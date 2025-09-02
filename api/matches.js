// api/matches-mock.js (temporary for testing)

module.exports = async function handler(req, res) {
  console.log('=== Using mock data for testing ===');
  
  // Mock data that matches your FixtureService expectations
  const mockMatches = [
    {
      id: 1,
      utcDate: "2025-09-03T15:00:00Z",
      date: "2025-09-03T15:00:00Z",
      status: "SCHEDULED",
      matchday: 4,
      stage: "REGULAR_SEASON",
      homeTeam: {
        id: 57,
        name: "Arsenal FC",
        shortName: "Arsenal",
        tla: "ARS",
        crest: "https://crests.football-data.org/57.png"
      },
      awayTeam: {
        id: 65,
        name: "Manchester City FC",
        shortName: "Man City",
        tla: "MCI",
        crest: "https://crests.football-data.org/65.png"
      },
      score: {
        winner: null,
        duration: "REGULAR",
        fullTime: { home: null, away: null }
      },
      venue: "Emirates Stadium",
      competition: {
        id: 2021,
        name: "Premier League",
        code: "PL",
        type: "LEAGUE",
        emblem: ""
      }
    },
    {
      id: 2,
      utcDate: "2025-09-03T17:30:00Z",
      date: "2025-09-03T17:30:00Z",
      status: "SCHEDULED",
      matchday: 4,
      stage: "REGULAR_SEASON",
      homeTeam: {
        id: 66,
        name: "Manchester United FC",
        shortName: "Man United",
        tla: "MUN",
        crest: "https://crests.football-data.org/66.png"
      },
      awayTeam: {
        id: 61,
        name: "Chelsea FC",
        shortName: "Chelsea",
        tla: "CHE",
        crest: "https://crests.football-data.org/61.png"
      },
      score: {
        winner: null,
        duration: "REGULAR",
        fullTime: { home: null, away: null }
      },
      venue: "Old Trafford",
      competition: {
        id: 2021,
        name: "Premier League",
        code: "PL",
        type: "LEAGUE",
        emblem: ""
      }
    }
  ];

  res.setHeader('Cache-Control', 'public, s-maxage=300');
  res.status(200).json(mockMatches);
};