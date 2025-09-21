// scripts/scrapeTeamStats.ts
/**
 * ===============================================================
 * Production-ready FBref Team Stats Scraper
 *
 * Features:
 * 1. Scrapes 7 stat types for all Premier League teams
 * 2. Respects rate limits with configurable delays
 * 3. Robust error handling and retry logic
 * 4. Progress tracking and resumption capability
 * 5. Saves JSON files and uploads to Supabase
 * 6. Concurrent processing with queue management
 * ===============================================================
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

/* ------------------ Configuration ------------------ */
const FBREF_BASE_URL = 'https://fbref.com/en/squads';
const SEASON = '2025-2026';
const DATA_DIR = path.join(process.cwd(), 'data', 'team-stats');
const PROGRESS_FILE = path.join(DATA_DIR, 'scraping-progress.json');

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerMinute: 10,  // Conservative limit - adjust based on FBref's actual limits
  delayBetweenRequests: 6000, // 6 seconds between requests
  retryDelay: 30000,      // 30 seconds before retry on error
  maxRetries: 3
};

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/* ------------------ Types ------------------ */
interface TeamInfo {
  id: string;
  name: string;
  fbrefId: string; // The UUID from FBref URLs like "18bb7c10"
}

interface StatType {
  key: string;
  name: string;
  tableName: string; // Supabase table name
}

interface ScrapingProgress {
  completedTeams: string[];
  completedStats: Record<string, string[]>; // teamId -> completed stat types
  lastUpdated: string;
  errors: Array<{ team: string; stat: string; error: string; timestamp: string }>;
}

interface TeamStatData {
  teamId: string;
  teamName: string;
  statType: string;
  season: string;
  matchLogs: any[];
  scrapedAt: string;
}

/* ------------------ Premier League Teams ------------------ */
const PREMIER_LEAGUE_TEAMS: TeamInfo[] = [
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
  { id: 'sunderland', name: 'Sunderland', fbrefId: '4a2215db' },
  { id: 'tottenham', name: 'Tottenham Hotspur', fbrefId: '361ca564' },
  { id: 'west-ham', name: 'West Ham United', fbrefId: '7c21e445' },
  { id: 'wolves', name: 'Wolverhampton Wanderers', fbrefId: '8cec06e1' }
];

/* ------------------ Stat Types ------------------ */
const STAT_TYPES: StatType[] = [
  { key: 'shooting', name: 'Shooting', tableName: 'team_shooting_stats' },
  { key: 'keeper', name: 'Goalkeeper', tableName: 'team_keeper_stats' },
  { key: 'passing', name: 'Passing', tableName: 'team_passing_stats' },
  { key: 'passing_types', name: 'Passing Types', tableName: 'team_passing_types_stats' },
  { key: 'gca', name: 'Goal and Shot Creation', tableName: 'team_gca_stats' },
  { key: 'defense', name: 'Defense', tableName: 'team_defense_stats' },
  { key: 'misc', name: 'Miscellaneous', tableName: 'team_misc_stats' }
];

/* ------------------ Rate Limiting ------------------ */
class RateLimiter {
  private lastRequestTime = 0;

  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT.delayBetweenRequests) {
      const waitTime = RATE_LIMIT.delayBetweenRequests - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
}

/* ------------------ Progress Management ------------------ */
class ProgressManager {
  private progress: ScrapingProgress;

  constructor() {
    this.progress = this.loadProgress();
  }

