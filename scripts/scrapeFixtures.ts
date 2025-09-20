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
  datetime: string;  // Changed from dateTime to match DB
  hometeam: string;  // Changed from homeTeam to match DB
  awayteam: string;  // Changed from awayTeam to match DB
  homescore?: number; // Changed from homeScore to match DB
  awayscore?: number; // Changed from awayScore to match DB
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming';
  venue?: string;
  matchweek?: number; // Changed from matchWeek to match DB
  matchurl?: string;  // Changed from matchUrl to match DB
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

  // Look for matchweek info in section headers or other elements
  console.log('Looking for matchweek indicators...');
  
  // Check for any elements containing "Matchweek", "Week", "Wk", "Round"
  const matchweekElements = $('*:contains("Matchweek"), *:contains("Week"), *:contains("Wk"), *:contains("Round")');
  console.log(`Found ${matchweekElements.length} elements with week-related text`);
  matchweekElements.slice(0, 10).each((i, el) => {
    const text = $(el).text().trim();
    if (text.length < 200) { // Only show reasonably short text
      console.log(`  Week element ${i}: "${text}"`);
    }
  });

  // Check for thead rows or section dividers that might contain matchweek info
  const theadRows = table.find('tr.thead, tr[class*="thead"]');
  console.log(`Found ${theadRows.length} thead/header rows`);
  theadRows.each((i, el) => {
    console.log(`  Thead ${i}: "${$(el).text().trim()}"`);
  });

  // Alternative approach: Calculate matchweek based on date
  // Premier League usually starts mid-August and each matchweek is ~1 week apart
  function calculateMatchweek(dateStr: string): number {
    const matchDate = new Date(dateStr);
    
    // Season typically starts around August 15th - this is an approximation
    const seasonStart = new Date('2025-08-15'); // Adjust based on actual season start
    const daysDiff = Math.floor((matchDate.getTime() - seasonStart.getTime()) / (1000 * 60 * 60 * 24));
    
    // Each matchweek is roughly 7 days apart, but can vary
    const estimatedWeek = Math.max(1, Math.floor(daysDiff / 7) + 1);
    
    // Cap at 38 matchweeks (Premier League has 38 matchweeks)
    return Math.min(38, estimatedWeek);
  }

  let currentMatchWeek: number | undefined = undefined;

  table.find('tbody > tr').each((index, row) => {
    const $row = $(row);
    
    // Check if this is a section header row (thead class or similar)
    if ($row.hasClass('thead') || $row.attr('class')?.includes('thead')) {
      const headerText = $row.text().trim();
      console.log(`Found header row ${index}: "${headerText}"`);
      
      // Try to extract matchweek from header text
      const wkMatch = headerText.match(/(?:Matchweek|Week|Wk|Round)\s*(\d+)/i);
      if (wkMatch) {
        currentMatchWeek = parseInt(wkMatch[1], 10);
        console.log(`✅ Extracted matchweek ${currentMatchWeek} from header: "${headerText}"`);
      }
      return; // Skip processing this row as data
    }

    const dateStr = $row.find('td[data-stat="date"]').text()?.trim() ?? '';
    const homeTeam = normalizeTeamName($row.find('td[data-stat="home_team"]').text() ?? '');
    const awayTeam = normalizeTeamName($row.find('td[data-stat="away_team"]').text() ?? '');
    const scoreStr = $row.find('td[data-stat="score"]').text()?.trim() ?? '';
    const venue = $row.find('td[data-stat="venue"]').text()?.trim() ?? '';
    const matchUrl = $row.find('td[data-stat="match_report"] a').attr('href');
    const fullMatchUrl = matchUrl ? `https://fbref.com${matchUrl}` : undefined;

    // Look for matchweek in the gameweek column
    const gameweekStr = $row.find('td[data-stat="gameweek"]').text()?.trim() ?? '';
    let matchweek: number | undefined = undefined;
    
    if (gameweekStr && gameweekStr !== '') {
      const weekNum = parseInt(gameweekStr, 10);
      if (!isNaN(weekNum)) {
        matchweek = weekNum;
        currentMatchWeek = weekNum; // Update current matchweek
      }
    } else if (currentMatchWeek) {
      // Use the last known matchweek if this row doesn't have one
      matchweek = currentMatchWeek;
    } else if (dateStr) {
      // Fall back to date-based calculation
      matchweek = calculateMatchweek(dateStr);
    }

    // Debug log for first few rows
    if (index < 5) {
      console.log(`  Row ${index}: date="${dateStr}", gameweek="${gameweekStr}", calculated matchweek=${matchweek}, home="${homeTeam}", away="${awayTeam}"`);
    }

    if (!dateStr || !homeTeam || !awayTeam) {
      if (index < 10) {
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
      datetime: new Date(dateStr).toISOString(),
      hometeam: homeTeam,
      awayteam: awayTeam,
      homescore: homeScore,
      awayscore: awayScore,
      status,
      matchurl: fullMatchUrl,
      venue,
      matchweek: matchweek, // Use the calculated or extracted matchweek
    });
  });

  console.log(`✅ Successfully parsed ${fixtures.length} fixtures`);
  return fixtures;
}

// ---------- Check table schema ----------
async function checkTableSchema() {
  try {
    // Try to get table info by selecting with limit 0
    const { data, error } = await supabase
      .from('fixtures')
      .select('*')
      .limit(0);
    
    if (error) {
      console.error('❌ Error checking table schema:', error);
      return null;
    }
    
    console.log('✅ Table exists and is accessible');
    return true;
  } catch (err) {
    console.error('❌ Failed to check table schema:', err);
    return null;
  }
}

// ---------- Push to Supabase ----------
async function saveToSupabase(fixtures: RawFixture[]) {
  console.log(`Preparing to upsert ${fixtures.length} fixtures to Supabase...`);
  
  // Check table schema first
  const schemaCheck = await checkTableSchema();
  if (!schemaCheck) {
    console.error('❌ Cannot proceed - table schema check failed');
    return;
  }
  
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
    // Try with just the first fixture to test
    const testFixture = fixtures.slice(0, 1);
    console.log('Testing with single fixture:', JSON.stringify(testFixture[0], null, 2));
    
    const { data: testData, error: testError } = await supabase
      .from('fixtures')
      .upsert(testFixture, { onConflict: 'id' })
      .select();

    if (testError) {
      console.error('❌ Error with single fixture test:', testError);
      console.error('This suggests a column mismatch. Please check your Supabase table schema.');
      return;
    }
    
    console.log('✅ Single fixture test successful, proceeding with all fixtures...');

    // If test passed, do the full upsert
    const { data, error } = await supabase
      .from('fixtures')
      .upsert(fixtures, { onConflict: 'id' })
      .select();

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
