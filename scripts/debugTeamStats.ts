// scripts/debugTeamStats.ts
/**
 * Debug version - tests single team/stat combination
 * TypeScript compatible version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';   // ✅ ensure fetch works in Node

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

const AVAILABLE_STATS = [
  { key: 'shooting', name: 'Shooting', tableName: 'team_shooting_stats' },
  { key: 'keeper', name: 'Goalkeeper', tableName: 'team_keeper_stats' },
  { key: 'passing', name: 'Passing', tableName: 'team_passing_stats' },
  { key: 'passing_types', name: 'Passing Types', tableName: 'team_passing_types_stats' },
  { key: 'gca', name: 'Goal and Shot Creation', tableName: 'team_gca_stats' },
  { key: 'defense', name: 'Defense', tableName: 'team_defense_stats' },
  { key: 'misc', name: 'Miscellaneous', tableName: 'team_misc_stats' }
];

// TEST CONFIGURATION - Change these to test different combinations
const TEST_TEAM_INDEX = 0;  // 0 = Arsenal, 1 = Aston Villa, etc.
const TEST_STAT_INDEX = 0;  // 0 = Shooting, 1 = Keeper, etc.

const TEST_TEAM = AVAILABLE_TEAMS[TEST_TEAM_INDEX];
const TEST_STAT = AVAILABLE_STATS[TEST_STAT_INDEX];

/* ------------------ Debug Scraper ------------------ */
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
    fs.writeFileSync(filePath, content);
    console.log(`💾 Saved file: ${filePath}`);
  }

  private buildUrl(team: any, statType: any): string {
    const teamNameSlug = team.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const url = `${FBREF_BASE_URL}/${team.fbrefId}/${SEASON}/matchlogs/all_comps/${statType.key}/${teamNameSlug}-Match-Logs-All-Competitions`;
    console.log('🔗 Built URL:', url);
    return url;
  }

  private parseStatsTable(html: string, statType: string): any[] {
    const $ = cheerio.load(html);

    console.log('📄 HTML length:', html.length);
    console.log('🔍 Looking for stat type:', statType);

    const matchLogs: any[] = [];

    // ... your full existing parsing logic here (unchanged) ...
    // just replace fs.writeFileSync calls with this.saveFile

    return matchLogs;
  }

  async debugScrape(): Promise<void> {
    const url = this.buildUrl(TEST_TEAM, TEST_STAT);

    try {
      console.log(`🔍 Debug scraping ${TEST_STAT.name} for ${TEST_TEAM.name}...`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
        }
      });

      console.log(`📡 Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`📄 Received HTML (${html.length} characters)`);

      // Blocking check
      const blockingPatterns = ['Access Denied','403 Forbidden','rate limit','Rate Limited','blocked','captcha','security check'];
      const isBlocked = blockingPatterns.some(p => html.toLowerCase().includes(p.toLowerCase()));

      if (isBlocked) {
        console.log('🚫 Likely blocked or rate limited');
        this.saveFile('debug-blocked.html', html);
        return;
      }

      const matchLogs = this.parseStatsTable(html, TEST_STAT.key);

      const result = {
        teamId: TEST_TEAM.id,
        teamName: TEST_TEAM.name,
        statType: TEST_STAT.key,
        season: SEASON,
        url,
        matchLogs,
        scrapedAt: new Date().toISOString(),
        success: matchLogs.length > 0
      };

      this.saveFile('debug-full-result.json', JSON.stringify(result, null, 2));

      console.log(`\n🎉 Debug completed!`);
      console.log(`📊 Found ${matchLogs.length} match records`);
    } catch (error) {
      console.error('💥 Debug scrape failed:', error);

      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3)
        });
      }
    }
  }
}

/* ------------------ Main Execution ------------------ */
async function main() {
  console.log('🐛 Starting debug scraper...');
  console.log(`   Team: ${TEST_TEAM.name} (index ${TEST_TEAM_INDEX})`);
  console.log(`   Stat: ${TEST_STAT.name} (index ${TEST_STAT_INDEX})`);

  const scraper = new DebugScraper();
  await scraper.debugScrape();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
