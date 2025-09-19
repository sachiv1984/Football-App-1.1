import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ESM __dirname fix
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output path
const DATA_DIR = path.join(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'fixtures.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// Fixture type
export interface RawFixture {
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

// Premier League schedule
const LEAGUE_FIXTURES_URL =
  'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures';

export async function scrapeFixtures(): Promise<RawFixture[]> {
  const res = await axios.get(LEAGUE_FIXTURES_URL);
  const $ = load(res.data);

  const fixtures: RawFixture[] = [];

  const table = $('#sched_all');
  if (!table.length) throw new Error('Fixtures table not found');

  table.find('tbody > tr').each((_, row) => {
    const $row = $(row);
    if ($row.hasClass('thead')) return;

    const dateStr = $row.find('td[data-stat="date"]').text().trim();
    const homeTeam = $row.find('td[data-stat="home_team"]').text().trim();
    const awayTeam = $row.find('td[data-stat="away_team"]').text().trim();
    const scoreStr = $row.find('td[data-stat="score"]').text().trim();
    const venueCell = $row.find('td[data-stat="venue"]').text().trim();
    const matchUrlAttr = $row.find('td[data-stat="match_report"] a').attr('href');
    const matchUrl = matchUrlAttr ? `https://fbref.com${matchUrlAttr}` : undefined;

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
      venue: venueCell || undefined,
      matchWeek: undefined,
      matchUrl,
    });
  });

  return fixtures;
}

// Optional: Save JSON locally
export async function saveFixturesToFile(fixtures: RawFixture[]) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(fixtures, null, 2));
  console.log(`Saved ${fixtures.length} fixtures to ${OUTPUT_FILE}`);
}
