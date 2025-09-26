// scripts/scrapeFixtures.ts
/**
 * ===============================================================
 * Production-ready FBref Fixtures Scraper
 *
 * Key fixes:
 * 1. Multiple URL attempts for fixtures
 * 2. More flexible table selector approach
 * 3. Better debugging and error handling
 * 4. Season-aware URL construction
 * ===============================================================
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
const FILE_NAME = 'Fixtures.json';

/* ------------------ Configuration ------------------ */
const CURRENT_SEASON = '2025-2026';
const NEXT_SEASON = '2026-2027';

// Try multiple URLs to find fixtures
const FBREF_URLS = [
  'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures',
  `https://fbref.com/en/comps/9/${CURRENT_SEASON}/schedule/${CURRENT_SEASON}-Premier-League-Scores-and-Fixtures`,
  `https://fbref.com/en/comps/9/${NEXT_SEASON}/schedule/${NEXT_SEASON}-Premier-League-Scores-and-Fixtures`,
  'https://fbref.com/en/comps/9/Premier-League-Stats'
];

/* ------------------ Scraper Class ------------------ */
class Scraper {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  async scrape() {
    console.log('🚀 Starting fixture scraping...');

    for (const url of FBREF_URLS) {
      try {
        console.log(`🔍 Trying URL: ${url}`);
        const html = await this.fetchHtml(url);
        const $ = cheerio.load(html);

        const fixtures = this.parseFixtures($);

        if (fixtures.length > 0) {
          // Validate fixture count (Premier League should have 380 fixtures)
          if (fixtures.length !== 380) {
            console.warn(`⚠️ Warning: Expected 380 fixtures, but found ${fixtures.length}`);
            console.log(`📊 Fixture breakdown:`);
            this.analyzeFixtures(fixtures);
          }
          
          this.saveFixtures(fixtures);
          console.log(`✅ Success: Found and saved ${fixtures.length} fixtures to ${FILE_NAME}`);
          return; // Exit after successful scraping
        } else {
          console.log(`⚠️ No fixtures found at ${url}`);
        }
      } catch (error) {
        console.log(`❌ Failed to scrape ${url}: ${error}`);
        continue; // Try next URL
      }
    }

    console.error('❌ All URLs failed. No fixtures could be scraped.');
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  private parseFixtures($: cheerio.CheerioAPI): any[] {
    const fixtures: any[] = [];
    const seenFixtures = new Set<string>(); // Track duplicates

    // Try multiple table selectors
    const possibleSelectors = [
      '#sched_2025-2026_9_1_fixtures_and_results',
      '#sched_2024-2025_9_1_fixtures_and_results', 
      'table[id*="sched_"][id*="_fixtures_and_results"]',
      'table[id*="schedule"]',
      '.stats_table',
      'table.sortable'
    ];

    let fixturesTable: cheerio.Cheerio<any> | null = null;

    for (const selector of possibleSelectors) {
      const table = $(selector).first();
      if (table.length > 0) {
        console.log(`✓ Found table with selector: ${selector}`);
        fixturesTable = table;
        break;
      }
    }

    if (!fixturesTable) {
      console.warn('❌ No fixtures table found with any selector.');
      this.debugTables($);
      return [];
    }

    const rows = fixturesTable.find('tbody tr');
    console.log(`📊 Processing ${rows.length} table rows...`);

    let validRows = 0;
    let skippedRows = 0;
    let duplicateRows = 0;

    rows.each((i: number, row: any) => {
      const $row = $(row);
      const cells = $row.find('td');
      
      // Skip rows with insufficient columns
      if (cells.length < 5) {
        skippedRows++;
        return;
      }

      // Skip header rows or separator rows
      if ($row.hasClass('thead') || $row.find('th').length > 0) {
        skippedRows++;
        return;
      }

      const date = $(cells[0]).text().trim();
      const time = $(cells[1]).text().trim();
      const homeTeam = $(cells[2]).text().trim();
      const awayTeam = $(cells[4]).text().trim();
      const scoreText = cells.length > 5 ? $(cells[5]).text().trim() : '';

      // Debug first few rows
      if (i < 5) {
        console.log(`Row ${i}: Date: "${date}", Time: "${time}", Home: "${homeTeam}", Away: "${awayTeam}", Score: "${scoreText}"`);
      }

      // Skip empty rows or invalid data
      if (!date || !homeTeam || !awayTeam) {
        skippedRows++;
        return;
      }

      // Skip obviously invalid entries (like "Squad" or other non-team names)
      if (homeTeam.toLowerCase().includes('squad') || awayTeam.toLowerCase().includes('squad')) {
        skippedRows++;
        return;
      }

      // Create unique identifier for duplicate detection
      const fixtureKey = `${date}-${homeTeam}-${awayTeam}`;
      if (seenFixtures.has(fixtureKey)) {
        duplicateRows++;
        return;
      }
      seenFixtures.add(fixtureKey);

      // Valid fixture found
      validRows++;
      fixtures.push({
        date,
        time: time || 'TBD',
        homeTeam,
        awayTeam,
        matchStatus: this.determineMatchStatus(scoreText),
        score: scoreText || null
      });
    });

    console.log(`📈 Processing summary:`);
    console.log(`  - Total rows processed: ${rows.length}`);
    console.log(`  - Valid fixtures: ${validRows}`);
    console.log(`  - Skipped rows: ${skippedRows}`);
    console.log(`  - Duplicate rows: ${duplicateRows}`);
    console.log(`  - Final fixture count: ${fixtures.length}`);

    return fixtures;
  }

