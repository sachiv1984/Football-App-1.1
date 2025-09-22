// scripts/scrapeAllTeamStats.ts
/**
 * ===============================================================
 * Production-ready FBref Sequential Stats Scraper
 *
 * This script sequentially scrapes a full set of team and opponent
 * match logs for all defined stat types. It handles hidden tables
 * and includes robust rate-limiting and retry logic.
 *
 * Key features:
 * - Scrapes all available stat types sequentially.
 * - Saves each stat type's data to a separate JSON file.
 * - Enforces a 30-second delay between each stat scrape to respect
 * FBref's global rate limits.
 * ===============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';

/* ------------------ Path Setup ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

/* ------------------ Configuration ------------------ */
const FBREF_BASE_URL = 'https://fbref.com/en/squads';
const SEASON = '2025-2026';

const AVAILABLE_TEAMS = [
  { id: 'arsenal', name: 'Arsenal', fbrefId: '18bb7c10' },
  { id: 'aston-villa', name: 'Aston Villa', fbrefId: '8602292d' },
  { id: 'bournemouth', name: 'Bournemouth', fbrefId: '4ba7cbea' },
  { id: 'brentford', name: 'Brentford', fbrefId: 'cd051869' },
  { id: 'brighton', name: 'Brighton & Hove Albion', fbrefId: 'd07537b9' },
  { id: 'burnley', name: 'Burnley', fbrefId: '943e8050' },
  { id: 'chelsea', name: 'Chelsea', fbrefId: 'cff3d9bb' },
  { id: 'crystal-palace', name: 'Crystal Palace', fbrefId: '47c64c55' },
  { id: 'everton', name: 'Everton', fbrefId: 'd3fd31cc' },
  { id: 'fulham', name: 'Fulham', fbrefId: 'fd962109' },
  { id: 'leeds-united', name: 'Leeds United', fbrefId: '5bfb9659' },
  { id: 'liverpool', name: 'Liverpool', fbrefId: '822bd0ba' },
  { id: 'manchester-city', name: 'Manchester City', fbrefId: 'b8fd03ef' },
  { id: 'manchester-united', name: 'Manchester United', fbrefId: '19538871' },
  { id: 'newcastle-united', name: 'Newcastle United', fbrefId: 'b2b47a98' },
  { id: 'nottingham-forest', name: "Nottingham Forest", fbrefId: 'e4a775cb' },
  { id: 'sunderland', name: 'Sunderland', fbrefId: '8ef52968' },
  { id: 'tottenham', name: 'Tottenham Hotspur', fbrefId: '361ca564' },
  { id: 'west-ham', name: 'West Ham United', fbrefId: '7c21e445' },
  { id: 'wolves', name: 'Wolverhampton Wanderers', fbrefId: '8cec06e1' }
];

const AVAILABLE_STATS = [
  { key: 'shooting', name: 'Shooting', tableName: 'team_shooting_stats' },
  { key: 'keeper', name: 'Goalkeeper', tableName: 'team_keeper_stats' },
  { key: 'passing', name: 'Passing', tableName: 'team_passing_stats' },
  { key: 'passing_types', name: 'Passing Types', tableName: 'team_passing_types_stats' },
  { key: 'gca', name: 'Goal and Shot Creation', tableName: 'team_gca_stats' },
  { key: 'defense', name: 'Defense', tableName: 'team_defense_stats' },
  { key: 'misc', name: 'Miscellaneous', tableName: 'team_misc_stats' }
];

/* ------------------ Rate Limiting ------------------ */
const RATE_LIMIT = {
  // Delay between individual team scrapes
  delayBetweenRequests: 6000, 
  // Delay between full stat scrapes (as per your request)
  delayBetweenStats: 30000,
  retryDelay: 30000,
  maxRetries: 3
};

/* ------------------ Scraper Class ------------------ */
/**
 * Handles the low-level scraping logic for a single team and stat type.
 * This class is kept clean and focused on its single responsibility.
 */
class Scraper {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  saveFile(filename: string, content: string) {
    this.ensureDataDir();
    fs.writeFileSync(path.join(DATA_DIR, filename), content, 'utf8');
  }

  buildUrl(team: any, statType: any): string {
    const teamNameSlug = team.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    return `${FBREF_BASE_URL}/${team.fbrefId}/${SEASON}/matchlogs/c9/${statType.key}/${teamNameSlug}-Match-Logs-Premier-League`;
  }

