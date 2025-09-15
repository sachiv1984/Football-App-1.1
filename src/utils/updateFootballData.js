// scripts/updateFootballData.js
const fs = require('fs').promises;
const path = require('path');

class ApiFootballUpdater {
  constructor() {
    this.apiKey = process.env.FOOTBALL_API_KEY;
    this.baseUrl = 'https://v3.football.api-sports.io';
    this.leagueId = 39; // Premier League
    this.season = new Date().getFullYear();
    this.dataDir = path.join(process.cwd(), 'public', 'data');
  }

  async makeApiCall(endpoint, params = {}) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log(`🔄 API Call: ${endpoint} - ${JSON.stringify(params)}`);
    
    const response = await fetch(url.toString(), {
      headers: {
        'X-RapidAPI-Key': this.apiKey,
        'X-RapidAPI-Host': 'v3.football.api-sports.io'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ API Response: ${data.response?.length || 0} items`);
    return data;
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (err) {
      console.error('Error creating data directory:', err);
    }
  }

  async saveToFile(filename, data) {
    const filepath = path.join(this.dataDir, filename);
    const jsonData = {
      data,
      lastUpdated: new Date().toISOString(),
      source: 'api-football.com'
    };
    
    await fs.writeFile(filepath, JSON.stringify(jsonData, null, 2));
    console.log(`💾 Saved ${filename}`);
  }

  async updateFixtures() {
    try {
      // Get current fixtures (last 7 days + next 14 days)
      const from = new Date();
      from.setDate(from.getDate() - 7);
      const to = new Date();
      to.setDate(to.getDate() + 14);

      const fixtures = await this.makeApiCall('/fixtures', {
        league: this.leagueId,
        season: this.season,
        from: from.toISOString().split('T')[0],
        to: to.toISOString().split('T')[0]
      });

      const transformedFixtures = fixtures.response.map(match => ({
        id: match.fixture.id,
        date: match.fixture.date,
        timestamp: match.fixture.timestamp,
        status: {
          long: match.fixture.status.long,
          short: match.fixture.status.short,
          elapsed: match.fixture.status.elapsed
        },
        round: match.league.round,
        homeTeam: {
          id: match.teams.home.id,
          name: match.teams.home.name,
          logo: match.teams.home.logo
        },
        awayTeam: {
          id: match.teams.away.id,
          name: match.teams.away.name,
          logo: match.teams.away.logo
        },
        goals: {
          home: match.goals.home,
          away: match.goals.away
        },
        venue: {
          name: match.fixture.venue?.name,
          city: match.fixture.venue?.city
        },
        league: {
          id: match.league.id,
          name: match.league.name,
          logo: match.league.logo
        }
      }));

      await this.saveToFile('fixtures.json', transformedFixtures);
      return transformedFixtures.length;
    } catch (error) {
      console.error('Error updating fixtures:', error);
      throw error;
    }
  }

  async updateStandings() {
    try {
      const standings = await this.makeApiCall('/standings', {
        league: this.leagueId,
        season: this.season
      });

      const transformedStandings = standings.response[0]?.league?.standings[0]?.map(team => ({
        position: team.rank,
        team: {
          id: team.team.id,
          name: team.team.name,
          logo: team.team.logo
        },
        points: team.points,
        playedGames: team.all.played,
        won: team.all.win,
        draw: team.all.draw,
        lost: team.all.lose,
        goalsFor: team.all.goals.for,
        goalsAgainst: team.all.goals.against,
        goalDifference: team.goalsDiff,
        form: team.form?.split('').slice(-5) || [] // Last 5 games
      })) || [];

      await this.saveToFile('standings.json', transformedStandings);
      return transformedStandings.length;
    } catch (error) {
      console.error('Error updating standings:', error);
      throw error;
    }
  }

  async updateTeams() {
    try {
      const teams = await this.makeApiCall('/teams', {
        league: this.leagueId,
        season: this.season
      });

      const transformedTeams = teams.response.map(item => ({
        id: item.team.id,
        name: item.team.name,
        code: item.team.code,
        founded: item.team.founded,
        logo: item.team.logo,
        venue: {
          name: item.venue?.name,
          address: item.venue?.address,
          city: item.venue?.city,
          capacity: item.venue?.capacity,
          surface: item.venue?.surface,
          image: item.venue?.image
        }
      }));

      await this.saveToFile('teams.json', transformedTeams);
      return transformedTeams.length;
    } catch (error) {
      console.error('Error updating teams:', error);
      throw error;
    }
  }

  async updateAll() {
    console.log('🚀 Starting football data update...');
    
    await this.ensureDataDir();
    
    let totalApiCalls = 0;
    const results = {};

    try {
      // Update fixtures (1 API call)
      results.fixtures = await this.updateFixtures();
      totalApiCalls++;

      // Update standings (1 API call)  
      results.standings = await this.updateStandings();
      totalApiCalls++;

      // Update teams (1 API call)
      results.teams = await this.updateTeams();
      totalApiCalls++;

      // Save metadata
      await this.saveToFile('_metadata.json', {
        lastFullUpdate: new Date().toISOString(),
        apiCallsUsed: totalApiCalls,
        results
      });

      console.log(`✅ Update complete! Used ${totalApiCalls} API calls`);
      console.log(`📊 Results:`, results);
      
      return results;
    } catch (error) {
      console.error('❌ Update failed:', error);
      throw error;
    }
  }

  // Quick update for just fixtures (during match days)
  async updateFixturesOnly() {
    console.log('🔄 Quick fixtures update...');
    await this.ensureDataDir();
    
    try {
      const count = await this.updateFixtures();
      
      // Update metadata
      const metadataPath = path.join(this.dataDir, '_metadata.json');
      let metadata = {};
      try {
        const existing = await fs.readFile(metadataPath, 'utf8');
        metadata = JSON.parse(existing).data || {};
      } catch (e) {
        // File doesn't exist, create new
      }

      metadata.lastFixturesUpdate = new Date().toISOString();
      await this.saveToFile('_metadata.json', metadata);
      
      console.log(`✅ Quick update complete! Updated ${count} fixtures`);
      return count;
    } catch (error) {
      console.error('❌ Quick update failed:', error);
      throw error;
    }
  }
}

// CLI usage
if (require.main === module) {
  const updater = new ApiFootballUpdater();
  const command = process.argv[2] || 'all';

  (async () => {
    try {
      switch (command) {
        case 'fixtures':
          await updater.updateFixturesOnly();
          break;
        case 'all':
        default:
          await updater.updateAll();
          break;
      }
    } catch (error) {
      console.error('Script failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = ApiFootballUpdater;
