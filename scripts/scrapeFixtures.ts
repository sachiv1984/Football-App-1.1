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

// ---------- Scraper ----------
async function scrapeFixtures(): Promise<RawFixture[]> {
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.goto(LEAGUE_FIXTURES_URL, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log('Page loaded');

    // Wait for the fixtures table to render
    await page.waitForSelector('table[id^="sched_"]', { timeout: 10000 });

    // Extract fixture data
    const fixtures: RawFixture[] = await page.$$eval('table[id^="sched_"] tbody tr', rows => {
      return rows.map(row => {
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

        let datetimeIso = '';
        if (dateStr) {
          // Combine date and time if available
          const dt = timeStr ? `${dateStr} ${timeStr}` : dateStr;
          const parsed = new Date(dt);
          if (!isNaN(parsed.getTime())) datetimeIso = parsed.toISOString();
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

        const matchweek = matchweekStr ? parseInt(matchweekStr, 10) : undefined;

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
          matchweek,
        };
      });
    });

    console.log(`✅ Scraped ${fixtures.length} fixtures`);
    return fixtures;
  } finally {
    await browser.close();
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
