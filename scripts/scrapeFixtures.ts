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

private extractFixturesTables($: cheerio.CheerioAPI): TableData[] {
  const tables: TableData[] = [];

  // Only tables with class "matches" are actual fixtures tables
  $('table.matches').each((_, tableElement) => {
    const $table = $(tableElement);
    const id = $table.attr('id') || `matches-${tables.length}`;
    
    // Extract headers
    const headers: string[] = [];
    $table.find('thead th').each((_, h) => headers.push($(h).text().trim()));

    // Extract all rows
    const rows: (string | CellData)[][] = [];
    $table.find('tbody tr').each((_, rowEl) => {
      const $row = $(rowEl);
      const rowData: (string | CellData)[] = [];

      $row.find('td').each((_, cellEl) => {
        const $cell = $(cellEl);
        const text = $cell.text().trim();
        const link = $cell.find('a').attr('href');

        if (link && link.startsWith('/')) rowData.push({ text, link: `https://fbref.com${link}` });
        else if (link && link.startsWith('http')) rowData.push({ text, link });
        else rowData.push(text);
      });

      if (rowData.length > 0) rows.push(rowData);
    });

    if (headers.length > 0 && rows.length > 0) {
      console.log(`🎯 Found fixtures table: ${id}, Rows: ${rows.length}`);
      tables.push({ id, caption: '', headers, rows });
    }
  });

  return tables;
}

private convertTableToFixtures(table: TableData): ScrapedFixture[] {
  const fixtures: ScrapedFixture[] = [];
  const seenFixtures = new Set<string>();

  console.log(`\n🔄 Converting table ${table.id} to fixtures...`);
  console.log(`📋 Headers: ${table.headers.join(' | ')}`);

  // Map headers to column indexes
  const headerLower = table.headers.map(h => h.toLowerCase());
  const idxDate = headerLower.indexOf('date');
  const idxTime = headerLower.indexOf('time');
  const idxHome = headerLower.indexOf('home');
  const idxAway = headerLower.indexOf('away');
  const idxScore = headerLower.indexOf('score');
  const idxVenue = headerLower.indexOf('venue');
  const idxMatchReport = headerLower.indexOf('match report');
  const idxMatchweek = headerLower.indexOf('matchweek');

  console.log('🗺️ Column mapping:', { idxDate, idxTime, idxHome, idxAway, idxScore, idxVenue, idxMatchReport, idxMatchweek });

  table.rows.forEach((row, rowIndex) => {
    const getCellText = (idx: number) => (row[idx] ? (typeof row[idx] === 'string' ? row[idx] : row[idx].text) : '');
    const getCellLink = (idx: number) => (row[idx] && typeof row[idx] === 'object' ? row[idx].link : undefined);

    const dateStr = getCellText(idxDate).trim();
    const timeStr = getCellText(idxTime).trim() || '00:00';
    const homeTeam = getCellText(idxHome).trim();
    const awayTeam = getCellText(idxAway).trim();
    const scoreStr = getCellText(idxScore).trim();
    const venue = getCellText(idxVenue).trim() || undefined;
    const matchUrl = getCellLink(idxMatchReport);
    const matchweekStr = getCellText(idxMatchweek).trim();
    const matchweek = matchweekStr ? parseInt(matchweekStr, 10) : null;

    if (!dateStr || !homeTeam || !awayTeam) return;

    let homescore: number | null = null;
    let awayscore: number | null = null;
    if (scoreStr && (scoreStr.includes('–') || scoreStr.includes('-'))) {
      const [home, away] = scoreStr.replace('-', '–').split('–');
      homescore = parseInt(home.trim(), 10);
      awayscore = parseInt(away.trim(), 10);
    }

    let status: 'scheduled' | 'finished' | 'live' | 'postponed' = 'scheduled';
    if (homescore !== null && awayscore !== null) status = 'finished';

    const fixture: ScrapedFixture = {
      date: dateStr,
      time: timeStr,
      homeTeam,
      awayTeam,
      score: scoreStr,
      homeScore: homescore,
      awayScore: awayscore,
      venue,
      matchweek,
      matchURL: matchUrl,
      status,
    };

    const fixtureKey = `${fixture.date}-${homeTeam}-${awayTeam}`;
    if (!seenFixtures.has(fixtureKey)) {
      fixtures.push(fixture);
      seenFixtures.add(fixtureKey);

      if (fixtures.length <= 5) {
        console.log(`✅ Sample fixture: ${homeTeam} vs ${awayTeam} on ${dateStr} (${status})`);
      }
    }
  });

  console.log(`\n📈 Conversion summary: ${fixtures.length} fixtures extracted`);
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
