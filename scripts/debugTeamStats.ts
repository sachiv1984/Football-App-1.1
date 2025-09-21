// scripts/debugTeamStats.ts
/**
 * Debug version - tests single team/stat combination
 * TypeScript compatible version
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';   // ensure fetch works in Node (you installed node-fetch)

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
    // FBref often places the desired tables inside HTML comments. Remove comment delimiters
    // so Cheerio can see them. This mirrors previous scraping patterns.
    const cleanHtml = html.replace(/<!--/g, '').replace(/-->/g, '');
    const $ = cheerio.load(cleanHtml);

    console.log('📄 HTML length:', html.length);
    console.log('📄 Clean HTML length (after uncomment):', cleanHtml.length);
    console.log('🔍 Looking for stat type:', statType);

    // Log all tables found on the page
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

    // Try multiple table selection strategies (include stats_ id pattern)
    const tableSelectors = [
      `#stats_${statType}_for`,            // e.g. stats_shooting_for
      `#matchlogs_for_${statType}`,        // original pattern
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
      console.log(`Trying selector: ${selector}`);
      const found = $(selector);
      console.log(`  Found ${found.length} matches`);

      if (found.length > 0) {
        if (selector === 'table') {
          // For generic selectors, find the table with most data rows
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
      // Save the raw HTML for inspection (so you can examine in workflow artifacts)
      this.saveFile('debug-page.html', html);
      console.log('💾 Saved HTML to data/debug-page.html for inspection');
      return [];
    }

    console.log(`✅ Using table with selector: ${usedSelector}`);

    // Extract headers with detailed logging
    const headers: string[] = [];
    console.log('\n📋 Extracting headers:');

    // Try different header row strategies
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
          if (header && header !== '') {
            headers.push(header);
          }
        });
        break;
      }
    }

    if (headers.length === 0) {
      console.log('❌ No headers found');
      return [];
    }

    console.log(`✅ Found ${headers.length} headers:`, headers.slice(0, 10)); // Show first 10

    // Extract data rows with detailed logging
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

        // Log first few rows for debugging
        if (rowIndex < 3) {
          console.log(`  Row ${rowIndex + 1}: ${Object.keys(row).length} fields`);
          console.log(`    Sample data:`, Object.keys(row).slice(0, 5).map(key => `${key}: ${row[key]}`));
        }
      }
    });

    console.log(`✅ Extracted ${matchLogs.length} data rows`);

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

      // Check for common blocking patterns
      const blockingPatterns = [
        'Access Denied',
        '403 Forbidden',
        'rate limit',
        'Rate Limited',
        'blocked',
        'captcha',
        'security check'
      ];

      const isBlocked = blockingPatterns.some(pattern =>
        html.toLowerCase().includes(pattern.toLowerCase())
      );

      if (isBlocked) {
        console.log('🚫 Likely blocked or rate limited');
        this.saveFile('debug-blocked.html', html);
        console.log('💾 Saved blocked response to data/debug-blocked.html');
        console.log('\n❌ BLOCKING DETECTED:');
        console.log(`   Status: BLOCKED`);
        console.log(`   Response length: ${html.length} chars`);
        console.log(`   Check data/debug-blocked.html for details`);
        return;
      }

      // Check if page looks like FBref
      const fbrefIndicators = ['fbref', 'FBref', 'sports-reference', 'matchlogs'];
      const isFbref = fbrefIndicators.some(indicator =>
        html.includes(indicator)
      );

      if (!isFbref) {
        console.log('⚠️  Page doesn\'t look like FBref');
        this.saveFile('debug-wrong-page.html', html.substring(0, 10000));
        console.log('💾 Saved first 10k chars to data/debug-wrong-page.html');
        console.log('\n⚠️  WRONG PAGE DETECTED:');
        console.log(`   Expected: FBref page`);
        console.log(`   Got: Unknown page type`);
        console.log(`   Response length: ${html.length} chars`);
      }

      const matchLogs = this.parseStatsTable(html, TEST_STAT.key);

      const result = {
        teamId: TEST_TEAM.id,
        teamName: TEST_TEAM.name,
        statType: TEST_STAT.key,
        season: SEASON,
        url: url,
        matchLogs,
        scrapedAt: new Date().toISOString(),
        success: matchLogs.length > 0
      };

      // Save full result
      this.saveFile('debug-full-result.json', JSON.stringify(result, null, 2));
      console.log('💾 Saved full result to data/debug-full-result.json');

      console.log(`\n🎉 Debug completed!`);
      console.log(`📊 Found ${matchLogs.length} match records`);

      if (matchLogs.length > 0) {
        console.log('✅ Sample record keys:', Object.keys(matchLogs[0]).slice(0, 8));
        if (matchLogs[0].Date) console.log('✅ Sample date:', matchLogs[0].Date);
        if (matchLogs[0].Opponent) console.log('✅ Sample opponent:', matchLogs[0].Opponent);
        console.log('✅ Success! Data structure looks good');

        // Output summary to console
        console.log('\n📋 EXTRACTION SUMMARY:');
        console.log(`   Team: ${TEST_TEAM.name}`);
        console.log(`   Stat Type: ${TEST_STAT.name}`);
        console.log(`   Total Records: ${matchLogs.length}`);
        console.log(`   Columns: ${Object.keys(matchLogs[0]).length}`);
        console.log(`   Status: SUCCESS ✅`);

      } else {
        console.log('❌ No data extracted');
        console.log(`   Status: FAILED ❌`);
        console.log('🔧 Check debug files in data/ folder');
      }

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

/* ------------------ Main Execution ------------------ */
async function main() {
  console.log('🐛 Starting debug scraper...');
  console.log(`\n📋 Current test configuration:`);
  console.log(`   Team: ${TEST_TEAM.name} (index ${TEST_TEAM_INDEX})`);
  console.log(`   Stat: ${TEST_STAT.name} (index ${TEST_STAT_INDEX})`);

  console.log(`\n📋 Available teams (change TEST_TEAM_INDEX):`);
  AVAILABLE_TEAMS.forEach((team, index) => {
    const marker = index === TEST_TEAM_INDEX ? '→' : ' ';
    console.log(`   ${marker} ${index}: ${team.name}`);
  });

  console.log(`\n📋 Available stats (change TEST_STAT_INDEX):`);
  AVAILABLE_STATS.forEach((stat, index) => {
    const marker = index === TEST_STAT_INDEX ? '→' : ' ';
    console.log(`   ${marker} ${index}: ${stat.name}`);
  });

  console.log(`\n🔄 Starting scrape test...`);

  const scraper = new DebugScraper();
  await scraper.debugScrape();

  console.log('\n📋 Next steps:');
  console.log('1. If successful, apply fixes to main scraper');
  console.log('2. If no data, check debug-*.html files in data/ folder');
  console.log('3. Change TEST_TEAM_INDEX/TEST_STAT_INDEX to test others');
  console.log('4. Test different combinations before running full scraper');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
