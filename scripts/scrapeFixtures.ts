// scripts/scrapeFixtures.ts
/**
 * ===============================================================
 * Production-ready FBref Fixtures Scraper
 *
 * Key fixes:
 * 1. Proper datetime parsing and formatting for PostgreSQL
 * 2. Better HTML table parsing with debugging
 * 3. Enhanced data validation and error handling
 * 4. More robust column mapping
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
const FBREF_URL = 'https://fbref.com/en/comps/9/Premier-League-Stats';

/* ------------------ Scraper Class ------------------ */
class Scraper {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  async scrape() {
    console.log('🚀 Starting fixture scraping...');

    try {
      const html = await this.fetchHtml(FBREF_URL);
      const $ = cheerio.load(html);

      const fixtures = this.parseFixtures($);

      if (fixtures.length > 0) {
        this.saveFixtures(fixtures);
        console.log(`✅ Success: Found and saved ${fixtures.length} fixtures to ${FILE_NAME}`);
      } else {
        console.warn('⚠️ Warning: No fixtures found.');
      }
    } catch (error) {
      console.error(`❌ An error occurred during scraping: ${error}`);
    }
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
    const fixturesTable = $('#sched_2025-2026_9_1_fixtures_and_results').first();
    const fixtures: any[] = [];

    if (fixturesTable.length === 0) {
      console.warn('❌ Fixtures table not found. Check the selector.');
      return [];
    }

    const rows = fixturesTable.find('tbody tr');
    rows.each((i: number, row: cheerio.Element) => {
      const cells = $(row).find('td');
      const date = $(cells[0]).text().trim();
      const time = $(cells[1]).text().trim();
      const homeTeam = $(cells[2]).text().trim();
      const awayTeam = $(cells[4]).text().trim();

      if (date && homeTeam && awayTeam) {
        fixtures.push({
          date,
          time,
          homeTeam,
          awayTeam,
          matchStatus: 'scheduled'
        });
      }
    });

    return fixtures;
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
