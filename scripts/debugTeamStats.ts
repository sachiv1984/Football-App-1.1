// scripts/debugTeamStats.ts
/**
 * Debug version - tests single team/stat combination
 * TypeScript compatible version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

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
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  private saveFile(filename: string, content: string) {
    this.ensureDataDir();
    fs.writeFileSync(path.join(DATA_DIR, filename), content);
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

    // Log all tables
    console.log('\n📊 All tables found on page:');
    const allTables = $('table');
    console.log(`Found ${allTables.length} tables total`);

    allTables.each((i: number, table: any) => {
      const tableId = $(table).attr('id') || 'no-id';
      const tableClass = $(table).attr('class') || 'no-class';
      const rowCount = $(table).find('tr').length;
      console.log(`  Table ${i + 1}: id="${tableId}", class="${tableClass}", rows=${rowCount}`);
    });

    const matchLogs: any[] = [];
    const tableSelectors = [
      `#matchlogs_for_${statType}`,
      `table[id*="matchlogs"]`,
      `table[id*="${statType}"]`,
      `table.stats_table`,
      `div[id*="matchlogs"] table`,
      'table'
    ];

    let selectedTable: any = null;
    let usedSelector = '';

    for (const selector of tableSelectors) {
      console.log(`Trying selector: ${selector}`);
      const found = $(selector);
      console.log(`  Found ${found.length} matches`);

      if (found.length > 0) {
        if (selector === 'table') {
          let bestTable = found.first();
          let maxRows = 0;
          found.each((_: number, tableEl: any) => {
            const table = $(tableEl);
            const rows = table.find('tbody tr').length;
            console.log(`    Table has ${rows} data rows`);
            if (rows > maxRows) {
              maxRows = rows;
              bestTable = table;
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
      console.log('💾 Saved HTML to data/debug-page.html');
      return [];
    }

    console.log(`✅ Using table with selector: ${usedSelector}`);

    // Header extraction
    const headers: string[] = [];
    console.log('\n📋 Extracting headers:');
    const headerSelectors = [
      'thead tr:last-child th',
      'thead tr th',
      'tr:first-child th',
      'tr:first-child td'
    ];

    for (const headerSelector of headerSelectors) {
      const headerCells = selectedTable.find(headerSelector);
      console.log(`  Trying header selector: ${headerSelector} - found ${headerCells.length} cells`);
      if (headerCells.length > 0) {
        console.log(`  Using header selector: ${headerSelector}`);
        headerCells.each((index: number, th: any) => {
          const header = $(th).text().trim();
          console.log(`    Header ${index}: "${header}"`);
          if (header && header !== '') headers.push(header);
        });
        break;
      }
    }

    if (headers.length === 0) {
      console.log('❌ No headers found');
      return [];
    }

    console.log(`✅ Found ${headers.length} headers:`, headers.slice(0, 10));

    // Extract data rows
    console.log('\n📊 Extracting data rows:');
    const dataRows = selectedTable.find('tbody tr');
    console.log(`Found ${dataRows.length} potential data rows`);

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
        if (rowIndex < 3) {
          console.log(`  Row ${rowIndex + 1}: ${Object.keys(row).length} fields`);
          console.log(`    Sample data:`, Object.keys(row).slice(0, 5).map(k => `${k}: ${row[k]}`));
        }
      }
    });

    console.log(`✅ Extracted ${matchLogs.length} data rows`);

    if (matchLogs.length > 0) {
      const sampleData = {
        url: this.buildUrl(TEST_TEAM, TEST_STAT),
        headers,
        sampleRows: matchLogs.slice(0, 3),
        totalRows: matchLogs.length,
        allColumns: Object.keys(matchLogs[0])
      };
      this.saveFile('debug-sample-data.json', JSON.stringify(sampleData, null, 2));
      console.log('💾 Saved sample data to data/debug-sample-data.json');
    }

    return matchLogs;
  }

  async debugScrape(): Promise<void> {
    const url = this.buildUrl(TEST_TEAM, TEST_STAT);

    try {
      console.log(`🔍 Debug scraping ${TEST_STAT.name} for ${TEST_TEAM.name}...`);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': 'text/html',
        }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();

      const blockingPatterns = ['Access Denied','403 Forbidden','rate limit','Rate Limited','blocked','captcha','security check'];
      const isBlocked = blockingPatterns.some(p => html.toLowerCase().includes(p.toLowerCase()));
      if (isBlocked) {
        console.log('🚫 Likely blocked or rate limited');
        this.saveFile('debug-blocked.html', html);
        return;
      }

      const fbrefIndicators = ['fbref','FBref','sports-reference','matchlogs'];
      const isFbref = fbrefIndicators.some(indicator => html.includes(indicator));
      if (!isFbref) this.saveFile('debug-wrong-page.html', html.substring(0,10000));

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
      console.log('💾 Saved full result to data/debug-full-result.json');

    } catch (error) {
      console.error('💥 Debug scrape failed:', error);
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
