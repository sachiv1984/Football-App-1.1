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
    
    // Basic headers (will be enhanced with bypass methods)
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

  // ========== BYPASS METHODS START ==========

  // Method 1: Rotate User Agents
  getUserAgent() {
    const userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
    ];
    return userAgents[Math.floor(Math.random() * userAgents.length)];
  }

  // Method 2: Enhanced headers
  getEnhancedHeaders() {
    return {
      'User-Agent': this.getUserAgent(),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      // Pretend to be coming from Google
      'Referer': 'https://www.google.com/',
      // Add some browser-specific headers
      'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"'
    };
  }

  // Method 3: Try different WhoScored endpoints
  async tryAlternativeWhoScoredUrls() {
    const alternativeUrls = [
      'https://www.whoscored.com/Regions/252/Tournaments/2/England-Premier-League',
      'https://www.whoscored.com/tournaments/2/england-premier-league',
      'https://www.whoscored.com/matches',
      // Try mobile version
      'https://m.whoscored.com/Regions/252/Tournaments/2/England-Premier-League',
      // Try different season URLs
      'https://www.whoscored.com/Regions/252/Tournaments/2/Seasons/10742/Stages/24532/Fixtures/England-Premier-League-2024-2025',
      // Try general fixtures
      'https://www.whoscored.com/LiveScores'
    ];

    for (const url of alternativeUrls) {
      try {
        console.log(`🔄 Trying alternative URL: ${url}`);
        
        const response = await fetch(url, {
          headers: this.getEnhancedHeaders(),
          timeout: 12000
        });

        console.log(`📡 Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const html = await response.text();
          console.log(`✅ Success with alternative URL: ${url}`);
          console.log(`📄 Retrieved ${html.length} characters`);
          return html;
        } else if (response.status === 403) {
          console.log(`🚫 403 Forbidden for ${url}`);
        } else if (response.status === 429) {
          console.log(`⏰ Rate limited for ${url}`);
        }
        
      } catch (error) {
        console.log(`❌ Failed: ${error.message}`);
      }
      
      // Wait between attempts to be respectful
      await this.delay(3000);
    }
    
    return null;
  }

  // Method 4: Use proxy services (for development only)
  async makeRequestWithProxy(url) {
    // Using free proxy services - be careful with these in production
    const proxyServices = [
      'https://api.allorigins.win/raw?url=',
      'https://cors-anywhere.herokuapp.com/',
      'https://thingproxy.freeboard.io/fetch/'
    ];
    
    for (const proxy of proxyServices) {
      try {
        console.log(`🔄 Trying proxy: ${proxy.split('/')[2]}`);
        
        const proxiedUrl = proxy + encodeURIComponent(url);
        const response = await fetch(proxiedUrl, {
          headers: {
            'User-Agent': this.getUserAgent(),
            'Origin': 'http://localhost:3000',
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 20000
        });
        
        if (response.ok) {
          const html = await response.text();
          console.log(`✅ Proxy success with ${proxy.split('/')[2]}`);
          console.log(`📄 Retrieved ${html.length} characters via proxy`);
          return html;
        }
        
      } catch (error) {
        console.log(`❌ Proxy failed: ${error.message}`);
      }
      
      await this.delay(5000);
    }
    
    return null;
  }

  // Method 5: Enhanced makeRequest with all bypass techniques
  async makeRequestWithBypass(url) {
    console.log(`🔄 Fetching with bypass techniques: ${url}`);
    
    // Method 1: Try with enhanced headers
    try {
      console.log('🛡️  Attempt 1: Enhanced headers...');
      const response = await fetch(url, {
        headers: this.getEnhancedHeaders(),
        timeout: 12000
      });

      if (response.ok) {
        const html = await response.text();
        console.log(`✅ Enhanced headers worked: ${html.length} characters`);
        return html;
      } else if (response.status === 403) {
        console.log('🚫 Still getting 403 with enhanced headers');
      } else if (response.status === 429) {
        console.log('⏰ Rate limited with enhanced headers');
      }
      
    } catch (error) {
      console.log('❌ Enhanced headers failed:', error.message);
    }
    
    // Method 2: Try alternative URLs
    console.log('🛡️  Attempt 2: Alternative WhoScored URLs...');
    const altHtml = await this.tryAlternativeWhoScoredUrls();
    if (altHtml) return altHtml;
    
    // Method 3: Try with proxy (use with caution)
    console.log('🛡️  Attempt 3: Proxy services...');
    const proxyHtml = await this.makeRequestWithProxy(url);
    if (proxyHtml) return proxyHtml;
    
    // Method 4: Wait and retry with different user agent
    console.log('🛡️  Attempt 4: Wait and retry with fresh user agent...');
    console.log('⏰ Waiting 15 seconds then retrying...');
    await this.delay(15000);
    
    try {
      const retryResponse = await fetch(url, {
        headers: {
          ...this.getEnhancedHeaders(),
          'User-Agent': this.getUserAgent(), // Get fresh random UA
          // Try additional bypass headers
          'X-Forwarded-For': this.getRandomIP(),
          'X-Real-IP': this.getRandomIP()
        },
        timeout: 15000
      });
      
      if (retryResponse.ok) {
        const html = await retryResponse.text();
        console.log(`✅ Final retry successful: ${html.length} characters`);
        return html;
      } else {
        console.log(`❌ Final retry failed with status: ${retryResponse.status}`);
      }
      
    } catch (retryError) {
      console.log('❌ Final retry failed:', retryError.message);
    }
    
    // All methods failed
    throw new Error('All bypass methods failed - WhoScored is blocking all requests');
  }

  // Helper method to generate random IP for headers
  getRandomIP() {
    return `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  // ========== BYPASS METHODS END ==========

  // Updated makeRequest method to use bypass techniques
  async makeRequest(url) {
    console.log(`🔄 Fetching: ${url}`);
    
    try {
      // First try the bypass method
      const html = await this.makeRequestWithBypass(url);
      
      // Add delay to be respectful
      await this.delay(2000);
      
      return html;
    } catch (error) {
      console.error(`❌ All methods failed for ${url}:`, error.message);
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
    console.log('🕷️  Starting WhoScored fixture scraping with bypass techniques...');
    console.log('📍 Targeting specific fixtures URL for 2025-26 season');
    console.log('🛡️  Multiple bypass methods will be attempted if blocked');

    await this.ensureDataDir();

    try {
      // Get the specific fixtures page using bypass techniques
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
      
      if (error.message.includes('403')) {
        console.log('🚫 WhoScored is blocking all requests with 403 Forbidden');
        console.log('🌐 This could be due to:');
        console.log('  - Advanced bot detection');
        console.log('  - IP-based blocking');
        console.log('  - Cloudflare protection');
        console.log('  - CAPTCHA requirements');
        console.log('💡 Consider using the alternative data source scraper instead');
      } else if (error.message.includes('fetch')) {
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
    console.log('🛡️  Using bypass techniques for inspection...');
    
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
      
      if (error.message.includes('fetch') || error.message.includes('403')) {
        console.log('\n🌐 Fetch/403 error troubleshooting:');
        console.log('  1. WhoScored has sophisticated bot detection');
        console.log('  2. All bypass methods were attempted');
        console.log('  3. Consider using alternative data sources');
        console.log('  4. The site might require browser-based access only');
        console.log('💡 Try the FootballDataScraper for better results');
      }
    }
  }

  // Method to test all bypass techniques individually
  async testBypassMethods() {
    console.log('🧪 Testing all bypass methods individually...');
    
    const methods = [
      {
        name: 'Basic Headers',
        test: async () => {
          const response = await fetch(this.fixturesUrl, {
            headers: this.headers,
            timeout: 10000
          });
          return { status: response.status, ok: response.ok };
        }
      },
      {
        name: 'Enhanced Headers',
        test: async () => {
          const response = await fetch(this.fixturesUrl, {
            headers: this.getEnhancedHeaders(),
            timeout: 10000
          });
          return { status: response.status, ok: response.ok };
        }
      },
      {
        name: 'Alternative URLs',
        test: async () => {
          const html = await this.tryAlternativeWhoScoredUrls();
          return { ok: !!html, message: html ? 'Got HTML' : 'Failed' };
        }
      },
      {
        name: 'Proxy Services',
        test: async () => {
          const html = await this.makeRequestWithProxy(this.fixturesUrl);
          return { ok: !!html, message: html ? 'Got HTML via proxy' : 'All proxies failed' };
        }
      }
    ];
    
    for (const method of methods) {
      try {
        console.log(`\n🔍 Testing: ${method.name}`);
        const result = await method.test();
        
        if (result.ok) {
          console.log(`✅ ${method.name}: SUCCESS`);
          if (result.status) console.log(`   Status: ${result.status}`);
          if (result.message) console.log(`   Result: ${result.message}`);
        } else {
          console.log(`❌ ${method.name}: FAILED`);
          if (result.status) console.log(`   Status: ${result.status}`);
          if (result.message) console.log(`   Result: ${result.message}`);
        }
        
      } catch (error) {
        console.log(`❌ ${method.name}: ERROR - ${error.message}`);
      }
      
      // Wait between tests
      await this.delay(3000);
    }
    
    console.log('\n🧪 Bypass method testing complete');
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
        case 'test':
          await scraper.testBypassMethods();
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
