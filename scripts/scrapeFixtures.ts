import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';

const OUTPUT_FILE = path.join(__dirname, '../data/fixtures.json');
const DATA_DIR = path.dirname(OUTPUT_FILE);

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

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

const LEAGUE_FIXTURES_URL = 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';

async function scrapeFixtures(): Promise<RawFixture[]> {
  const res = await axios.get(LEAGUE_FIXTURES_URL);
  const $ = load(res.data);

  const fixtures: RawFixture[] = [];

  // FBref table has id="sched_all"
  const table = $('#sched_all');
  if (!table.length) throw new Error('Fixtures table not found');

  table.find('tbody > tr').each((_, row) => {
    const $row = $(row);
    if ($row.hasClass('thead')) return; // skip header rows inside tbody

    const dateStr = $row.find('td[data-stat="date"]').text().trim();
    const homeTeam = $row.find('td[data-stat="home_team"]').text().trim();
    const awayTeam = $row.find('td[data-stat="away_team"]').text().trim();
    const scoreStr = $row.find('td[data-stat="score"]').text().trim();
    const matchUrl = $row.find('td[data-stat="match_report"] a').attr('href')
      ? `https://fbref.com${$row.find('td[data-stat="match_report"] a').attr('href')}`
      : undefined;

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
      venue: homeTeam, // can adjust later
      matchWeek: undefined, // assigned later in service
    });
  });

  return fixtures;
}

async function run() {
  try {
    const fixtures = await scrapeFixtures();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fixtures, null, 2));
    console.log(`Scraped ${fixtures.length} fixtures and saved to ${OUTPUT_FILE}`);
  } catch (err) {
    console.error('Error scraping fixtures:', err);
  }
}

run();
