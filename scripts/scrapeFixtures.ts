// scripts/scrapeFixtures.ts
/**
 * ===============================================================
 * Production-ready FBref Fixtures Scraper - UPDATED VERSION
 *
 * Key updates:
 * 1. Correct match report URL extraction from score column
 * 2. URL validation to ensure it's a match report link
 * 3. Better debugging for URL extraction
 * ===============================================================
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

/* ------------------ Configuration Section ------------------ */
const FBREF_URL =
  'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';

const JSON_PATH = path.join(process.cwd(), 'data', 'Fixtures.json');

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
  datetime: string;
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
 */
function parseDateTime(dateStr: string, timeStr?: string): string {
  try {
    let fullDateStr = dateStr.trim();
    
    if (timeStr && timeStr.trim()) {
      fullDateStr += ` ${timeStr.trim()}`;
    }
    
    const date = new Date(fullDateStr);
    
    if (isNaN(date.getTime())) {
      const dateOnly = new Date(dateStr.trim());
      if (!isNaN(dateOnly.getTime())) {
        dateOnly.setUTCHours(15, 0, 0, 0);
        return dateOnly.toISOString();
      }
      
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
  if (homescore !== null && awayscore !== null) {
    return 'finished';
  }
  
  const matchDate = new Date(dateTime);
  const now = new Date();
  
  if (matchDate < now) {
    return 'finished';
  }
  
  return 'scheduled';
}

/**
 * Extract match report URL from row
 */
function extractMatchReportUrl(row: RawRow, rowIndex: number): string | null {
  // The Score column (row[6]) typically has the link to match report
  const scoreCell = row[6];
  
  if (typeof scoreCell === 'object' && scoreCell.link) {
    const url = scoreCell.link;
    
    // Validate it's actually a match report URL (contains '/matches/')
    if (url.includes('/matches/')) {
      if (rowIndex < 5) {
        console.log(`Row ${rowIndex}: Found match report URL: ${url}`);
      }
      return url;
    } else {
      if (rowIndex < 5) {
        console.warn(`Row ${rowIndex}: Score cell link doesn't look like match report: ${url}`);
      }
    }
  }
  
  // Fallback: check date cell
  const dateCell = row[2];
  if (typeof dateCell === 'object' && dateCell.link && dateCell.link.includes('/matches/')) {
    return dateCell.link;
  }
  
  return null;
}

/* ------------------ Enhanced Data Cleaning Function ------------------ */
function cleanRow(row: RawRow, rowIndex: number): Fixture | null {
  try {
    // Debug: log the row structure for first few rows
    if (rowIndex < 5) {
      console.log(`Row ${rowIndex} structure:`, row.map((cell, i) => `${i}: ${typeof cell === 'object' ? cell.text : cell}`));
    }
    
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
    
    // Extract match URL using the new function
    const matchurl = extractMatchReportUrl(row, rowIndex);
    
    // Generate unique ID
    const cleanHometeam = hometeam.replace(/\s+/g, '_');
    const cleanAwayteam = awayteam.replace(/\s+/g, '_');
    const dateId = datetime.split('T')[0];
    const id = `${cleanHometeam}_${dateId}_${cleanAwayteam}`;
    
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

    // Dynamic Table Inspection
    const allTables = $('table');
    console.log(`Found ${allTables.length} tables on the page:`);

    allTables.each((i, tableEl) => {
      const tableId = $(tableEl).attr('id') || '(no id)';
      const rowCount = $(tableEl).find('tbody tr').length;
      console.log(`  Table ${i + 1}: ID='${tableId}', rows=${rowCount}`);
    });

    // Table Selection
    let selectedTable = $('table#sched_2025-2026_9_1');

    if (selectedTable.length === 0) {
      console.log('Primary table selector not found, trying fallbacks...');
      selectedTable = $('table[id*="sched"]').first();
      if (selectedTable.length === 0) {
        selectedTable = $('table.stats_table').first();
      }
    }

    if (selectedTable.length === 0) {
      throw new Error('No suitable table found on the page');
    }

    console.log(`Using table ID: '${selectedTable.attr('id')}', with ${selectedTable.find('tbody tr').length} rows`);

    // Extract Table Data
    const rows: RawRow[] = [];
    selectedTable.find('tbody tr').each((index, tr) => {
      const row: RawRow = [];
      $(tr).find('td, th').each((_, cell) => {
        row.push(extractCellData($(cell)));
      });

      if (row.length > 0) rows.push(row);
    });

    console.log(`Extracted ${rows.length} raw rows from table`);

    // Debug: Show structure of first few rows
    if (rows.length > 0) {
      console.log('\nFirst 3 raw rows structure:');
      rows.slice(0, 3).forEach((row, i) => {
        console.log(`Raw row ${i}:`, row.map(cell => typeof cell === 'object' ? cell.text : cell));
      });
    }

    // Process and Clean Fixtures
    console.log('Processing and cleaning fixture data...');
    const fixtures: Fixture[] = rows
      .map((row, index) => cleanRow(row, index))
      .filter(Boolean) as Fixture[];

    console.log(`Successfully processed ${fixtures.length} valid fixtures`);
    
    // Count fixtures with match URLs
    const fixturesWithUrls = fixtures.filter(f => f.matchurl !== null).length;
    console.log(`Fixtures with match report URLs: ${fixturesWithUrls}`);

    // Save to JSON
    console.log(`Saving fixtures to ${JSON_PATH}...`);
    fs.mkdirSync(path.dirname(JSON_PATH), { recursive: true });
    fs.writeFileSync(JSON_PATH, JSON.stringify(fixtures, null, 2), 'utf-8');
    console.log(`✅ JSON saved successfully at ${JSON_PATH}`);
    
    // Verify JSON was written correctly
    const savedJson = fs.readFileSync(JSON_PATH, 'utf-8');
    const parsedSaved = JSON.parse(savedJson);
    console.log(`✅ JSON verification: ${parsedSaved.length} fixtures saved to file`);
    
    console.log('\nSample fixtures:');
    fixtures.slice(0, 3).forEach((fixture, i) => {
      console.log(`${i + 1}:`, JSON.stringify(fixture, null, 2));
    });

    // Upload to Supabase
    if (fixtures.length > 0) {
      console.log('\nUploading to Supabase...');
      
      // Test connection
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
        .select();

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
