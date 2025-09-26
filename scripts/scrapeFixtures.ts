// scripts/scrapeFixtures.ts
/**
 * ===============================================================
 * Production-ready FBref Fixtures Scraper - FIXED VERSION
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
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

/* ------------------ Configuration Section ------------------ */
const FBREF_URL =
  'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';

const JSON_PATH = path.join(process.cwd(), 'data', 'fixtures.json');

// Supabase client setup
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
  id: string;
  datetime: string; // Will be converted to ISO string for PostgreSQL
  hometeam: string;
  awayteam: string;
  homescore: number | null;
  awayscore: number | null;
  status: string;
  venue: string | null;
  matchweek: number | null;
  matchurl: string | null;
}

/* ------------------ Helper Functions ------------------ */

/**
 * Parse FBref date format to ISO string
 * Expected formats: "2024-08-17", "2024-08-17 15:00", etc.
 */
function parseDateTime(dateStr: string, timeStr?: string): string {
  try {
    let fullDateStr = dateStr.trim();
    
    // If we have a separate time string, combine them
    if (timeStr && timeStr.trim()) {
      fullDateStr += ` ${timeStr.trim()}`;
    }
    
    // Handle various FBref date formats
    const date = new Date(fullDateStr);
    
    // If date is invalid, try different parsing
    if (isNaN(date.getTime())) {
      // Try parsing just the date part and assume 15:00 UTC
      const dateOnly = new Date(dateStr.trim());
      if (!isNaN(dateOnly.getTime())) {
        dateOnly.setUTCHours(15, 0, 0, 0); // Default to 3 PM UTC
        return dateOnly.toISOString();
      }
      
      // Fallback to current date if all parsing fails
      console.warn(`Failed to parse date: ${dateStr}, using current date`);
      return new Date().toISOString();
    }
    
    return date.toISOString();
  } catch (error) {
    console.warn(`Date parsing error for "${dateStr}": ${error}`);
    return new Date().toISOString();
  }
}

/**
 * Extract text and link from cell
 */
function extractCellData(cell: cheerio.Cheerio<any>): string | CellData {
  const text = cell.text().trim();
  const link = cell.find('a').attr('href');
  
  if (link) {
    const fullLink = link.startsWith('/') ? `https://fbref.com${link}` : link;
    return { text, link: fullLink };
  }
  
  return text;
}

/**
 * Determine match status based on available data
 */
function determineStatus(homescore: number | null, awayscore: number | null, dateTime: string): string {
  // If scores are available, match is finished
  if (homescore !== null && awayscore !== null) {
    return 'finished';
  }
  
  // Check if match date has passed (rough estimate)
  const matchDate = new Date(dateTime);
  const now = new Date();
  
  if (matchDate < now) {
    return 'finished'; // Could also be 'postponed' but we'll default to finished
  }
  
  return 'scheduled';
}

