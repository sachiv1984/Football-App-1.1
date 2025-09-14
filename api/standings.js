// api/standings.js
import { redis } from '../services/upstash/redis'; // your Redis wrapper

const STANDINGS_KEY = 'standings:data';
const STANDINGS_ETAG_KEY = 'standings:etag';
const PERF_KEY = 'standings:perf';

// Helper: measure execution time
async function measureTime(fn) {
  const start = Date.now();
  const result = await fn();
  const duration = Date.now() - start;
  return { result, duration };
}

// Fetch standings from API
async function fetchStandingsFromApi(API_TOKEN, etag) {
  const headers = {
    'X-Auth-Token': API_TOKEN,
    'Content-Type': 'application/json',
    ...(etag ? { 'If-None-Match': etag } : {}),
  };
  return fetch('https://api.football-data.org/v4/competitions/PL/standings', { headers });
}

export default async function handler(req, res) {
  try {
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN;
    if (!API_TOKEN) return res.status(500).json({ error: 'API token not configured' });

    const cachedStandings = await redis.get(STANDINGS_KEY).then(d => d && JSON.parse(d));
    const cachedEtag = await redis.get(STANDINGS_ETAG_KEY);

    // Fetch with timing
    const { result: response, duration: fetchTime } = await measureTime(() =>
      fetchStandingsFromApi(API_TOKEN, cachedEtag)
    );

    // 304 Not Modified → return cache
    if (response.status === 304 && cachedStandings) {
      res.setHeader('x-cache', 'ETAG-NOTMODIFIED');
      res.setHeader('ETag', cachedEtag);
      return res.status(200).json(cachedStandings);
    }

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 429 && cachedStandings) {
        res.setHeader('x-cache', 'STALE');
        res.setHeader('ETag', cachedEtag || '');
        return res.status(200).json(cachedStandings);
      }
      return res.status(500).json({ error: 'Football Data API error', details: text });
    }

    // Parse JSON
    const { result: data, duration: parseTime } = await measureTime(() => response.json());

    const standings = data.standings?.[0]?.table || [];

    // Save to Redis
    await redis.set(STANDINGS_KEY, JSON.stringify(standings), { ex: 3600 });
    await redis.set(STANDINGS_ETAG_KEY, response.headers.get('etag') || '', { ex: 3600 });

    // Update perf stats
    const perfStats = (await redis.get(PERF_KEY).then(d => d && JSON.parse(d))) || [];
    perfStats.push({ fetchTime, parseTime, timestamp: Date.now() });
    if (perfStats.length > 50) perfStats.shift();
    await redis.set(PERF_KEY, JSON.stringify(perfStats), { ex: 86400 });

    // Response headers
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=1800');
    res.setHeader('x-cache', 'MISS');
    res.setHeader('ETag', response.headers.get('etag') || '');
    res.setHeader('x-timings-fetch', fetchTime.toString());
    res.setHeader('x-timings-parse', parseTime.toString());

    return res.status(200).json(standings);
  } catch (err) {
    console.error('Standings handler error:', err);
    const cachedStandings = await redis.get(STANDINGS_KEY).then(d => d && JSON.parse(d));
    if (cachedStandings) {
      res.setHeader('x-cache', 'ERROR-STALE');
      return res.status(200).json(cachedStandings);
    }
    return res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' });
  }
}
