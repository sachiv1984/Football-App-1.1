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
  skipDefensiveData?: boolean; // Whether to skip “against” stats
}

export class FBrefTeamMatchLogsService {
  private readonly defaultOptions: Required<ScrapeOptions> = {
    concurrency: 2,
    delayBetweenRequests: 1500,
    retries: 1,
    enableLogging: true,
    skipDefensiveData: true,
  };

  private readonly tableCache = new Map<string, any>();

  /**
   * Scrape team's match logs for corners
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
      const offensiveData = await this.scrapePassingTypes(teamId, season, competitionId, false, opts);
      if (!offensiveData) {
        if (opts.enableLogging) console.error(`[TeamMatchLogs] Failed to get offensive data for ${teamName}`);
        return null;
      }

      let defensiveData: TeamMatchLogCorners[] | null = null;
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
        }
      }

      const matches = this.mergeOffensiveAndDefensive(offensiveData, defensiveData);

      return {
        teamName: normalizeTeamName(teamName),
        season,
        competition: this.getCompetitionName(competitionId),
        matches
      };
    } catch (error) {
      if (opts.enableLogging) console.error(`[TeamMatchLogs] Error scraping ${teamName}:`, error);
      return null;
    }
  }

  /**
   * Scrape passing types table (JSON-first, then fallback HTML)
   */
  private async scrapePassingTypes(
    teamId: string, 
    season: string, 
    competitionId: string, 
    isOpposition: boolean,
    options: Required<ScrapeOptions>
  ): Promise<TeamMatchLogCorners[] | null> {

    const url = FBrefUrlBuilder.buildPassingTypesUrl(teamId, season, competitionId, isOpposition);
    if (options.enableLogging) console.log(`[TeamMatchLogs] Scraping ${isOpposition ? 'defensive' : 'offensive'} corners: ${url}`);

    let table: { headers: string[]; rows: any[][] } | null = null;

    // Try JSON-first
    try {
      const jsonTables = await fbrefScraper.scrapeJsonTables(url);
      if (jsonTables?.length) {
        table = jsonTables.find(t => {
          const id = ((t as any).table_type || t.id || "").toString().toLowerCase();
          if (isOpposition) return id.includes("against");
          return id.includes("for") || id.includes("matchlog");
        }) || null;

        if (table) table = { headers: table.headers, rows: table.rows };
      }
    } catch (err) {
      if (options.enableLogging) console.warn(`[TeamMatchLogs] JSON scraping failed for ${url}`, err);
    }

    // Fallback to HTML
    if (!table) {
      const scraped = await fbrefScraper.scrapeUrl(url);
      table = this.findMatchLogsTable(scraped, url);
    }

    if (!table) {
      if (options.enableLogging) console.warn(`[TeamMatchLogs] No table found at ${url}`);
      return null;
    }

    return this.extractCornersFromMatchLogsTable(table, isOpposition, options);
  }

  /**
   * Extract corners from a table
   */
  private extractCornersFromMatchLogsTable(
    table: any, 
    isOpposition: boolean,
    options: Required<ScrapeOptions>
  ): TeamMatchLogCorners[] {

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

        const matchData: TeamMatchLogCorners = {
          date: rawDate,
          opponent: normalizeTeamName(rawOpponent),
          venue: this.parseVenue(columnIndices.venue !== -1 ? this.extractCellText(row[columnIndices.venue]) : ''),
          corners: isOpposition ? 0 : this.safeParseNumber(rawCorners),
        };

        if (isOpposition) matchData.cornersAgainst = this.safeParseNumber(rawCorners);

        matches.push(matchData);
      } catch (err) {
        if (options.enableLogging) console.warn('[TeamMatchLogs] Error processing row:', err);
      }
    }

    if (options.enableLogging) console.log(`[TeamMatchLogs] Extracted ${matches.length} matches (${isOpposition ? 'defensive' : 'offensive'})`);
    return matches;
  }

  /**
   * Merge offensive and defensive data
   */
  private mergeOffensiveAndDefensive(
    offensiveData: TeamMatchLogCorners[],
    defensiveData: TeamMatchLogCorners[] | null
  ): TeamMatchLogCorners[] {

    if (!defensiveData || defensiveData.length === 0) {
      return offensiveData.map(match => ({ ...match, cornersAgainst: undefined }));
    }

    const defensiveMap = new Map<string, number>();
    for (const defMatch of defensiveData) {
      const key = `${defMatch.date}_${defMatch.opponent}`;
      defensiveMap.set(key, defMatch.cornersAgainst ?? defMatch.corners);
    }

    return offensiveData.map(offMatch => {
      const key = `${offMatch.date}_${offMatch.opponent}`;
      const cornersAgainst = defensiveMap.get(key);
      return { ...offMatch, cornersAgainst: cornersAgainst ?? undefined };
    });
  }

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

  public clearCache(): void { this.tableCache.clear(); }
}

/**
 * URL Builder
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
    if (this.urlCache.has(cacheKey)) return this.urlCache.get(cacheKey)!;

    const baseUrl = `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/passing_types`;
    const url = baseUrl; 
    this.urlCache.set(cacheKey, url);
    return url;
  }

  static clearCache(): void { this.urlCache.clear(); }
}

// Export service instance
export const fbrefTeamMatchLogsService = new FBrefTeamMatchLogsService();
