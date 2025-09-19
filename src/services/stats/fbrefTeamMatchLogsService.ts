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
  skipDefensiveData?: boolean;
}

export class FBrefTeamMatchLogsService {
  private readonly defaultOptions: Required<ScrapeOptions> = {
    concurrency: 1,
    delayBetweenRequests: 6000, // Slightly increased since we're making fewer requests
    retries: 2,
    enableLogging: true,
    skipDefensiveData: false,
  };

  private readonly tableCache = new Map<string, any>();

  async scrapeTeamCorners(
    teamId: string, 
    season: string, 
    competitionId: string, 
    teamName: string,
    options: Partial<ScrapeOptions> = {}
  ): Promise<TeamSeasonCorners | null> {
    const opts = { ...this.defaultOptions, ...options };
    try {
      // NEW APPROACH: Get both offensive and defensive data from single page
      const matchData = await this.scrapeMatchLogsFromSinglePage(teamId, season, competitionId, opts);
      
      if (!matchData || matchData.length === 0) {
        if (opts.enableLogging) console.error(`[TeamMatchLogs] Failed to get match data for ${teamName}`);
        return null;
      }

      return {
        teamName: normalizeTeamName(teamName),
        season,
        competition: this.getCompetitionName(competitionId),
        matches: matchData
      };
    } catch (error) {
      if (opts.enableLogging) console.error(`[TeamMatchLogs] Error scraping ${teamName}:`, error);
      return null;
    }
  }

  /**
   * NEW METHOD: Scrape both offensive and defensive corner data from a single page
   * This reduces requests by 50% compared to the old approach
   */
  private async scrapeMatchLogsFromSinglePage(
    teamId: string, 
    season: string, 
    competitionId: string, 
    options: Required<ScrapeOptions>
  ): Promise<TeamMatchLogCorners[] | null> {
    // Try different URL patterns that might contain both datasets
    const urlsToTry = [
      `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/passing_types`,
    ];

    for (const url of urlsToTry) {
      if (options.enableLogging) {
        console.log(`[TeamMatchLogs] Trying to scrape both corner datasets from: ${url}`);
      }

      for (let attempt = 1; attempt <= options.retries + 1; attempt++) {
        try {
          const scraped = await fbrefScraper.scrapeUrl(url);
          
          // Look for tables that contain corner data
          const cornerTables = this.findCornerTables(scraped, url);
          
          if (cornerTables.length === 0) {
            if (options.enableLogging && attempt === options.retries + 1) {
              console.warn(`[TeamMatchLogs] No corner tables found in ${url}`);
            }
            if (attempt <= options.retries) {
              await this.delay(options.delayBetweenRequests);
              continue;
            }
            break; // Try next URL
          }

          // Extract corner data from the found tables
          const matches = this.extractCornersFromMultipleTables(cornerTables, options);
          
          if (matches.length > 0) {
            if (options.enableLogging) {
              console.log(`[TeamMatchLogs] Successfully extracted ${matches.length} matches from ${url}`);
            }
            return matches;
          }

        } catch (err) {
          if (options.enableLogging) {
            console.warn(`[TeamMatchLogs] Attempt ${attempt} failed for ${url}:`, err);
          }
          if (attempt <= options.retries) {
            await this.delay(options.delayBetweenRequests * attempt);
          }
        }
      }
    }

    // Fallback to original two-request method if single page doesn't work
    if (options.enableLogging) {
      console.log(`[TeamMatchLogs] Single page approach failed, falling back to two-request method`);
    }
    return this.fallbackToTwoRequestMethod(teamId, season, competitionId, options);
  }

