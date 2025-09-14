// api/matches.js
import { redis } from '../services/upstash/redis'; // your Redis wrapper

const TEAM_VENUE_CACHE_KEY = 'team:venues'; // optional Redis map for venues
const MATCHES_KEY = 'matches:data';
const MATCHES_ETAG_KEY = 'matches:etag';
const PERF_KEY = 'matches:perf';

// Helper: measure execution time
async function measureTime(fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

// Fetch & cache team venue
async function getTeamVenue(teamId, API_TOKEN) {
  const cachedVenues = (await redis.get(TEAM_VENUE_CACHE_KEY)) || {};
  const cached = cachedVenues[teamId];
  const week = 7 * 24 * 60 * 60 * 1000; // 7 days

  if (cached && Date.now() - cached.ts < week) {
    return cached.venue;
  }

  try {
    const r = await fetch(`https://api.football-data.org/v4/teams/${teamId}`, {
      headers: { 'X-Auth-Token': API_TOKEN, 'Content-Type': 'application/json' },
    });
    if (!r.ok) {
      console.warn(`Failed to fetch venue for team ${teamId}: ${r.status}`);
      return '';
    }
    const t = await r.json();
    const venue = t.venue || '';
    cachedVenues[teamId] = { venue, ts: Date.now() };
    await redis.set(TEAM_VENUE_CACHE_KEY, JSON.stringify(cachedVenues));
    return venue;
  } catch (err) {
    console.error('Error fetching team venue:', err);
    return '';
  }
}

// Fetch matches from API
async function fetchMatchesFromApi(API_TOKEN, etag) {
  const headers = {
    'X-Auth-Token': API_TOKEN,
    'Content-Type': 'application/json',
    ...(etag ? { 'If-None-Match': etag } : {}),
  };
  return fetch('https://api.football-data.org/v4/competitions/PL/matches', { headers });
}

export default async function handler(req, res) {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN;
    if (!API_TOKEN) return res.status(500).json({ error: 'API token not configured' });

    const cachedMatches = await redis.get(MATCHES_KEY).then(d => d && JSON.parse(d));
    const cachedEtag = await redis.get(MATCHES_ETAG_KEY);

    // Fetch matches with timing
    const { result: response, duration: fetchTime } = await measureTime(() =>
      fetchMatchesFromApi(API_TOKEN, cachedEtag)
    );

    // 304 Not Modified → return cache
    if (response.status === 304 && cachedMatches) {
      res.setHeader('x-cache', 'ETAG-NOTMODIFIED');
      res.setHeader('ETag', cachedEtag);
      return res.status(200).json(cachedMatches);
    }

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 429 && cachedMatches) {
        res.setHeader('x-cache', 'STALE');
        res.setHeader('ETag', cachedEtag || '');
        return res.status(200).json(cachedMatches);
      }
      return res.status(500).json({ error: 'Football Data API error', details: text });
    }

    // Parse JSON
    const { result: data, duration: parseTime } = await measureTime(() => response.json());

    // Venue enrichment
    const { result: matches, duration: enrichTime } = await measureTime(async () => {
      const teamsToFetch = new Set();
      (data.matches || []).forEach(match => {
        if (!match.venue && match.homeTeam?.id) teamsToFetch.add(match.homeTeam.id);
      });

      const fetchedVenues = {};
      await Promise.all(
        Array.from(teamsToFetch).map(async teamId => {
          fetchedVenues[teamId] = await getTeamVenue(teamId, API_TOKEN);
        })
      );

      return (data.matches || []).map(match => {
        let venue = match.venue || '';
        if (!venue && match.homeTeam?.id) venue = fetchedVenues[match.homeTeam.id] || '';
        return {
          id: match.id,
          utcDate: match.utcDate,
          status: match.status,
          matchday: match.matchday,
          stage: match.stage || 'REGULAR_SEASON',
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          venue,
          score: match.score || null,
          competition: match.competition || {},
        };
      });
    });

    // Save to Redis
    await redis.set(MATCHES_KEY, JSON.stringify(matches), { ex: 3600 });
    await redis.set(MATCHES_ETAG_KEY, response.headers.get('etag') || '', { ex: 3600 });

    // Update perf stats
    const perfStats = (await redis.get(PERF_KEY).then(d => d && JSON.parse(d))) || [];
    perfStats.push({ fetchTime, parseTime, enrichTime, timestamp: Date.now() });
    if (perfStats.length > 50) perfStats.shift();
    await redis.set(PERF_KEY, JSON.stringify(perfStats), { ex: 86400 });

    // Response headers
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    res.setHeader('x-cache', 'MISS');
    res.setHeader('ETag', response.headers.get('etag') || '');
    res.setHeader('x-timings-fetch', fetchTime.toString());
    res.setHeader('x-timings-parse', parseTime.toString());
    res.setHeader('x-timings-enrich', enrichTime.toString());

    return res.status(200).json(matches);
  } catch (err) {
    console.error('Matches handler error:', err);
    const cachedMatches = await redis.get(MATCHES_KEY).then(d => d && JSON.parse(d));
    if (cachedMatches) {
      res.setHeader('x-cache', 'ERROR-STALE');
      return res.status(200).json(cachedMatches);
    }
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
