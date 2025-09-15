// src/utils/scrapeWhoscored.js
const fs = require('fs').promises;
const path = require('path');

class WhoscoredScraper {
  constructor() {
    this.baseUrl = 'https://www.whoscored.com';
    this.premierLeagueUrl = 'https://www.whoscored.com/Regions/252/Tournaments/2/England-Premier-League';
    this.dataDir = path.join(process.cwd(), 'public', 'data');
    
    // Headers to mimic a real browser
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  async makeRequest(url) {
    console.log(`🔄 Fetching: ${url}`);
    
    try {
      const response = await fetch(url, {
        headers: this.headers,
        timeout: 10000
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`✅ Successfully fetched ${html.length} characters`);
      
      // Add delay to be respectful
      await this.delay(1000);
      
      return html;
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error.message);
      throw error;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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
      source: 'whoscored.com',
      note: 'Data scraped from WhoScored.com'
    };
    
    await fs.writeFile(filepath, JSON.stringify(jsonData, null, 2));
    console.log(`💾 Saved ${filename} (${data.length || 0} items)`);
  }

  parseFixturesFromHtml(html) {
    const fixtures = [];
    
    try {
      // WhoScored uses JavaScript to load data, but we can extract from script tags
      // Look for fixture data in script tags
      const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
      
      if (!scriptMatches) {
        console.log('⚠️  No script tags found');
        return fixtures;
      }

      for (const scriptMatch of scriptMatches) {
        // Look for fixture data patterns
        if (scriptMatch.includes('matchCentreData') || scriptMatch.includes('fixtureData') || scriptMatch.includes('matches')) {
          console.log('🔍 Found potential fixture data in script tag');
          
          // Try to extract JSON data
          const jsonMatches = scriptMatch.match(/(\{[^{}]*"(?:fixture|match|game)s?"[^{}]*\})/gi);
          
          if (jsonMatches) {
            for (const jsonMatch of jsonMatches) {
              try {
                const data = JSON.parse(jsonMatch);
                console.log('📋 Parsed JSON data:', Object.keys(data));
              } catch (e) {
                // Continue if JSON parsing fails
              }
            }
          }
        }
      }

      // Alternative approach: Look for table data
      console.log('🔍 Looking for fixture table data...');
      
      // WhoScored typically has fixture data in tables or divs
      // This is a simplified parser - you'd need to inspect the actual HTML structure
      const tableMatches = html.match(/<table[^>]*class="[^"]*fixture[^"]*"[^>]*>(.*?)<\/table>/gis);
      
      if (tableMatches) {
        console.log(`📊 Found ${tableMatches.length} fixture table(s)`);
        
        for (const table of tableMatches) {
          // Parse table rows
          const rowMatches = table.match(/<tr[^>]*>(.*?)<\/tr>/gis);
          
          if (rowMatches) {
            for (const row of rowMatches) {
              // Extract team names, scores, dates, etc.
              const cellMatches = row.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gis);
              
              if (cellMatches && cellMatches.length >= 3) {
                // This is a simplified example - actual parsing would be more complex
                const fixture = this.parseFixtureRow(cellMatches);
                if (fixture) {
                  fixtures.push(fixture);
                }
              }
            }
          }
        }
      }

      // Look for div-based fixture data (modern websites often use divs instead of tables)
      const fixtureMatches = html.match(/<div[^>]*class="[^"]*(?:fixture|match|game)[^"]*"[^>]*>(.*?)<\/div>/gis);
      
      if (fixtureMatches) {
        console.log(`🎯 Found ${fixtureMatches.length} fixture div(s)`);
        
        for (const fixtureDiv of fixtureMatches.slice(0, 10)) { // Limit to first 10 for testing
          const fixture = this.parseFixtureDiv(fixtureDiv);
          if (fixture) {
            fixtures.push(fixture);
          }
        }
      }

    } catch (error) {
      console.error('Error parsing fixtures:', error);
    }

    return fixtures;
  }

  parseFixtureRow(cells) {
    try {
      // This is a template - you'd need to adjust based on actual HTML structure
      const dateCell = cells[0]?.replace(/<[^>]*>/g, '').trim();
      const homeTeamCell = cells[1]?.replace(/<[^>]*>/g, '').trim();
      const scoreCell = cells[2]?.replace(/<[^>]*>/g, '').trim();
      const awayTeamCell = cells[3]?.replace(/<[^>]*>/g, '').trim();

      if (homeTeamCell && awayTeamCell) {
        return {
          id: Date.now() + Math.random(), // Generate unique ID
          date: dateCell || new Date().toISOString(),
          homeTeam: {
            name: homeTeamCell,
            id: this.generateTeamId(homeTeamCell)
          },
          awayTeam: {
            name: awayTeamCell,
            id: this.generateTeamId(awayTeamCell)
          },
          score: scoreCell,
          status: this.parseStatus(scoreCell),
          source: 'whoscored'
        };
      }
    } catch (error) {
      console.error('Error parsing fixture row:', error);
    }
    
    return null;
  }

  parseFixtureDiv(divHtml) {
    try {
      // Extract text content
      const text = divHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Look for team name patterns
      const teamPattern = /([A-Za-z\s]+(?:FC|United|City|Town|Rovers|Wanderers|Athletic|Albion|Palace|Forest|Villa|Hotspur)?)/g;
      const teams = text.match(teamPattern);
      
      // Look for score patterns
      const scorePattern = /(\d+)\s*[-:]\s*(\d+)/;
      const scoreMatch = text.match(scorePattern);
      
      // Look for date patterns
      const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}\s+\w{3}\s+\d{2,4})/;
      const dateMatch = text.match(datePattern);

