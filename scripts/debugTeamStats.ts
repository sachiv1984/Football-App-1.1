// scripts/debugTeamStats.ts
/**
 * Refactored Debug Scraper
 * TypeScript compatible version
 *
 * Adds:
 *  - SCRAPE_MODE: 'single' | 'all'
 *  - Progress logging: "1 of 20"
 *  - Rate limiting with retries
 *
 * Existing scraping, parsing, and debug logging logic preserved.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';   // Node fetch polyfill

/* ------------------ Path Setup ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

/* ------------------ Configuration ------------------ */
const FBREF_BASE_URL = 'https://fbref.com/en/squads';
const SEASON = '2025-2026';

// Available teams for testing
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
  { id: 'sunderland', name: 'Sunderland', fbrefId: '4a2215db' },
  { id: 'tottenham', name: 'Tottenham Hotspur', fbrefId: '361ca564' },
  { id: 'west-ham', name: 'West Ham United', fbrefId: '7c21e445' },
  { id: 'wolves', name: 'Wolverhampton Wanderers', fbrefId: '8cec06e1' }
];

// Available stats for testing
const AVAILABLE_STATS = [
  { key: 'shooting', name: 'Shooting', tableName: 'team_shooting_stats' },
  { key: 'keeper', name: 'Goalkeeper', tableName: 'team_keeper_stats' },
  { key: 'passing', name: 'Passing', tableName: 'team_passing_stats' },
  { key: 'passing_types', name: 'Passing Types', tableName: 'team_passing_types_stats' },
  { key: 'gca', name: 'Goal and Shot Creation', tableName: 'team_gca_stats' },
  { key: 'defense', name: 'Defense', tableName: 'team_defense_stats' },
  { key: 'misc', name: 'Miscellaneous', tableName: 'team_misc_stats' }
];

// ------------------ Test / Scraper Configuration ------------------

// Define allowed scrape modes
const SCRAPE_MODES = {
  SINGLE: 'single',
  ALL: 'all',
} as const;

// Type for the mode
type ScrapeMode = typeof SCRAPE_MODES[keyof typeof SCRAPE_MODES];

// Pick current mode
const SCRAPE_MODE: ScrapeMode = SCRAPE_MODES.SINGLE; // or SCRAPE_MODES.ALL

// Team/stat selection for single mode
const SINGLE_TEAM_INDEX = 2; // Arsenal
const TEST_STAT_INDEX = 0;   // Shooting


// ------------------ Rate Limiting Configuration ------------------ //
const RATE_LIMIT = {
  requestsPerMinute: 10,
  delayBetweenRequests: 6000, // 6 seconds
  retryDelay: 30000,          // 30 seconds before retry on failure
  maxRetries: 3
};

