// api/odds.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { OddsAPIService } from '../src/services/api/oddsAPIService';

const oddsService = new OddsAPIService();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { home, away } = req.query;

    if (!home || !away) {
      return res.status(400).json({ error: 'Missing home or away team' });
    }

    const odds = await oddsService.getOddsForMatch(String(home), String(away));

    if (!odds) {
      return res.status(404).json({ error: 'No odds found' });
    }

    res.status(200).json(odds);

  } catch (err) {
    console.error('[API] Error fetching odds:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
