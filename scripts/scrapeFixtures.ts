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
 * 5. Generates a unique `id` for each fixture to satisfy primary key.
 *
 * Requirements:
 * - Node 18+ (fetch built-in)
 * - Environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * ===============================================================
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

/* ------------------ Configuration Section ------------------ */
const FBREF_URL =
  'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';
const JSON_PATH = path.join(process.cwd(), 'data', 'fixtures.json');

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ------------------ Type Definitions ------------------ */
interface CellData {
  text: string;
  link?: string;
}

type RawRow = (string | CellData)[];

interface Fixture {
  id: string; // new unique ID
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
function cleanRow(row: RawRow): Fixture | null {
  const wkCell = row[0];
  const homeCell = row[4];
  const awayCell = row[8];
  const scoreCell = row[6];

  if (!wkCell || wkCell === '-') return null;
  if (!homeCell || !awayCell) return null;

  const matchweek = parseInt(wkCell as string, 10) || null;
  const hometeam = typeof homeCell === 'object' ? homeCell.text : (homeCell as string);
  const awayteam = typeof awayCell === 'object' ? awayCell.text : (awayCell as string);

  let homescore: number | null = null;
  let awayscore: number | null = null;
  if (scoreCell && typeof scoreCell === 'string' && scoreCell.includes('-')) {
    const [h, a] = scoreCell.split('-').map(s => parseInt(s.trim(), 10));
    homescore = isNaN(h) ? null : h;
    awayscore = isNaN(a) ? null : a;
  }

  const dateCell = row[2];
  let datetime = '';
  let matchurl: string | null = null;
  if (dateCell && typeof dateCell === 'object') {
    datetime = dateCell.text;
    matchurl = dateCell.link || null;
  } else if (typeof dateCell === 'string') {
    datetime = dateCell;
  }

  const status = homescore !== null && awayscore !== null ? 'finished' : 'scheduled';
  const venueCell = row[10];
  const venue = typeof venueCell === 'string' ? venueCell : '';

  // Generate unique ID for primary key
  const id = `${datetime}_${hometeam}_${awayteam}`.replace(/\s+/g, '_');

  return { id, datetime, hometeam, awayteam, homescore, awayscore, status, venue, matchweek, matchurl };
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

    const fixtures: Fixture[] = rows.map(cleanRow).filter(Boolean) as Fixture[];

    console.log(`Saving ${fixtures.length} fixtures to ${JSON_PATH}...`);
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(fixtures, null, 2), 'utf-8');

    console.log('Uploading to Supabase...');
    const { error } = await supabase.from('fixtures').upsert(fixtures, {
      onConflict: 'id', // now uses unique primary key
      defaultToNull: true,
    });

    if (error) {
      console.error('Supabase upsert error:', error);
    } else {
      console.log(`Successfully upserted ${fixtures.length} fixtures.`);
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

/* ------------------ Run Script ------------------ */
scrapeAndUpload();
