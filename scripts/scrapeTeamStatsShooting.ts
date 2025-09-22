// scripts/scrapeTeamStatsShooting.ts
/**
 * Enhanced Debug scraper - scrapes both team stats AND opponent stats from match logs
 * Handles hidden tables and generates correct match report URLs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

/* ------------------ Path Setup ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

/* ------------------ Configuration ------------------ */
const FBREF_BASE_URL = 'https://fbref.com/en/squads';
const SEASON = '2025-2026';

const AVAILABLE_TEAMS = [
  { id: 'arsenal', name: 'Arsenal', fbrefId: '18bb7c10' },
  { id: 'aston-villa', name: 'Aston Villa', fbrefId: '8602292d' },
  { id: 'bournemouth', name: 'Bournemouth', fbrefId: '4ba7cbea' },
  { id: 'brentford', name: 'Brentford', fbrefId: 'cd051869' },
  { id: 'brighton', name: 'Brighton & Hove Albion', fbrefId: 'd07537b9' },
  { id: 'burnley', name: 'Burnley', fbrefId: '943e8050' },
  { id: 'chelsea', name: 'Chelsea', fbrefId: 'cff3d9bb' },
  { id: 'crystal-palace', name: 'Crystal Palace', fbrefId: '47c64c55' },
  { id: 'everton', name: 'Everton', fbrefId: 'd3fd31cc' },
  { id: 'fulham', name: 'Fulham', fbrefId: 'fd962109' },
  { id: 'leeds-united', name: 'Leeds United', fbrefId: '5bfb9659' },
  { id: 'liverpool', name: 'Liverpool', fbrefId: '822bd0ba' },
  { id: 'manchester-city', name: 'Manchester City', fbrefId: 'b8fd03ef' },
  { id: 'manchester-united', name: 'Manchester United', fbrefId: '19538871' },
  { id: 'newcastle-united', name: 'Newcastle United', fbrefId: 'b2b47a98' },
  { id: 'nottingham-forest', name: "Nottingham Forest", fbrefId: 'e4a775cb' },
  { id: 'sunderland', name: 'Sunderland', fbrefId: '8ef52968' },
  { id: 'tottenham', name: 'Tottenham Hotspur', fbrefId: '361ca564' },
  { id: 'west-ham', name: 'West Ham United', fbrefId: '7c21e445' },
  { id: 'wolves', name: 'Wolverhampton Wanderers', fbrefId: '8cec06e1' }
];

const AVAILABLE_STATS = [
  { key: 'shooting', name: 'Shooting', tableName: 'team_shooting_stats' },
  { key: 'keeper', name: 'Goalkeeper', tableName: 'team_keeper_stats' },
  { key: 'passing', name: 'Passing', tableName: 'team_passing_stats' },
  { key: 'passing_types', name: 'Passing Types', tableName: 'team_passing_types_stats' },
  { key: 'gca', name: 'Goal and Shot Creation', tableName: 'team_gca_stats' },
  { key: 'defense', name: 'Defense', tableName: 'team_defense_stats' },
  { key: 'misc', name: 'Miscellaneous', tableName: 'team_misc_stats' }
];

/* ------------------ Test Configuration ------------------ */
const SCRAPE_MODES = { SINGLE: 'single', ALL: 'all' } as const;
type ScrapeMode = typeof SCRAPE_MODES[keyof typeof SCRAPE_MODES];
const SCRAPE_MODE: ScrapeMode = SCRAPE_MODES.ALL; // Change to ALL for all teams
const SINGLE_TEAM_INDEX = 0; // Arsenal
const TEST_STAT_INDEX = 0;   

/* ------------------ Rate Limiting ------------------ */
const RATE_LIMIT = {
  requestsPerMinute: 10,
  delayBetweenRequests: 6000,
  retryDelay: 30000,
  maxRetries: 3
};

/* ------------------ Enhanced Scraper ------------------ */
class Scraper {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  saveFile(filename: string, content: string) {
    this.ensureDataDir();
    fs.writeFileSync(path.join(DATA_DIR, filename), content, 'utf8');
  }

  buildUrl(team: any, statType: any): string {
    const teamNameSlug = team.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    return `${FBREF_BASE_URL}/${team.fbrefId}/${SEASON}/matchlogs/c9/${statType.key}/${teamNameSlug}-Match-Logs-Premier-League`;
  }

  /**
   * Extract match report URL from a table cell
   */
  extractMatchReportUrl($: cheerio.Root, cell: cheerio.Element): string | null {
    const link = $(cell).find('a').first();
    if (link.length > 0) {
      const href = link.attr('href');
      if (href && href.includes('/matches/')) {
        return href.startsWith('http') ? href : `https://fbref.com${href}`;
      }
    }
    return null;
  }