  private determineMatchStatus(scoreText: string): string {
    if (!scoreText || scoreText === '') {
      return 'scheduled';
    } else if (scoreText.includes('–') || scoreText.includes('-')) {
      return 'completed';
    } else {
      return 'scheduled';
    }
  }

  private debugTables($: cheerio.CheerioAPI) {
    console.log('🔧 Debug: Available tables on the page:');
    $('table').each((i, table) => {
      const id = $(table).attr('id') || 'no-id';
      const classes = $(table).attr('class') || 'no-classes';
      console.log(`  Table ${i}: id="${id}", class="${classes}"`);
    });

    console.log('🔧 Debug: Looking for tables with "sched" in ID:');
    $('table[id*="sched"]').each((i, table) => {
      const id = $(table).attr('id');
      console.log(`  Schedule table: ${id}`);
    });
  }

  private analyzeFixtures(fixtures: any[]) {
    const teamCounts = new Map<string, number>();
    const dateRange = { earliest: '', latest: '' };
    
    fixtures.forEach((fixture, index) => {
      // Count home games for each team
      const home = fixture.homeTeam;
      const away = fixture.awayTeam;
      
      teamCounts.set(home, (teamCounts.get(home) || 0) + 1);
      teamCounts.set(away, (teamCounts.get(away) || 0) + 1);
      
      // Track date range
      if (index === 0) {
        dateRange.earliest = fixture.date;
        dateRange.latest = fixture.date;
      } else {
        if (fixture.date < dateRange.earliest) dateRange.earliest = fixture.date;
        if (fixture.date > dateRange.latest) dateRange.latest = fixture.date;
      }
    });

    console.log(`  - Date range: ${dateRange.earliest} to ${dateRange.latest}`);
    console.log(`  - Unique teams: ${teamCounts.size}`);
    
    // Check if any team has wrong number of fixtures (should be 38 for each team)
    const incorrectCounts = Array.from(teamCounts.entries())
      .filter(([team, count]) => count !== 38)
      .slice(0, 5); // Show first 5 problematic teams
      
    if (incorrectCounts.length > 0) {
      console.log(`  - Teams with incorrect fixture counts:`, incorrectCounts);
    }
  }

  private saveFixtures(data: any[]) {
    this.ensureDataDir();
    const filePath = path.join(DATA_DIR, FILE_NAME);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
}

/* ------------------ Main Execution ------------------ */
async function main() {
  const scraper = new Scraper();
  await scraper.scrape();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
