// api/matches.js

// Helper function to calculate match importance
function calculateMatchImportance(match) {
  // Big 6 teams (higher importance when they play each other)
  const big6Teams = [
    'Arsenal FC', 'Chelsea FC', 'Liverpool FC', 
    'Manchester City FC', 'Manchester United FC', 'Tottenham Hotspur FC'
  ];
  
  const homeTeamName = match.homeTeam.name;
  const awayTeamName = match.awayTeam.name;
  
  const homeIsBig6 = big6Teams.includes(homeTeamName);
  const awayIsBig6 = big6Teams.includes(awayTeamName);
  
  // Both teams are Big 6 = high importance
  if (homeIsBig6 && awayIsBig6) {
    return 9;
  }
  
  // One team is Big 6 = medium importance  
  if (homeIsBig6 || awayIsBig6) {
    return 7;
  }
  
  // Derby matches or rivals (you can expand this)
  const derbies = [
    ['Manchester City FC', 'Manchester United FC'], // Manchester Derby
    ['Arsenal FC', 'Tottenham Hotspur FC'], // North London Derby
    ['Liverpool FC', 'Everton FC'], // Merseyside Derby
    ['Chelsea FC', 'Arsenal FC'], // London rivalry
  ];
  
  const isDerby = derbies.some(([team1, team2]) => 
    (homeTeamName === team1 && awayTeamName === team2) ||
    (homeTeamName === team2 && awayTeamName === team1)
  );
  
  if (isDerby) {
    return 8;
  }
  
  // Default importance for other matches
  return Math.floor(Math.random() * 3) + 4; // Random between 4-6
}

module.exports = async function handler(req, res) {
  try {
    console.log('=== API /matches called ===');
    
    // Set cache headers to cache for 10 minutes
    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=300');
    
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
      
      // Handle rate limiting specifically
      if (response.status === 429) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: 'Football Data API rate limit reached. Please wait and try again.',
          retryAfter: response.headers.get('Retry-After') || '60',
          details: errorText
        });
      }
      
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
      dateTime: match.utcDate, // Your debug component uses this
      status: match.status,
      matchday: match.matchday,
      matchWeek: match.matchday, // Your debug component uses this
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
      competition: {
        id: match.competition?.id || 2021,
        name: match.competition?.name || 'Premier League',
        code: match.competition?.code || 'PL',
        type: match.competition?.type || 'LEAGUE',
        emblem: match.competition?.emblem || '',
        logo: match.competition?.emblem || '' // Your debug component uses this
      },
      // Calculate importance based on team matchups or use a default
      importance: calculateMatchImportance(match)
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