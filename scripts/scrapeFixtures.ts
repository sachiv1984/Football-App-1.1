// scripts/scrapeFixtures.ts
/**
 * ===============================================================
 * Production-ready FBref Fixtures Scraper
 * 
 * Features:
 * 1. Fetches Premier League fixtures from FBref.
 * 2. Cleans and structures the data.
 * 3. Saves JSON to `data/fixtures.json` (overwriting existing file).
 * 4. Uploads the cleaned data to Supabase `fixtures` table.
 * 
 * Requirements:
 * - Node 18+ (fetch built-in)
 * - Environment variables: SUPABASE_URL, SUPABASE_KEY
 * ===============================================================
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

/* ------------------ Configuration Section ------------------ */
// FBref URL for Premier League fixtures
const FBREF_URL =
  'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';

// JSON file path (saved locally)
const JSON_PATH = path.join(process.cwd(), 'data', 'fixtures.json');

// Supabase client setup
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ------------------ Type Definitions ------------------ */
// Individual cell in a row can be a string or an object with text + link
interface CellData {
  text: string;
  link?: string;
}

// Raw row from the table (array of strings or CellData)
type RawRow = (string | CellData)[];

// Cleaned fixture object to match Supabase schema
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

/* ------------------ Data Cleaning Function ------------------ */
/**
 * Convert a raw row from the table into a Fixture object.
 * Returns null if the row is invalid (e.g., empty rows or filler rows)
 */
function cleanRow(row: RawRow): Fixture | null {
  const wkCell = row[0];
  const homeCell = row[4];
  const awayCell = row[8];
  const scoreCell = row[6];

  // Skip rows without a valid matchweek
  if (!wkCell || wkCell === '-') return null;
  if (!homeCell || !awayCell) return null;

  // Parse numeric values
  const matchweek = parseInt(wkCell as string, 10) || null;
  const hometeam = typeof homeCell === 'object' ? homeCell.text : (homeCell as string);
  const awayteam = typeof awayCell === 'object' ? awayCell.text : (awayCell as string);

  // Parse score if available
  let homescore: number | null = null;
  let awayscore: number | null = null;
  if (scoreCell && typeof scoreCell === 'string' && scoreCell.includes('-')) {
    const [h, a] = scoreCell.split('-').map(s => parseInt(s.trim(), 10));
    homescore = isNaN(h) ? null : h;
    awayscore = isNaN(a) ? null : a;
  }

  // Parse date and optional link to match page
  const dateCell = row[2];
  let datetime = '';
  let matchurl: string | null = null;
  if (dateCell && typeof dateCell === 'object') {
    datetime = dateCell.text;
    matchurl = dateCell.link || null;
  } else if (typeof dateCell === 'string') {
    datetime = dateCell;
  }

  // Determine status: Played vs Scheduled
  const status = homescore !== null && awayscore !== null ? 'Played' : 'Scheduled';

  // Venue
  const venueCell = row[10];
  const venue = typeof venueCell === 'string' ? venueCell : '';

  return { datetime, hometeam, awayteam, homescore, awayscore, status, venue, matchweek, matchurl };
}

/* ------------------ Main Scrape & Upload Function ------------------ */
async function scrapeAndUpload() {
  try {
    console.log('Fetching FBref fixtures page...');
    const res = await fetch(FBREF_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/html' },
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
    const html = await res.text();

    console.log('Parsing HTML with Cheerio...');
    const $ = cheerio.load(html);

    // Target the fixtures table by ID
    const table = $('table#sched_2025-2026_9_1');

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

    // Clean rows and remove invalid/filler rows
    const fixtures: Fixture[] = rows.map(cleanRow).filter(Boolean) as Fixture[];

    console.log(`Saving ${fixtures.length} fixtures to ${JSON_PATH}...`);
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(fixtures, null, 2), 'utf-8');

    console.log('Uploading to Supabase...');
    const { error } = await supabase.from('fixtures').upsert(fixtures, {
      onConflict: 'datetime', // conflict key must be a single string column
      defaultToNull: true,
    });
    if (error) throw error;

    console.log('Scrape and upload complete!');
  } catch (err) {
    console.error('Error:', err);
  }
}

/* ------------------ Run Script ------------------ */
scrapeAndUpload();
