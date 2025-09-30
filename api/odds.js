// api/odds.cjs (TEST VERSION - REMOVES require() FOR DEBUGGING)

// Use module.exports for the Vercel handler export
module.exports = async function handler(req, res) { 
  console.log('[API Test Handler] Request received:', req.method, req.url);
  console.log('[API Test Handler] Query params:', req.query);
  
  try {
    const { home, away } = req.query;
    
    if (!home || !away) {
      console.error('[API Test Handler] Missing parameters');
      return res.status(400).json({ 
        error: 'Missing home or away team',
        received: { home, away }
      });
    }

    // --- MOCK LOGIC: If this code executes, the Vercel 404/require error is solved. ---

    const matchId = `${String(home).toLowerCase().replace(/\s+/g, '')}_vs_${String(away).toLowerCase().replace(/\s+/g, '')}`;
    
    console.log(`[API Test Handler] Returning mock odds for ${home} vs ${away}`);

    const mockOdds = {
      matchId: matchId,
      homeTeam: String(home),
      awayTeam: String(away),
      lastFetched: new Date().toISOString(),
      // Mock data structured to pass your APIdebug.tsx checks
      totalGoalsOdds: { overOdds: 1.85, underOdds: 1.95 },
      bttsOdds: { yesOdds: 1.70, noOdds: 2.10 },
      status: "MOCK_SUCCESS_ROUTE_CONFIRMED"
    };

    // --- END MOCK LOGIC ---

    console.log('[API Test Handler] ✅ Mock data returned');
    res.status(200).json(mockOdds);
    
  } catch (err) {
    console.error('[API Test Handler] Unexpected error:', err);
    
    res.status(500).json({ 
      error: err.message || 'Internal server error',
      type: err.constructor.name,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
