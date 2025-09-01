// src/pages/api/standings.ts
import type { NextApiRequest, NextApiResponse } from 'next';

let cache: any = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const now = Date.now();
    if (cache && now - cacheTime < CACHE_TTL) {
      return res.status(200).json(cache);
    }

    const response = await fetch(
      'https://api.football-data.org/v4/competitions/PL/standings',
      {
        headers: {
          'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch standings' });
    }

    const data = await response.json();
    cache = data;
    cacheTime = now;

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
