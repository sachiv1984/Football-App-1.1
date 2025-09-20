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
  const res = await axios.get(LEAGUE_FIXTURES_URL);
  const $ = cheerio.load(res.data);

  const fixtures: RawFixture[] = [];

  const table = $('table[id^="sched_"]'); // TypeScript infers Cheerio type
  if (table.length === 0) throw new Error('Fixtures table not found');

  table.find('tbody > tr').each((_, row) => {
    const $row = $(row);
    if ($row.hasClass('thead')) return;

    const dateStr = $row.find('td[data-stat="date"]').text().trim();
    const homeTeam = normalizeTeamName($row.find('td[data-stat="home_team"]').text());
    const awayTeam = normalizeTeamName($row.find('td[data-stat="away_team"]').text());
    const scoreStr = $row.find('td[data-stat="score"]').text().trim();
    const venue = $row.find('td[data-stat="venue"]').text().trim();
    const matchUrlCell = $row.find('td[data-stat="match_report"] a');
    const matchUrl = matchUrlCell.length > 0 ? `https://fbref.com${matchUrlCell.attr('href')}` : undefined;

    if (!dateStr || !homeTeam || !awayTeam) return;

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
      matchUrl,
      venue,
      matchWeek: undefined,
    });
  });

  return fixtures;
}

// ---------- Push to Supabase ----------
async function saveToSupabase(fixtures: RawFixture[]) {
  const { data, error } = await supabase
    .from('fixtures')
    .upsert(fixtures, { onConflict: 'id' });

  if (error) {
    console.error('Error saving to Supabase:', error);
  } else {
    console.log(`Saved ${data?.length || 0} fixtures to Supabase`);
  }
}

// ---------- Run scraper ----------
async function run() {
  try {
    const fixtures = await scrapeFixtures();

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fixtures, null, 2));
    console.log(`Scraped ${fixtures.length} fixtures and saved to ${OUTPUT_FILE}`);

    await saveToSupabase(fixtures);
  } catch (err) {
    console.error('Error scraping fixtures:', err);
  }
}

run();
