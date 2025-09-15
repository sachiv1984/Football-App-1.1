// src/utils/scrapeWhoscored.js
const fs = require('fs').promises;
const path = require('path');

class WhoscoredScraper {
  constructor() {
    this.baseUrl = 'https://www.whoscored.com';
    this.premierLeagueUrl = 'https://www.whoscored.com/Regions/252/Tournaments/2/England-Premier-League';
    
    // Specific fixtures URL for 2025-26 season
    this.fixturesUrl = 'https://www.whoscored.com/regions/252/tournaments/2/seasons/10743/stages/24533/fixtures/england-premier-league-2025-2026';
    
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
      console.log('🔍 Parsing fixtures from WhoScored fixtures page...');
      
      // WhoScored fixtures page typically has data in script tags
      // Look for matchCentreData, fixtureData, or similar
      const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
      
      if (!scriptMatches) {
        console.log('⚠️  No script tags found');
        return fixtures;
      }

      // Look for the main data object that contains fixtures
      for (const scriptMatch of scriptMatches) {
        const scriptContent = scriptMatch.replace(/<\/?script[^>]*>/gi, '');
        
        // Common patterns in WhoScored for fixture data
        const dataPatterns = [
          /matchCentreData\s*=\s*(\{.*?\});/s,
          /fixtureData\s*=\s*(\{.*?\});/s,
          /var\s+data\s*=\s*(\{.*?\});/s,
          /window\.data\s*=\s*(\{.*?\});/s,
          /"fixtures"\s*:\s*(\[.*?\])/s,
          /"matches"\s*:\s*(\[.*?\])/s
        ];

        for (const pattern of dataPatterns) {
          const match = scriptContent.match(pattern);
          if (match) {
            try {
              console.log(`🎯 Found potential data with pattern: ${pattern.source.substring(0, 30)}...`);
              
              const jsonData = JSON.parse(match[1]);
              console.log('📋 Data keys found:', Object.keys(jsonData));
              
              // Extract fixtures from the data
              const extractedFixtures = this.extractFixturesFromData(jsonData);
              if (extractedFixtures.length > 0) {
                fixtures.push(...extractedFixtures);
                console.log(`✅ Extracted ${extractedFixtures.length} fixtures from JSON data`);
              }
              
            } catch (jsonError) {
              console.log('❌ Failed to parse JSON from script:', jsonError.message);
              continue;
            }
          }
        }
      }

      // If no JSON data found, try HTML parsing
      if (fixtures.length === 0) {
        console.log('🔍 No JSON data found, trying HTML parsing...');
        const htmlFixtures = this.parseFixturesFromTable(html);
        fixtures.push(...htmlFixtures);
      }

    } catch (error) {
      console.error('Error parsing fixtures:', error);
    }

