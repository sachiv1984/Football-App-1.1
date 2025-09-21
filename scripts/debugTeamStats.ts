// scripts/debugTeamStats.ts
/**
 * Debug scraper - all teams or single team, single output file
 * Preserves original FBref parsing logic
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
const SCRAPE_MODE: ScrapeMode = SCRAPE_MODES.SINGLE; // or SCRAPE_MODES.SINGLE
const SINGLE_TEAM_INDEX = 0; // used if single mode
const TEST_STAT_INDEX = 0;   // shooting, keeper, etc.

/* ------------------ Rate Limiting ------------------ */
const RATE_LIMIT = {
  requestsPerMinute: 10,
  delayBetweenRequests: 6000,
  retryDelay: 30000,
  maxRetries: 3
};

/* ------------------ DebugScraper ------------------ */
class DebugScraper {
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

  parseStatsTable(html: string, statType: any): any[] {
    // FBref tables inside comments
    const cleanHtml = html.replace(/<!--/g, '').replace(/-->/g, '');
    const $ = cheerio.load(cleanHtml);

    const tableSelectors = [
      `#stats_${statType.key}_for`,
      `#matchlogs_for_${statType.key}`,
      `table[id*="matchlogs"]`,
      `table[id*="${statType.key}"]`,
      'table.stats_table'
    ];

    let selectedTable: cheerio.Cheerio | null = null;
    for (const sel of tableSelectors) {
      const t = $(sel).first();
      if (t.length > 0) {
        selectedTable = t;
        break;
      }
    }

    if (!selectedTable || selectedTable.length === 0) {
      console.warn(`❌ No table found for ${statType.key}`);
      return [];
    }

    const headers: string[] = [];
    const headerSelectors = ['thead tr:last-child th', 'thead tr th', 'tr:first-child th', 'tr:first-child td'];
    for (const sel of headerSelectors) {
      const ths = selectedTable.find(sel);
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

    const matchLogs: any[] = [];
    selectedTable.find('tbody tr').each((i, tr) => {
      const row: Record<string, any> = {};
      let hasData = false;
      $(tr).find('td, th').each((j, td) => {
        const val = $(td).text().trim();
        if (headers[j] && val !== '') {
          row[headers[j]] = val;
          hasData = true;
        }
      });
      if (hasData) matchLogs.push(row);
    });

    return matchLogs;
  }

  async debugScrape(team: any, statType: any): Promise<any> {
    const url = this.buildUrl(team, statType);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();

    const matchLogs = this.parseStatsTable(html, statType);

    return {
      teamId: team.id,
      teamName: team.name,
      statType: statType.key,
      season: SEASON,
      url,
      matchLogs,
      scrapedAt: new Date().toISOString(),
      success: matchLogs.length > 0
    };
  }
}

/* ------------------ ScraperManager ------------------ */
class ScraperManager {
  private scraper = new DebugScraper();
  private teamsToScrape: typeof AVAILABLE_TEAMS;
  private statToScrape = AVAILABLE_STATS[TEST_STAT_INDEX];

  constructor() {
    if (SCRAPE_MODE === SCRAPE_MODES.ALL) this.teamsToScrape = AVAILABLE_TEAMS;
    else this.teamsToScrape = [AVAILABLE_TEAMS[SINGLE_TEAM_INDEX]];
  }

  async run() {
    console.log(`🔄 Scraping mode: ${SCRAPE_MODE}`);
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
        } catch (err) {
          attempts++;
          console.warn(`⚠️ Attempt ${attempts} failed for ${team.name}. Retrying in ${RATE_LIMIT.retryDelay / 1000}s...`);
          await new Promise(res => setTimeout(res, RATE_LIMIT.retryDelay));
        }
      }

      if (!success) console.error(`❌ Failed to scrape ${team.name} after ${RATE_LIMIT.maxRetries} retries`);

      if (i < this.teamsToScrape.length - 1) {
        console.log(`⏳ Waiting ${RATE_LIMIT.delayBetweenRequests / 1000}s before next scrape...`);
        await new Promise(res => setTimeout(res, RATE_LIMIT.delayBetweenRequests));
      }
    }

    const filename = `Team${this.statToScrape.name.replace(/\s+/g, '')}Stats.json`;
    this.scraper.saveFile(filename, JSON.stringify(allResults, null, 2));
    console.log(`\n💾 All data saved to data/${filename}`);
  }
}

/* ------------------ Main ------------------ */
async function main() {
  console.log('🐛 Starting debug scraper...');
  const manager = new ScraperManager();
  await manager.run();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
