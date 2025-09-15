// src/utils/updateFootballData.js
require('dotenv').config(); // Add this line at the top
const fs = require('fs').promises;
const path = require('path');

class ApiFootballUpdater {
  constructor() {
    this.apiKey = process.env.FOOTBALL_API_KEY;
    
    // The API might be accessed through different URLs depending on subscription
    // Try these in order: RapidAPI -> Direct API-Sports
    this.possibleConfigs = [
      {
        name: 'RapidAPI',
        baseUrl: 'https://v3.football.api-sports.io',
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'v3.football.api-sports.io'
        }
      },
      {
        name: 'Direct API-Sports',
        baseUrl: 'https://api.api-sports.io/football',
        headers: {
          'x-apisports-key': this.apiKey
        }
      },
      {
        name: 'API-Football Direct',
        baseUrl: 'https://v3.api-football.com',
        headers: {
          'X-API-KEY': this.apiKey
        }
      }
    ];
    
    this.currentConfig = this.possibleConfigs[0]; // Start with RapidAPI
    this.leagueId = 39; // Premier League
    this.season = 2025; // Explicit for 25/26 season
    this.dataDir = path.join(process.cwd(), 'public', 'data');
  }

  // Test different API configurations to find the working one
  async findWorkingApiConfig() {
    console.log('🔍 Testing different API configurations...');
    
    for (let i = 0; i < this.possibleConfigs.length; i++) {
      const config = this.possibleConfigs[i];
      console.log(`\n${i + 1}. Testing ${config.name}...`);
      
      this.currentConfig = config;
      
      try {
        // Test with a simple status or leagues call
        let testData;
        try {
          // Try status endpoint first
          testData = await this.makeApiCall('/status');
        } catch (statusError) {
          // If status fails, try leagues endpoint
          testData = await this.makeApiCall('/leagues', { id: this.leagueId });
        }
        
        if (testData && testData.response !== undefined) {
          console.log(`✅ ${config.name} is working!`);
          return true;
        }
      } catch (error) {
        console.log(`❌ ${config.name} failed:`, error.message.split('-')[0].trim());
        continue;
      }
    }
    
    console.log('❌ No working API configuration found');
    return false;
  }

  async makeApiCall(endpoint, params = {}) {
    const url = new URL(`${this.currentConfig.baseUrl}${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    console.log(`🔄 API Call: ${this.currentConfig.name} - ${endpoint} - ${JSON.stringify(params)}`);
    
    // Add error handling for missing API key
    if (!this.apiKey) {
      throw new Error('FOOTBALL_API_KEY is not set in environment variables');
    }
    
    const response = await fetch(url.toString(), {
      headers: this.currentConfig.headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      console.error(`❌ Response: ${errorText}`);
      throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    // Enhanced logging to debug API responses
    console.log(`✅ API Response: ${data.response?.length || 0} items`);
    if (data.response?.length === 0) {
      console.log(`⚠️  Empty response for ${endpoint} with params:`, params);
      console.log(`📋 Full API response:`, JSON.stringify(data, null, 2));
    }
    
    return data;
  }

  async ensureDataDir() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      console.log(`📁 Data directory ready: ${this.dataDir}`);
    } catch (err) {
      console.error('Error creating data directory:', err);
    }
  }

  async saveToFile(filename, data) {
    const filepath = path.join(this.dataDir, filename);
    const jsonData = {
      data,
      lastUpdated: new Date().toISOString(),
      source: 'api-football.com',
      season: this.season
    };
    
    await fs.writeFile(filepath, JSON.stringify(jsonData, null, 2));
    console.log(`💾 Saved ${filename} (${data.length || 0} items)`);
  }

  async updateFixtures() {
    try {
      console.log(`🏆 Fetching fixtures for season ${this.season}`);
      
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
      console.log(`📊 Fetching standings for season ${this.season}`);
      
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
      console.log(`⚽ Fetching teams for season ${this.season}`);
      
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

  // Test method to verify API connection and debug issues
  async testApiConnection() {
    console.log('🔍 Testing API connection...');
    console.log(`Using season: ${this.season}`);
    console.log(`League ID: ${this.leagueId}`);
    console.log(`API Key present: ${this.apiKey ? 'Yes' : 'No'}`);
    
    // First, find working API configuration
    const configWorking = await this.findWorkingApiConfig();
    if (!configWorking) {
      console.log('\n❌ Could not find a working API configuration. Please check:');
      console.log('   1. Your API key is valid');
      console.log('   2. Your subscription is active');
      console.log('   3. You haven\'t exceeded quota limits');
      return false;
    }
    
    try {
      console.log(`\n✅ Using ${this.currentConfig.name} configuration`);
      
      // 1. Test leagues endpoint to verify Premier League exists
      console.log('\n1️⃣ Testing Premier League availability...');
      const leagues = await this.makeApiCall('/leagues', {
        id: this.leagueId
      });
      
      if (leagues.response && leagues.response.length > 0) {
        const league = leagues.response[0];
        console.log('🏆 Premier League found:', league.league.name);
        
        if (league.seasons) {
          const availableSeasons = league.seasons.map(s => s.year).sort();
          console.log('Available seasons:', availableSeasons);
          
          const currentSeasonExists = league.seasons.some(s => s.year === this.season);
          console.log(`Season ${this.season} available:`, currentSeasonExists ? '✅ Yes' : '❌ No');
          
          if (!currentSeasonExists && availableSeasons.length > 0) {
            const latestSeason = Math.max(...availableSeasons);
            console.log(`⚠️  Consider using season ${latestSeason} instead`);
          }
        }
      } else {
        console.log('❌ Premier League not found with ID', this.leagueId);
        return false;
      }
      
      // 2. Test current season specifically
      console.log(`\n2️⃣ Testing season ${this.season} specifically...`);
      const currentSeasonLeagues = await this.makeApiCall('/leagues', {
        id: this.leagueId,
        season: this.season
      });
      
      if (currentSeasonLeagues.response && currentSeasonLeagues.response.length > 0) {
        console.log(`✅ Season ${this.season} is available and active`);
      } else {
        console.log(`❌ Season ${this.season} not available or not active yet`);
        
        // Try without season filter to see what's available
        console.log('\n3️⃣ Checking what seasons are currently active...');
        const currentLeagues = await this.makeApiCall('/leagues', {
          id: this.leagueId,
          current: true
        });
        
        if (currentLeagues.response && currentLeagues.response.length > 0) {
          const currentSeason = currentLeagues.response[0].seasons?.[0];
          if (currentSeason) {
            console.log(`Current active season: ${currentSeason.year}`);
            console.log(`Season dates: ${currentSeason.start} to ${currentSeason.end}`);
            console.log(`Status: ${currentSeason.current ? 'Active' : 'Inactive'}`);
          }
        }
      }
      
      // 3. Test teams for current season
      console.log(`\n4️⃣ Testing teams for season ${this.season}...`);
      const teams = await this.makeApiCall('/teams', {
        league: this.leagueId,
        season: this.season
      });
      console.log(`Teams found: ${teams.response?.length || 0}`);
      if (teams.response?.length > 0) {
        console.log('Sample teams:', teams.response.slice(0, 3).map(t => t.team.name).join(', '));
      }
      
      // 4. Test fixtures for current season
      console.log(`\n5️⃣ Testing fixtures for season ${this.season}...`);
      const allFixtures = await this.makeApiCall('/fixtures', {
        league: this.leagueId,
        season: this.season
      });
      console.log(`Total fixtures for season: ${allFixtures.response?.length || 0}`);
      
      if (allFixtures.response?.length > 0) {
        const sampleFixture = allFixtures.response[0];
        console.log('Sample fixture:', {
          date: sampleFixture.fixture.date,
          teams: `${sampleFixture.teams.home.name} vs ${sampleFixture.teams.away.name}`,
          status: sampleFixture.fixture.status.long
        });
      }
      
      return true;
    } catch (error) {
      console.error('❌ API connection test failed:', error.message);
      
      // Check if it's an authentication error
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('\n🔑 This looks like an API key issue. Please verify:');
        console.log('   - Your API key is correct');
        console.log('   - Your API key has the right permissions');
        console.log('   - You haven\'t exceeded your quota');
      }
      
      return false;
    }
  }

  async updateAll() {
    console.log('🚀 Starting football data update...');
    console.log(`📅 Using season: ${this.season}`);
    
    // First ensure we have a working API configuration
    const configWorking = await this.findWorkingApiConfig();
    if (!configWorking) {
      throw new Error('No working API configuration found');
    }
    
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
        season: this.season,
        apiConfig: this.currentConfig.name,
        apiCallsUsed: totalApiCalls,
        results
      });

      console.log(`✅ Update complete! Used ${totalApiCalls} API calls`);
      console.log(`🔧 Using API: ${this.currentConfig.name}`);
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
      metadata.season = this.season;
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
        case 'test':
          await updater.testApiConnection();
          break;
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