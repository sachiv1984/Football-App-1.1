// scripts/scrapeFixtures.ts
/**
 * ===============================================================
 * FBref Premier League Fixtures Scraper with Supabase Integration
 *
 * Fully self-contained version: no external config required.
 * Maps scraped fixtures to Supabase table with proper types.
 * ===============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

/* ------------------ Paths ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = process.cwd();
const DATA_DIR = path.join(PROJECT_ROOT, 'data');
const FILE_NAME = 'Fixtures.json';

/* ------------------ Supabase Setup ------------------ */
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ------------------ Embedded Config ------------------ */
const FIXTURES_CONFIG = {
  BASE_URL: 'https://fbref.com',
  FIXTURES_URL: 'https://fbref.com/en/comps/9/Premier-League-Scores-and-Fixtures',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  EXPECTED_FIXTURES_COUNT: 380,
  EXPECTED_TEAMS_COUNT: 20,
  GAMES_PER_TEAM: 38,
  SUPABASE_TABLE: 'fixtures',
  FIELD_MAPPINGS: {
    Date: 'match_date',
    Time: 'match_time',
    HomeTeam: 'hometeam',
    AwayTeam: 'awayteam',
    Score: 'score',
    HomeScore: 'homescore',
    AwayScore: 'awayscore',
    Venue: 'venue',
    Matchweek: 'matchweek',
    MatchURL: 'matchurl',
    Status: 'status',
  },
};

/* ------------------ Types ------------------ */
interface CellData {
  text: string;
  link?: string;
}

interface TableData {
  id: string;
  caption: string;
  headers: string[];
  rows: (string | CellData)[][];
}

interface ScrapedFixture {
  date: string;
  time?: string;
  homeTeam: string;
  awayTeam: string;
  score?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  venue?: string;
  matchweek?: number | null;
  matchURL?: string;
  status?: 'scheduled' | 'finished' | 'live' | 'postponed';
}

interface SupabaseFixture {
  id: string;
  datetime: string;
  hometeam: string;
  awayteam: string;
  homescore?: number | null;
  awayscore?: number | null;
  status: 'scheduled' | 'finished' | 'live' | 'postponed';
  venue?: string;
  matchweek?: number | null;
  matchurl?: string;
}

/* ------------------ Scraper Class ------------------ */
class FixturesScraper {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  async scrape() {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase credentials.');
      return;
    }

    console.log('🚀 Scraping Premier League fixtures...');
    const html = await this.fetchHtml(FIXTURES_CONFIG.FIXTURES_URL);
    const $ = cheerio.load(html);
    const tables = this.extractTables($);

    const fixturesTable = this.findFixturesTable(tables);
    if (!fixturesTable) {
      console.error('❌ Fixtures table not found.');
      return;
    }

    const scrapedFixtures = this.convertTableToFixtures(fixturesTable);
    const supabaseFixtures = this.convertToSupabaseFormat(scrapedFixtures);

    await this.saveToFile(scrapedFixtures);
    await this.upsertToSupabase(supabaseFixtures);

    console.log(`🎉 Scraping completed. ${scrapedFixtures.length} fixtures processed.`);
  }

  private async fetchHtml(url: string): Promise<string> {
    console.log(`🔍 Fetching: ${url}`);
    const response = await fetch(url, { headers: { 'User-Agent': FIXTURES_CONFIG.USER_AGENT } });
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    return response.text();
  }

private extractTables($: cheerio.CheerioAPI): TableData[] {
  const tables: TableData[] = [];

  $('table').each((_, tableElement) => {
    const $table = $(tableElement);
    const id = $table.attr('id') || `table-${tables.length}`;

    // Get table caption/title
    let caption = $table.find('caption').text().trim();
    if (!caption) {
      caption = $table.prev('h2, h3').text().trim() ||
                $table.closest('div').find('h2, h3').first().text().trim() ||
                `Table ${tables.length + 1}`;
    }

   // Extract headers (all th and td in first row if <thead> missing)
const headers: string[] = [];
const $thead = $table.find('thead');
if ($thead.length > 0) {
  $thead.find('th, td').each((_, h) => {
    headers.push($(h).text().trim());
    return; // explicitly void
  });
} else {
  $table.find('tr:first th, tr:first td').each((_, h) => {
    headers.push($(h).text().trim());
    return; // explicitly void
  });
}


    // Extract all rows
    const rows: (string | CellData)[][] = [];
    $table.find('tbody tr, tr').each((_, rowElement) => {
      const $row = $(rowElement);
      const rowData: (string | CellData)[] = [];

      $row.find('td, th').each((_, cellElement) => {
        const $cell = $(cellElement);
        const text = $cell.text().trim();
        const link = $cell.find('a').attr('href');

        if (link && link.startsWith('/')) {
          rowData.push({ text, link: `https://fbref.com${link}` });
        } else if (link && link.startsWith('http')) {
          rowData.push({ text, link });
        } else {
          rowData.push(text);
        }
      });

      if (rowData.length > 0) {
        rows.push(rowData);
      }
    });

    // Only include tables with meaningful data
    if (headers.length > 0 && rows.length > 0) {
      tables.push({ id, caption, headers, rows });
    }
  });

  return tables;
}

