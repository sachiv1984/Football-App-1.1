// api/odds.cjs (This forces CommonJS, making module.exports and require() valid)

// You must use the synchronous require() call in a CJS file.
function getOddsAPIService() {
  // Reference the COMPILED JavaScript output file (.js)
  const module = require('../../src/services/api/oddsAPIService.js');
  
  // Return the named export 'oddsAPIService' from the module object
  return module.oddsAPIService;
}

// Use module.exports for the Vercel handler export
module.exports = async function handler(req, res) { 
  try {
    const { home, away } = req.query;
    if (!home || !away) return res.status(400).json({ error: 'Missing home or away team' });

    // 1. Get the service object
    const oddsAPIService = getOddsAPIService();
    
    // 2. Use the service object
    const odds = await oddsAPIService.getOddsForMatch(String(home), String(away));
    if (!odds) return res.status(404).json({ error: 'No odds found' });

    res.status(200).json(odds);
  } catch (err) {
    console.error('[API] Unexpected error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
};
