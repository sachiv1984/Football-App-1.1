// src/services/stats/fbrefTeamMatchLogsService.ts

import { fbrefScraper, type ScrapedData } from "../scrape/Fbref";
import { normalizeTeamName } from "../../utils/teamUtils";

export interface TeamMatchLogCorners {
  date: string;
  opponent: string;
  venue: 'Home' | 'Away';
  corners: number;
  cornersAgainst?: number;
  matchUrl?: string;
}

export interface TeamSeasonCorners {
  teamName: string;
  season: string;
  competition: string;
  matches: TeamMatchLogCorners[];
}

export interface ScrapeOptions {
  concurrency?: number;
  delayBetweenRequests?: number;
  retries?: number;
  enableLogging?: boolean;
  skipDefensiveData?: boolean; // For cases where only offensive stats are needed
}

export class FBrefTeamMatchLogsService {
  private readonly defaultOptions: Required<ScrapeOptions> = {
    concurrency: 2, // Reduced from 3 to avoid rate limiting
    delayBetweenRequests: 1500, // Increased from 800ms to be more conservative
    retries: 1, // Reduced retries to minimize requests
    enableLogging: true,
    skipDefensiveData: true, // Default to true since /vs URLs seem unreliable
  };

  // Cache parsed tables to avoid re-parsing similar structures
  private readonly tableCache = new Map<string, any>();
  
