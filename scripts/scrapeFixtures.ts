// scripts/scrapeAndUpload.ts
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import cheerio from 'cheerio';

// ---------- CONFIG ----------
const FBREF_URL = 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';
const JSON_PATH = path.join(process.cwd(), 'data', 'fixtures.json');

// Use environment variables for security
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ---------- HELPER FUNCTIONS ----------
interface CellData {
  text: string;
  link?: string;
}

interface RawRow extends Array<string | CellData> {}

interface Fixture {
  datetime: string;
  hometeam: string;
  awayteam: string;
  homescore: number | null;
  awayscore: number | null;
  status: string;
  venue: string;
  matchweek: number | null;
  matchurl: string | null;
}

function cleanRow(row: RawRow): Fixture | null {
  // Skip rows where Wk is missing or '-'
  const wkCell = row[0];
  const homeCell = row[4];
  const awayCell = row[8];
  const scoreCell = row[6];

  if (!wkCell || wkCell === '-') return null;
  if (!homeCell || !awayCell) return null;

  // Extract matchweek
  const matchweek = parseInt(wkCell as string, 10) || null;

  // Extract teams
  const hometeam = typeof homeCell === 'object' ? homeCell.text : (homeCell as string);
  const awayteam = typeof awayCell === 'object' ? awayCell.text : (awayCell as string);

  // Extract score
  let homescore: number | null = null;
  let awayscore: number | null = null;
  if (scoreCell && typeof scoreCell === 'string' && scoreCell.includes('-')) {
    const [h, a] = scoreCell.split('-').map(s => parseInt(s.trim(), 10));
    homescore = isNaN(h) ? null : h;
    awayscore = isNaN(a) ? null : a;
  }

  // Extract date & URL
  const dateCell = row[2];
  let datetime = '';
  let matchurl: string | null = null;
  if (dateCell && typeof dateCell === 'object') {
    datetime = dateCell.text;
    matchurl = dateCell.link || null;
  } else if (typeof dateCell === 'string') {
    datetime = dateCell;
  }

  // Status is inferred from score
  const status = homescore !== null && awayscore !== null ? 'Played' : 'Scheduled';

  // Venue
  const venueCell = row[10];
  const venue = typeof venueCell === 'string' ? venueCell : '';

  return {
    datetime,
    hometeam,
    awayteam,
    homescore,
    awayscore,
    status,
    venue,
    matchweek,
    matchurl,
  };
}

// ---------- MAIN FUNCTION ----------
async function scrapeAndUpload() {
  try {
    console.log('Fetching FBref page...');
    const res = await fetch(FBREF_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DataScraper/1.0)',
        'Accept': 'text/html',
      },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const html = await res.text();

    console.log('Parsing HTML with Cheerio...');
    const $ = cheerio.load(html);

    const table = $('table#sched_2025-2026_9_1'); // main fixtures table
    if (!table) throw new Error('Fixtures table not found');

    const rows: RawRow[] = [];
    table.find('tbody tr').each((_, tr) => {
      const row: RawRow = [];
      $(tr).find('td, th').each((_, cell) => {
        const $cell = $(cell);
        const text = $cell.text().trim();
        const link = $cell.find('a').attr('href');
        if (link) {
          row.push({ text, link: link.startsWith('/') ? `https://fbref.com${link}` : link });
        } else {
          row.push(text);
        }
      });
      rows.push(row);
    });

    console.log(`Raw rows fetched: ${rows.length}`);
    const fixtures: Fixture[] = rows.map(cleanRow).filter(Boolean) as Fixture[];

    console.log(`Cleaned fixtures count: ${fixtures.length}`);
    if (fixtures.length !== 380) {
      console.warn('⚠️ Expected 380 fixtures, got', fixtures.length);
    }

    // Save JSON file
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(fixtures, null, 2), 'utf-8');
    console.log(`Fixtures saved to ${JSON_PATH}`);

    // Upload to Supabase
    console.log('Uploading fixtures to Supabase...');
    const { error } = await supabase.from('fixtures').upsert(fixtures, {
      onConflict: ['datetime', 'hometeam', 'awayteam'], // avoid duplicates
    });

    if (error) throw error;
    console.log('Fixtures uploaded successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

// Run the script
scrapeAndUpload();
