// api/odds.cjs - Standalone version (no external imports)

const TEAM_NORMALIZATION_MAP = {
  'Man Utd': 'Manchester United',
  'Manchester United FC': 'Manchester United',
  'Man United': 'Manchester United',
  'Manchester Utd': 'Manchester United',
  'Man City': 'Manchester City',
  'Manchester City FC': 'Manchester City',
  'Spurs': 'Tottenham Hotspur',
  'Tottenham': 'Tottenham Hotspur',
  'Tottenham Hotspur FC': 'Tottenham Hotspur',
  'Brighton': 'Brighton & Hove Albion',
  'Brighton Hove Albion': 'Brighton & Hove Albion',
  'Brighton and Hove Albion': 'Brighton & Hove Albion',
  'Brighton & Hove Albion FC': 'Brighton & Hove Albion',
  'Sheffield Utd': 'Sheffield United',
  'Sheffield United FC': 'Sheffield United',
  'Wolves': 'Wolverhampton Wanderers',
  'Wolverhampton Wanderers FC': 'Wolverhampton Wanderers',
  'Leicester': 'Leicester City',
  'Leicester City FC': 'Leicester City',
  'Newcastle': 'Newcastle United',
  'Newcastle United FC': 'Newcastle United',
  'West Ham': 'West Ham United',
  'West Ham FC': 'West Ham United',
  'Crystal Palace FC': 'Crystal Palace',
  'Palace': 'Crystal Palace',
  'Forest': 'Nottingham Forest',
  "Nott'm Forest": 'Nottingham Forest',
  'Nottingham Forest FC': 'Nottingham Forest',
  'Villa': 'Aston Villa',
  'Aston Villa FC': 'Aston Villa',
  'Fulham FC': 'Fulham',
  'Brentford FC': 'Brentford',
  'Everton FC': 'Everton',
  'Liverpool FC': 'Liverpool',
  'Arsenal FC': 'Arsenal',
  'Chelsea FC': 'Chelsea',
  'Bournemouth': 'AFC Bournemouth',
  'AFC Bournemouth FC': 'AFC Bournemouth',
  'Luton': 'Luton Town',
  'Luton Town FC': 'Luton Town',
  'Burnley FC': 'Burnley',
  'Leeds Utd': 'Leeds United',
  'Leeds United FC': 'Leeds United',
  'Southampton FC': 'Southampton',
  'Ipswich': 'Ipswich Town',
  'Ipswich Town FC': 'Ipswich Town',
};

function normalizeTeamName(name) {
  const clean = name.trim();
  return TEAM_NORMALIZATION_MAP[clean] || clean;
}

function generateMatchId(home, away) {
  const normalizedHome = normalizeTeamName(home).toLowerCase().replace(/\s+/g, '');
  const normalizedAway = normalizeTeamName(away).toLowerCase().replace(/\s+/g, '');
  return `${normalizedHome}_vs_${normalizedAway}`;
}