  /**
   * Find tables that contain corner statistics
   */
  private findCornerTables(scraped: ScrapedData, url: string): any[] {
    const cacheKey = `corner_tables_${url}`;
    if (this.tableCache.has(cacheKey)) {
      return this.tableCache.get(cacheKey);
    }

    const cornerTables: any[] = [];
    
    for (const table of scraped.tables) {
      const headers = table.headers.map((h: string) => h.toLowerCase().trim());
      
      // Check if table contains corner-related columns
      const hasCornerColumn = headers.some(h => 
        h.includes('ck') || 
        h.includes('corner') || 
        h.includes('corners')
      );
      
      // Check if table has basic match log structure
      const hasBasicStructure = headers.some(h => h.includes('date')) && 
                               headers.some(h => h.includes('opponent') || h.includes('opp'));

      if (hasCornerColumn && hasBasicStructure) {
        const tableInfo = {
          ...table,
          isOffensive: this.isOffensiveTable(table),
          isDefensive: this.isDefensiveTable(table),
        };
        cornerTables.push(tableInfo);
      }
    }

    // Cache the results
    this.tableCache.set(cacheKey, cornerTables);
    if (this.tableCache.size > 100) {
      const firstKey = this.tableCache.keys().next().value;
      if (firstKey !== undefined) {
        this.tableCache.delete(firstKey);
      }
    }

    return cornerTables;
  }

  private isOffensiveTable(table: any): boolean {
    const id = (table.id || "").toLowerCase();
    const caption = (table.caption || "").toLowerCase();
    
    return (id.includes("matchlogs_for") || 
            id.includes("matchlogs") && !id.includes("against")) ||
           (caption.includes("match logs") && !caption.includes("against"));
  }

  private isDefensiveTable(table: any): boolean {
    const id = (table.id || "").toLowerCase();
    const caption = (table.caption || "").toLowerCase();
    
    return id.includes("matchlogs_against") || 
           caption.includes("against");
  }

  /**
   * Extract corner data from multiple tables found on the same page
   */
  private extractCornersFromMultipleTables(tables: any[], options: Required<ScrapeOptions>): TeamMatchLogCorners[] {
    let offensiveData: TeamMatchLogCorners[] = [];
    let defensiveData: TeamMatchLogCorners[] = [];

    for (const table of tables) {
      try {
        if (table.isOffensive) {
          const offensive = this.extractCornersFromMatchLogsTable(table, false, options);
          if (offensive.length > offensiveData.length) {
            offensiveData = offensive;
          }
        }
        
        if (table.isDefensive && !options.skipDefensiveData) {
          const defensive = this.extractCornersFromMatchLogsTable(table, true, options);
          if (defensive.length > defensiveData.length) {
            defensiveData = defensive;
          }
        }
      } catch (err) {
        if (options.enableLogging) {
          console.warn(`[TeamMatchLogs] Error processing table:`, err);
        }
      }
    }

    // If we couldn't find separate offensive/defensive tables, try to extract both from any table
    if (offensiveData.length === 0 && tables.length > 0) {
      if (options.enableLogging) {
        console.log(`[TeamMatchLogs] No clear offensive table found, trying to extract from general table`);
      }
      offensiveData = this.extractCornersFromMatchLogsTable(tables[0], false, options);
    }

    return this.mergeOffensiveAndDefensive(offensiveData, defensiveData);
  }

