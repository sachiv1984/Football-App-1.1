// api/odds.cjs (Complete handler with enhanced error handling)

// You must use the synchronous require() call in a CJS file.
function getOddsAPIService() {
  // Reference the COMPILED JavaScript output file (.js)
  const module = require('../../src/services/api/oddsAPIService.js');
  
  // Return the named export 'oddsAPIService' from the module object
  return module.oddsAPIService;
}

// Use module.exports for the Vercel handler export
module.exports = async function handler(req, res) { 
  console.log('[API Handler] Request received:', req.method, req.url);
  console.log('[API Handler] Query params:', req.query);
  
  try {
    const { home, away } = req.query;
    
    if (!home || !away) {
      console.error('[API Handler] Missing parameters - home:', home, 'away:', away);
      return res.status(400).json({ 
        error: 'Missing home or away team',
        received: { home, away }
      });
    }

    console.log(`[API Handler] Fetching odds for ${home} vs ${away}`);

    // 1. Get the service object
    const oddsAPIService = getOddsAPIService();
    console.log('[API Handler] Service loaded successfully');
    
    // 2. Use the service object
    const odds = await oddsAPIService.getOddsForMatch(String(home), String(away));
    
    if (!odds) {
      console.warn('[API Handler] No odds found for match');
      return res.status(404).json({ 
        error: 'No odds found',
        match: `${home} vs ${away}`,
        suggestion: 'Check team names match Premier League teams exactly'
      });
    }

    console.log('[API Handler] ✅ Odds found, returning data');
    res.status(200).json(odds);
    
  } catch (err) {
    console.error('[API Handler] Unexpected error:', err);
    console.error('[API Handler] Error stack:', err.stack);
    
    res.status(500).json({ 
      error: err.message || 'Internal server error',
      type: err.constructor.name,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};