      if (teams && teams.length >= 2) {
        return {
          id: Date.now() + Math.random(),
          date: dateMatch ? dateMatch[0] : new Date().toISOString(),
          homeTeam: {
            name: teams[0].trim(),
            id: this.generateTeamId(teams[0].trim())
          },
          awayTeam: {
            name: teams[1].trim(),
            id: this.generateTeamId(teams[1].trim())
          },
          score: scoreMatch ? `${scoreMatch[1]}-${scoreMatch[2]}` : null,
          status: scoreMatch ? 'FT' : 'Scheduled',
          source: 'whoscored'
        };
      }
    } catch (error) {
      console.error('Error parsing fixture div:', error);
    }
    
    return null;
  }

  generateTeamId(teamName) {
    // Generate a consistent ID based on team name
    return teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  parseStatus(scoreText) {
    if (!scoreText) return 'Scheduled';
    if (scoreText.includes('-') && scoreText.match(/\d/)) return 'FT';
    if (scoreText.includes('vs') || scoreText.includes('v')) return 'Scheduled';
    return 'Unknown';
  }

  async scrapeFixtures() {
    console.log('🕷️  Starting WhoScored fixture scraping...');
    console.log('⚠️  Note: This is experimental and may need adjustments based on site structure');

    await this.ensureDataDir();

    try {
      // Get the main Premier League page
      const html = await this.makeRequest(this.premierLeagueUrl);
      
      // Parse fixtures from the HTML
      const fixtures = this.parseFixturesFromHtml(html);
      
      if (fixtures.length === 0) {
        console.log('⚠️  No fixtures found. The website structure may have changed.');
        console.log('📋 HTML sample (first 500 chars):');
        console.log(html.substring(0, 500));
        
        // Create sample data as fallback
        const sampleFixtures = this.createSampleFixtures();
        await this.saveToFile('fixtures_scraped.json', sampleFixtures);
        
        return sampleFixtures.length;
      }

      // Save the scraped fixtures
      await this.saveToFile('fixtures_scraped.json', fixtures);
      
      console.log(`✅ Scraped ${fixtures.length} fixtures from WhoScored`);
      return fixtures.length;

    } catch (error) {
      console.error('❌ Failed to scrape fixtures:', error);
      
      // Create sample data as fallback
      console.log('📋 Creating sample data as fallback...');
      const sampleFixtures = this.createSampleFixtures();
      await this.saveToFile('fixtures_scraped.json', sampleFixtures);
      
      return sampleFixtures.length;
    }
  }

  createSampleFixtures() {
    // Fallback sample data if scraping fails
    const teams = ['Arsenal', 'Chelsea', 'Liverpool', 'Man City', 'Man United', 'Tottenham'];
    const fixtures = [];
    
    for (let i = 0; i < 6; i++) {
      const homeTeam = teams[i % teams.length];
      const awayTeam = teams[(i + 1) % teams.length];
      
      fixtures.push({
        id: 'sample-' + i,
        date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
        homeTeam: {
          name: homeTeam,
          id: this.generateTeamId(homeTeam)
        },
        awayTeam: {
          name: awayTeam,
          id: this.generateTeamId(awayTeam)
        },
        score: i < 3 ? `${Math.floor(Math.random() * 3)}-${Math.floor(Math.random() * 3)}` : null,
        status: i < 3 ? 'FT' : 'Scheduled',
        source: 'sample-fallback'
      });
    }
    
    return fixtures;
  }

  // Method to inspect HTML structure for development
  async inspectPageStructure() {
    console.log('🔍 Inspecting WhoScored page structure...');
    
    try {
      const html = await this.makeRequest(this.premierLeagueUrl);
      
      console.log('\n📋 Page title:');
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        console.log(titleMatch[1]);
      }
      
      console.log('\n📋 Looking for fixture-related elements:');
      
      // Look for common fixture-related class names
      const classPatterns = [
        /class="[^"]*fixture[^"]*"/gi,
        /class="[^"]*match[^"]*"/gi,
        /class="[^"]*game[^"]*"/gi,
        /class="[^"]*calendar[^"]*"/gi
      ];
      
      for (const pattern of classPatterns) {
        const matches = html.match(pattern);
        if (matches) {
          console.log(`Found ${matches.length} elements with pattern ${pattern.source}:`);
          matches.slice(0, 5).forEach(match => console.log('  -', match));
        }
      }
      
      console.log('\n📋 Script tags with potential data:');
      const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
      if (scriptMatches) {
        scriptMatches.forEach((script, index) => {
          if (script.includes('fixture') || script.includes('match') || script.includes('game')) {
            console.log(`Script ${index}: Contains fixture-related data`);
            console.log(script.substring(0, 200) + '...');
          }
        });
      }
      
    } catch (error) {
      console.error('❌ Failed to inspect page:', error);
    }
  }
}

// CLI usage
if (require.main === module) {
  const scraper = new WhoscoredScraper();
  const command = process.argv[2] || 'fixtures';

  (async () => {
    try {
      switch (command) {
        case 'inspect':
          await scraper.inspectPageStructure();
          break;
        case 'fixtures':
        default:
          await scraper.scrapeFixtures();
          break;
      }
    } catch (error) {
      console.error('Script failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = WhoscoredScraper;