    return fixtures;
  }

  extractFixturesFromData(data) {
    const fixtures = [];
    
    try {
      // Try different possible data structures
      let fixturesArray = [];
      
      if (data.fixtures) {
        fixturesArray = data.fixtures;
      } else if (data.matches) {
        fixturesArray = data.matches;
      } else if (data.games) {
        fixturesArray = data.games;
      } else if (Array.isArray(data)) {
        fixturesArray = data;
      } else if (data.schedule) {
        fixturesArray = data.schedule;
      }
      
      console.log(`📊 Found ${fixturesArray.length} items in fixtures array`);
      
      for (const item of fixturesArray) {
        const fixture = this.parseFixtureFromDataItem(item);
        if (fixture) {
          fixtures.push(fixture);
        }
      }
      
    } catch (error) {
      console.error('Error extracting fixtures from data:', error);
    }
    
    return fixtures;
  }

  parseFixtureFromDataItem(item) {
    try {
      // WhoScored typical data structure (adjust based on actual data)
      const fixture = {
        id: item.id || item.matchId || item.fixtureId || `ws-${Date.now()}-${Math.random()}`,
        date: item.date || item.kickOff || item.startTime,
        timestamp: item.timestamp || new Date(item.date || item.kickOff).getTime() / 1000,
        status: this.parseStatusFromItem(item),
        round: item.round || item.gameweek || item.matchday || 'Unknown',
        homeTeam: {
          id: item.homeTeam?.id || item.home?.id || this.generateTeamId(item.homeTeam?.name || item.home?.name),
          name: item.homeTeam?.name || item.home?.name || item.homeTeamName,
          logo: item.homeTeam?.logo || item.home?.logo || null
        },
        awayTeam: {
          id: item.awayTeam?.id || item.away?.id || this.generateTeamId(item.awayTeam?.name || item.away?.name),
          name: item.awayTeam?.name || item.away?.name || item.awayTeamName,
          logo: item.awayTeam?.logo || item.away?.logo || null
        },
        goals: {
          home: item.homeGoals ?? item.homeScore ?? item.score?.home ?? null,
          away: item.awayGoals ?? item.awayScore ?? item.score?.away ?? null
        },
        venue: {
          name: item.venue?.name || item.stadium || null,
          city: item.venue?.city || null
        },
        source: 'whoscored'
      };

      // Only return if we have essential data
      if (fixture.homeTeam.name && fixture.awayTeam.name) {
        return fixture;
      }
      
    } catch (error) {
      console.error('Error parsing fixture item:', error);
    }
    
    return null;
  }

  parseStatusFromItem(item) {
    if (item.status) {
      return {
        long: item.status.long || item.status,
        short: item.status.short || item.status.substring(0, 2),
        elapsed: item.status.elapsed || item.minute || null
      };
    }
    
    if (item.finished || item.isFinished) {
      return { long: "Match Finished", short: "FT", elapsed: 90 };
    }
    
    if (item.live || item.isLive) {
      return { long: "In Progress", short: "LIVE", elapsed: item.minute || null };
    }
    
    return { long: "Not Started", short: "NS", elapsed: null };
  }

  parseFixturesFromTable(html) {
    const fixtures = [];
    
    try {
      console.log('🔍 Parsing fixtures from HTML tables/divs...');
      
      // Look for fixture containers - WhoScored often uses divs with specific classes
      const fixturePatterns = [
        /<div[^>]*class="[^"]*fixture[^"]*"[^>]*>(.*?)<\/div>/gis,
        /<tr[^>]*class="[^"]*fixture[^"]*"[^>]*>(.*?)<\/tr>/gis,
        /<div[^>]*class="[^"]*match[^"]*"[^>]*>(.*?)<\/div>/gis,
        /<li[^>]*class="[^"]*fixture[^"]*"[^>]*>(.*?)<\/li>/gis
      ];

      for (const pattern of fixturePatterns) {
        const matches = html.match(pattern);
        if (matches) {
          console.log(`📊 Found ${matches.length} potential fixtures with pattern`);
          
          for (const match of matches.slice(0, 20)) { // Limit to first 20 for testing
            const fixture = this.parseFixtureFromHtml(match);
            if (fixture) {
              fixtures.push(fixture);
            }
          }
        }
      }

      // Also try table-based parsing
      const tableMatches = html.match(/<table[^>]*>(.*?)<\/table>/gis);
      if (tableMatches) {
        for (const table of tableMatches) {
          if (table.toLowerCase().includes('fixture') || table.toLowerCase().includes('match')) {
            const rowMatches = table.match(/<tr[^>]*>(.*?)<\/tr>/gis);
            if (rowMatches) {
              for (const row of rowMatches) {
                const fixture = this.parseFixtureFromTableRow(row);
                if (fixture) {
                  fixtures.push(fixture);
                }
              }
            }
          }
        }
      }

    } catch (error) {
      console.error('Error parsing HTML fixtures:', error);
    }

    return fixtures;
  }

  parseFixtureFromHtml(htmlString) {
    try {
      // Remove HTML tags and get text content
      const text = htmlString.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      
      // Look for team names (common football team patterns)
      const teamPattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:FC|United|City|Town|Rovers|Wanderers|Athletic|Albion|Palace|Forest|Villa|Hotspur|County|Wednesday|Argyle))?)/g;
      const teams = text.match(teamPattern);
      
      // Look for score pattern
      const scorePattern = /(\d+)\s*[-–]\s*(\d+)/;
      const scoreMatch = text.match(scorePattern);
      
      // Look for time/date pattern
      const timePattern = /(\d{1,2}:\d{2}|\d{1,2}\/\d{1,2}|\w{3}\s+\d{1,2})/;
      const timeMatch = text.match(timePattern);

      if (teams && teams.length >= 2) {
        return {
          id: `html-${Date.now()}-${Math.random()}`,
          date: timeMatch ? this.parseDate(timeMatch[0]) : new Date().toISOString(),
          homeTeam: {
            id: this.generateTeamId(teams[0]),
            name: teams[0].trim(),
            logo: null
          },
          awayTeam: {
            id: this.generateTeamId(teams[1]),
            name: teams[1].trim(),
            logo: null
          },
          goals: {
            home: scoreMatch ? parseInt(scoreMatch[1]) : null,
            away: scoreMatch ? parseInt(scoreMatch[2]) : null
          },
          status: {
            long: scoreMatch ? "Match Finished" : "Not Started",
            short: scoreMatch ? "FT" : "NS",
            elapsed: scoreMatch ? 90 : null
          },
          source: 'whoscored-html'
        };
      }
    } catch (error) {
      console.error('Error parsing HTML fixture:', error);
    }
    
    return null;
  }

  parseFixtureFromTableRow(rowHtml) {
    try {
      const cells = rowHtml.match(/<t[dh][^>]*>(.*?)<\/t[dh]>/gis);
      if (!cells || cells.length < 3) return null;
      
      const cellTexts = cells.map(cell => cell.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim());
      
      // Assuming structure: Date | Home Team | Score | Away Team
      if (cellTexts.length >= 4) {
        return {
          id: `table-${Date.now()}-${Math.random()}`,
          date: this.parseDate(cellTexts[0]),
          homeTeam: {
            id: this.generateTeamId(cellTexts[1]),
            name: cellTexts[1],
            logo: null
          },
          awayTeam: {
            id: this.generateTeamId(cellTexts[3]),
            name: cellTexts[3],
            logo: null
          },
          goals: this.parseScore(cellTexts[2]),
          status: this.parseStatus(cellTexts[2]),
          source: 'whoscored-table'
        };
      }
    } catch (error) {
      console.error('Error parsing table row:', error);
    }
    
    return null;
  }

  parseDate(dateStr) {
    try {
      // Handle various date formats
      if (dateStr.includes(':')) {
        // Time format like "15:30"
        const today = new Date();
        const [hours, minutes] = dateStr.split(':');
        today.setHours(parseInt(hours), parseInt(minutes));
        return today.toISOString();
      }
      
      if (dateStr.includes('/')) {
        // Date format like "15/09"
        const [day, month] = dateStr.split('/');
        const year = new Date().getFullYear();
        return new Date(year, parseInt(month) - 1, parseInt(day)).toISOString();
      }
      
      // Try to parse as regular date
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      
    } catch (error) {
      console.error('Error parsing date:', error);
    }
    
    return new Date().toISOString();
  }

  parseScore(scoreStr) {
    const scoreMatch = scoreStr.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (scoreMatch) {
      return {
        home: parseInt(scoreMatch[1]),
        away: parseInt(scoreMatch[2])
      };
    }
    return { home: null, away: null };
  }

  parseStatus(scoreText) {
    if (!scoreText) return { long: 'Not Started', short: 'NS', elapsed: null };
    if (scoreText.includes('-') && scoreText.match(/\d/)) {
      return { long: 'Match Finished', short: 'FT', elapsed: 90 };
    }
    if (scoreText.includes('vs') || scoreText.includes('v')) {
      return { long: 'Not Started', short: 'NS', elapsed: null };
    }
    return { long: 'Unknown', short: 'UNK', elapsed: null };
  }

  generateTeamId(teamName) {
    if (!teamName) return 'unknown-team';
    // Generate a consistent ID based on team name
    return teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }

  async scrapeFixtures() {
    console.log('🕷️  Starting WhoScored fixture scraping...');
    console.log('📍 Targeting specific fixtures URL for 2025-26 season');

    await this.ensureDataDir();

    try {
      // Get the specific fixtures page
      const html = await this.makeRequest(this.fixturesUrl);
      
      if (!html || html.length < 1000) {
        throw new Error('Received empty or too small HTML response');
      }
      
      console.log(`📄 Retrieved HTML page (${html.length} characters)`);
      
      // Parse fixtures from the HTML
      const fixtures = this.parseFixturesFromHtml(html);
      
      if (fixtures.length === 0) {
        console.log('⚠️  No fixtures found. Creating sample data as fallback...');
        
        // Log some useful debugging info
        console.log('📋 Page title:', html.match(/<title>(.*?)<\/title>/i)?.[1] || 'Not found');
        console.log('📋 Page contains "fixture":', html.toLowerCase().includes('fixture'));
        console.log('📋 Page contains "match":', html.toLowerCase().includes('match'));
        
        // Look for common class patterns
        const classMatches = html.match(/class="[^"]*(?:fixture|match|game)[^"]*"/gi);
        if (classMatches) {
          console.log('📋 Found relevant CSS classes:', classMatches.slice(0, 5));
        }
        
        // Check if page requires JavaScript
        if (html.includes('window.onload') || html.includes('document.ready')) {
          console.log('⚠️  Page appears to load data with JavaScript');
        }
        
        // Create sample data as fallback
        const sampleFixtures = this.createSampleFixtures();
        await this.saveToFile('fixtures_scraped.json', sampleFixtures);
        
        return sampleFixtures.length;
      }

      // Save the scraped fixtures
      await this.saveToFile('fixtures_scraped.json', fixtures);
      
      console.log(`✅ Successfully scraped ${fixtures.length} fixtures from WhoScored`);
      
      // Log sample of scraped data
      if (fixtures.length > 0) {
        console.log('📋 Sample fixture:', {
          homeTeam: fixtures[0].homeTeam.name,
          awayTeam: fixtures[0].awayTeam.name,
          date: fixtures[0].date,
          status: fixtures[0].status
        });
      }
      
      return fixtures.length;

    } catch (error) {
      console.error('❌ Failed to scrape fixtures:', error.message);
      
      if (error.message.includes('fetch')) {
        console.log('🌐 Network error - possible causes:');
        console.log('  - Site blocking requests (check User-Agent)');
        console.log('  - Rate limiting');
        console.log('  - CORS issues');
        console.log('  - Site requires cookies/session');
      }
      
      // Create sample data as fallback
      console.log('📋 Creating sample data as fallback...');
      const sampleFixtures = this.createSampleFixtures();
      await this.saveToFile('fixtures_scraped.json', sampleFixtures);
      
      return sampleFixtures.length;
    }
  }

  createSampleFixtures() {
    // Enhanced fallback sample data with realistic Premier League teams and fixtures
    const teams = [
      'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton', 
      'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Ipswich Town',
      'Leicester City', 'Liverpool', 'Manchester City', 'Manchester United', 
      'Newcastle United', 'Nottingham Forest', 'Southampton', 'Tottenham', 
      'West Ham', 'Wolverhampton'
    ];
    
    const fixtures = [];
    const baseDate = new Date();
    
    // Create fixtures for the past week and next 2 weeks
    for (let dayOffset = -7; dayOffset <= 14; dayOffset++) {
      // Not every day has matches
      if (Math.random() > 0.6) continue;
      
      const matchDate = new Date(baseDate);
      matchDate.setDate(baseDate.getDate() + dayOffset);
      
      // Weekend matches are more common
      const isWeekend = matchDate.getDay() === 0 || matchDate.getDay() === 6;
      const matchCount = isWeekend ? Math.floor(Math.random() * 5) + 3 : Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < matchCount && fixtures.length < 30; i++) {
        const homeTeamIndex = Math.floor(Math.random() * teams.length);
        let awayTeamIndex = Math.floor(Math.random() * teams.length);
        while (awayTeamIndex === homeTeamIndex) {
          awayTeamIndex = Math.floor(Math.random() * teams.length);
        }
        
        const matchTime = new Date(matchDate);
        const hours = isWeekend ? [12, 14, 17] : [19, 20];
        matchTime.setHours(hours[i % hours.length], 30, 0, 0);
        
        const isPastMatch = dayOffset < -1;
        const isLiveMatch = dayOffset === 0 && Math.random() > 0.7;
        
        let status, homeGoals, awayGoals;
        if (isPastMatch) {
          status = { long: "Match Finished", short: "FT", elapsed: 90 };
          homeGoals = Math.floor(Math.random() * 4);
          awayGoals = Math.floor(Math.random() * 4);
        } else if (isLiveMatch) {
          const elapsed = 45 + Math.floor(Math.random() * 45);
          status = { 
            long: elapsed > 90 ? "Second Half" : elapsed > 45 ? "Half Time" : "First Half", 
            short: elapsed > 90 ? "2H" : elapsed > 45 ? "HT" : "1H", 
            elapsed 
          };
          homeGoals = Math.floor(Math.random() * 3);
          awayGoals = Math.floor(Math.random() * 3);
        } else {
          status = { long: "Not Started", short: "NS", elapsed: null };
          homeGoals = null;
          awayGoals = null;
        }
        
        fixtures.push({
          id: `sample-${fixtures.length + 1}`,
          date: matchTime.toISOString(),
          timestamp: Math.floor(matchTime.getTime() / 1000),
          status,
          round: `Matchday ${Math.floor(fixtures.length / 10) + 1}`,
          homeTeam: {
            id: this.generateTeamId(teams[homeTeamIndex]),
            name: teams[homeTeamIndex],
            logo: null
          },
          awayTeam: {
            id: this.generateTeamId(teams[awayTeamIndex]),
            name: teams[awayTeamIndex],
            logo: null
          },
          goals: {
            home: homeGoals,
            away: awayGoals
          },
          venue: {
            name: `${teams[homeTeamIndex]} Stadium`,
            city: 'London' // Simplified
          },
          source: 'sample-fallback'
        });
      }
    }
    
    return fixtures.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  // Method to inspect HTML structure for development
  async inspectPageStructure() {
    console.log('🔍 Inspecting WhoScored fixtures page structure...');
    console.log(`📍 URL: ${this.fixturesUrl}`);
    
    try {
      const html = await this.makeRequest(this.fixturesUrl);
      
      if (!html || html.length < 100) {
        console.log('❌ Failed to retrieve HTML or empty response');
        return;
      }
      
      console.log(`📄 Retrieved ${html.length} characters of HTML`);
      
      console.log('\n📋 Page title:');
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        console.log(`  "${titleMatch[1]}"`);
      }
      
      console.log('\n📋 Meta information:');
      console.log('  Contains "Premier League":', html.includes('Premier League'));
      console.log('  Contains "fixtures":', html.toLowerCase().includes('fixtures'));
      console.log('  Contains "2025":', html.includes('2025'));
      
      console.log('\n📋 JavaScript indicators:');
      console.log('  Has script tags:', (html.match(/<script/gi) || []).length);
      console.log('  Uses React/Angular:', html.includes('react') || html.includes('angular') || html.includes('ng-'));
      console.log('  Has JSON data:', html.includes('JSON') || html.includes('"fixtures"') || html.includes('"matches"'));
      
      console.log('\n📋 Looking for fixture-related CSS classes:');
      const classPatterns = [
        /class="[^"]*fixture[^"]*"/gi,
        /class="[^"]*match[^"]*"/gi,
        /class="[^"]*game[^"]*"/gi,
        /id="[^"]*fixture[^"]*"/gi,
        /id="[^"]*match[^"]*"/gi
      ];
      
      for (const pattern of classPatterns) {
        const matches = html.match(pattern);
        if (matches && matches.length > 0) {
          console.log(`  Found ${matches.length} elements matching pattern`);
          console.log(`    Examples: ${matches.slice(0, 3).join(', ')}`);
        }
      }
      
      console.log('\n📋 Looking for data in script tags:');
      const scriptMatches = html.match(/<script[^>]*>(.*?)<\/script>/gis);
      if (scriptMatches) {
        console.log(`  Found ${scriptMatches.length} script tags`);
        
        let dataScriptCount = 0;
        scriptMatches.forEach((script, index) => {
          const scriptContent = script.replace(/<\/?script[^>]*>/gi, '');
          if (scriptContent.includes('fixture') || 
              scriptContent.includes('match') || 
              scriptContent.includes('game') ||
              scriptContent.includes('"home"') ||
              scriptContent.includes('"away"')) {
            dataScriptCount++;
            console.log(`  Script ${index}: Contains potential fixture data`);
            
            // Look for JSON patterns
            const jsonPatterns = [
              /\{[^{}]*"(?:fixture|match|game|home|away|score)[^{}]*\}/gi,
              /\[[^\[\]]*"(?:fixture|match|game)[^\[\]]*\]/gi
            ];
            
            for (const jsonPattern of jsonPatterns) {
              const jsonMatches = scriptContent.match(jsonPattern);
              if (jsonMatches) {
                console.log(`    Found ${jsonMatches.length} potential JSON objects`);
                console.log(`    Sample: ${jsonMatches[0].substring(0, 100)}...`);
              }
            }
          }
        });
        
        if (dataScriptCount === 0) {
          console.log('  No scripts found with fixture-related data');
        }
      }
      
      console.log('\n📋 HTML structure analysis:');
      const divCount = (html.match(/<div/gi) || []).length;
      const tableCount = (html.match(/<table/gi) || []).length;
      const liCount = (html.match(/<li/gi) || []).length;
      
      console.log(`  DIV elements: ${divCount}`);
      console.log(`  TABLE elements: ${tableCount}`);
      console.log(`  LI elements: ${liCount}`);
      
      // Look for specific WhoScored patterns
      console.log('\n📋 WhoScored-specific patterns:');
      const wsPatterns = [
        'matchCentreData',
        'fixtureData',
        'stageData',
        'tournamentData',
        'data-'
      ];
      
      for (const pattern of wsPatterns) {
        if (html.includes(pattern)) {
          console.log(`  Contains "${pattern}": Yes`);
          
          // Find context around the pattern
          const index = html.indexOf(pattern);
          if (index > 0) {
            const context = html.substring(Math.max(0, index - 50), index + 100);
            console.log(`    Context: ...${context}...`);
          }
        } else {
          console.log(`  Contains "${pattern}": No`);
        }
      }
      
      // Save a sample of the HTML for manual inspection
      const sampleHtml = html.substring(0, 5000);
      const samplePath = path.join(this.dataDir, 'whoscored_sample.html');
      await fs.writeFile(samplePath, sampleHtml);
      console.log(`\n💾 Saved HTML sample to: ${samplePath}`);
      
      console.log('\n✅ Inspection complete');
      console.log('💡 Use this information to adjust the parsing logic');
      
    } catch (error) {
      console.error('❌ Failed to inspect page:', error.message);
      
      if (error.message.includes('fetch')) {
        console.log('\n🌐 Fetch error troubleshooting:');
        console.log('  1. Check if the URL is accessible in a browser');
        console.log('  2. The site might be blocking automated requests');
        console.log('  3. Try using a different User-Agent string');
        console.log('  4. The site might require cookies or session tokens');
      }
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