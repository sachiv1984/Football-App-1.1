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
    headless: false, // Set to false for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    
    // Add some debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    
    console.log('Navigating to:', LEAGUE_FIXTURES_URL);
    await page.goto(LEAGUE_FIXTURES_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded');

    // Take a screenshot for debugging
    await page.screenshot({ path: path.join(__dirname, '../debug_page.png'), fullPage: true });
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
      const tableIds = await page.$$eval('table', tables => 
        tables.map(t => t.id).filter(id => id)
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

    // Log the HTML structure for debugging
    const tableHTML = await page.$eval(tableSelector, el => el.outerHTML.substring(0, 1000));
    console.log('Table HTML preview:', tableHTML);

    // Extract fixture data with enhanced debugging
    const fixtures: RawFixture[] = await page.$$eval(
      `${tableSelector} tbody tr`,
      (rows, debug) => {
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
          .map((row, index) => {
            // Log each row's HTML for the first few rows
            if (debug && index < 3) {
              console.log(`Row ${index} HTML:`, row.outerHTML.substring(0, 500));
            }

            const getText = (selector: string) => {
              const el = row.querySelector(selector);
              const text = el ? el.textContent?.trim() || '' : '';
              if (debug && index < 3) {
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
              if (debug && index < 3) {
                console.log(`Row ${index}: No data-stat attributes found, trying alternative selectors...`);
              }
              // Try by column position (this is brittle but sometimes necessary)
              const cells = row.querySelectorAll('td');
              if (debug && index < 3) {
                console.log(`  Found ${cells.length} cells`);
                cells.forEach((cell, i) => {
                  console.log(`    Cell ${i}: "${cell.textContent?.trim()}"`);
                });
              }
            }

            if (!homeTeam || !awayTeam) {
              if (debug && index < 3) {
                console.log(`Row ${index}: Missing team data, skipping`);
              }
              return null;
            }

            const datetimeIso = parseDateTime(dateStr, timeStr);
            if (!datetimeIso) {
              if (debug && index < 3) {
                console.log(`Row ${index}: Invalid datetime, skipping`);
              }
              return null;
            }

            let homeScore: number | undefined;
            let awayScore: number | undefined;
            let status: RawFixture['status'] = 'scheduled';

            if (scoreStr.includes('–') || scoreStr.includes('-')) {
              const separator = scoreStr.includes('–') ? '–' : '-';
              const [h, a] = scoreStr.split(separator).map(s => parseInt(s.trim(), 10));
              if (!isNaN(h) && !isNaN(a)) {
                homeScore = h;
                awayScore = a;
                status = 'finished';
              }
            } else if (scoreStr.toLowerCase().includes('postponed')) {
              status = 'postponed';
            }

            const matchweek = matchweekStr ? parseInt(matchweekStr, 10) : undefined;

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
              matchweek,
            };

            if (debug && index < 3) {
              console.log(`Row ${index} parsed:`, fixture);
            }

            return fixture;
          })
          .filter(f => f !== null) as RawFixture[];

        console.log(`Filtered results: ${results.length} fixtures`);
        return results;
      },
      true // Pass debug flag
    );

    console.log(`✅ Scraped ${fixtures.length} fixtures`);
    
    // Log first few fixtures for debugging
    fixtures.slice(0, 3).forEach((fixture, index) => {
      console.log(`Fixture ${index}:`, fixture);
    });

    return fixtures;
  } finally {
    // Keep browser open for debugging if needed
    // await browser.close();
    console.log('Browser left open for debugging. Close manually when done.');
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
