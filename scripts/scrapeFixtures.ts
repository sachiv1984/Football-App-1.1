// src/scrapers/fbrefPuppeteerScraper.ts
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'fixtures.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

function normalizeTeamName(name: string) {
  return name.trim().replace(/\s+/g, ' ');
}

const FBREF_URL = 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';

async function scrapeFixtures(): Promise<RawFixture[]> {
  console.log('Launching Puppeteer...');
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(FBREF_URL, { waitUntil: 'networkidle0' });
  console.log('Page loaded');

  // Wait for the main fixture table
  await page.waitForSelector('table[id^="sched_"]');

  // Extract fixtures
  const fixtures: RawFixture[] = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('table[id^="sched_"] tbody tr'));
    const data: RawFixture[] = [];

    let currentMatchweek: number | undefined;

    rows.forEach((row: any) => {
      const tr = row as HTMLTableRowElement;

      // Skip header rows inside tbody
      if (tr.classList.contains('thead')) {
        const headerText = tr.innerText;
        const matchweekMatch = headerText.match(/(?:Matchweek|Week|Wk|Round)\s*(\d+)/i);
        if (matchweekMatch) {
          currentMatchweek = parseInt(matchweekMatch[1], 10);
        }
        return;
      }

      const dateStr = tr.querySelector('td[data-stat="date"]')?.textContent?.trim();
      const timeStr = tr.querySelector('td[data-stat="start_time"]')?.textContent?.trim();
      const hometeam = tr.querySelector('td[data-stat="home_team"]')?.textContent?.trim();
      const awayteam = tr.querySelector('td[data-stat="away_team"]')?.textContent?.trim();
      const scoreStr = tr.querySelector('td[data-stat="score"]')?.textContent?.trim();
      const venue = tr.querySelector('td[data-stat="venue"]')?.textContent?.trim();
      const matchUrl = tr.querySelector('td[data-stat="match_report"] a')?.getAttribute('href');

      if (!dateStr || !hometeam || !awayteam) return;

      // Combine date + time
      const datetime = timeStr ? `${dateStr} ${timeStr}` : dateStr;
      let isoDatetime: string;
      try {
        isoDatetime = new Date(datetime).toISOString();
      } catch {
        isoDatetime = new Date(dateStr).toISOString();
      }

      let homeScore: number | undefined;
      let awayScore: number | undefined;
      let status: RawFixture['status'] = 'scheduled';

      if (scoreStr && scoreStr.includes('–')) {
        const [h, a] = scoreStr.split('–').map((s) => parseInt(s.trim(), 10));
        if (!isNaN(h) && !isNaN(a)) {
          homeScore = h;
          awayScore = a;
          status = 'finished';
        }
      } else if (scoreStr?.toLowerCase().includes('postponed')) {
        status = 'postponed';
      }

      data.push({
        id: `fbref-${hometeam}-${awayteam}-${dateStr}`.replace(/\s+/g, '-'),
        datetime: isoDatetime,
        hometeam,
        awayteam,
        homescore: homeScore,
        awayscore: awayScore,
        status,
        venue,
        matchweek: currentMatchweek,
        matchurl: matchUrl ? `https://fbref.com${matchUrl}` : undefined,
      });
    });

    return data;
  });

  console.log(`Scraped ${fixtures.length} fixtures`);
  await browser.close();
  return fixtures;
}

async function saveFixtures(fixtures: RawFixture[]) {
  if (!fixtures.length) return;

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fixtures, null, 2));
  console.log(`Saved to ${OUTPUT_FILE}`);

  // Upsert into Supabase
  const { data, error } = await supabase.from('fixtures').upsert(fixtures, { onConflict: 'id' }).select();
  if (error) {
    console.error('Error saving to Supabase:', error);
  } else {
    console.log(`Saved ${data?.length || 0} fixtures to Supabase`);
  }
}

async function run() {
  try {
    const fixtures = await scrapeFixtures();
    await saveFixtures(fixtures);
  } catch (err) {
    console.error('Scraper error:', err);
  }
}

run();
