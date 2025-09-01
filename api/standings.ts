// /api/standings.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { FixtureService } from '../src/services/fixtures/fixtureService';

let cache: any = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 min

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.status(200).json(cache);
    }

    const fixtureService = new FixtureService();
    const standings = await fixtureService['getStandings'](); // private method access workaround

    cache = standings;
    cacheTime = now;

    res.status(200).json(standings);
  } catch (err) {
    console.error('Error in /api/standings:', err);
    res.status(500).json({ error: 'Failed to fetch standings' });
  }
}