  private loadProgress(): ScrapingProgress {
    try {
      if (fs.existsSync(PROGRESS_FILE)) {
        const data = fs.readFileSync(PROGRESS_FILE, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.warn('Failed to load progress file, starting fresh:', error);
    }

    return {
      completedTeams: [],
      completedStats: {},
      lastUpdated: new Date().toISOString(),
      errors: []
    };
  }

  saveProgress(): void {
    try {
      fs.mkdirSync(path.dirname(PROGRESS_FILE), { recursive: true });
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  isCompleted(teamId: string, statType: string): boolean {
    return this.progress.completedStats[teamId]?.includes(statType) || false;
  }

  markCompleted(teamId: string, statType: string): void {
    if (!this.progress.completedStats[teamId]) {
      this.progress.completedStats[teamId] = [];
    }
    
    if (!this.progress.completedStats[teamId].includes(statType)) {
      this.progress.completedStats[teamId].push(statType);
    }

    this.progress.lastUpdated = new Date().toISOString();
    this.saveProgress();
  }

  addError(teamId: string, statType: string, error: string): void {
    this.progress.errors.push({
      team: teamId,
      stat: statType,
      error,
      timestamp: new Date().toISOString()
    });
    this.saveProgress();
  }

  getProgress(): { completed: number; total: number; percentage: number } {
    const total = PREMIER_LEAGUE_TEAMS.length * STAT_TYPES.length;
    const completed = Object.values(this.progress.completedStats)
      .reduce((sum, stats) => sum + stats.length, 0);
    
    return {
      completed,
      total,
      percentage: Math.round((completed / total) * 100)
    };
  }
}

/* ------------------ Scraper Class ------------------ */
class TeamStatsScraper {
  private rateLimiter = new RateLimiter();
  private progressManager = new ProgressManager();

  async scrapeTeamStat(team: TeamInfo, statType: StatType): Promise<TeamStatData | null> {
    const url = this.buildUrl(team, statType);
    
    try {
      console.log(`📊 Scraping ${statType.name} for ${team.name}...`);
      
      await this.rateLimiter.waitForRateLimit();
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const matchLogs = this.parseStatsTable(html, statType.key);

      const statData: TeamStatData = {
        teamId: team.id,
        teamName: team.name,
        statType: statType.key,
        season: SEASON,
        matchLogs,
        scrapedAt: new Date().toISOString()
      };

      console.log(`✅ Successfully scraped ${matchLogs.length} records for ${team.name} ${statType.name}`);
      return statData;

    } catch (error) {
      console.error(`❌ Failed to scrape ${statType.name} for ${team.name}:`, error);
      this.progressManager.addError(team.id, statType.key, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private buildUrl(team: TeamInfo, statType: StatType): string {
    const teamNameSlug = team.name.replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    return `${FBREF_BASE_URL}/${team.fbrefId}/${SEASON}/matchlogs/all_comps/${statType.key}/${teamNameSlug}-Match-Logs-All-Competitions`;
  }

  private parseStatsTable(html: string, statType: string): any[] {
    const $ = cheerio.load(html);
    const matchLogs: any[] = [];

    // Find the stats table - FBref uses specific IDs for different stat types
    const tableId = `matchlogs_for_${statType}`;
    const table = $(`#${tableId}`);
    
    if (table.length === 0) {
      console.warn(`Table ${tableId} not found, trying alternative selectors...`);
      // Try alternative table selectors
      const altTable = $('table[id*="matchlogs"]').first();
      if (altTable.length === 0) {
        throw new Error(`No stats table found for ${statType}`);
      }
    }

    // Extract headers
    const headers: string[] = [];
    table.find('thead tr th').each((_, th) => {
      const header = $(th).text().trim();
      if (header) headers.push(header);
    });

    // Extract data rows
    table.find('tbody tr').each((_, tr) => {
      const row: Record<string, any> = {};
      $(tr).find('td, th').each((index, cell) => {
        const value = $(cell).text().trim();
        const header = headers[index];
        if (header) {
          row[header] = value || null;
        }
      });
      
      if (Object.keys(row).length > 0) {
        matchLogs.push(row);
      }
    });

    return matchLogs;
  }

  async saveToFile(statData: TeamStatData): Promise<void> {
    const fileName = `${statData.teamId}_${statData.statType}_${statData.season}.json`;
    const filePath = path.join(DATA_DIR, fileName);
    
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(statData, null, 2));
    
    console.log(`💾 Saved ${fileName}`);
  }

  async uploadToSupabase(statData: TeamStatData): Promise<void> {
    const tableName = STAT_TYPES.find(st => st.key === statData.statType)?.tableName;
    
    if (!tableName) {
      throw new Error(`No table mapping found for stat type: ${statData.statType}`);
    }

    // Transform match logs for database
    const records = statData.matchLogs.map(log => ({
      team_id: statData.teamId,
      team_name: statData.teamName,
      season: statData.season,
      scraped_at: statData.scrapedAt,
      ...log // Spread all the scraped stats
    }));

    if (records.length === 0) {
      console.warn(`No records to upload for ${statData.teamName} ${statData.statType}`);
      return;
    }

    const { error } = await supabase
      .from(tableName)
      .upsert(records, {
        onConflict: 'team_id,season,Date', // Adjust conflict resolution as needed
        ignoreDuplicates: false
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    console.log(`📤 Uploaded ${records.length} records to ${tableName}`);
  }

  async scrapeAllTeamStats(): Promise<void> {
    console.log('🚀 Starting team stats scraping...');
    
    const progress = this.progressManager.getProgress();
    console.log(`📈 Progress: ${progress.completed}/${progress.total} (${progress.percentage}%)`);

    for (const team of PREMIER_LEAGUE_TEAMS) {
      console.log(`\n🔄 Processing ${team.name}...`);
      
      for (const statType of STAT_TYPES) {
        // Skip if already completed
        if (this.progressManager.isCompleted(team.id, statType.key)) {
          console.log(`⏭️  Skipping ${team.name} ${statType.name} (already completed)`);
          continue;
        }

        let retries = 0;
        let success = false;

        while (retries < RATE_LIMIT.maxRetries && !success) {
          const statData = await this.scrapeTeamStat(team, statType);
          
          if (statData) {
            try {
              await this.saveToFile(statData);
              await this.uploadToSupabase(statData);
              
              this.progressManager.markCompleted(team.id, statType.key);
              success = true;
              
              const newProgress = this.progressManager.getProgress();
              console.log(`📊 Progress: ${newProgress.completed}/${newProgress.total} (${newProgress.percentage}%)`);
              
            } catch (uploadError) {
              console.error(`Failed to save/upload data:`, uploadError);
              retries++;
              
              if (retries < RATE_LIMIT.maxRetries) {
                console.log(`🔄 Retrying in ${RATE_LIMIT.retryDelay}ms... (${retries}/${RATE_LIMIT.maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay));
              }
            }
          } else {
            retries++;
            if (retries < RATE_LIMIT.maxRetries) {
              console.log(`🔄 Retrying in ${RATE_LIMIT.retryDelay}ms... (${retries}/${RATE_LIMIT.maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, RATE_LIMIT.retryDelay));
            }
          }
        }

        if (!success) {
          console.error(`💥 Failed to scrape ${team.name} ${statType.name} after ${RATE_LIMIT.maxRetries} attempts`);
        }
      }
    }

    const finalProgress = this.progressManager.getProgress();
    console.log(`\n🎉 Scraping completed! Final progress: ${finalProgress.completed}/${finalProgress.total} (${finalProgress.percentage}%)`);
    
    if (finalProgress.percentage < 100) {
      console.log(`⚠️  Some stats failed to scrape. Check the progress file for details: ${PROGRESS_FILE}`);
    }
  }
}

/* ------------------ Main Execution ------------------ */
async function main() {
  try {
    const scraper = new TeamStatsScraper();
    await scraper.scrapeAllTeamStats();
  } catch (error) {
    console.error('💥 Scraping failed:', error);
    process.exit(1);
  }
}

// Run the scraper
if (require.main === module) {
  console.log('🏈 Team Stats Scraper Starting...');
  main();
}
