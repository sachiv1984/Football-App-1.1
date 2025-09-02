// api/matches.js

module.exports = async function handler(req, res) {
  try {
    console.log('=== API /matches-simple called ===');
    
    // Check environment variables
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    console.log('API_TOKEN exists:', !!API_TOKEN);
    
    if (!API_TOKEN) {
      console.error('❌ No API token found');
      return res.status(500).json({
        success: false,
        error: 'API token is not configured',
        note: 'Please set FOOTBALL_DATA_TOKEN in environment variables'
      });
    }

    // Test basic fetch first
    console.log('Testing direct API call...');
    const testUrl = 'https://api.football-data.org/v4/competitions/PL/matches';
    
    const response = await fetch(testUrl, {
      headers: {
        'X-Auth-Token': API_TOKEN,
        'Content-Type': 'application/json'
      }
    });

    console.log('API Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error response:', errorText);
      
      return res.status(500).json({
        success: false,
        error: `Football Data API error: ${response.status} ${response.statusText}`,
        details: errorText,
        note: 'Check your API token and account limits'
      });
    }

    const data = await response.json();
    console.log('Matches count:', data.matches?.length || 0);

    // Return simplified match data
    const matches = (data.matches || []).slice(0, 10).map((match) => ({
      id: match.id,
      date: match.utcDate,
      status: match.status,
      homeTeam: {
        name: match.homeTeam.name,
        crest: match.homeTeam.crest
      },
      awayTeam: {
        name: match.awayTeam.name,
        crest: match.awayTeam.crest
      },
      score: match.score
    }));

    console.log('Sending response with', matches.length, 'matches');
    
    // Return just the array (not wrapped in an object) to match FixtureService expectations
    res.status(200).json(matches);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);

    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown server error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
  }
};