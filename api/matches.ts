// /api/matches.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { FootballDataApi, FootballDataMatch } from '../src/services/api/footballDataApi';

let cache: FootballDataMatch[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FootballDataMatch[] | { error: string }>
) {
  try {
    const now = Date.now();

    if (cache && now - cacheTime < CACHE_TTL) {
      return res.status(200).json(cache);
    }

    const api = FootballDataApi.getInstance();
    const matches = await api.getUpcomingMatches(20); // adjust limit if needed

    cache = matches;
    cacheTime = Date.now();

    res.status(200).json(matches);
  } catch (err) {
    console.error('❌ Error in /api/matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
}
