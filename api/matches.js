// api/matches.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { redisGet, redisSet } from '../../services/upstash/redis';

let teamVenueCache = new Map<number, { venue: string; ts: number }>();

// Helper: measure async execution time
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

// Fetch team venue with 7-day cache
async function getTeamVenue(teamId: number, API_TOKEN: string) {
  const cached = teamVenueCache.get(teamId);
  const week = 7 * 24 * 60 * 60 * 1000;
  if (cached && Date.now() - cached.ts < week) return cached.venue;

  try {
    const res = await fetch(`https://api.football-data.org/v4/teams/${teamId}`, {
      headers: { 'X-Auth-Token': API_TOKEN, 'Content-Type': 'application/json' },
    });
    if (!res.ok) return '';
    const data = await res.json();
    const venue = data.venue || '';
    teamVenueCache.set(teamId, { venue, ts: Date.now() });
    return venue;
  } catch (err) {
    console.error('Error fetching team venue:', err);
    return '';
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    if (!API_TOKEN) return res.status(500).json({ error: 'API token not configured' });

    // Check Redis cache first
    const cacheKey = 'matches:pl';
    const cached = await redisGet<{ data: any[]; etag: string; timestamp: number }>(cacheKey);

    const now = Date.now();
    let ttl = 60 * 60 * 1000; // default 1h

    if (cached) {
      const hasLive = cached.data.some((m) => ['LIVE', 'IN_PLAY', 'PAUSED'].includes(m.status));
      if (hasLive) ttl = 30 * 1000;
      else {
        const today = new Date();
        const hasTodayMatch = cached.data.some((m) => new Date(m.utcDate).toDateString() === today.toDateString());
        if (hasTodayMatch) ttl = 15 * 60 * 1000;
      }

      if (now - cached.timestamp < ttl) {
        res.setHeader('x-cache', 'HIT');
        res.setHeader('ETag', cached.etag || '');
        return res.status(200).json(cached.data);
      }
    }

    const headers: Record<string, string> = {
      'X-Auth-Token': API_TOKEN,
      'Content-Type': 'application/json',
      ...(cached?.etag ? { 'If-None-Match': cached.etag } : {}),
    };

    const url = 'https://api.football-data.org/v4/competitions/PL/matches';
    const { result: response, duration: fetchTime } = await measureTime(() => fetch(url, { headers }));

    if (response.status === 304 && cached) {
      // Not Modified -> update timestamp only
      cached.timestamp = Date.now();
      await redisSet(cacheKey, cached, ttl / 1000);
      res.setHeader('x-cache', 'ETAG-NOTMODIFIED');
      res.setHeader('ETag', cached.etag);
      res.setHeader('x-timings-fetch', fetchTime.toString());
      return res.status(200).json(cached.data);
    }

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429 && cached) {
        res.setHeader('x-cache', 'STALE');
        res.setHeader('ETag', cached.etag || '');
        res.setHeader('x-timings-fetch', fetchTime.toString());
        return res.status(200).json(cached.data);
      }
      return res.status(500).json({ error: 'Football Data API error', details: errorText });
    }

    const etag = response.headers.get('etag') || '';
    const { result: data, duration: parseTime } = await measureTime(() => response.json());

    // Enrich missing venues
    const { result: matches, duration: enrichTime } = await measureTime(async () => {
      const teamsToFetch = new Set<number>();
      (data.matches || []).forEach((match: any) => {
        if (!match.venue && match.homeTeam?.id) teamsToFetch.add(match.homeTeam.id);
      });

      const fetchedVenues: Record<number, string> = {};
      await Promise.all(
        Array.from(teamsToFetch).map(async (teamId) => {
          fetchedVenues[teamId] = await getTeamVenue(teamId, API_TOKEN);
        })
      );

      return (data.matches || []).map((match: any) => {
        let venue = match.venue || '';
        if (!venue && match.homeTeam?.id) venue = fetchedVenues[match.homeTeam.id] || '';
        return { ...match, venue };
      });
    });

    // Save to Redis cache
    await redisSet(cacheKey, { data: matches, etag, timestamp: now }, ttl / 1000);

    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    res.setHeader('x-cache', 'MISS');
    res.setHeader('ETag', etag);
    res.setHeader('x-timings-fetch', fetchTime.toString());
    res.setHeader('x-timings-parse', parseTime.toString());
    res.setHeader('x-timings-enrich', enrichTime.toString());

    return res.status(200).json(matches);
  } catch (error) {
    console.error('Matches handler error:', error);

    // Fallback to cached
    const cacheKey = 'matches:pl';
    const cached = await redisGet<{ data: any[]; etag: string; timestamp: number }>(cacheKey);
    if (cached) {
      res.setHeader('x-cache', 'ERROR-STALE');
      res.setHeader('ETag', cached.etag || '');
      return res.status(200).json(cached.data);
    }

    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
