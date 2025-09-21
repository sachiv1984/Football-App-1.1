import puppeteer from 'puppeteer';
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
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------- Supabase client ----------
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ---------- Fixture type ----------
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

// ---------- FBref URL ----------
const LEAGUE_FIXTURES_URL =
  'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';

// ---------- Enhanced Scraper with Debug Info ----------
async function scrapeFixtures(): Promise<RawFixture[]> {
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true, // Must be true for CI/server environments
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Add some debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    console.log('Navigating to:', LEAGUE_FIXTURES_URL);
    await page.goto(LEAGUE_FIXTURES_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded');

    // Take a screenshot for debugging
    const screenshotPath = path.join(__dirname, '../debug_page.png') as `${string}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to debug_page.png');

    // Check if we can find any tables at all
    const allTables = await page.$$('table');
    console.log(`Found ${allTables.length} tables on the page`);

    // Look for tables with id starting with "sched_"
    const schedTables = await page.$$('table[id^="sched_"]');
    console.log(`Found ${schedTables.length} schedule tables`);

    if (schedTables.length === 0) {
      // Try alternative selectors
      console.log('No schedule tables found, trying alternative selectors...');
      
      // Check for any table that might contain fixtures
      const tableIds = await page.$$eval('table', (tables: Element[]) => 
        tables.map((t: Element) => (t as HTMLElement).id).filter((id: string) => id)
      );
      console.log('All table IDs found:', tableIds);

      // Look for table with "schedule" in the class or data attributes
      const scheduleElements = await page.$$('table[class*="schedule"], table[class*="fixture"], .schedule, .fixtures');
      console.log(`Found ${scheduleElements.length} elements with schedule/fixture keywords`);
    }

    // Wait for the fixtures table to render - with fallback selectors
    let tableSelector = 'table[id^="sched_"]';
    try {
      await page.waitForSelector(tableSelector, { timeout: 10000 });
    } catch (error) {
      console.log('Primary selector failed, trying alternatives...');
      
      // Try different selectors
      const alternativeSelectors = [
        'table.stats_table',
        'table#fixtures',
        '.table_container table',
        'table[data-stat]',
        'table tbody tr[data-stat]'
      ];
      
      let foundTable = false;
      for (const selector of alternativeSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          tableSelector = selector;
          console.log(`Found table with selector: ${selector}`);
          foundTable = true;
          break;
        } catch (e) {
          console.log(`Selector ${selector} not found`);
        }
      }
      
      if (!foundTable) {
        throw new Error('No fixture table found with any selector');
      }
    }

    // Check what season we're looking at and get more details
    const seasonInfo = await page.$eval(tableSelector, (el: Element) => {
      const caption = el.querySelector('caption');
      return caption ? caption.textContent?.trim() || '' : '';
    });
    console.log('Season info from table:', seasonInfo);

    // Get initial row count and sample row data for debugging
    const initialRowCount = await page.$$eval(`${tableSelector} tbody tr`, (rows: Element[]) => {
      console.log(`Found ${rows.length} rows in tbody`);
      
      // Log first few rows to see their structure
      rows.slice(0, 5).forEach((row, index) => {
        console.log(`Row ${index} structure:`, {
          tagName: row.tagName,
          innerHTML: row.innerHTML.substring(0, 200) + '...',
          cellCount: row.querySelectorAll('td, th').length,
          hasDataStat: !!row.querySelector('[data-stat]')
        });
      });
      
      return rows.length;
    });
    console.log(`Found ${initialRowCount} rows in selected table`);

    // Wait a bit longer and check if content is loading dynamically
    console.log('Waiting for content to fully load...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if there are any loading indicators or if content changed
    const finalRowCount = await page.$$eval(`${tableSelector} tbody tr`, (rows: Element[]) => rows.length);
    console.log(`Final row count after waiting: ${finalRowCount}`);

    // Log the HTML structure for debugging
    const tableHTML = await page.$eval(tableSelector, (el: Element) => el.outerHTML.substring(0, 1500));
    console.log('Table HTML preview:', tableHTML);

    // Get table headers to understand the structure
    const headers = await page.$$eval(`${tableSelector} thead th`, (ths: Element[]) => 
      ths.map((th: Element) => ({
        text: th.textContent?.trim() || '',
        dataStat: th.getAttribute('data-stat') || '',
        index: Array.from(th.parentElement?.children || []).indexOf(th)
      }))
    );
    console.log('Table headers:', headers);

    // Find matchweek column index
    const matchweekHeader = headers.find((h: any) => 
      h.text.toLowerCase().includes('week') || 
      h.text.toLowerCase().includes('round') ||
      h.dataStat.includes('week') ||
      h.dataStat.includes('round')
    );
    console.log('Matchweek header found:', matchweekHeader);

    // Extract fixture data with enhanced debugging
    const fixtures: RawFixture[] = await page.evaluate(
      (tableSelector: string, debug: boolean) => {
        const table = document.querySelector(tableSelector);
        if (!table) return [];
        
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        console.log(`Processing ${rows.length} rows`);
        
        const parseDateTime = (dateStr: string, timeStr: string): string | null => {
          try {
            if (!dateStr) return null;

            // Debug: Log the input strings
            if (debug) console.log(`Parsing date: "${dateStr}", time: "${timeStr}"`);

            // Handle different date formats that FBref might use
            let parsedDate: Date;
            
            // Try different date parsing approaches
            if (dateStr.includes(',')) {
              // Format like "Sat, Aug 17, 2024"
              parsedDate = new Date(dateStr);
            } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // ISO date format
              parsedDate = new Date(dateStr);
            } else {
              // Original format: "Sat Aug 17 2024"
              const parts = dateStr.split(' ');
              if (parts.length < 4) return null;

              const day = parseInt(parts[2], 10);
              const year = parseInt(parts[3], 10);
              const month = new Date(`${parts[1]} 1, 2000`).getMonth();

              let hours = 0, minutes = 0;
              if (timeStr && timeStr !== '') {
                const timeParts = timeStr.split(':');
                if (timeParts.length >= 2) {
                  const h = parseInt(timeParts[0], 10);
                  const m = parseInt(timeParts[1], 10);
                  if (!isNaN(h)) hours = h;
                  if (!isNaN(m)) minutes = m;
                }
              }

              parsedDate = new Date(Date.UTC(year, month, day, hours, minutes));
            }

            return parsedDate.toISOString();
          } catch (error) {
            if (debug) console.log(`Date parsing error for "${dateStr}", "${timeStr}":`, error);
            return null;
          }
        };

        const normalizeTeamName = (name: string) =>
          name.trim().replace(/\s+/g, ' ');

        const results = rows
          .map((row: Element, index: number) => {
            // Log each row's HTML for the first few rows to understand structure
            if (debug && index < 10) {
              console.log(`\n=== Row ${index} ===`);
              console.log('HTML:', row.outerHTML.substring(0, 300) + '...');
              console.log('Tag:', row.tagName);
              console.log('Classes:', row.className);
              
              // Check if this might be a header or separator row
              const cells = row.querySelectorAll('td, th');
              console.log(`Cell count: ${cells.length}`);
              
              if (cells.length > 0) {
                Array.from(cells).slice(0, 5).forEach((cell, cellIndex) => {
                  console.log(`  Cell ${cellIndex}: "${cell.textContent?.trim()}" [${cell.tagName}] [data-stat="${cell.getAttribute('data-stat')}"]`);
                });
              }
            }

            const getText = (selector: string) => {
              const el = row.querySelector(selector);
              const text = el ? el.textContent?.trim() || '' : '';
              if (debug && index < 10) {
                console.log(`  ${selector}: "${text}"`);
              }
              return text;
            };

            const getLink = (selector: string) => {
              const a = row.querySelector<HTMLAnchorElement>(selector);
              return a ? a.href : undefined;
            };

            const dateStr = getText('td[data-stat="date"]');
            const timeStr = getText('td[data-stat="start_time"]');
            const homeTeam = normalizeTeamName(getText('td[data-stat="home_team"]'));
            const awayTeam = normalizeTeamName(getText('td[data-stat="away_team"]'));
            const scoreStr = getText('td[data-stat="score"]');
            const venue = getText('td[data-stat="venue"]');
            const matchweekStr = getText('td[data-stat="gameweek"]');
            const matchurl = getLink('td[data-stat="match_report"] a');

            // If no data-stat attributes, try alternative selectors
            if (!dateStr && !homeTeam && !awayTeam) {
              if (debug && index < 10) {
                console.log(`Row ${index}: No data-stat attributes found, trying alternative selectors...`);
              }
              
              // Check if this is a spacer row, header row, or empty row
              const allText = row.textContent?.trim() || '';
              const cellCount = row.querySelectorAll('td, th').length;
              
              if (debug && index < 10) {
                console.log(`  All text: "${allText}"`);
                console.log(`  Cell count: ${cellCount}`);
              }
              
              // Skip rows that are clearly not fixture data
              if (cellCount === 0 || allText === '' || allText.length < 10) {
                if (debug && index < 10) {
                  console.log(`  Skipping empty/header row`);
                }
                return null;
              }
              
              // Try by column position (this is brittle but sometimes necessary)
              const cells = row.querySelectorAll('td');
              if (debug && index < 10) {
                console.log(`  Found ${cells.length} cells`);
                Array.from(cells).forEach((cell: Element, i: number) => {
                  console.log(`    Cell ${i}: "${cell.textContent?.trim()}" [data-stat="${cell.getAttribute('data-stat')}"]`);
                });
              }
            }

            // Debug matchweek parsing
            if (debug && index < 10) {
              console.log(`  Matchweek: "${matchweekStr}"`);
            }

            if (!homeTeam || !awayTeam) {
              if (debug && index < 10) {
                console.log(`Row ${index}: Missing team data (home: "${homeTeam}", away: "${awayTeam}"), skipping`);
              }
              return null;
            }

            const datetimeIso = parseDateTime(dateStr, timeStr);
            if (!datetimeIso) {
              if (debug && index < 10) {
                console.log(`Row ${index}: Invalid datetime (date: "${dateStr}", time: "${timeStr}"), skipping`);
              }
              return null;
            }

            let homeScore: number | undefined;
            let awayScore: number | undefined;
            let status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming' = 'scheduled';

            if (scoreStr.includes('–') || scoreStr.includes('-')) {
              const separator = scoreStr.includes('–') ? '–' : '-';
              const [h, a] = scoreStr.split(separator).map((s: string) => parseInt(s.trim(), 10));
              if (!isNaN(h) && !isNaN(a)) {
                homeScore = h;
                awayScore = a;
                status = 'finished';
              }
            } else if (scoreStr.toLowerCase().includes('postponed')) {
              status = 'postponed';
            }

            const matchweekNum = matchweekStr ? parseInt(matchweekStr, 10) : undefined;

            const fixture = {
              id: `fbref-${homeTeam}-${awayTeam}-${dateStr}`.replace(/\s+/g, '-'),
              datetime: datetimeIso,
              hometeam: homeTeam,
              awayteam: awayTeam,
              homescore: homeScore,
              awayscore: awayScore,
              status,
              matchurl,
              venue,
              matchweek: matchweekNum,
            };

            if (debug && index < 10) {
              console.log(`Row ${index} parsed:`, fixture);
            }

            return fixture;
          })
          .filter((f: any) => f !== null) as RawFixture[];

        console.log(`Filtered results: ${results.length} fixtures`);
        return results;
      },
      tableSelector,
      true // debug flag
    );

    console.log(`✅ Scraped ${fixtures.length} fixtures`);
    
    // Log first few fixtures for debugging
    fixtures.slice(0, 3).forEach((fixture, index) => {
      console.log(`Fixture ${index}:`, fixture);
    });

    return fixtures;
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

// ---------- Save JSON ----------
function saveToFile(fixtures: RawFixture[]) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fixtures, null, 2));
  console.log(`✅ Saved ${fixtures.length} fixtures to ${OUTPUT_FILE}`);
}

// ---------- Supabase upsert ----------
async function saveToSupabase(fixtures: RawFixture[]) {
  console.log(`Upserting ${fixtures.length} fixtures to Supabase...`);
  const { data, error } = await supabase
    .from('fixtures')
    .upsert(fixtures, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('❌ Supabase error:', error);
  } else {
    console.log(`✅ Successfully upserted ${data?.length || 0} fixtures`);
  }
}

// ---------- Run ----------
(async () => {
  try {
    console.log('Starting scraper...');
    const fixtures = await scrapeFixtures();

    if (fixtures.length === 0) {
      console.warn('⚠️ No fixtures found');
      return;
    }

    saveToFile(fixtures);
    await saveToSupabase(fixtures);
  } catch (err) {
    console.error('Scraper error:', err);
  }
})();
