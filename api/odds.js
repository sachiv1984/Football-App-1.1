/**
 * api/odds.js
 * Vercel Serverless Function for fetching odds from The Odds API
 * 
 * Query Parameters:
 * - home: Home team name (e.g., "Arsenal")
 * - away: Away team name (e.g., "Chelsea")
 * 
 * Environment Variables Required:
 * - ODDS_API_KEY: Your API key from the-odds-api.com
 */

// In-memory cache
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Helper to check if cache is valid
const isCacheValid = (entry) => {
  return entry && (Date.now() - entry.timestamp) < CACHE_TTL;
};

// Helper to generate match ID
const generateMatchId = (home, away) => {
  return `${home.toLowerCase().replace(/\s+/g, '')}_vs_${away.toLowerCase().replace(/\s+/g, '')}`;
};

// Helper to find best odds from bookmakers
const findBestOdds = (outcomes) => {
  if (!outcomes || outcomes.length === 0) return null;
  
  const bestOdds = {};
  outcomes.forEach(outcome => {
    const name = outcome.name;
    const price = outcome.price;
    
    if (!bestOdds[name] || price > bestOdds[name]) {
      bestOdds[name] = price;
    }
  });
  
  return bestOdds;
};

// Main handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { home, away } = req.query;

  if (!home || !away) {
    return res.status(400).json({ 
      error: 'Missing required parameters: home and away team names' 
    });
  }

  const matchId = generateMatchId(home, away);

  // Check cache
  const cachedData = cache.get(matchId);
  if (isCacheValid(cachedData)) {
    console.log(`Cache hit for ${matchId}`);
    return res.status(200).json(cachedData.data);
  }

  // Get API key from environment
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'ODDS_API_KEY not configured in environment variables' 
    });
  }

  try {
    const sport = 'soccer_epl'; // English Premier League
    const regions = 'uk'; // UK bookmakers
    const markets = 'totals,btts,h2h'; // Markets we need
    
    // Fetch odds from The Odds API
    const oddsApiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=${regions}&markets=${markets}&oddsFormat=decimal`;
    
    console.log(`Fetching odds for ${home} vs ${away} from The Odds API`);
    
    const response = await fetch(oddsApiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('The Odds API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: `The Odds API returned status ${response.status}`,
        details: errorText
      });
    }

    const data = await response.json();
    
    // Find the specific match
    const match = data.find(game => {
      const homeMatch = game.home_team.toLowerCase().includes(home.toLowerCase()) || 
                        home.toLowerCase().includes(game.home_team.toLowerCase());
      const awayMatch = game.away_team.toLowerCase().includes(away.toLowerCase()) || 
                        away.toLowerCase().includes(game.away_team.toLowerCase());
      return homeMatch && awayMatch;
    });

    if (!match) {
      return res.status(404).json({ 
        error: `No match found for ${home} vs ${away}`,
        hint: 'Match might not be available or scheduled. Check team names.'
      });
    }

    // Parse bookmaker data for different markets
    const result = {
      matchId,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      commenceTime: match.commence_time,
      lastFetched: new Date().toISOString()
    };

    // Process markets
    if (match.bookmakers && match.bookmakers.length > 0) {
      match.bookmakers.forEach(bookmaker => {
        bookmaker.markets.forEach(market => {
          
          // Total Goals (Over/Under 2.5)
          if (market.key === 'totals' && market.outcomes) {
            const outcome = market.outcomes.find(o => o.name === 'Over' && o.point === 2.5);
            if (outcome) {
              const bestOdds = findBestOdds(market.outcomes);
              result.totalGoalsOdds = {
                overOdds: bestOdds['Over'] || 0,
                underOdds: bestOdds['Under'] || 0,
                line: 2.5
              };
            }
          }

          // BTTS (Both Teams To Score)
          if (market.key === 'btts') {
            const bestOdds = findBestOdds(market.outcomes);
            result.bttsOdds = {
              yesOdds: bestOdds['Yes'] || 0,
              noOdds: bestOdds['No'] || 0
            };
          }
        });
      });
    }

    // Note: The Odds API doesn't provide cards and corners data for most bookmakers
    // These markets are rarely available via API, mostly only on betting sites directly
    // We'll leave them undefined for now
    console.log(`Successfully fetched odds for ${matchId}`);

    // Cache the result
    cache.set(matchId, {
      data: result,
      timestamp: Date.now()
    });

    return res.status(200).json(result);

  } catch (error) {
    console.error('Error fetching odds:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch odds',
      message: error.message 
    });
  }
}