async function fetchOddsFromAPI(homeTeam, awayTeam) {
  const API_KEY = process.env.ODDS_API_KEY;
  
  if (!API_KEY) {
    console.error('[Odds API] No API key found');
    return null;
  }

  const markets = ['totals', 'btts', 'total_cards', 'total_corners', 'most_cards'].join(',');
  const url = `https://api.the-odds-api.com/v4/sports/soccer_epl/odds?apiKey=${API_KEY}&regions=uk&markets=${markets}&oddsFormat=decimal`;

  console.log(`[Odds API] Fetching for ${homeTeam} vs ${awayTeam}...`);

  try {
    const res = await fetch(url);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[Odds API] HTTP ${res.status}:`, errorText.slice(0, 200));
      return null;
    }

    const text = await res.text();
    console.log('[Odds API] Response received, length:', text.length);

    if (text.trim().startsWith('<!DOCTYPE') || text.trim().startsWith('<html')) {
      console.error('[Odds API] Received HTML instead of JSON');
      return null;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      console.error('[Odds API] JSON parse error:', parseErr.message);
      return null;
    }

    if (!Array.isArray(data)) {
      console.error('[Odds API] Response is not an array');
      return null;
    }

    console.log(`[Odds API] Found ${data.length} matches`);

    const inputHome = normalizeTeamName(homeTeam);
    const inputAway = normalizeTeamName(awayTeam);

    const match = data.find(m => {
      const apiHome = normalizeTeamName(m.home_team);
      const apiAway = normalizeTeamName(m.away_team);
      
      return (apiHome === inputHome && apiAway === inputAway) || 
             (apiHome === inputAway && apiAway === inputHome);
    });

    if (!match) {
      console.error(`[Odds API] No match found for ${inputHome} vs ${inputAway}`);
      console.error('[Odds API] Available:', data.slice(0, 3).map(m => `${m.home_team} vs ${m.away_team}`));
      return null;
    }

    console.log(`[Odds API] Match found: ${match.home_team} vs ${match.away_team}`);

    const bookmaker = match.bookmakers.find(b => b.key === 'draftkings') || match.bookmakers[0];
    if (!bookmaker) {
      console.error('[Odds API] No bookmaker data');
      return null;
    }

    // Extract odds
    const totalGoals = bookmaker.markets.find(m => m.key === 'totals');
    const btts = bookmaker.markets.find(m => m.key === 'btts');
    const totalCards = bookmaker.markets.find(m => m.key === 'total_cards');
    const totalCorners = bookmaker.markets.find(m => m.key === 'total_corners');
    const mostCards = bookmaker.markets.find(m => m.key === 'most_cards');

    return {
      matchId: generateMatchId(homeTeam, awayTeam),
      totalGoalsOdds: totalGoals ? {
        market: 'Over/Under 2.5 Goals',
        overOdds: totalGoals.outcomes.find(o => o.name === 'Over' && o.point === 2.5)?.price || 0,
        underOdds: totalGoals.outcomes.find(o => o.name === 'Under' && o.point === 2.5)?.price || 0,
      } : undefined,
      bttsOdds: btts ? {
        market: 'Both Teams To Score',
        yesOdds: btts.outcomes.find(o => o.name === 'Yes')?.price || 0,
        noOdds: btts.outcomes.find(o => o.name === 'No')?.price || 0,
      } : undefined,
      totalCardsOdds: totalCards ? {
        market: 'Over/Under 4.5 Cards',
        overOdds: totalCards.outcomes.find(o => o.name === 'Over' && o.point === 4.5)?.price || 0,
        underOdds: totalCards.outcomes.find(o => o.name === 'Under' && o.point === 4.5)?.price || 0,
      } : undefined,
      totalCornersOdds: totalCorners ? {
        market: 'Over/Under 9.5 Corners',
        overOdds: totalCorners.outcomes.find(o => o.name === 'Over' && o.point === 9.5)?.price || 0,
        underOdds: totalCorners.outcomes.find(o => o.name === 'Under' && o.point === 9.5)?.price || 0,
      } : undefined,
      mostCardsOdds: mostCards ? {
        market: 'Most Cards',
        homeOdds: mostCards.outcomes.find(o => o.name === 'Home')?.price || 0,
        awayOdds: mostCards.outcomes.find(o => o.name === 'Away')?.price || 0,
        drawOdds: mostCards.outcomes.find(o => o.name === 'Draw')?.price || 0,
      } : undefined,
      lastFetched: Date.now(),
    };
  } catch (err) {
    console.error('[Odds API] Error:', err.message);
    return null;
  }
}

module.exports = async function handler(req, res) {
  console.log('[API Handler] Request received:', req.method, req.url);
  console.log('[API Handler] Query params:', req.query);

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { home, away } = req.query;

    if (!home || !away) {
      console.error('[API Handler] Missing parameters');
      return res.status(400).json({
        error: 'Missing home or away team',
        received: { home, away }
      });
    }

    console.log(`[API Handler] Fetching odds for ${home} vs ${away}`);

    const odds = await fetchOddsFromAPI(String(home), String(away));

    if (!odds) {
      console.warn('[API Handler] No odds found');
      return res.status(404).json({
        error: 'No odds found',
        match: `${home} vs ${away}`,
        suggestion: 'Check team names or try again later'
      });
    }

    console.log('[API Handler] Success - returning odds');
    res.status(200).json(odds);

  } catch (err) {
    console.error('[API Handler] Error:', err);
    res.status(500).json({
      error: err.message || 'Internal server error'
    });
  }
};
