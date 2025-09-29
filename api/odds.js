// api/odds.js (or api/odds.ts)

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Function to dynamically load the service module
async function loadOddsAPIService() {
  // Use dynamic import and the expected runtime extension (.js)
  // to avoid the static parsing error caused by 'import { ... }'
  const module = await import('../../src/services/api/oddsAPIService.js');
  
  // Access the named export 'oddsAPIService' from the module object
  return module.oddsAPIService;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { home, away } = req.query;
    if (!home || !away) return res.status(400).json({ error: 'Missing home or away team' });

    // 1. Load the service object dynamically at runtime
    const oddsAPIService = await loadOddsAPIService();
    
    // 2. Use the service object
    const odds = await oddsAPIService.getOddsForMatch(String(home), String(away));
    if (!odds) return res.status(404).json({ error: 'No odds found' });

    res.status(200).json(odds);
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    // Note: 'err' here is typed as 'any' in TypeScript, but in JavaScript, no type cast is needed.
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