  /**
   * Enhanced table parsing that extracts both team and opponent stats
   */
  parseMatchLogsTable(html: string, statType: any, teamName: string): any[] {
    // Remove HTML comments to reveal hidden tables
    const cleanHtml = html.replace(/<!--/g, '').replace(/-->/g, '');
    const $ = cheerio.load(cleanHtml);

    // Find the main matchlogs table
    const tableSelectors = [
      `#matchlogs_for_${statType.key}`,
      `table[id*="matchlogs_for"]`,
      `table[id*="${statType.key}"]`,
      'table.stats_table'
    ];

    let teamTable: cheerio.Cheerio | null = null;
    for (const sel of tableSelectors) {
      const t = $(sel).first();
      if (t.length > 0) {
        teamTable = t;
        console.log(`✅ Found team table with selector: ${sel}`);
        break;
      }
    }

    // Also look for opponent table
    const opponentSelectors = [
      `#matchlogs_against_${statType.key}`,
      `table[id*="matchlogs_against"]`,
      `table[id*="against_${statType.key}"]`
    ];

    let opponentTable: cheerio.Cheerio | null = null;
    for (const sel of opponentSelectors) {
      const t = $(sel).first();
      if (t.length > 0) {
        opponentTable = t;
        console.log(`✅ Found opponent table with selector: ${sel}`);
        break;
      }
    }

    if (!teamTable || teamTable.length === 0) {
      console.warn(`❌ No team table found for ${statType.key}`);
      return [];
    }

    // Extract headers from team table
    const headers: string[] = [];
    const headerSelectors = ['thead tr:last-child th', 'thead tr th', 'tr:first-child th', 'tr:first-child td'];
    for (const sel of headerSelectors) {
      const ths = teamTable.find(sel);
      if (ths.length > 0) {
        ths.each((i, th) => {
          const h = $(th).text().trim();
          if (h) headers.push(h);
        });
        if (headers.length > 0) break;
      }
    }

    if (headers.length === 0) {
      console.warn('❌ No headers found');
      return [];
    }

    console.log(`📋 Headers found: ${headers.slice(0, 10).join(', ')}...`);

    // Extract opponent headers if opponent table exists
    let opponentHeaders: string[] = [];
    if (opponentTable) {
      for (const sel of headerSelectors) {
        const ths = opponentTable.find(sel);
        if (ths.length > 0) {
          ths.each((i, th) => {
            const h = $(th).text().trim();
            if (h) opponentHeaders.push(h);
          });
          if (opponentHeaders.length > 0) break;
        }
      }
    }

    // Parse team data
    const teamData: any[] = [];
    teamTable.find('tbody tr').each((i, tr) => {
      const row: Record<string, any> = {};
      let hasData = false;
      let matchReportUrl: string | null = null;

      $(tr).find('td, th').each((j, td) => {
        const val = $(td).text().trim();
        if (headers[j] && val !== '') {
          row[headers[j]] = val;
          hasData = true;
        }

        // Look for match report link (usually in Date column)
        if (headers[j] === 'Date' || j === 0) {
          const url = this.extractMatchReportUrl($, td);
          if (url) matchReportUrl = url;
        }
      });

      if (hasData) {
        row.matchReportUrl = matchReportUrl;
        row.teamName = teamName;
        teamData.push(row);
      }
    });

    // Parse opponent data if available
    const opponentData: any[] = [];
    if (opponentTable && opponentHeaders.length > 0) {
      opponentTable.find('tbody tr').each((i, tr) => {
        const row: Record<string, any> = {};
        let hasData = false;

        $(tr).find('td, th').each((j, td) => {
          const val = $(td).text().trim();
          if (opponentHeaders[j] && val !== '') {
            row[opponentHeaders[j]] = val;
            hasData = true;
          }
        });

        if (hasData) {
          opponentData.push(row);
        }
      });
    }

    // Combine team and opponent data
    const combinedData: any[] = [];
    teamData.forEach((teamMatch, index) => {
      // Extract core match info (date, venue, etc.) without duplicating stats
      const coreMatchData: Record<string, any> = {};
      const teamStats: Record<string, any> = {};
      
      // Separate core match data from team stats
      Object.entries(teamMatch).forEach(([key, value]) => {
        if (['Date', 'Time', 'Comp', 'Round', 'Day', 'Venue', 'Result', 'GF', 'GA', 'Opponent', 'Poss', 'matchReportUrl', 'teamName', 'Match Report'].includes(key)) {
          // Only add to core data if it's not the redundant "Match Report" text
          if (key !== 'Match Report') {
            coreMatchData[key] = value;
          }
        } else {
          teamStats[key] = value;
        }
      });

      const combined: Record<string, any> = {
        ...coreMatchData,
        team: {
          name: teamName,
          stats: teamStats
        }
      };

      // Add opponent data if available
      if (opponentData[index]) {
        const opponentStats: Record<string, any> = {};
        // Extract only stats from opponent data, skip match info and redundant fields
        Object.entries(opponentData[index]).forEach(([key, value]) => {
          if (!['Date', 'Time', 'Comp', 'Round', 'Day', 'Venue', 'Result', 'GF', 'GA', 'Opponent', 'Poss', 'Match Report'].includes(key)) {
            opponentStats[key] = value;
          }
        });
        
        combined.opponent = {
          name: teamMatch.Opponent || 'Unknown',
          stats: opponentStats
        };
      } else if (teamMatch.Opponent) {
        // If no opponent data table found, just add the name
        combined.opponent = {
          name: teamMatch.Opponent,
          stats: {}
        };
      }

      combinedData.push(combined);
    });

    return combinedData;
  }

