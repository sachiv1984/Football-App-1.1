// api/standings.js

module.exports = async function handler(req, res) {
  try {
    console.log('=== API /standings called ===');
    
    // Check environment variables
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    
    if (!API_TOKEN) {
      console.error('❌ No API token found');
      return res.status(500).json({
        error: 'API token is not configured',
        note: 'Please set FOOTBALL_DATA_TOKEN in environment variables'
      });
    }

    // Direct API call to get standings
    const url = 'https://api.football-data.org/v4/competitions/PL/standings';
    
    const response = await fetch(url, {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('Standings API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Standings API Error:', errorText);
      
      return res.status(500).json({
        error: `Football Data API error: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }

    const data = await response.json();
    console.log('Standings data received');

    // Extract the league table
    const standings = data.standings?.[0]?.table || [];
    
    console.log('Sending standings response with', standings.length, 'teams');
    res.status(200).json(standings);
    
  } catch (error) {
    console.error('❌ Unexpected error in /api/standings:', error);

    res.status(500).json({
      message: 'Failed to fetch standings',
      error: error instanceof Error ? error.message : 'Unknown server error'
    });
  }
};