  /**
   * Fallback method using the original two-request approach
   */
  private async fallbackToTwoRequestMethod(
    teamId: string, 
    season: string, 
    competitionId: string, 
    options: Required<ScrapeOptions>
  ): Promise<TeamMatchLogCorners[] | null> {
    try {
      // Scrape offensive data
      const offensiveData = await this.scrapePassingTypes(teamId, season, competitionId, false, options);
      if (!offensiveData) {
        return null;
      }

      // Scrape defensive data if needed
      let defensiveData: TeamMatchLogCorners[] | null = null;
      if (!options.skipDefensiveData) {
        defensiveData = await this.scrapePassingTypes(teamId, season, competitionId, true, options);
      }

      return this.mergeOffensiveAndDefensive(offensiveData, defensiveData);
    } catch (error) {
      if (options.enableLogging) {
        console.error(`[TeamMatchLogs] Fallback method also failed:`, error);
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
      console.log(`[TeamMatchLogs] Fallback: Scraping ${isOpposition ? 'defensive' : 'offensive'} corners: ${url}`);
    }

    for (let attempt = 1; attempt <= options.retries + 1; attempt++) {
      try {
        const scraped = await fbrefScraper.scrapeUrl(url);
        let table = this.findMatchLogsTable(scraped, url, isOpposition);

        if (!table) {
          const jsonTables = await fbrefScraper.scrapeJsonTables(url);
          if (jsonTables?.length) {
            table = jsonTables.find(t =>
              t.headers.some(h => h.toLowerCase().includes('date')) &&
              t.headers.some(h => h.toLowerCase().includes('opponent'))
            );
          }
        }

        if (!table) {
          if (options.enableLogging) console.warn(`[TeamMatchLogs] No suitable table found in ${url} (attempt ${attempt})`);
          if (attempt <= options.retries) {
            await this.delay(options.delayBetweenRequests);
            continue;
          }
          return null;
        }

        return this.extractCornersFromMatchLogsTable(table, isOpposition, options);
      } catch (err) {
        if (options.enableLogging) console.warn(`[TeamMatchLogs] Attempt ${attempt} failed for ${url}:`, err);
        if (attempt <= options.retries) await this.delay(options.delayBetweenRequests * attempt);
        else throw err;
      }
    }

    return null;
  }

  private findMatchLogsTable(scraped: ScrapedData, url?: string, isOpposition = false): any | null {
    const cacheKey = `${url}_${isOpposition ? "opp" : "for"}`;
    if (this.tableCache.has(cacheKey)) return this.tableCache.get(cacheKey);

    const table = scraped.tables.find(t => {
      const id = (t.id || "").toLowerCase();
      const cap = (t.caption || "").toLowerCase();
      if (isOpposition) return id.includes("matchlogs_against") || cap.includes("against");
      else return id.includes("matchlogs_for") || id.includes("matchlogs") || cap.includes("match logs");
    });

    if (table) {
      this.tableCache.set(cacheKey, table);
      if (this.tableCache.size > 50) {
        const firstKey = this.tableCache.keys().next().value;
        if (firstKey !== undefined) {
          this.tableCache.delete(firstKey);
        }
      }
    }

    return table || null;
  }

  private extractCornersFromMatchLogsTable(table: any, isOpposition: boolean, options: Required<ScrapeOptions>): TeamMatchLogCorners[] {
    const headers = table.headers.map((h: string) => h.trim().toLowerCase());
    const columnIndices = {
      date: this.findColumnIndex(headers, ['date', 'day']),
      opponent: this.findColumnIndex(headers, ['opponent', 'opp', 'vs']),
      venue: this.findColumnIndex(headers, ['venue', 'home/away', 'h/a']),
      corners: this.findColumnIndex(headers, ['ck', 'corners', 'corner kicks'])
    };
    
    if (columnIndices.date === -1 || columnIndices.opponent === -1 || columnIndices.corners === -1) {
      if (options.enableLogging) console.error('[TeamMatchLogs] Missing required columns:', columnIndices);
      return [];
    }

    const matches: TeamMatchLogCorners[] = [];
    for (const row of table.rows) {
      try {
        const rawDate = this.extractCellText(row[columnIndices.date]);
        const rawOpponent = this.extractCellText(row[columnIndices.opponent]);
        const rawCorners = this.extractCellText(row[columnIndices.corners]);
        if (!rawDate || !rawOpponent || rawDate.toLowerCase().includes('date')) continue;

        const date = rawDate;
        const opponent = normalizeTeamName(rawOpponent);
        const corners = this.safeParseNumber(rawCorners);
        const venue = this.parseVenue(columnIndices.venue !== -1 ? this.extractCellText(row[columnIndices.venue]) : '');

        const matchData: TeamMatchLogCorners = {
          date,
          opponent,
          venue,
          corners: isOpposition ? 0 : corners
        };
        if (isOpposition) matchData.cornersAgainst = corners;

        matches.push(matchData);
      } catch (err) {
        if (options.enableLogging) console.warn('[TeamMatchLogs] Error processing row:', err);
      }
    }
    
    if (options.enableLogging) console.log(`[TeamMatchLogs] Extracted ${matches.length} matches (${isOpposition ? 'defensive' : 'offensive'})`);
    return matches;
  }

  private mergeOffensiveAndDefensive(offensiveData: TeamMatchLogCorners[], defensiveData: TeamMatchLogCorners[] | null): TeamMatchLogCorners[] {
    if (!defensiveData || defensiveData.length === 0) {
      return offensiveData.map(m => ({ ...m, cornersAgainst: undefined }));
    }
    
    const defensiveMap = new Map<string, number>();
    for (const defMatch of defensiveData) {
      const key = `${defMatch.date}_${defMatch.opponent}`;
      defensiveMap.set(key, defMatch.cornersAgainst ?? defMatch.corners);
    }
    
    return offensiveData.map(offMatch => {
      const key = `${offMatch.date}_${offMatch.opponent}`;
      const cornersAgainst = defensiveMap.get(key);
      return { ...offMatch, cornersAgainst };
    });
  }

  async scrapeMultipleTeams(teams: Array<{ teamId: string; teamName: string; season: string; competitionId: string }>, options: Partial<ScrapeOptions> = {}): Promise<TeamSeasonCorners[]> {
    const opts = { ...this.defaultOptions, ...options };
    const results: TeamSeasonCorners[] = [];
    const failedTeams: string[] = [];

    if (opts.enableLogging) console.log(`[TeamMatchLogs] Starting optimized batch scrape for ${teams.length} teams`);

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      if (opts.enableLogging) console.log(`[TeamMatchLogs] Processing ${team.teamName} (${i + 1}/${teams.length})`);
      try {
        const corners = await this.scrapeTeamCorners(team.teamId, team.season, team.competitionId, team.teamName, opts);
        if (corners) results.push(corners);
        else failedTeams.push(team.teamName);
      } catch {
        failedTeams.push(team.teamName);
      }
      if (i < teams.length - 1) await this.delay(opts.delayBetweenRequests);
    }

    if (opts.enableLogging && failedTeams.length) console.warn(`[TeamMatchLogs] Failed teams: ${failedTeams.join(", ")}`);
    if (opts.enableLogging) console.log(`[TeamMatchLogs] Batch complete: ${results.length} successful, ${failedTeams.length} failed`);
    
    return results;
  }

