import axios from 'axios';
import { load } from 'cheerio';
import fs from 'fs';
import path from 'path';

const OUTPUT_FILE = path.join(__dirname, '../data/fixtures.json');

// FBref Premier League team URLs (example for Arsenal)
const TEAMS = [
  { name: 'Arsenal', url: 'https://fbref.com/en/squads/18bb7c10/2025-2026/matchlogs/c9/schedule/Arsenal-Scores-and-Fixtures-Premier-League' },
  // add other 19 teams...
];

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

async function scrapeTeamFixtures(team: { name: string; url: string }): Promise<RawFixture[]> {
  const res = await axios.get(team.url);
  const $ = load(res.data);

  const fixtures: RawFixture[] = [];

  // FBref uses tables with id="matchlogs_all"
  const table = $('#matchlogs_all');

  if (!table.length) {
    console.warn(`No fixtures table found for ${team.name}`);
    return fixtures;
  }

  table.find('tbody > tr').each((_, row) => {
    const $row = $(row);

    // Skip rows with class "thead" (header rows inside tbody)
    if ($row.hasClass('thead')) return;

    const dateStr = $row.find('td[data-stat="date"]').text().trim();
    const opponent = $row.find('td[data-stat="opponent"]').text().trim();
    const homeAway = $row.find('td[data-stat="home_away"]').text().trim();
    const result = $row.find('td[data-stat="result"]').text().trim();
    const scoreStr = $row.find('td[data-stat="score"]').text().trim();
    const venue = homeAway === 'Home' ? team.name : opponent;

    if (!dateStr || !opponent) return;

    // Parse scores
    let homeScore: number | undefined;
    let awayScore: number | undefined;

    if (scoreStr.includes('–')) {
      const [h, a] = scoreStr.split('–').map(s => parseInt(s.trim(), 10));
      if (!isNaN(h) && !isNaN(a)) {
        if (homeAway === 'Home') {
          homeScore = h;
          awayScore = a;
        } else {
          homeScore = a;
          awayScore = h;
        }
      }
    }

    // Determine status
    let status: RawFixture['status'] = 'scheduled';
    if (result.toLowerCase() === 'postponed') status = 'postponed';
    else if (scoreStr.includes('–')) status = 'finished';

    const fixture: RawFixture = {
      id: `fbref-${team.name}-${opponent}-${dateStr}`.replace(/\s+/g, '-'),
      dateTime: new Date(dateStr).toISOString(),
      homeTeam: homeAway === 'Home' ? team.name : opponent,
      awayTeam: homeAway === 'Away' ? team.name : opponent,
      homeScore,
      awayScore,
      status,
      venue,
      matchWeek: undefined, // can compute later in service
      matchUrl: $row.find('td[data-stat="match_report"] a').attr('href')
        ? `https://fbref.com${$row.find('td[data-stat="match_report"] a').attr('href')}`
        : undefined,
    };

    fixtures.push(fixture);
  });

  return fixtures;
}

async function scrapeAllTeams() {
  const allFixtures: RawFixture[] = [];

  for (const team of TEAMS) {
    try {
      console.log(`Scraping fixtures for ${team.name}`);
      const fixtures = await scrapeTeamFixtures(team);
      allFixtures.push(...fixtures);
      // Respect FBref rate limit: 10 requests/min
      await new Promise(res => setTimeout(res, 7000)); // 7 seconds delay
    } catch (err) {
      console.error(`Error scraping ${team.name}:`, err);
    }
  }

  // Remove duplicates (same match can appear in home/away team pages)
  const uniqueFixtures = Array.from(
    new Map(allFixtures.map(f => [f.id, f])).values()
  );

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueFixtures, null, 2));
  console.log(`Scraped ${uniqueFixtures.length} unique fixtures. Saved to ${OUTPUT_FILE}`);
}

// Run scraper
scrapeAllTeams().catch(err => console.error(err));
