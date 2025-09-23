// scripts/scrapeAllTeamStats.ts
/**
 * ===============================================================
 * Production-ready FBref Sequential Stats Scraper with Supabase
 *
 * This script sequentially scrapes a full set of team and opponent
 * match logs for all defined stat types. It handles hidden tables,
 * includes robust rate-limiting and retry logic, and exports to both
 * local JSON files and Supabase database.
 *
 * Key features:
 * - Scrapes all available stat types sequentially.
 * - Saves each stat type's data to a separate JSON file.
 * - Exports structured data to Supabase using field mappings.
 * - Enforces a 30-second delay between each stat scrape to respect
 * FBref's global rate limits.
 * ===============================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIGS } from '../config/supabaseTableConfigs.js';

/* ------------------ Path Setup ------------------ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '..', 'data');

/* ------------------ Supabase Setup ------------------ */
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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

/* ------------------ Test Configuration ------------------ */
const SCRAPE_MODES = { SINGLE: 'single', ALL: 'all' } as const;
type ScrapeMode = typeof SCRAPE_MODES[keyof typeof SCRAPE_MODES];
const SCRAPE_MODE: ScrapeMode = SCRAPE_MODES.ALL; // Change to ALL for all teams
const SINGLE_TEAM_INDEX = 0; // Arsenal
const TEST_STAT_INDEX = 6;   

/* ------------------ Rate Limiting ------------------ */
const RATE_LIMIT = {
  requestsPerMinute: 10,
  delayBetweenRequests: 6000,
  delayBetweenStats: 30000,
  retryDelay: 30000,
  maxRetries: 3
};

/* ------------------ Supabase Helper Functions ------------------ */
class SupabaseExporter {
  /**
   * Transform scraped data to Supabase format using field mappings
   */
  transformDataForSupabase(matchLogs: any[], statType: string, teamId: string): any[] {
    const config = SUPABASE_CONFIGS[statType];
    if (!config) {
      console.warn(`⚠️ No config found for stat type: ${statType}`);
      return [];
    }

    return matchLogs.map((match: any) => {
      const transformed: any = {
        id: `${teamId}_${match.Date}_${match.Opponent || 'unknown'}`.replace(/[^\w-]/g, '_'),
        season: SEASON,
        team_id: teamId,
        team_name: match.teamName,
        match_report_url: match.matchReportUrl
      };

      // Map common fields
      Object.entries(config.fieldMappings.common).forEach(([fbrefField, supabaseField]) => {
        if (match[fbrefField] !== undefined) {
          transformed[supabaseField] = this.parseValue(match[fbrefField]);
        }
      });

      // Map team stats
      if (match.team?.stats) {
        Object.entries(config.fieldMappings.team).forEach(([fbrefField, supabaseField]) => {
          if (match.team.stats[fbrefField] !== undefined) {
            transformed[supabaseField] = this.parseValue(match.team.stats[fbrefField]);
          }
        });
      }

      // Map opponent stats
      if (match.opponent?.stats) {
        Object.entries(config.fieldMappings.opponent).forEach(([fbrefField, supabaseField]) => {
          if (match.opponent.stats[fbrefField] !== undefined) {
            transformed[supabaseField] = this.parseValue(match.opponent.stats[fbrefField]);
          }
        });
      }

      return transformed;
    });
  }

  /**
   * Parse and convert values to appropriate types
   */
  private parseValue(value: any): any {
    if (value === null || value === undefined || value === '') return null;
    
    const strValue = String(value).trim();
    
    // Handle percentages
    if (strValue.endsWith('%')) {
      const numValue = parseFloat(strValue.replace('%', ''));
      return isNaN(numValue) ? null : numValue / 100;
    }
    
    // Handle numeric values
    const numValue = parseFloat(strValue);
    if (!isNaN(numValue)) return numValue;
    
    // Handle dates
    if (strValue.match(/^\d{4}-\d{2}-\d{2}$/)) return strValue;
    
    // Return as string
    return strValue;
  }

