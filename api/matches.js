// api/matches.js

module.exports = async function handler(req, res) {
  try {
    console.log('=== API /matches called ===');
    
    // Check environment variables
    const API_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.REACT_APP_FOOTBALL_DATA_TOKEN;
    console.log('API_TOKEN exists:', !!API_TOKEN);
    
    if (!API_TOKEN) {
      console.error('❌ No API token found');
      return res.status(500).json({
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
        error: `Football Data API error: ${response.status} ${response.statusText}`,
        details: errorText,
        note: 'Check your API token and account limits'
      });
    }

    const data = await response.json();
    console.log('Matches count:', data.matches?.length || 0);
    
    // Debug: Log first match structure
    if (data.matches && data.matches.length > 0) {
      console.log('First match structure:', JSON.stringify(data.matches[0], null, 2));
    }

    // Return complete match data that matches FixtureService expectations
    const matches = (data.matches || []).slice(0, 50).map((match) => ({
      id: match.id,
      utcDate: match.utcDate,
      date: match.utcDate, // Some services expect 'date' instead of 'utcDate'
      status: match.status,
      matchday: match.matchday,
      stage: match.stage || 'REGULAR_SEASON',
      homeTeam: {
        id: match.homeTeam.id,
        name: match.homeTeam.name,
        shortName: match.homeTeam.shortName || match.homeTeam.name,
        tla: match.homeTeam.tla || match.homeTeam.name.substring(0, 3).toUpperCase(),
        crest: match.homeTeam.crest
      },
      awayTeam: {
        id: match.awayTeam.id,
        name: match.awayTeam.name,
        shortName: match.awayTeam.shortName || match.awayTeam.name,
        tla: match.awayTeam.tla || match.awayTeam.name.substring(0, 3).toUpperCase(),
        crest: match.awayTeam.crest
      },
      score: match.score || {
        winner: null,
        duration: 'REGULAR',
        fullTime: { home: null, away: null }
      },
      venue: match.venue || '',
      competition: match.competition || {
        id: 2021,
        name: 'Premier League',
        code: 'PL',
        type: 'LEAGUE',
        emblem: ''
      }
    })).filter(match => match.id != null); // Filter out any matches with null/undefined IDs

    console.log('Sending response with', matches.length, 'matches');
    
    // Return just the array to match FixtureService expectations
    res.status(200).json(matches);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);

    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown server error',
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined
    });
  }
};