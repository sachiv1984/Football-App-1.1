import type { VercelRequest, VercelResponse } from '@vercel/node';
import { oddsAPIService } from '../src/services/api/oddsAPIService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { home, away } = req.query;
    if (!home || !away) return res.status(400).json({ error: 'Missing home or away team' });

    const odds = await oddsAPIService.getOddsForMatch(String(home), String(away));
    if (!odds) return res.status(404).json({ error: 'No odds found' });

    res.status(200).json(odds);
  } catch (err: any) {
    console.error('[API] Unexpected error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