  extractMatchReportUrl($: cheerio.Root, cell: cheerio.Element): string | null {
    const link = $(cell).find('a').first();
    if (link.length > 0) {
      const href = link.attr('href');
      if (href && href.includes('/matches/')) {
        return href.startsWith('http') ? href : `https://fbref.com${href}`;
      }
    }
    return null;
  }

  parseMatchLogsTable(html: string, statType: any, teamName: string): any[] {
    // Remove HTML comments to reveal hidden tables
    const cleanHtml = html.replace(//g, '');
    const $ = cheerio.load(cleanHtml);

    // Find the main matchlogs table
    const tableSelectors = [ `#matchlogs_for_${statType.key}`, `table[id*="matchlogs_for"]`, `table[id*="${statType.key}"]`, 'table.stats_table'];
    let teamTable: cheerio.Cheerio | null = null;
    for (const sel of tableSelectors) {
      const t = $(sel).first();
      if (t.length > 0) {
        teamTable = t;
        console.log(`✅ Found team table with selector: ${sel}`);
        break;
      }
    }

    // Also look for opponent table
    const opponentSelectors = [ `#matchlogs_against_${statType.key}`, `table[id*="matchlogs_against"]`, `table[id*="against_${statType.key}"]`];
    let opponentTable: cheerio.Cheerio | null = null;
    for (const sel of opponentSelectors) {
      const t = $(sel).first();
      if (t.length > 0) {
        opponentTable = t;
        console.log(`✅ Found opponent table with selector: ${sel}`);
        break;
      }
    }

    if (!teamTable || teamTable.length === 0) {
      console.warn(`❌ No team table found for ${statType.key}`);
      return [];
    }

    // Extract headers from team table
    const headers: string[] = [];
    const headerSelectors = ['thead tr:last-child th', 'thead tr th', 'tr:first-child th', 'tr:first-child td'];
    for (const sel of headerSelectors) {
      const ths = teamTable.find(sel);
      if (ths.length > 0) {
        ths.each((i, th) => {
          const h = $(th).text().trim();
          if (h) headers.push(h);
        });
        if (headers.length > 0) break;
      }
    }

    if (headers.length === 0) {
      console.warn('❌ No headers found');
      return [];
    }

    console.log(`📋 Headers found: ${headers.slice(0, 10).join(', ')}...`);

    // Extract opponent headers if opponent table exists
    let opponentHeaders: string[] = [];
    if (opponentTable) {
      for (const sel of headerSelectors) {
        const ths = opponentTable.find(sel);
        if (ths.length > 0) {
          ths.each((i, th) => {
            const h = $(th).text().trim();
            if (h) opponentHeaders.push(h);
          });
          if (opponentHeaders.length > 0) break;
        }
      }
    }

    // Parse team data
    const teamData: any[] = [];
    teamTable.find('tbody tr').each((i, tr) => {
      const row: Record<string, any> = {};
      let hasData = false;
      let matchReportUrl: string | null = null;

      $(tr).find('td, th').each((j, td) => {
        const val = $(td).text().trim();
        if (headers[j] && val !== '') {
          row[headers[j]] = val;
          hasData = true;
        }

        // Look for match report link (usually in Date column)
        if (headers[j] === 'Date' || j === 0) {
          const url = this.extractMatchReportUrl($, td);
          if (url) matchReportUrl = url;
        }
      });
      if (hasData) {
        row.matchReportUrl = matchReportUrl;
        row.teamName = teamName;
        teamData.push(row);
      }
    });

    // Parse opponent data if available
    const opponentData: any[] = [];
    if (opponentTable && opponentHeaders.length > 0) {
      opponentTable.find('tbody tr').each((i, tr) => {
        const row: Record<string, any> = {};
        let hasData = false;
        $(tr).find('td, th').each((j, td) => {
          const val = $(td).text().trim();
          if (opponentHeaders[j] && val !== '') {
            row[opponentHeaders[j]] = val;
            hasData = true;
          }
        });
        if (hasData) {
          opponentData.push(row);
        }
      });
    }

    // Combine team and opponent data
    const combinedData: any[] = [];
    teamData.forEach((teamMatch, index) => {
      const coreMatchData: Record<string, any> = {};
      const teamStats: Record<string, any> = {};
      
      Object.entries(teamMatch).forEach(([key, value]) => {
        if (['Date', 'Time', 'Comp', 'Round', 'Day', 'Venue', 'Result', 'GF', 'GA', 'Opponent', 'Poss', 'matchReportUrl', 'teamName', 'Match Report'].includes(key)) {
          if (key !== 'Match Report') coreMatchData[key] = value;
        } else {
          teamStats[key] = value;
        }
      });
      
      const combined: Record<string, any> = {
        ...coreMatchData,
        team: { name: teamName, stats: teamStats }
      };

      if (opponentData[index]) {
        const opponentStats: Record<string, any> = {};
        Object.entries(opponentData[index]).forEach(([key, value]) => {
          if (!['Date', 'Time', 'Comp', 'Round', 'Day', 'Venue', 'Result', 'GF', 'GA', 'Opponent', 'Poss', 'Match Report'].includes(key)) {
            opponentStats[key] = value;
          }
        });
        combined.opponent = { name: teamMatch.Opponent || 'Unknown', stats: opponentStats };
      } else if (teamMatch.Opponent) {
        combined.opponent = { name: teamMatch.Opponent, stats: {} };
      }
      combinedData.push(combined);
    });
    return combinedData;
  }

  async Scrape(team: any, statType: any): Promise<any> {
    const url = this.buildUrl(team, statType);
    console.log(`🔗 Fetching: ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const html = await response.text();
    const matchLogs = this.parseMatchLogsTable(html, statType, team.name);
    return {
      teamId: team.id,
      teamName: team.name,
      statType: statType.key,
      season: SEASON,
      url,
      matchLogs,
      scrapedAt: new Date().toISOString(),
      success: matchLogs.length > 0,
      matchCount: matchLogs.length
    };
  }
}

/*/* ------------------ Scraper Class ------------------ */
/**
 * Handles the low-level scraping logic for a single team and stat type.
 */
class Scraper {
  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  saveFile(filename: string, content: string) {
    this.ensureDataDir();
    fs.writeFileSync(path.join(DATA_DIR, filename), content, 'utf8');
  }

  buildUrl(team: any, statType: any): string {
    const teamNameSlug = team.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    return `${FBREF_BASE_URL}/${team.fbrefId}/${SEASON}/matchlogs/c9/${statType.key}/${teamNameSlug}-Match-Logs-Premier-League`;
  }

  extractMatchReportUrl($: cheerio.Root, cell: cheerio.Element): string | null {
    const link = $(cell).find('a').first();
    if (link.length > 0) {
      const href = link.attr('href');
      if (href && href.includes('/matches/')) {
        return href.startsWith('http') ? href : `https://fbref.com${href}`;
      }
    }
    return null;
  }

