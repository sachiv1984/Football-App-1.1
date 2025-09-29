// api/odds.js
import { oddsAPIService } from './oddsAPIService.js';

export default async function handler(req, res) {
  try {
    if (!process.env.ODDS_API_KEY) {
      return res.status(500).json({ error: 'ODDS_API_KEY not set in environment' });
    }

    const { home, away } = req.query;
    if (!home || !away) return res.status(400).json({ error: 'Missing home or away team' });

    const odds = await oddsAPIService.getOddsForMatch(String(home), String(away));
    if (!odds) return res.status(404).json({ error: 'No odds found for this match' });

    res.status(200).json(odds);

  } catch (err) {
    console.error('[API] Unexpected error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}

