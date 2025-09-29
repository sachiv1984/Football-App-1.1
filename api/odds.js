// api/odds.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
// 1. ADD THIS LINE: Import the value of the service you want to use
import oddsAPIService from '../../src/services/api/oddsAPIService.ts'; 
// NOTE: Vercel/TypeScript handles the relative path with the .ts extension, or your bundler will resolve it.

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { home, away } = req.query;
    if (!home || !away) return res.status(400).json({ error: 'Missing home or away team' });

    // This now works because oddsAPIService is imported
    const odds = await oddsAPIService.getOddsForMatch(String(home), String(away));
    if (!odds) return res.status(404).json({ error: 'No odds found' });

    res.status(200).json(odds);
  } catch (err: any) {
    console.error('[API] Unexpected error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
