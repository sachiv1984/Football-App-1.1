// api/standings.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { redisGet, redisSet } from '../../services/upstash/redis';

// Helper: measure async execution time
async function measureTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    if (!API_TOKEN) return res.status(500).json({ error: 'API token not configured' });

    const cacheKey = 'standings:pl';
    const cached = await redisGet<{ data: any[]; etag: string; timestamp: number }>(cacheKey);

    const now = Date.now();
    let ttl = 12 * 60 * 60 * 1000; // default 12h

    if (cached) {
      const hasLive = cached.data.some((s) => s.form?.includes('W'));
      if (hasLive) ttl = 5 * 60 * 1000; // refresh faster during games
      else {
        const today = new Date();
        if (today.getDay() >= 5 && today.getDay() <= 7) ttl = 1 * 60 * 60 * 1000; // weekend -> 1h
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

    const url = 'https://api.football-data.org/v4/competitions/PL/standings';
    const { result: response, duration: fetchTime } = await measureTime(() => fetch(url, { headers }));

    // Handle 304 Not Modified
    if (response.status === 304 && cached) {
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
    const { result: data, duration: parseTime } = await measureTime(async () => {
      const json = await response.json();
      // Extract standings table (first table)
      return json.standings?.[0]?.table || [];
    });

    // Save to Redis
    await redisSet(cacheKey, { data, etag, timestamp: now }, ttl / 1000);

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.setHeader('x-cache', 'MISS');
    res.setHeader('ETag', etag);
    res.setHeader('x-timings-fetch', fetchTime.toString());
    res.setHeader('x-timings-parse', parseTime.toString());

    return res.status(200).json(data);
  } catch (error) {
    console.error('Standings handler error:', error);

    // Fallback to cached
    const cacheKey = 'standings:pl';
    const cached = await redisGet<{ data: any[]; etag: string; timestamp: number }>(cacheKey);
    if (cached) {
      res.setHeader('x-cache', 'ERROR-STALE');
      res.setHeader('ETag', cached.etag || '');
      return res.status(200).json(cached.data);
    }

    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

