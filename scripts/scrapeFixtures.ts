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
    headless: true,
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

    // Debug console logs from page
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    console.log('Navigating to:', LEAGUE_FIXTURES_URL);
    await page.goto(LEAGUE_FIXTURES_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded');

    // ---------- Click "Wk" header to populate gameweek numbers ----------
try {
  console.log('Trying to click "Wk" column header to populate gameweek numbers...');
  const wkHeader = await page.$('table thead th[data-stat="gameweek"]');
  if (wkHeader) {
    await wkHeader.click();
    console.log('Clicked "Wk" header, waiting for table to populate gameweeks...');
    
    // Wait until at least one cell in the gameweek column has a number
    await page.waitForFunction(() => {
      const cells = Array.from(document.querySelectorAll('td[data-stat="gameweek"]'));
      return cells.some(cell => cell.textContent?.trim() !== '');
    }, { timeout: 5000 }); // wait max 5s
  } else {
    console.log('⚠️ "Wk" header not found, skipping click');
  }
} catch (err) {
  console.log('Error clicking "Wk" header or waiting for gameweeks:', err);
}


    // ---------- Take screenshot ----------
    const screenshotPath = path.join(__dirname, '../debug_page.png') as `${string}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to debug_page.png');

    // ---------- Find tables ----------
    const allTables = await page.$$('table');
    console.log(`Found ${allTables.length} tables on the page`);

    const schedTables = await page.$$('table[id^="sched_"]');
    console.log(`Found ${schedTables.length} schedule tables`);

    if (schedTables.length === 0) {
      console.log('No schedule tables found, trying alternative selectors...');
      const tableIds = await page.$$eval('table', (tables: Element[]) =>
        tables.map((t: Element) => (t as HTMLElement).id).filter(id => id)
      );
      console.log('All table IDs found:', tableIds);
      const scheduleElements = await page.$$('table[class*="schedule"], table[class*="fixture"], .schedule, .fixtures');
      console.log(`Found ${scheduleElements.length} elements with schedule/fixture keywords`);
    }

    // ---------- Wait for table ----------
    let tableSelector = 'table[id^="sched_"]';
    try {
      await page.waitForSelector(tableSelector, { timeout: 10000 });
    } catch (error) {
      console.log('Primary selector failed, trying alternatives...');
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
      if (!foundTable) throw new Error('No fixture table found with any selector');
    }

    // ---------- Season info ----------
    const seasonInfo = await page.$eval(tableSelector, (el: Element) => {
      const caption = el.querySelector('caption');
      return caption ? caption.textContent?.trim() || '' : '';
    });
    console.log('Season info from table:', seasonInfo);

    // ---------- Scrape fixtures ----------
    const fixtures: RawFixture[] = await page.evaluate(
      (tableSelector: string, debug: boolean) => {
        const table = document.querySelector(tableSelector);
        if (!table) return [];
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        console.log(`Processing ${rows.length} rows`);

        const parseDateTime = (dateStr: string, timeStr: string): string | null => {
          try {
            if (!dateStr) return null;
            let parsedDate: Date;
            if (dateStr.includes(',')) parsedDate = new Date(dateStr);
            else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) parsedDate = new Date(dateStr);
            else {
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

        const normalizeTeamName = (name: string) => name.trim().replace(/\s+/g, ' ');

        let lastMatchweek: number | undefined;

        const results = rows.map((row: Element, index: number) => {
          const getText = (selector: string) => {
            const el = row.querySelector(selector);
            return el ? el.textContent?.trim() || '' : '';
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

          if (!homeTeam || !awayTeam || !dateStr) return null;

          const datetimeIso = parseDateTime(dateStr, timeStr);
          if (!datetimeIso) return null;

          let homeScore: number | undefined;
          let awayScore: number | undefined;
          let status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming' = 'scheduled';

          if (scoreStr.includes('–') || scoreStr.includes('-')) {
            const separator = scoreStr.includes('–') ? '–' : '-';
            const [h, a] = scoreStr.split(separator).map(s => parseInt(s.trim(), 10));
            if (!isNaN(h) && !isNaN(a)) {
              homeScore = h;
              awayScore = a;
              status = 'finished';
            }
          } else if (scoreStr.toLowerCase().includes('postponed')) status = 'postponed';

          const matchweekNum = matchweekStr ? parseInt(matchweekStr, 10) : lastMatchweek;
          if (matchweekNum) lastMatchweek = matchweekNum;

          return {
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
        }).filter(f => f !== null) as RawFixture[];

        console.log(`Filtered results: ${results.length} fixtures`);
        return results;
      },
      tableSelector,
      true
    );

    console.log(`✅ Scraped ${fixtures.length} fixtures`);
    fixtures.slice(0, 3).forEach((fixture, index) => console.log(`Fixture ${index}:`, fixture));

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
  console.log(`Upserting ${fixtures.length} fixtures to Supabase (fixtures)...`);
  const { data, error } = await supabase
    .from('fixtures')
    .upsert(fixtures, { onConflict: 'id' })
    .select();

  if (error) console.error('❌ Supabase error (fixtures):', error);
  else console.log(`✅ Successfully upserted ${data?.length || 0} fixtures into fixtures`);
}

// ---------- Supabase insert (raw scraped fixtures) ----------
async function saveToSupabaseScraped(fixtures: RawFixture[]) {
  console.log(`Inserting ${fixtures.length} raw fixtures into Supabase (scraped_fixtures)...`);
  const { data, error } = await supabase
    .from('fixtures')
    .insert(fixtures)
    .select();

  if (error) console.error('❌ Supabase error (fixtures):', error);
  else if (Array.isArray(data)) console.log(`✅ Successfully inserted ${data.length} raw fixtures into scraped_fixtures`);
  else console.log('✅ Insert completed; no data returned from Supabase.');
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
    await saveToSupabaseScraped(fixtures);
  } catch (err) {
    console.error('Scraper error:', err);
  }
})();
