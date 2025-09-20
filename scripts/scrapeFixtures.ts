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

// ---------- Fixture type ----------
interface RawFixture {
  id: string;
  dateTime: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming';
  venue?: string;
  matchWeek?: number;
  matchUrl?: string;
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

  // Look for the fixtures table
  const table = $('table[id^="sched_"]');
  console.log(`Found ${table.length} table(s) with fixture data`);
  
  if (!table || table.length === 0) {
    console.error('❌ Fixtures table not found');
    // Log available tables for debugging
    const allTables = $('table');
    console.log(`Available tables: ${allTables.length}`);
    allTables.each((i, el) => {
      const id = $(el).attr('id');
      const className = $(el).attr('class');
      console.log(`  Table ${i}: id="${id}", class="${className}"`);
    });
    throw new Error('Fixtures table not found');
  }

  const rows = table.find('tbody > tr');
  console.log(`Found ${rows.length} rows in fixtures table`);

  table.find('tbody > tr').each((index, row) => {
    const $row = $(row);
    if ($row.hasClass('thead')) {
      console.log(`Skipping header row ${index}`);
      return;
    }

    const dateStr = $row.find('td[data-stat="date"]').text()?.trim() ?? '';
    const homeTeam = normalizeTeamName($row.find('td[data-stat="home_team"]').text() ?? '');
    const awayTeam = normalizeTeamName($row.find('td[data-stat="away_team"]').text() ?? '');
    const scoreStr = $row.find('td[data-stat="score"]').text()?.trim() ?? '';
    const venue = $row.find('td[data-stat="venue"]').text()?.trim() ?? '';
    const matchUrl = $row.find('td[data-stat="match_report"] a').attr('href');
    const fullMatchUrl = matchUrl ? `https://fbref.com${matchUrl}` : undefined;

    // Debug log for first few rows
    if (index < 3) {
      console.log(`Row ${index}: date="${dateStr}", home="${homeTeam}", away="${awayTeam}", score="${scoreStr}"`);
    }

    if (!dateStr || !homeTeam || !awayTeam) {
      if (index < 10) { // Only log first 10 skipped rows to avoid spam
        console.log(`Skipping row ${index}: missing data (date="${dateStr}", home="${homeTeam}", away="${awayTeam}")`);
      }
      return;
    }

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
      dateTime: new Date(dateStr).toISOString(),
      homeTeam,
      awayTeam,
      homeScore,
      awayScore,
      status,
      matchUrl: fullMatchUrl,
      venue,
      matchWeek: undefined,
    });
  });

  console.log(`✅ Successfully parsed ${fixtures.length} fixtures`);
  return fixtures;
}

// ---------- Push to Supabase ----------
async function saveToSupabase(fixtures: RawFixture[]) {
  console.log(`Preparing to upsert ${fixtures.length} fixtures to Supabase...`);
  
  // Check Supabase connection
  try {
    const { data: testData, error: testError } = await supabase
      .from('fixtures')
      .select('count', { count: 'exact', head: true });
    
    if (testError) {
      console.error('❌ Supabase connection test failed:', testError);
      return;
    }
    console.log('✅ Supabase connection successful');
  } catch (connectionError) {
    console.error('❌ Failed to connect to Supabase:', connectionError);
    return;
  }

  // Perform the upsert
  try {
    const { data, error } = await supabase
      .from('fixtures')
      .upsert(fixtures, { onConflict: 'id' })
      .select(); // Add select() to return the upserted data

    if (error) {
      console.error('❌ Error saving to Supabase:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
    } else {
      console.log(`✅ Successfully saved ${data?.length || 0} fixtures to Supabase`);
      
      // Verify data was saved
      const { data: countData, error: countError } = await supabase
        .from('fixtures')
        .select('count', { count: 'exact', head: true });
        
      if (!countError && countData) {
        console.log(`Total fixtures in database: ${(countData as any).count || 0}`);
      }
    }
  } catch (upsertError) {
    console.error('❌ Upsert operation failed:', upsertError);
  }
}

// ---------- Run scraper ----------
async function run() {
  try {
    console.log('Starting fixture scraping...');
    console.log('Target URL:', LEAGUE_FIXTURES_URL);
    console.log('Output file:', OUTPUT_FILE);
    
    const fixtures = await scrapeFixtures();
    console.log(`Raw fixtures scraped: ${fixtures.length}`);
    
    // Log first fixture for debugging
    if (fixtures.length > 0) {
      console.log('First fixture sample:', JSON.stringify(fixtures[0], null, 2));
    } else {
      console.log('⚠️ No fixtures were scraped!');
      return;
    }

    // Save to JSON file
    try {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fixtures, null, 2));
      console.log(`✅ Successfully saved ${fixtures.length} fixtures to ${OUTPUT_FILE}`);
      
      // Verify file was written
      const fileStats = fs.statSync(OUTPUT_FILE);
      console.log(`File size: ${fileStats.size} bytes, modified: ${fileStats.mtime}`);
    } catch (fileError) {
      console.error('❌ Error writing to file:', fileError);
      return;
    }

    // Save to Supabase
    console.log('Attempting to save to Supabase...');
    await saveToSupabase(fixtures);
    
  } catch (err) {
    console.error('❌ Error in main process:', err);
    if (err instanceof Error) {
      console.error('Error message:', err.message);
      console.error('Stack trace:', err.stack);
    }
  }
}

run();