  parseMatchLogsTable(html: string, statType: any, teamName: string): any[] {
    // Remove HTML comments to reveal hidden tables
    const cleanHtml = html.replace(//g, '');

    // FIX: Get the correct `load` function due to CJS/ESM compatibility
    // The load function may be at the top level or on the 'default' property.
    const loadFunction = typeof cheerio.load === 'function' ? cheerio.load : (cheerio as any).default.load;
    const $ = loadFunction(cleanHtml);

    // Find the main matchlogs table
    const tableSelectors = [ `#matchlogs_for_${statType.key}`, `table[id*="matchlogs_for"]`, `table[id*="${statType.key}"]`, 'table.stats_table'];
    let teamTable: cheerio.Cheerio | null = null;
    for (const sel of tableSelectors) {
      const t = $(sel).first();
      if (t.length > 0) { teamTable = t; console.log(`✅ Found team table with selector: ${sel}`); break; }
    }

    // Also look for opponent table
    const opponentSelectors = [ `#matchlogs_against_${statType.key}`, `table[id*="matchlogs_against"]`, `table[id*="against_${statType.key}"]`];
    let opponentTable: cheerio.Cheerio | null = null;
    for (const sel of opponentSelectors) {
      const t = $(sel).first();
      if (t.length > 0) { opponentTable = t; console.log(`✅ Found opponent table with selector: ${sel}`); break; }
    }

    if (!teamTable || teamTable.length === 0) {
      console.warn(`❌ No team table found for ${statType.key}`);
      return [];
    }

    // Extract headers from team table
    const headers: string[] = [];
    const headerSelectors = ['thead tr:last-child th', 'thead tr th', 'tr:first-child th', 'tr:first-child td'];
    for (const sel of headerSelectors) {
      const ths = teamTable.find(sel);
      if (ths.length > 0) {
        ths.each((i, th) => { const h = $(th).text().trim(); if (h) headers.push(h); });
        if (headers.length > 0) break;
      }
    }

    if (headers.length === 0) { console.warn('❌ No headers found'); return []; }
    console.log(`📋 Headers found: ${headers.slice(0, 10).join(', ')}...`);

    // Extract opponent headers if opponent table exists
    let opponentHeaders: string[] = [];
    if (opponentTable) {
      for (const sel of headerSelectors) {
        const ths = opponentTable.find(sel);
        if (ths.length > 0) {
          ths.each((i, th) => { const h = $(th).text().trim(); if (h) opponentHeaders.push(h); });
          if (opponentHeaders.length > 0) break;
        }
      }
    }

    // Parse team data
    const teamData: any[] = [];
    teamTable.find('tbody tr').each((i, tr) => {
      const row: Record<string, any> = {}; let hasData = false; let matchReportUrl: string | null = null;
      $(tr).find('td, th').each((j, td) => {
        const val = $(td).text().trim();
        if (headers[j] && val !== '') { row[headers[j]] = val; hasData = true; }
        if (headers[j] === 'Date' || j === 0) { const url = this.extractMatchReportUrl($, td); if (url) matchReportUrl = url; }
      });
      if (hasData) { row.matchReportUrl = matchReportUrl; row.teamName = teamName; teamData.push(row); }
    });

    // Parse opponent data if available
    const opponentData: any[] = [];
    if (opponentTable && opponentHeaders.length > 0) {
      opponentTable.find('tbody tr').each((i, tr) => {
        const row: Record<string, any> = {}; let hasData = false;
        $(tr).find('td, th').each((j, td) => {
          const val = $(td).text().trim();
          if (opponentHeaders[j] && val !== '') { row[opponentHeaders[j]] = val; hasData = true; }
        });
        if (hasData) { opponentData.push(row); }
      });
    }

    // Combine team and opponent data
    const combinedData: any[] = [];
    teamData.forEach((teamMatch, index) => {
      const coreMatchData: Record<string, any> = {}; const teamStats: Record<string, any> = {};
      Object.entries(teamMatch).forEach(([key, value]) => {
        if (['Date', 'Time', 'Comp', 'Round', 'Day', 'Venue', 'Result', 'GF', 'GA', 'Opponent', 'Poss', 'matchReportUrl', 'teamName', 'Match Report'].includes(key)) {
          if (key !== 'Match Report') coreMatchData[key] = value;
        } else { teamStats[key] = value; }
      });
      
      const combined: Record<string, any> = { ...coreMatchData, team: { name: teamName, stats: teamStats } };
      if (opponentData[index]) {
        const opponentStats: Record<string, any> = {};
        Object.entries(opponentData[index]).forEach(([key, value]) => {
          if (!['Date', 'Time', 'Comp', 'Round', 'Day', 'Venue', 'Result', 'GF', 'GA', 'Opponent', 'Poss', 'Match Report'].includes(key)) {
            opponentStats[key] = value;
          }
        });
        combined.opponent = { name: teamMatch.Opponent || 'Unknown', stats: opponentStats };
      } else if (teamMatch.Opponent) {
        combined.opponent = { name: teamMatch.Opponent, stats: {} };
      }
      combinedData.push(combined);
    });
    return combinedData;
  }

  async Scrape(team: any, statType: any): Promise<any> {
    const url = this.buildUrl(team, statType);
    console.log(`🔗 Fetching: ${url}`);
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const html = await response.text();
    const matchLogs = this.parseMatchLogsTable(html, statType, team.name);
    return {
      teamId: team.id, teamName: team.name, statType: statType.key, season: SEASON, url, matchLogs,
      scrapedAt: new Date().toISOString(), success: matchLogs.length > 0, matchCount: matchLogs.length
    };
  }
}


/* ------------------ Main Execution ------------------ */
async function main() {
  const manager = new ScraperManager();
  await manager.run();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
