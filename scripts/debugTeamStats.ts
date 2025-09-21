// scripts/debugTeamStats.ts
/**
 * Debug version - tests single team/stat combination
 * Use this to debug parsing issues before running full scraper
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

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

    // Log all tables found on the page
    console.log('\n📊 All tables found on page:');
    $('table').each((i: number, table: any) => {
      const tableId = $(table).attr('id') || 'no-id';
      const tableClass = $(table).attr('class') || 'no-class';
      const rowCount = $(table).find('tr').length;
      console.log(`  Table ${i + 1}: id="${tableId}", class="${tableClass}", rows=${rowCount}`);
    });

    const matchLogs: any[] = [];

    // Try multiple table selection strategies
    const tableSelectors = [
      `#matchlogs_for_${statType}`,
      `table[id*="matchlogs"]`,
      `table[id*="${statType}"]`,
      `table.stats_table`,
      `div[id*="matchlogs"] table`,
      'table'
    ];

    let table: cheerio.Cheerio<any> | null = null;
    let usedSelector = '';

    for (const selector of tableSelectors) {
      const found = $(selector);
      if (found.length > 0) {
        // For generic selectors, try to find the most relevant table
        if (selector === 'table') {
          // Look for table with most data rows
          let bestTable = found.first();
          let maxRows = 0;
          
          found.each((_, t) => {
            const rows = $(t).find('tbody tr').length;
            if (rows > maxRows) {
              maxRows = rows;
              bestTable = $(t);
            }
          });
          
          if (maxRows > 0) {
            table = bestTable;
            usedSelector = `${selector} (${maxRows} rows)`;
            break;
          }
        } else {
          table = found.first();
          usedSelector = selector;
          break;
        }
      }
    }

    if (!table || table.length === 0) {
      console.log('❌ No suitable table found');
      // Save HTML for debugging
      fs.writeFileSync('debug-page.html', html);
      console.log('💾 Saved HTML to debug-page.html for inspection');
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
      const headerCells = table.find(headerSelector);
      if (headerCells.length > 0) {
        console.log(`  Using header selector: ${headerSelector} (${headerCells.length} cells)`);
        
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

    console.log(`✅ Found ${headers.length} headers:`, headers);

    // Extract data rows with detailed logging
    console.log('\n📊 Extracting data rows:');
    
    const dataRows = table.find('tbody tr');
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
          console.log(`  Row ${rowIndex + 1}:`, Object.keys(row).slice(0, 5), '...');
        }
      }
    });

    console.log(`✅ Extracted ${matchLogs.length} data rows`);

    // Save sample data for inspection
    if (matchLogs.length > 0) {
      fs.writeFileSync('debug-sample-data.json', JSON.stringify({
        headers,
        sampleRows: matchLogs.slice(0, 3),
        totalRows: matchLogs.length
      }, null, 2));
      console.log('💾 Saved sample data to debug-sample-data.json');
    }

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
      console.log(`📡 Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      console.log(`📄 Received HTML (${html.length} characters)`);

      // Check if we got blocked or redirected
      if (html.includes('Access Denied') || html.includes('403 Forbidden') || html.includes('rate limit')) {
        console.log('🚫 Likely blocked or rate limited');
        fs.writeFileSync('debug-blocked.html', html);
        return;
      }

      // Check if page looks like FBref
      if (!html.includes('fbref') && !html.includes('FBref')) {
        console.log('⚠️  Page doesn\'t look like FBref');
        fs.writeFileSync('debug-wrong-page.html', html.substring(0, 5000));
      }

      const matchLogs = this.parseStatsTable(html, TEST_STAT.key);

      const result = {
        teamId: TEST_TEAM.id,
        teamName: TEST_TEAM.name,
        statType: TEST_STAT.key,
        season: SEASON,
        url: url,
        matchLogs,
        scrapedAt: new Date().toISOString()
      };

      // Save full result
      fs.writeFileSync('debug-full-result.json', JSON.stringify(result, null, 2));
      console.log('💾 Saved full result to debug-full-result.json');

      console.log(`\n🎉 Debug completed! Found ${matchLogs.length} match records`);
      
      if (matchLogs.length > 0) {
        console.log('✅ Sample record keys:', Object.keys(matchLogs[0]));
        console.log('✅ Sample record:', matchLogs[0]);
      } else {
        console.log('❌ No data extracted - check debug files for troubleshooting');
      }

    } catch (error) {
      console.error('💥 Debug scrape failed:', error);
      
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 5)
        });
      }
    }
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
  console.log('1. Check debug-*.json files for extracted data');
  console.log('2. Check debug-*.html files if no data found');
  console.log('3. Verify table selectors work with FBref structure');
  console.log('4. Change TEST_TEAM_INDEX or TEST_STAT_INDEX to test others');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}