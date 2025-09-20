import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// ---------- ESM fix for __dirname ----------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---------- Output file ----------
const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'fixtures.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ---------- Supabase client ----------
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------- Fixture types ----------
interface RawFixture {
  id: string;
  datetime: string;
  hometeam: string;
  awayteam: string;
  homescore?: number;
  awayscore?: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming';
  venue?: string;
  matchweek?: number;
  matchurl?: string;
}

// ---------- Helpers ----------
function normalizeTeamName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

// ---------- FBref Premier League schedule URL ----------
const LEAGUE_FIXTURES_URL =
  'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';

// ---------- Scraper function ----------
async function scrapeFixtures(): Promise<RawFixture[]> {
  console.log('Fetching fixtures from FBref...');
  
  let res;
  try {
    res = await axios.get(LEAGUE_FIXTURES_URL, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    console.log(`✅ Successfully fetched page (${res.data.length} bytes)`);
  } catch (httpError) {
    console.error('❌ Failed to fetch fixtures page:', httpError);
    throw httpError;
  }

  const $ = cheerio.load(res.data);
  const fixtures: RawFixture[] = [];

  const table = $('table[id^="sched_"]');
  if (!table || table.length === 0) {
    throw new Error('Fixtures table not found');
  }

  let currentMatchWeek: number | undefined = undefined;

  function calculateMatchweek(dateStr: string): number {
    const matchDate = new Date(dateStr);
    const seasonStart = new Date('2025-08-15'); // adjust season start as needed
    const daysDiff = Math.floor((matchDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    const estimatedWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
    return Math.min(38, estimatedWeek);
  }

  table.find('tbody > tr').each((index, row) => {
    const $row = $(row);

    // Skip header rows
    if ($row.hasClass('thead') || $row.attr('class')?.includes('thead')) {
      const headerText = $row.text().trim();
      const wkMatch = headerText.match(/(?:Matchweek|Week|Wk|Round)\s*(\d+)/i);
      if (wkMatch) {
        currentMatchWeek = parseInt(wkMatch[1], 10);
      }
      return;
    }

    const dateStr = $row.find('td[data-stat="date"]').text()?.trim() ?? '';
    const timeStr = $row.find('td[data-stat="start_time"]').text()?.trim() ?? '00:00'; // fallback
    const homeTeam = normalizeTeamName($row.find('td[data-stat="home_team"]').text() ?? '');
    const awayTeam = normalizeTeamName($row.find('td[data-stat="away_team"]').text() ?? '');
    const scoreStr = $row.find('td[data-stat="score"]').text()?.trim() ?? '';
    const venue = $row.find('td[data-stat="venue"]').text()?.trim() ?? '';
    const matchUrl = $row.find('td[data-stat="match_report"] a').attr('href');
    const fullMatchUrl = matchUrl ? `https://fbref.com${matchUrl}` : undefined;

    let matchweek: number | undefined;
    const gameweekStr = $row.find('td[data-stat="gameweek"]').text()?.trim() ?? '';
    if (gameweekStr && gameweekStr !== '') {
      const weekNum = parseInt(gameweekStr, 10);
      if (!isNaN(weekNum)) {
        matchweek = weekNum;
        currentMatchWeek = weekNum;
      }
    } else if (currentMatchWeek) {
      matchweek = currentMatchWeek;
    } else if (dateStr) {
      matchweek = calculateMatchweek(dateStr);
    }

    if (!dateStr || !homeTeam || !awayTeam) return;

    // Combine date + time for ISO datetime
    const datetime = new Date(`${dateStr} ${timeStr}`).toISOString();

    let homeScore: number | undefined;
    let awayScore: number | undefined;
    let status: RawFixture['status'] = 'scheduled';

    if (scoreStr.includes('–')) {
      const [h, a] = scoreStr.split('–').map(s => parseInt(s.trim(), 10));
      if (!isNaN(h) && !isNaN(a)) {
        homeScore = h;
        awayScore = a;
        status = 'finished';
      }
    } else if (scoreStr.toLowerCase().includes('postponed')) {
      status = 'postponed';
    }

    fixtures.push({
      id: `fbref-${homeTeam}-${awayTeam}-${dateStr}`.replace(/\s+/g, '-'),
      datetime,
      hometeam: homeTeam,
      awayteam: awayTeam,
      homescore: homeScore,
      awayscore: awayScore,
      status,
      matchurl: fullMatchUrl,
      venue,
      matchweek,
    });
  });

  console.log(`✅ Successfully parsed ${fixtures.length} fixtures`);
  return fixtures;
}

// ---------- Supabase functions ----------
async function checkTableSchema() {
  try {
    const { data, error } = await supabase.from('fixtures').select('*').limit(0);
    if (error) {
      console.error('❌ Error checking table schema:', error);
      return null;
    }
    return true;
  } catch (err) {
    console.error('❌ Failed to check table schema:', err);
    return null;
  }
}

async function saveToSupabase(fixtures: RawFixture[]) {
  const schemaCheck = await checkTableSchema();
  if (!schemaCheck) return;

  try {
    const { data, error } = await supabase
      .from('fixtures')
      .upsert(fixtures, { onConflict: 'id' })
      .select();
    if (error) console.error('❌ Error saving to Supabase:', error);
    else console.log(`✅ Successfully saved ${data?.length || 0} fixtures to Supabase`);
  } catch (upsertError) {
    console.error('❌ Upsert operation failed:', upsertError);
  }
}

// ---------- Run scraper ----------
async function run() {
  try {
    console.log('Starting fixture scraping...');
    const fixtures = await scrapeFixtures();

    // Save to JSON file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fixtures, null, 2));
    console.log(`✅ Successfully saved ${fixtures.length} fixtures to ${OUTPUT_FILE}`);

    // Save to Supabase
    await saveToSupabase(fixtures);
  } catch (err) {
    console.error('❌ Error in main process:', err);
  }
}

run();
