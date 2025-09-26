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

    rows.each((i: number, row: any) => {
      const cells = $(row).find('td');
      
      if (cells.length < 5) {
        return; // Skip rows with insufficient columns
      }

      const date = $(cells[0]).text().trim();
      const time = $(cells[1]).text().trim();
      const homeTeam = $(cells[2]).text().trim();
      const awayTeam = $(cells[4]).text().trim();

      // Debug first few rows
      if (i < 3) {
        console.log(`Row ${i}: Date: "${date}", Time: "${time}", Home: "${homeTeam}", Away: "${awayTeam}"`);
      }

      if (date && homeTeam && awayTeam) {
        fixtures.push({
          date,
          time,
          homeTeam,
          awayTeam,
          matchStatus: this.determineMatchStatus($(cells[5]).text().trim())
        });
      }
    });

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
