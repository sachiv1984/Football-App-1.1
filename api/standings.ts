// /api/standings.ts
import { FootballDataApi } from '../src/services/api/footballDataApi';

let cache: any = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 min

export default async function handler(req: any, res: any) {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.status(200).json(cache);
    }

    const api = FootballDataApi.getInstance();
    const standings = await api.getStandings();

    cache = standings;
    cacheTime = Date.now();

    res.status(200).json(standings);
  } catch (err) {
    console.error('Error in /api/standings:', err);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
}