  /**
   * Upsert data to Supabase
   */
  async upsertToSupabase(data: any[], statType: string): Promise<boolean> {
    const config = SUPABASE_CONFIGS[statType];
    if (!config || data.length === 0) return false;

    try {
      console.log(`📤 Upserting ${data.length} records to ${config.tableName}...`);
      
      const { error } = await supabase
        .from(config.tableName)
        .upsert(data, { 
          onConflict: 'team_id,match_date,opponent',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Supabase upsert error for ${config.tableName}:`, error);
        return false;
      }

      console.log(`✅ Successfully upserted ${data.length} records to ${config.tableName}`);
      return true;
    } catch (err) {
      console.error(`❌ Supabase upsert exception for ${config.tableName}:`, err);
      return false;
    }
  }
}

/* ------------------ Enhanced DebugScraper ------------------ */
class DebugScraper {
  private supabaseExporter = new SupabaseExporter();

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

  /**
   * Extract match report URL from a table cell
   */
  extractMatchReportUrl($: any, cell: any): string | null {
    const link = $(cell).find('a').first();
    if (link.length > 0) {
      const href = link.attr('href');
      if (href && href.includes('/matches/')) {
        return href.startsWith('http') ? href : `https://fbref.com${href}`;
      }
    }
    return null;
  }

  /**
   * Enhanced table parsing that extracts both team and opponent stats
   */
  parseMatchLogsTable(html: string, statType: any, teamName: string): any[] {
    // Remove HTML comments to reveal hidden tables
    const cleanHtml = html.replace(/<!--/g, '').replace(/-->/g, '');
    const $ = cheerio.load(cleanHtml);

    // Find the main matchlogs table
    const tableSelectors = [
      `#matchlogs_for_${statType.key}`,
      `table[id*="matchlogs_for"]`,
      `table[id*="${statType.key}"]`,
      'table.stats_table'
    ];

    let teamTable: any = null;
    for (const sel of tableSelectors) {
      const t = $(sel).first();
      if (t.length > 0) {
        teamTable = t;
        console.log(`✅ Found team table with selector: ${sel}`);
        break;
      }
    }

    // Also look for opponent table
    const opponentSelectors = [
      `#matchlogs_against_${statType.key}`,
      `table[id*="matchlogs_against"]`,
      `table[id*="against_${statType.key}"]`
    ];

    let opponentTable: any = null;
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
        ths.each((i: any, th: any) => {
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
          ths.each((i: any, th: any) => {
            const h = $(th).text().trim();
            if (h) opponentHeaders.push(h);
          });
          if (opponentHeaders.length > 0) break;
        }
      }
    }

    // Parse team data
    const teamData: any[] = [];
    teamTable.find('tbody tr').each((i: any, tr: any) => {
      const row: Record<string, any> = {};
      let hasData = false;
      let matchReportUrl: string | null = null;

      $(tr).find('td, th').each((j: any, td: any) => {
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
      opponentTable.find('tbody tr').each((i: any, tr: any) => {
        const row: Record<string, any> = {};
        let hasData = false;

        $(tr).find('td, th').each((j: any, td: any) => {
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
    teamData.forEach((teamMatch: any, index: any) => {
      // Extract core match info (date, venue, etc.) without duplicating stats
      const coreMatchData: Record<string, any> = {};
      const teamStats: Record<string, any> = {};
      
      // Separate core match data from team stats
      Object.entries(teamMatch).forEach(([key, value]) => {
        if (['Date', 'Time', 'Comp', 'Round', 'Day', 'Venue', 'Result', 'GF', 'GA', 'Opponent', 'Poss', 'matchReportUrl', 'teamName', 'Match Report'].includes(key)) {
          // Only add to core data if it's not the redundant "Match Report" text
          if (key !== 'Match Report') {
            coreMatchData[key] = value;
          }
        } else {
          teamStats[key] = value;
        }
      });

      const combined: Record<string, any> = {
        ...coreMatchData,
        team: {
          name: teamName,
          stats: teamStats
        }
      };

      // Add opponent data if available
      if (opponentData[index]) {
        const opponentStats: Record<string, any> = {};
        // Extract only stats from opponent data, skip match info and redundant fields
        Object.entries(opponentData[index]).forEach(([key, value]) => {
          if (!['Date', 'Time', 'Comp', 'Round', 'Day', 'Venue', 'Result', 'GF', 'GA', 'Opponent', 'Poss', 'Match Report'].includes(key)) {
            opponentStats[key] = value;
          }
        });
        
        combined.opponent = {
          name: teamMatch.Opponent || 'Unknown',
          stats: opponentStats
        };
      } else if (teamMatch.Opponent) {
        // If no opponent data table found, just add the name
        combined.opponent = {
          name: teamMatch.Opponent,
          stats: {}
        };
      }

      combinedData.push(combined);
    });

    return combinedData;
  }

  async debugScrape(team: any, statType: any): Promise<any> {
    const url = this.buildUrl(team, statType);
    console.log(`🔗 Fetching: ${url}`);

    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive'
      }
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const html = await response.text();

    const matchLogs = this.parseMatchLogsTable(html, statType, team.name);

    // Transform and export to Supabase
    let supabaseSuccess = false;
    if (matchLogs.length > 0) {
      try {
        const transformedData = this.supabaseExporter.transformDataForSupabase(
          matchLogs, 
          statType.key, 
          team.id
        );
        supabaseSuccess = await this.supabaseExporter.upsertToSupabase(
          transformedData, 
          statType.key
        );
      } catch (err) {
        console.warn(`⚠️ Supabase export failed for ${team.name}:`, err);
      }
    }

    return {
      teamId: team.id,
      teamName: team.name,
      statType: statType.key,
      season: SEASON,
      url,
      matchLogs,
      scrapedAt: new Date().toISOString(),
      success: matchLogs.length > 0,
      matchCount: matchLogs.length,
      supabaseSuccess
    };
  }
}

/* ------------------ ScraperManager ------------------ */
class ScraperManager {
  private scraper = new DebugScraper();

  async run() {
    console.log('🚀 Starting full sequential stat scrape with Supabase export...');
    
    // Check Supabase connection
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('⚠️ Supabase credentials missing. Only local JSON files will be saved.');
    } else {
      console.log('✅ Supabase configured. Data will be exported to both JSON and database.');
    }
    
    // Determine the range of stats to scrape
    const statsToScrape = AVAILABLE_STATS.slice(TEST_STAT_INDEX);
    console.log(`📋 Total stat types to scrape: ${statsToScrape.length}`);
    
    for (let i = 0; i < statsToScrape.length; i++) {
      const stat = statsToScrape[i];
      console.log(`\n--- Scraping Stat ${TEST_STAT_INDEX + i + 1} of ${AVAILABLE_STATS.length}: ${stat.name} ---`);
      
      // Determine teams to scrape based on mode
      const teamsToScrape = SCRAPE_MODE === SCRAPE_MODES.ALL ? AVAILABLE_TEAMS : [AVAILABLE_TEAMS[SINGLE_TEAM_INDEX]];
      console.log(`📋 Total teams to scrape: ${teamsToScrape.length}`);
      
      const statResults: any[] = [];
      let supabaseSuccessCount = 0;
      
      for (let j = 0; j < teamsToScrape.length; j++) {
        const team = teamsToScrape[j];
        console.log(`\n⏱ Scraping team ${j + 1} of ${teamsToScrape.length}: ${team.name}`);

        let attempts = 0;
        let success = false;
        while (!success && attempts <= RATE_LIMIT.maxRetries) {
          try {
            const result = await this.scraper.debugScrape(team, stat);
            statResults.push(result);
            success = true;
            if (result.supabaseSuccess) supabaseSuccessCount++;

            console.log(`✅ Success! Found ${result.matchCount} matches for ${team.name}`);
            console.log(`📤 Supabase export: ${result.supabaseSuccess ? '✅' : '❌'}`);
            
            // Log sample data for debugging
            if (result.matchLogs.length > 0) {
              const sampleMatch = result.matchLogs[0];
              console.log(`📋 Sample match data keys: ${Object.keys(sampleMatch).slice(0, 10).join(', ')}`);
              
              if (sampleMatch.matchReportUrl) {
                console.log(`🔗 Sample match report URL: ${sampleMatch.matchReportUrl}`);
              }
              
              if (sampleMatch.opponent) {
                console.log(`🆚 Sample opponent: ${sampleMatch.opponent.name || 'Unknown'}`);
              }
            }
            
          } catch (err) {
            attempts++;
            console.warn(`⚠️ Attempt ${attempts} failed for ${team.name}: ${err}`);
            if (attempts <= RATE_LIMIT.maxRetries) {
              console.log(`Retrying in ${RATE_LIMIT.retryDelay / 1000}s...`);
              await new Promise(res => setTimeout(res, RATE_LIMIT.retryDelay));
            }
          }
        }

        if (!success) {
          console.error(`❌ Failed to scrape ${team.name} after ${RATE_LIMIT.maxRetries} retries`);
          // Add empty result to maintain consistency
          statResults.push({
            teamId: team.id,
            teamName: team.name,
            statType: stat.key,
            season: SEASON,
            url: this.scraper.buildUrl(team, stat),
            matchLogs: [],
            scrapedAt: new Date().toISOString(),
            success: false,
            matchCount: 0,
            supabaseSuccess: false,
            error: 'Failed after retries'
          });
        }

        if (j < teamsToScrape.length - 1) {
          console.log(`⏳ Waiting ${RATE_LIMIT.delayBetweenRequests / 1000}s before next scrape...`);
          await new Promise(res => setTimeout(res, RATE_LIMIT.delayBetweenRequests));
        }
      }

      // Save local JSON file
      const filename = `Team${stat.name.replace(/\s+/g, '')}Stats.json`;
      this.scraper.saveFile(filename, JSON.stringify(statResults, null, 2));
      console.log(`\n💾 All ${stat.name} data saved to data/${filename}`);
      console.log(`📤 Supabase exports successful: ${supabaseSuccessCount}/${teamsToScrape.length}`);

      // Add delay before next stat scrape
      if (i < statsToScrape.length - 1) {
          console.log(`\n-----------------------------------------------------`);
          console.log(`⏳ Waiting ${RATE_LIMIT.delayBetweenStats / 1000}s before next stat scrape...`);
          console.log(`-----------------------------------------------------`);
          await new Promise(res => setTimeout(res, RATE_LIMIT.delayBetweenStats));
      }
    }
    
    console.log(`\n📊 Final Summary:`);
    console.log(`   ✅ All scraping and export operations complete.`);
    console.log('   📁 JSON files saved to data/ directory');
    console.log('   🗄️ Data exported to Supabase (where successful)');
  }
}

/* ------------------ Main ------------------ */
async function main() {
  console.log('🐛 Starting enhanced team vs opponent scraper with Supabase...');
  const manager = new ScraperManager();
  await manager.run();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
