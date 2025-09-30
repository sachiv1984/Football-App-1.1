/**
 * api/available-matches.js
 * Lists all available upcoming Premier League matches
 */

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

  // Get API key from environment
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'ODDS_API_KEY not configured in environment variables' 
    });
  }

  try {
    const sport = 'soccer_epl';
    const regions = 'uk';
    const markets = 'h2h'; // Simple market just to get the fixtures
    
    const oddsApiUrl = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${apiKey}&regions=${regions}&markets=${markets}&oddsFormat=decimal`;
    
    console.log('Fetching available Premier League matches...');
    
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
    
    // Format the matches for easy reading
    const matches = data.map(match => ({
      id: match.id,
      homeTeam: match.home_team,
      awayTeam: match.away_team,
      commenceTime: match.commence_time,
      commenceTimeFormatted: new Date(match.commence_time).toLocaleString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

    // Sort by commence time
    matches.sort((a, b) => new Date(a.commenceTime) - new Date(b.commenceTime));

    return res.status(200).json({
      count: matches.length,
      matches,
      note: 'Use these exact team names when calling /api/odds'
    });

  } catch (error) {
    console.error('Error fetching matches:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch matches',
      message: error.message 
    });
  }
}