  // Utility methods remain the same
  private findColumnIndex(headers: string[], searchTerms: string[]): number {
    const processedHeaders = headers.map(h => h.replace(/[_\s]/g, "").toLowerCase());
    for (const term of searchTerms) {
      const processedTerm = term.replace(/[_\s]/g, "").toLowerCase();
      const directIndex = headers.findIndex(h => h === term);
      if (directIndex !== -1) return directIndex;
      const containsIndex = headers.findIndex(h => h.includes(term));
      if (containsIndex !== -1) return containsIndex;
      const processedIndex = processedHeaders.findIndex(h => h === processedTerm);
      if (processedIndex !== -1) return processedIndex;
    }
    return -1;
  }

  private extractCellText(cell: any): string {
    if (typeof cell === "object" && cell !== null) return (cell.text || String(cell)).trim();
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

  public clearCache(): void {
    this.tableCache.clear();
  }
}

export class FBrefUrlBuilder {
  private static readonly urlCache = new Map<string, string>();

  static buildPassingTypesUrl(teamId: string, season: string, competitionId: string, isOpposition = false): string {
    const cacheKey = `${teamId}_${season}_${competitionId}_${isOpposition}`;
    if (this.urlCache.has(cacheKey)) return this.urlCache.get(cacheKey)!;
    const baseUrl = `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/passing_types`;
    this.urlCache.set(cacheKey, baseUrl);
    return baseUrl;
  }

  // NEW: Build URLs for single-page scraping
  static buildMatchLogsUrl(teamId: string, season: string, competitionId: string, category: 'misc' | 'keeper' | 'passing' | 'passing_types' = 'misc'): string {
    return `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/${category}`;
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