  async Scrape(team: any, statType: any): Promise<any> {
    const url = this.buildUrl(team, statType);
    console.log(`🔗 Fetching: ${url}`);

    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const html = await response.text();

    const matchLogs = this.parseMatchLogsTable(html, statType, team.name);

    return {
      teamId: team.id,
      teamName: team.name,
      statType: statType.key,
      season: SEASON,
      url,
      matchLogs,
      scrapedAt: new Date().toISOString(),
      success: matchLogs.length > 0,
      matchCount: matchLogs.length
    };
  }
}

/* ------------------ ScraperManager ------------------ */
class ScraperManager {
  private scraper = new Scraper();
  private teamsToScrape: typeof AVAILABLE_TEAMS;
  private statToScrape = AVAILABLE_STATS[TEST_STAT_INDEX];

  constructor() {
    if (SCRAPE_MODE === SCRAPE_MODES.ALL) this.teamsToScrape = AVAILABLE_TEAMS;
    else this.teamsToScrape = [AVAILABLE_TEAMS[SINGLE_TEAM_INDEX]];
  }

  async run() {
    console.log(`🔄 Scraping mode: ${SCRAPE_MODE}`);
    console.log(`📊 Stat type: ${this.statToScrape.name} (${this.statToScrape.key})`);
    console.log(`📋 Total teams: ${this.teamsToScrape.length}`);

    const allResults: any[] = [];

    for (let i = 0; i < this.teamsToScrape.length; i++) {
      const team = this.teamsToScrape[i];
      console.log(`\n⏱ Scraping team ${i + 1} of ${this.teamsToScrape.length}: ${team.name}`);

      let attempts = 0;
      let success = false;
      while (!success && attempts <= RATE_LIMIT.maxRetries) {
        try {
          const result = await this.scraper.debugScrape(team, this.statToScrape);
          allResults.push(result);
          success = true;

          console.log(`✅ Success! Found ${result.matchCount} matches for ${team.name}`);
          
          // Log sample data for debugging
          if (result.matchLogs.length > 0) {
            const sampleMatch = result.matchLogs[0];
            console.log(`📋 Sample match data keys: ${Object.keys(sampleMatch).slice(0, 10).join(', ')}`);
            
            if (sampleMatch.matchReportUrl) {
              console.log(`🔗 Sample match report URL: ${sampleMatch.matchReportUrl}`);
            }
            
            if (sampleMatch.opponent) {
              console.log(`🆚 Sample opponent: ${sampleMatch.opponent.name || 'Unknown'}`);
            }
          }
          
        } catch (err) {
          attempts++;
          console.warn(`⚠️ Attempt ${attempts} failed for ${team.name}: ${err}`);
          if (attempts <= RATE_LIMIT.maxRetries) {
            console.log(`Retrying in ${RATE_LIMIT.retryDelay / 1000}s...`);
            await new Promise(res => setTimeout(res, RATE_LIMIT.retryDelay));
          }
        }
      }

      if (!success) {
        console.error(`❌ Failed to scrape ${team.name} after ${RATE_LIMIT.maxRetries} retries`);
        // Add empty result to maintain consistency
        allResults.push({
          teamId: team.id,
          teamName: team.name,
          statType: this.statToScrape.key,
          season: SEASON,
          url: this.scraper.buildUrl(team, this.statToScrape),
          matchLogs: [],
          scrapedAt: new Date().toISOString(),
          success: false,
          matchCount: 0,
          error: 'Failed after retries'
        });
      }

      if (i < this.teamsToScrape.length - 1) {
        console.log(`⏳ Waiting ${RATE_LIMIT.delayBetweenRequests / 1000}s before next scrape...`);
        await new Promise(res => setTimeout(res, RATE_LIMIT.delayBetweenRequests));
      }
    }

    const filename = `Team${this.statToScrape.name.replace(/\s+/g, '')}Stats.json`;
    this.scraper.saveFile(filename, JSON.stringify(allResults, null, 2));
    console.log(`\n💾 All data saved to data/${filename}`);

    // Generate summary
    const totalMatches = allResults.reduce((sum, result) => sum + result.matchCount, 0);
    const successfulTeams = allResults.filter(r => r.success).length;
    console.log(`\n📊 Summary:`);
    console.log(`   Teams scraped successfully: ${successfulTeams}/${this.teamsToScrape.length}`);
    console.log(`   Total matches found: ${totalMatches}`);
  }
}

/* ------------------ Main ------------------ */
async function main() {
  console.log('🐛 Starting enhanced team vs opponent scraper...');
  const manager = new ScraperManager();
  await manager.run();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