private findFixturesTable(tables: TableData[]): TableData | null {
  for (const table of tables) {
    const caption = table.caption.toLowerCase();
    const headers = table.headers.map(h => h.toLowerCase()).join(' ');

    const hasFixtureIndicators = (
      caption.includes('fixture') ||
      caption.includes('schedule') ||
      caption.includes('scores') ||
      headers.includes('date') ||
      headers.includes('time') ||
      headers.includes('home') ||
      headers.includes('away')
    );

    if (hasFixtureIndicators) {
      console.log(`🎯 Found potential fixtures table: "${table.caption}"`);
      console.log(`   Headers: ${table.headers.join(', ')}`);
      console.log(`   Rows: ${table.rows.length}`);
      return table;
    }
  }

  return null;
}

  private convertTableToFixtures(table: TableData): ScrapedFixture[] {
    const fixtures: ScrapedFixture[] = [];
    const colMap: Record<string, number> = {};
    table.headers.forEach((h, i) => (colMap[h.toLowerCase()] = i));

    for (const row of table.rows) {
      const date = row[colMap['date']] ? (row[colMap['date']] as string).trim() : null;
      const homeTeam = row[colMap['home']] ? (row[colMap['home']] as string).trim() : null;
      const awayTeam = row[colMap['away']] ? (row[colMap['away']] as string).trim() : null;
      if (!date || !homeTeam || !awayTeam) continue;

      const time = colMap['time'] !== undefined ? (row[colMap['time']] as string).trim() : undefined;
      const score = colMap['score'] !== undefined ? (row[colMap['score']] as string).trim() : undefined;
      let homeScore: number | null = null;
      let awayScore: number | null = null;
      if (score && (score.includes('–') || score.includes('-'))) {
        const [h, a] = score.replace('-', '–').split('–');
        homeScore = parseInt(h.trim(), 10);
        awayScore = parseInt(a.trim(), 10);
      }
      const venue = colMap['venue'] !== undefined ? (row[colMap['venue']] as string).trim() : undefined;
      const matchweek = colMap['matchweek'] !== undefined ? parseInt((row[colMap['matchweek']] as string).trim(), 10) : null;
      const matchURL = colMap['matchurl'] !== undefined ? (row[colMap['matchurl']] as CellData).link : undefined;

      const status = homeScore !== null && awayScore !== null ? 'finished' : 'scheduled';

      fixtures.push({ date, time, homeTeam, awayTeam, score, homeScore, awayScore, venue, matchweek, matchURL, status });
    }

    return fixtures;
  }

  private convertToSupabaseFormat(scraped: ScrapedFixture[]): SupabaseFixture[] {
    return scraped.map(f => {
      const datetime = new Date(`${f.date}T${f.time || '00:00'}:00Z`).toISOString();
      const id = `${f.homeTeam}_${f.date}_${f.awayTeam}`.replace(/\s+/g, '_');
      return {
        id,
        datetime,
        hometeam: f.homeTeam,
        awayteam: f.awayTeam,
        homescore: f.homeScore ?? null,
        awayscore: f.awayScore ?? null,
        status: f.status ?? 'scheduled',
        venue: f.venue,
        matchweek: f.matchweek ?? null,
        matchurl: f.matchURL,
      };
    });
  }

  private async saveToFile(fixtures: ScrapedFixture[]) {
    this.ensureDataDir();
    const filePath = path.join(DATA_DIR, FILE_NAME);
    fs.writeFileSync(filePath, JSON.stringify(fixtures, null, 2), 'utf8');
    console.log(`💾 Backup saved: ${filePath}`);
  }

  private async upsertToSupabase(fixtures: SupabaseFixture[]) {
    const batchSize = 100;
    for (let i = 0; i < fixtures.length; i += batchSize) {
      const batch = fixtures.slice(i, i + batchSize);
      const { error } = await supabase.from(FIXTURES_CONFIG.SUPABASE_TABLE).upsert(batch, { onConflict: 'id' });
      if (error) console.error('❌ Upsert batch failed:', error.message);
      else console.log(`✅ Upserted batch ${Math.floor(i / batchSize) + 1}`);
    }
  }
}

/* ------------------ Main ------------------ */
(async () => {
  const scraper = new FixturesScraper();
  await scraper.scrape();
})();