/* ------------------ Enhanced Data Cleaning Function ------------------ */
function cleanRow(row: RawRow, rowIndex: number): Fixture | null {
  try {
    // Debug: log the row structure for first few rows
    if (rowIndex < 5) {
      console.log(`Row ${rowIndex} structure:`, row.map((cell, i) => `${i}: ${typeof cell === 'object' ? cell.text : cell}`));
    }
    
    // FBref table typically has these columns (may vary):
    // 0: Wk (matchweek)
    // 1: Day
    // 2: Date
    // 3: Time
    // 4: Home team
    // 5: xG (home)
    // 6: Score
    // 7: xG (away)
    // 8: Away team
    // 9: Attendance
    // 10: Venue
    // 11: Referee
    
    // Extract and validate required fields
    const matchweekStr = typeof row[0] === 'object' ? row[0].text : (row[0] as string);
    const dateStr = typeof row[2] === 'object' ? row[2].text : (row[2] as string);
    const timeStr = typeof row[3] === 'object' ? row[3].text : (row[3] as string);
    const homeCell = row[4];
    const scoreStr = typeof row[6] === 'object' ? row[6].text : (row[6] as string);
    const awayCell = row[8];
    const venueStr = typeof row[10] === 'object' ? row[10].text : (row[10] as string);
    
    // Skip invalid rows
    if (!matchweekStr || matchweekStr === '-' || matchweekStr === 'Wk') return null;
    if (!dateStr || dateStr === 'Date') return null;
    if (!homeCell || !awayCell) return null;
    
    // Parse matchweek
    const matchweek = parseInt(matchweekStr, 10) || null;
    
    // Extract team names
    const hometeam = typeof homeCell === 'object' ? homeCell.text : (homeCell as string);
    const awayteam = typeof awayCell === 'object' ? awayCell.text : (awayCell as string);
    
    if (!hometeam || !awayteam || hometeam === 'Home' || awayteam === 'Away') return null;
    
    // Parse scores
    let homescore: number | null = null;
    let awayscore: number | null = null;
    
    if (scoreStr && scoreStr !== 'Score' && scoreStr.includes('–')) {
      const [h, a] = scoreStr.split('–').map(s => s.trim());
      const hScore = parseInt(h, 10);
      const aScore = parseInt(a, 10);
      
      if (!isNaN(hScore) && !isNaN(aScore)) {
        homescore = hScore;
        awayscore = aScore;
      }
    }
    
    // Parse datetime
    const datetime = parseDateTime(dateStr, timeStr);
    
    // Determine status
    const status = determineStatus(homescore, awayscore, datetime);
    
    // Extract venue
    const venue = venueStr && venueStr !== 'Venue' ? venueStr : null;
    
    // Extract match URL if available
    let matchurl: string | null = null;
    if (typeof row[2] === 'object' && row[2].link) {
      matchurl = row[2].link;
    } else if (typeof homeCell === 'object' && homeCell.link) {
      matchurl = homeCell.link;
    }
    
    // Generate unique ID
    const cleanHometeam = hometeam.replace(/\s+/g, '_');
    const cleanAwayteam = awayteam.replace(/\s+/g, '_');
    const dateId = datetime.split('T')[0]; // Use date part only for ID
    const id = `${dateId}_${cleanHometeam}_vs_${cleanAwayteam}`;
    
    const fixture: Fixture = {
      id,
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
    
    return fixture;
    
  } catch (error) {
    console.error(`Error processing row ${rowIndex}:`, error);
    return null;
  }
}

/* ------------------ Enhanced Main Function ------------------ */
async function scrapeAndUpload() {
  try {
    console.log('Fetching FBref fixtures page...');
    const res = await fetch(FBREF_URL, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
      },
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    const html = await res.text();
    console.log(`Fetched HTML, length: ${html.length} characters`);

    console.log('Parsing HTML with Cheerio...');
    const $ = cheerio.load(html);

    // Try to find the table - FBref may use different IDs for different seasons
    let table = $('table#sched_2025-2026_9_1');
    
    // Fallback: try other common table selectors
    if (table.length === 0) {
      console.log('Primary table selector not found, trying fallbacks...');
      table = $('table[id*="sched"]').first();
      
      if (table.length === 0) {
        table = $('table.stats_table').first();
      }
      
      if (table.length === 0) {
        throw new Error('Could not find fixtures table on the page');
      }
    }

    console.log(`Found table with ID: ${table.attr('id')}`);

    // Extract table data
    const rows: RawRow[] = [];
    table.find('tbody tr').each((index, tr) => {
      const row: RawRow = [];
      $(tr).find('td, th').each((_, cell) => {
        row.push(extractCellData($(cell)));
      });
      
      if (row.length > 0) {
        rows.push(row);
      }
    });

    console.log(`Extracted ${rows.length} raw rows from table`);

    // Clean and validate data
    console.log('Processing and cleaning fixture data...');
    const fixtures: Fixture[] = rows
      .map((row, index) => cleanRow(row, index))
      .filter(Boolean) as Fixture[];

    console.log(`Successfully processed ${fixtures.length} valid fixtures`);

    // Save to local JSON with pretty formatting
    console.log(`Saving fixtures to ${JSON_PATH}...`);
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(fixtures, null, 2), 'utf-8');

    // Debug: log first few fixtures
    console.log('Sample fixtures:');
    fixtures.slice(0, 3).forEach((fixture, i) => {
      console.log(`${i + 1}:`, JSON.stringify(fixture, null, 2));
    });

    // Upload to Supabase
    if (fixtures.length > 0) {
      console.log('Uploading to Supabase...');
      
      // First, let's test the connection
      const { data: testData, error: testError } = await supabase
        .from('fixtures')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error('Supabase connection test failed:', testError);
        return;
      }
      
      console.log('Supabase connection successful, proceeding with upsert...');
      
      const { data, error } = await supabase
        .from('fixtures')
        .upsert(fixtures, {
          onConflict: 'id',
          defaultToNull: false,
        })
        .select(); // This will return the upserted data

      if (error) {
        console.error('Supabase upsert error:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log(`✅ Successfully upserted ${data?.length || fixtures.length} fixtures to Supabase`);
      }
    } else {
      console.log('⚠️  No valid fixtures found to upload');
    }

  } catch (err) {
    console.error('❌ Script failed:', err);
    
    // Additional error context
    if (err instanceof Error) {
      console.error('Error name:', err.name);
      console.error('Error message:', err.message);
      console.error('Error stack:', err.stack);
    }
  }
}

/* ------------------ Run Script ------------------ */
console.log('🚀 Starting FBref fixtures scraper...');
scrapeAndUpload();
