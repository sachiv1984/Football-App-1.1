// api/odds.js 

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Function to use the Node.js CommonJS 'require' syntax.
// This is synchronous and reliably bypasses the static parsing error
// caused by the ES Module 'import { ... }' syntax in the Vercel environment.
function getOddsAPIService() {
  // NOTE: You must use the .js extension here because the TypeScript file
  // will be compiled to a .js file by Vercel's build process.
  // The 'require' will look for the compiled file relative to the handler.
  const module = require('../../src/services/api/oddsAPIService.js');
  
  // The module object will contain the named exports
  return module.oddsAPIService;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { home, away } = req.query;
    if (!home || !away) return res.status(400).json({ error: 'Missing home or away team' });

    // 1. Get the service object synchronously
    const oddsAPIService = getOddsAPIService();
    
    // 2. Use the service object (methods are still async)
    const odds = await oddsAPIService.getOddsForMatch(String(home), String(away));
    if (!odds) return res.status(404).json({ error: 'No odds found' });

    res.status(200).json(odds);
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
