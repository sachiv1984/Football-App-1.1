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
    concurrency: 2,
    delayBetweenRequests: 1500,
    retries: 1,
    enableLogging: true,
    skipDefensiveData: false, // Default now allows defensive scrape
  };

  private readonly tableCache = new Map<string, any>();

  /** Scrape a team's corners (for + against) using JSON-first method */
  async scrapeTeamCorners(
    teamId: string,
    season: string,
    competitionId: string,
    teamName: string,
    options: Partial<ScrapeOptions> = {}
  ): Promise<TeamSeasonCorners | null> {
    const opts = { ...this.defaultOptions, ...options };

    try {
      // JSON-first scraping
      const url = FBrefUrlBuilder.buildPassingTypesUrl(teamId, season, competitionId);
      if (opts.enableLogging) console.log(`[TeamMatchLogs] Scraping JSON: ${url}`);

      const scraped: ScrapedData = await fbrefScraper.scrapeUrl(url);
      if (!scraped || !scraped.tables.length) {
        if (opts.enableLogging) console.error(`[TeamMatchLogs] No tables found for ${teamName}`);
        return null;
      }

      // Extract offensive and defensive tables
      const offensiveTable = this.findMatchLogsTable(scraped, false);
      const defensiveTable = this.findMatchLogsTable(scraped, true);

      if (!offensiveTable) {
        if (opts.enableLogging) console.error(`[TeamMatchLogs] No offensive table found for ${teamName}`);
        return null;
      }

      const offensiveData = this.extractCornersFromMatchLogsTable(offensiveTable, false, opts);
      const defensiveData = defensiveTable
        ? this.extractCornersFromMatchLogsTable(defensiveTable, true, opts)
        : null;

      const matches = this.mergeOffensiveAndDefensive(offensiveData, defensiveData);

      return {
        teamName: normalizeTeamName(teamName),
        season,
        competition: this.getCompetitionName(competitionId),
        matches,
      };
    } catch (error) {
      if (opts.enableLogging) console.error(`[TeamMatchLogs] Error scraping ${teamName}:`, error);
      return null;
    }
  }

  /** Find match logs table from scraped JSON */
  private findMatchLogsTable(scraped: ScrapedData, isOpposition: boolean): any | null {
    const cacheKey = `${isOpposition ? "opp" : "for"}`;
    if (this.tableCache.has(cacheKey)) return this.tableCache.get(cacheKey);

    const table = scraped.tables.find(t => {
      const id = (t.id || "").toLowerCase();
      const cap = (t.caption || "").toLowerCase();
      if (isOpposition) return id.includes("matchlogs_against") || cap.includes("against");
      return id.includes("matchlogs") || cap.includes("match logs");
    });

    if (table) {
      this.tableCache.set(cacheKey, table);
      if (this.tableCache.size > 50) this.tableCache.delete(this.tableCache.keys().next().value);
    }

    return table || null;
  }

  /** Extract corners from table */
  private extractCornersFromMatchLogsTable(
    table: any,
    isOpposition: boolean,
    options: Required<ScrapeOptions>
  ): TeamMatchLogCorners[] {
    const headers = table.headers.map((h: string) => h.trim().toLowerCase());
    const columnIndices = {
      date: this.findColumnIndex(headers, ["date", "day"]),
      opponent: this.findColumnIndex(headers, ["opponent", "opp", "vs"]),
      venue: this.findColumnIndex(headers, ["venue", "home/away", "h/a"]),
      corners: this.findColumnIndex(headers, ["ck", "corners", "corner kicks"]),
    };

    if (columnIndices.date === -1 || columnIndices.opponent === -1 || columnIndices.corners === -1) {
      if (options.enableLogging) console.error("[TeamMatchLogs] Missing required columns", columnIndices);
      return [];
    }

    const matches: TeamMatchLogCorners[] = [];
    for (const row of table.rows) {
      try {
        const rawDate = this.extractCellText(row[columnIndices.date]);
        const rawOpponent = this.extractCellText(row[columnIndices.opponent]);
        const rawCorners = this.extractCellText(row[columnIndices.corners]);

        if (!rawDate || !rawOpponent || rawDate.toLowerCase().includes("date")) continue;

        const matchData: TeamMatchLogCorners = {
          date: rawDate,
          opponent: normalizeTeamName(rawOpponent),
          venue: this.parseVenue(columnIndices.venue !== -1 ? this.extractCellText(row[columnIndices.venue]) : ""),
          corners: isOpposition ? 0 : this.safeParseNumber(rawCorners),
        };

        if (isOpposition) matchData.cornersAgainst = this.safeParseNumber(rawCorners);

        matches.push(matchData);
      } catch (err) {
        if (options.enableLogging) console.warn("[TeamMatchLogs] Error processing row:", err);
      }
    }

    if (options.enableLogging)
      console.log(`[TeamMatchLogs] Extracted ${matches.length} matches (${isOpposition ? "defensive" : "offensive"})`);

    return matches;
  }

  /** Merge offensive + defensive data */
  private mergeOffensiveAndDefensive(
    offensiveData: TeamMatchLogCorners[],
    defensiveData: TeamMatchLogCorners[] | null
  ): TeamMatchLogCorners[] {
    if (!defensiveData || defensiveData.length === 0) {
      return offensiveData.map(match => ({ ...match, cornersAgainst: undefined }));
    }

    const defensiveMap = new Map<string, number>();
    for (const defMatch of defensiveData) {
      defensiveMap.set(`${defMatch.date}_${defMatch.opponent}`, defMatch.cornersAgainst ?? defMatch.corners);
    }

    return offensiveData.map(offMatch => {
      const key = `${offMatch.date}_${offMatch.opponent}`;
      return { ...offMatch, cornersAgainst: defensiveMap.get(key) };
    });
  }

  /** Utility methods */
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
    return typeof cell === "object" && cell !== null ? (cell.text || "").trim() : String(cell || "").trim();
  }

  private safeParseNumber(raw: any): number {
    const str = String(raw || "").replace(/[^\d]/g, "");
    const n = parseInt(str, 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  }

  private parseVenue(venueText: string): 'Home' | 'Away' {
    const text = venueText.toLowerCase().trim();
    return text.includes("home") || text === "h" || text === "" ? "Home" : "Away";
  }

  private getCompetitionName(competitionId: string): string {
    const competitions: Record<string, string> = {
      c9: "Premier League",
      c11: "Champions League",
      c16: "FA Cup",
      c21: "EFL Cup",
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

/** URL builder for FBref matchlogs */
export class FBrefUrlBuilder {
  private static readonly urlCache = new Map<string, string>();

  static buildPassingTypesUrl(teamId: string, season: string, competitionId: string): string {
    const cacheKey = `${teamId}_${season}_${competitionId}`;
    if (this.urlCache.has(cacheKey)) return this.urlCache.get(cacheKey)!;
    const url = `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/passing_types`;
    this.urlCache.set(cacheKey, url);
    return url;
  }
}

/** Premier League team IDs */
export const PREMIER_LEAGUE_TEAMS = {
  Liverpool: "822bd0ba",
  "Manchester City": "b8fd03ef",
  Arsenal: "18bb7c10",
  Chelsea: "cff3d9bb",
  "Manchester United": "19538871",
  Tottenham: "361ca564",
  "Newcastle United": "b2b47a98",
  "Brighton & Hove Albion": "d07537b9",
  "Aston Villa": "8602292d",
  "West Ham United": "7c21e445",
  Bournemouth: "4ba7cbea",
  Everton: "d3fd31cc",
  Sunderland: "8ef52968",
  "Crystal Palace": "47c64c55",
  Fulham: "fd962109",
  Brentford: "cd051869",
  "Nottingham Forest": "e4a775cb",
  "Leeds United": "5bfb9659",
  Burnley: "943e8050",
  "Wolverhampton Wanderers": "8cec06e1",
} as const;

/** Export a singleton */
export const fbrefTeamMatchLogsService = new FBrefTeamMatchLogsService();
