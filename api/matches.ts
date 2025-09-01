// /api/matches.ts
import { FootballDataApi } from '../src/services/api/footballDataApi';

let cache: any = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

export default async function handler(req: any, res: any) {
  try {
    const now = Date.now();

    // Serve cached data if valid
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.status(200).json(cache);
    }

    const api = FootballDataApi.getInstance();
    const matches = await api.getCurrentSeasonMatches('SCHEDULED');

    cache = matches;
    cacheTime = now;

    res.status(200).json(matches);
  } catch (err) {
    console.error('Error in /api/matches:', err);
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
}
