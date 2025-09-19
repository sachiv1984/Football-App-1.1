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
    skipDefensiveData: false, // now default false so we get defensive data
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
      // Scrape offensive data
      const offensiveData = await this.scrapePassingTypes(teamId, season, competitionId, false, opts);
      if (!offensiveData) {
        if (opts.enableLogging) console.error(`[TeamMatchLogs] Failed to get offensive data for ${teamName}`);
        return null;
      }

      // Scrape defensive data if needed
      let defensiveData: TeamMatchLogCorners[] | null = null;
      if (!opts.skipDefensiveData) {
        defensiveData = await this.scrapePassingTypes(teamId, season, competitionId, true, opts);
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

    for (let attempt = 1; attempt <= options.retries + 1; attempt++) {
      try {
        const scraped = await fbrefScraper.scrapeUrl(url);
        const table = this.findMatchLogsTable(scraped, url, isOpposition);
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
      if (this.tableCache.size > 50) this.tableCache.delete(this.tableCache.keys().next().value);
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
    if (!defensiveData || defensiveData.length === 0) return offensiveData.map(m => ({ ...m, cornersAgainst: undefined }));
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

    if (opts.enableLogging) console.log(`[TeamMatchLogs] Starting batch scrape for ${teams.length} teams`);

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
    return results;
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