  /**
   * Scrape team's match logs for corner statistics (optimized version)
   */
  async scrapeTeamCorners(
    teamId: string, 
    season: string, 
    competitionId: string, 
    teamName: string,
    options: Partial<ScrapeOptions> = {}
  ): Promise<TeamSeasonCorners | null> {
    
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      // Always get offensive data first
      const offensiveData = await this.scrapePassingTypes(teamId, season, competitionId, false, opts);
      
      if (!offensiveData) {
        if (opts.enableLogging) {
          console.error(`[TeamMatchLogs] Failed to get offensive data for ${teamName}`);
        }
        return null;
      }

      let defensiveData: TeamMatchLogCorners[] | null = null;
      
      // Try to get defensive data if not skipping, but don't fail if it doesn't work
      if (!opts.skipDefensiveData) {
        try {
          defensiveData = await this.scrapePassingTypes(teamId, season, competitionId, true, opts);
          if (opts.enableLogging && !defensiveData) {
            console.warn(`[TeamMatchLogs] Defensive data not available for ${teamName}, using offensive only`);
          }
        } catch (error) {
          if (opts.enableLogging) {
            console.warn(`[TeamMatchLogs] Failed to get defensive data for ${teamName}, continuing with offensive only:`, error);
          }
          // Continue without defensive data
        }
      }

      // Merge the data
      const matches = this.mergeOffensiveAndDefensive(offensiveData, defensiveData);

      return {
        teamName: normalizeTeamName(teamName),
        season,
        competition: this.getCompetitionName(competitionId),
        matches
      };
    } catch (error) {
      if (opts.enableLogging) {
        console.error(`[TeamMatchLogs] Error scraping ${teamName}:`, error);
      }
      return null;
    }
  }

  private async scrapePassingTypes(
    teamId: string, 
    season: string, 
    competitionId: string, 
    isOpposition: boolean,
    options: Required<ScrapeOptions>
  ): Promise<TeamMatchLogCorners[] | null> {
    
    const url = FBrefUrlBuilder.buildPassingTypesUrl(teamId, season, competitionId, isOpposition);
    
    if (options.enableLogging) {
      console.log(`[TeamMatchLogs] Scraping ${isOpposition ? 'defensive' : 'offensive'} corners: ${url}`);
    }

    // Try with retries
    for (let attempt = 1; attempt <= options.retries + 1; attempt++) {
      try {
        const scraped = await fbrefScraper.scrapeUrl(url);
        const table = this.findMatchLogsTable(scraped, url);
        
        if (!table) {
          if (options.enableLogging) {
            console.warn(`[TeamMatchLogs] No suitable table found in ${url} (attempt ${attempt})`);
          }
          if (attempt <= options.retries) {
            await this.delay(options.delayBetweenRequests);
            continue;
          }
          return null;
        }

        return this.extractCornersFromMatchLogsTable(table, isOpposition, options);
        
      } catch (err) {
        if (options.enableLogging) {
          console.warn(`[TeamMatchLogs] Attempt ${attempt} failed for ${url}:`, err);
        }
        
        if (attempt <= options.retries) {
          await this.delay(options.delayBetweenRequests * attempt); // Exponential backoff
        } else {
          if (options.enableLogging) {
            console.error(`[TeamMatchLogs] All attempts failed for ${url}:`, err);
          }
          throw err; // Re-throw to let caller handle it
        }
      }
    }
    
    return null;
  }

  private findMatchLogsTable(scraped: ScrapedData, url?: string): any | null {
    // Check cache first
    const cacheKey = url ? `table_${url}` : `table_${Date.now()}`;
    if (url && this.tableCache.has(cacheKey)) {
      return this.tableCache.get(cacheKey);
    }

    // Look for match logs table - it could be offensive or defensive data
    const table = scraped.tables.find(t => {
      if (!t.rows || t.rows.length === 0) return false;
      
      const cap = (t.caption || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      const headers = t.headers || [];
      
      // Check if this is a match logs table
      const hasMatchLogs = cap.includes("match logs") || cap.includes("matchlogs") || 
                          id.includes("matchlogs") || id.includes("match_logs") ||
                          id === "matchlogs_against"; // Specific check for opposition table
      
      // Must have corner kicks column
      const hasCorners = headers.some((h: string) => {
        const header = h.toLowerCase();
        return header === 'ck' || header.includes('corner') || 
               header === 'corner_kicks' || header.includes('corner kicks');
      });
      
      const hasRequiredColumns = this.hasRequiredColumns(headers);
      
      // Additional check: look for the "Against [Team]" pattern in caption or headers
      const isOppositionTable = cap.includes('against ') || 
                               t.headers.some((h: string) => h.toLowerCase().includes('against'));
      
      return hasMatchLogs && hasCorners && hasRequiredColumns;
    });

    if (table && url) {
      // Cache the result
      this.tableCache.set(cacheKey, table);
      // Limit cache size
      if (this.tableCache.size > 50) {
        const firstKey = this.tableCache.keys().next().value;
        if (firstKey !== undefined) {
          this.tableCache.delete(firstKey);
        }
      }
    }

    return table;
  }

  private hasRequiredColumns(headers: string[]): boolean {
    const lowerHeaders = headers.map(h => h.toLowerCase());
    const hasDate = lowerHeaders.some(h => h.includes('date') || h.includes('day'));
    const hasOpponent = lowerHeaders.some(h => h.includes('opponent') || h.includes('opp') || h === 'vs');
    return hasDate && hasOpponent;
  }

  private extractCornersFromMatchLogsTable(
    table: any, 
    isOpposition: boolean,
    options: Required<ScrapeOptions>
  ): TeamMatchLogCorners[] {
    
    const headers = table.headers.map((h: string) => h.trim().toLowerCase());
    
    // Pre-compute column indices once
    const columnIndices = {
      date: this.findColumnIndex(headers, ['date', 'day']),
      opponent: this.findColumnIndex(headers, ['opponent', 'opp', 'vs']),
      venue: this.findColumnIndex(headers, ['venue', 'home/away', 'h/a']),
      corners: this.findColumnIndex(headers, ['ck', 'corners', 'corner kicks'])
    };
    
    if (columnIndices.date === -1 || columnIndices.opponent === -1 || columnIndices.corners === -1) {
      if (options.enableLogging) {
        console.error('[TeamMatchLogs] Missing required columns:', columnIndices);
      }
      return [];
    }

    const matches: TeamMatchLogCorners[] = [];
    
    // Process rows with optimized logic
    for (const row of table.rows) {
      try {
        const rawDate = this.extractCellText(row[columnIndices.date]);
        const rawOpponent = this.extractCellText(row[columnIndices.opponent]);
        const rawCorners = this.extractCellText(row[columnIndices.corners]);

        // Quick validation
        if (!rawDate || !rawOpponent || rawDate.toLowerCase().includes('date')) {
          continue;
        }

        const date = rawDate;
        const opponent = normalizeTeamName(rawOpponent);
        const corners = this.safeParseNumber(rawCorners);
        const venue = this.parseVenue(
          columnIndices.venue !== -1 ? this.extractCellText(row[columnIndices.venue]) : ''
        );
        
        const matchData: TeamMatchLogCorners = {
          date,
          opponent,
          venue,
          corners: isOpposition ? 0 : corners,
        };

        if (isOpposition) {
          matchData.cornersAgainst = corners;
        }

        matches.push(matchData);
      } catch (err) {
        if (options.enableLogging) {
          console.warn('[TeamMatchLogs] Error processing row:', err);
        }
      }
    }

    if (options.enableLogging) {
      console.log(`[TeamMatchLogs] Extracted ${matches.length} matches (${isOpposition ? 'defensive' : 'offensive'})`);
    }
    
    return matches;
  }

  private mergeOffensiveAndDefensive(
    offensiveData: TeamMatchLogCorners[],
    defensiveData: TeamMatchLogCorners[] | null
  ): TeamMatchLogCorners[] {
    
    if (!defensiveData || defensiveData.length === 0) {
      // Return offensive data with cornersAgainst as undefined
      return offensiveData.map(match => ({
        ...match,
        cornersAgainst: undefined
      }));
    }

    // Create a lookup map for faster matching
    const defensiveMap = new Map<string, number>();
    for (const defMatch of defensiveData) {
      const key = `${defMatch.date}_${defMatch.opponent}`;
      // Get corners from cornersAgainst field (since it was populated in defensive scraping)
      const cornersAgainst = defMatch.cornersAgainst ?? defMatch.corners;
      defensiveMap.set(key, cornersAgainst);
    }

    // Merge using the map
    const merged = offensiveData.map(offMatch => {
      const key = `${offMatch.date}_${offMatch.opponent}`;
      const cornersAgainst = defensiveMap.get(key);
      
      return {
        ...offMatch,
        cornersAgainst: cornersAgainst !== undefined ? cornersAgainst : undefined
      };
    });

    return merged;
  }

  /**
   * Scrape multiple teams with enhanced error handling and aggressive rate limiting protection
   */
  async scrapeMultipleTeams(teams: Array<{
    teamId: string;
    teamName: string;
    season: string;
    competitionId: string;
  }>, options: Partial<ScrapeOptions> = {}): Promise<TeamSeasonCorners[]> {
    
    const opts = { ...this.defaultOptions, ...options };
    const results: TeamSeasonCorners[] = [];
    const failedTeams: string[] = [];
    
    if (opts.enableLogging) {
      console.log(`[TeamMatchLogs] Starting batch scrape for ${teams.length} teams (concurrency: ${opts.concurrency})`);
    }

    // Process teams one by one to avoid rate limiting completely
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      
      if (opts.enableLogging) {
        console.log(`[TeamMatchLogs] Processing ${team.teamName} (${i + 1}/${teams.length})`);
      }

      try {
        // Always skip defensive data to minimize requests
        const corners = await this.scrapeTeamCorners(
          team.teamId, 
          team.season, 
          team.competitionId, 
          team.teamName,
          { ...opts, skipDefensiveData: true } // Force skip defensive to reduce requests
        );

        if (corners) {
          results.push(corners);
          if (opts.enableLogging) {
            console.log(`[TeamMatchLogs] ✓ Successfully scraped ${team.teamName}`);
          }
        } else {
          failedTeams.push(team.teamName);
          if (opts.enableLogging) {
            console.warn(`[TeamMatchLogs] ✗ Failed to scrape ${team.teamName}`);
          }
        }
      } catch (error) {
        failedTeams.push(team.teamName);
        if (opts.enableLogging) {
          console.error(`[TeamMatchLogs] ✗ Error processing ${team.teamName}:`, error);
        }
      }

      // Always delay between teams to avoid rate limiting
      if (i < teams.length - 1) {
        if (opts.enableLogging) {
          console.log(`[TeamMatchLogs] Waiting ${opts.delayBetweenRequests}ms before next team...`);
        }
        await this.delay(opts.delayBetweenRequests);
      }
    }
    
    if (opts.enableLogging) {
      console.log(`[TeamMatchLogs] Completed: ${results.length}/${teams.length} successful`);
      if (failedTeams.length > 0) {
        console.log(`[TeamMatchLogs] Failed teams:`, failedTeams.join(', '));
      }
    }
    
    return results;
  }

  // Utility methods (optimized)
  private findColumnIndex(headers: string[], searchTerms: string[]): number {
    // Pre-process headers for faster matching
    const processedHeaders = headers.map(h => h.replace(/[_\s]/g, "").toLowerCase());
    
    for (const term of searchTerms) {
      const processedTerm = term.replace(/[_\s]/g, "").toLowerCase();
      
      // Direct match first
      const directIndex = headers.findIndex(h => h === term);
      if (directIndex !== -1) return directIndex;
      
      // Contains match
      const containsIndex = headers.findIndex(h => h.includes(term));
      if (containsIndex !== -1) return containsIndex;
      
      // Processed match
      const processedIndex = processedHeaders.findIndex(h => h === processedTerm);
      if (processedIndex !== -1) return processedIndex;
    }
    return -1;
  }

  private extractCellText(cell: any): string {
    if (typeof cell === "object" && cell !== null) {
      return (cell.text || String(cell)).trim();
    }
    return String(cell || "").trim();
  }

  private safeParseNumber(raw: any): number {
    const str = String(raw || "").replace(/[^\d]/g, "");
    const n = parseInt(str, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  }

  private parseVenue(venueText: string): 'Home' | 'Away' {
    const text = venueText.toLowerCase().trim();
    return (text.includes('home') || text === 'h' || text === '') ? 'Home' : 'Away';
  }

  private getCompetitionName(competitionId: string): string {
    const competitions: Record<string, string> = {
      'c9': 'Premier League',
      'c11': 'Champions League',
      'c16': 'FA Cup',
      'c21': 'EFL Cup',
    };
    return competitions[competitionId] || `Competition ${competitionId}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clear cache method for memory management
  public clearCache(): void {
    this.tableCache.clear();
  }
}

/**
 * Enhanced URL builder with caching and validation
 */
export class FBrefUrlBuilder {
  private static readonly urlCache = new Map<string, string>();

  static buildPassingTypesUrl(
    teamId: string, 
    season: string, 
    competitionId: string, 
    isOpposition: boolean = false
  ): string {
    const cacheKey = `${teamId}_${season}_${competitionId}_${isOpposition}`;
    
    if (this.urlCache.has(cacheKey)) {
      return this.urlCache.get(cacheKey)!;
    }

    // Based on the HTML analysis, /vs URLs might not work consistently
    // For now, just use the base URL as it contains both offensive data
    // The defensive data might be in the same table or require different URL structure
    const baseUrl = `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/passing_types`;
    
    // Comment out the /vs logic for now since it's causing 500 errors
    // const url = isOpposition ? `${baseUrl}/vs` : baseUrl;
    const url = baseUrl; // Use base URL for both offensive and defensive for now
    
    this.urlCache.set(cacheKey, url);
    return url;
  }

  static buildTeamStatsUrl(teamId: string, season?: string): string {
    const base = `https://fbref.com/en/squads/${teamId}`;
    return season ? `${base}/${season}` : `${base}-Stats`;
  }

  static buildFixturesUrl(teamId: string, season: string, competitionId: string): string {
    return `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/schedule`;
  }

  static extractTeamId(url: string): string | null {
    const match = url.match(/\/squads\/([a-f0-9]+)\//);
    return match ? match[1] : null;
  }

  static clearCache(): void {
    this.urlCache.clear();
  }
}

// Pre-defined team configurations
export const PREMIER_LEAGUE_TEAMS = {
  'Liverpool': '822bd0ba',
  'Manchester City': 'b8fd03ef',
  'Arsenal': '18bb7c10',
  'Chelsea': 'cff3d9bb',
  'Manchester United': '19538871',
  'Tottenham': '361ca564',
  'Newcastle United': 'b2b47a98',
  'Brighton & Hove Albion': 'd07537b9',
  'Aston Villa': '8602292d',
  'West Ham United': '7c21e445',
  'Bournemouth': '4ba7cbea',
  'Everton': 'd3fd31cc',
  'Sunderland': '8ef52968',
  'Crystal Palace': '47c64c55',
  'Fulham': 'fd962109',
  'Brentford': 'cd051869',
  'Nottingham Forest': 'e4a775cb',
  'Leeds United': '5bfb9659',
  'Burnley': '943e8050',
  'Wolverhampton Wanderers': '8cec06e1',
} as const;

export const fbrefTeamMatchLogsService = new FBrefTeamMatchLogsService();