/* ------------------ DebugScraper Class ------------------ */
class DebugScraper {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      console.log(`📂 Created data directory: ${DATA_DIR}`);
    }
  }

  private saveFile(filename: string, content: string) {
    this.ensureDataDir();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`💾 Saved file: ${filePath}`);
  }

  private buildUrl(team: any, statType: any): string {
    const teamNameSlug = team.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const url = `${FBREF_BASE_URL}/${team.fbrefId}/${SEASON}/matchlogs/c9/${statType.key}/${teamNameSlug}-Match-Logs-Premier-League`;
    console.log('🔗 Built URL:', url);
    return url;
  }

  private parseStatsTable(html: string, statType: string): any[] {
    // Remove HTML comment delimiters (FBref tables are sometimes commented)
    const cleanHtml = html.replace(/<!--/g, '').replace(/-->/g, '');
    const $ = cheerio.load(cleanHtml);

    const matchLogs: any[] = [];
    const tableSelectors = [
      `#stats_${statType}_for`,
      `#matchlogs_for_${statType}`,
      `table[id*="matchlogs"]`,
      `table[id*="${statType}"]`,
      `table[id*="stats_${statType}"]`,
      `table.stats_table`,
      `div[id*="matchlogs"] table`,
      'table'
    ];

    let selectedTable: any = null;
    let usedSelector = '';

    for (const selector of tableSelectors) {
      const found = $(selector);
      if (found.length > 0) {
        if (selector === 'table') {
          let bestTable = found.first();
          let maxRows = 0;
          found.each((_: number, tableEl: any) => {
            const rows = $(tableEl).find('tbody tr').length;
            if (rows > maxRows) {
              maxRows = rows;
              bestTable = $(tableEl);
            }
          });
          if (maxRows > 0) {
            selectedTable = bestTable;
            usedSelector = `${selector} (${maxRows} rows)`;
            break;
          }
        } else {
          selectedTable = found.first();
          usedSelector = selector;
          break;
        }
      }
    }

    if (!selectedTable || selectedTable.length === 0) {
      console.log('❌ No suitable table found');
      this.saveFile('debug-page.html', html);
      return [];
    }

    console.log(`✅ Using table with selector: ${usedSelector}`);

    // Extract headers
    const headers: string[] = [];
    const headerSelectors = ['thead tr:last-child th', 'thead tr th', 'tr:first-child th', 'tr:first-child td'];
    for (const headerSelector of headerSelectors) {
      const headerCells = selectedTable.find(headerSelector);
      if (headerCells.length > 0) {
        headerCells.each((index: number, th: any) => {
          const header = $(th).text().trim();
          if (header && header !== '') headers.push(header);
        });
        break;
      }
    }

    if (headers.length === 0) {
      console.log('❌ No headers found');
      return [];
    }

    // Extract rows
    const dataRows = selectedTable.find('tbody tr');
    dataRows.each((rowIndex: number, tr: any) => {
      const row: Record<string, any> = {};
      let hasData = false;

      $(tr).find('td, th').each((cellIndex: number, cell: any) => {
        const value = $(cell).text().trim();
        const header = headers[cellIndex];
        if (header && value !== '') {
          row[header] = value;
          hasData = true;
        }
      });

      if (hasData && Object.keys(row).length > 0) {
        matchLogs.push(row);
      }
    });

    console.log(`✅ Extracted ${matchLogs.length} data rows`);
    return matchLogs;
  }

  // ------------------ Main Scrape Function ------------------ //
  async debugScrape(team: any, stat: any) {
    const url = this.buildUrl(team, stat);

    try {
      console.log(`🔍 Debug scraping ${stat.name} for ${team.name}...`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        }
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const html = await response.text();

      // Check for blocking
      const blockingPatterns = ['Access Denied','403 Forbidden','rate limit','Rate Limited','blocked','captcha','security check'];
      if (blockingPatterns.some(pattern => html.toLowerCase().includes(pattern.toLowerCase()))) {
        console.log('🚫 Likely blocked or rate limited');
        this.saveFile('debug-blocked.html', html);
        return;
      }

      const matchLogs = this.parseStatsTable(html, stat.key);

      const result = {
        teamId: team.id,
        teamName: team.name,
        statType: stat.key,
        season: SEASON,
        url,
        matchLogs,
        scrapedAt: new Date().toISOString(),
        success: matchLogs.length > 0
      };

      const statNameCapitalized = stat.name.replace(/\s+/g, '');
      const filename = `Team${statNameCapitalized}Stats-${team.id}.json`;
      this.saveFile(filename, JSON.stringify(result, null, 2));

      console.log(`\n📊 Extraction Summary: Team=${team.name}, Stat=${stat.name}, Records=${matchLogs.length}, Status=${matchLogs.length > 0 ? 'SUCCESS ✅' : 'FAILED ❌'}`);

    } catch (error) {
      console.error(`💥 Scrape failed for ${team.name}:`, error);
    }
  }
}

/* ------------------ Scraper Manager (All Teams Handling) ------------------ */
class ScraperManager {
  private scraper: DebugScraper;
  private teamsToScrape: typeof AVAILABLE_TEAMS;
  private statToScrape: typeof AVAILABLE_STATS[0];

constructor() {
  this.scraper = new DebugScraper();
  this.statToScrape = AVAILABLE_STATS[TEST_STAT_INDEX];

  if (SCRAPE_MODE === SCRAPE_MODES.ALL) {
    this.teamsToScrape = AVAILABLE_TEAMS;
  } else {
    if (SINGLE_TEAM_INDEX < 0 || SINGLE_TEAM_INDEX >= AVAILABLE_TEAMS.length) {
      throw new Error(`SINGLE_TEAM_INDEX ${SINGLE_TEAM_INDEX} is out of bounds`);
    }
    this.teamsToScrape = [AVAILABLE_TEAMS[SINGLE_TEAM_INDEX]];
  }
}

  async run() {
    console.log(`🔄 Starting scraping mode: ${SCRAPE_MODE}`);
    console.log(`📋 Total teams: ${this.teamsToScrape.length}`);

    for (let i = 0; i < this.teamsToScrape.length; i++) {
      const team = this.teamsToScrape[i];

      let attempts = 0;
      let success = false;

      // -------------------- Retry loop --------------------
      while (!success && attempts <= RATE_LIMIT.maxRetries) {
        try {
          await this.scraper.debugScrape(team, this.statToScrape);
          success = true;
        } catch (err) {
          attempts++;
          console.warn(`⚠️ Attempt ${attempts} failed for ${team.name}. Retrying in ${RATE_LIMIT.retryDelay / 1000}s...`);
          await new Promise(res => setTimeout(res, RATE_LIMIT.retryDelay));
        }
      }

      if (!success) console.error(`❌ Failed to scrape ${team.name} after ${RATE_LIMIT.maxRetries} retries`);

      // -------------------- Rate limiting delay --------------------
      if (i < this.teamsToScrape.length - 1) {
        console.log(`⏳ Waiting ${RATE_LIMIT.delayBetweenRequests / 1000}s before next scrape...`);
        await new Promise(res => setTimeout(res, RATE_LIMIT.delayBetweenRequests));
      }
    }

    console.log('\n🎉 All scraping complete!');
  }
}


/* ------------------ Main Execution ------------------ */
async function main() {
  console.log('🐛 Starting debug scraper manager...');
  const manager = new ScraperManager();
  await manager.run();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
