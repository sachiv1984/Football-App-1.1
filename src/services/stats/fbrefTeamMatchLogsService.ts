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
  batchSize?: number;
  maxTeamsPerSession?: number;
  useIncrementalScraping?: boolean;
}

export interface CornersCacheEntry {
  data: TeamSeasonCorners;
  timestamp: number;
  season: string;
}

export class FBrefTeamMatchLogsService {
  private readonly defaultOptions: Required<ScrapeOptions> = {
    concurrency: 1,
    delayBetweenRequests: 8000, // Increased delay to 8 seconds
    retries: 2,
    enableLogging: true,
    skipDefensiveData: false, // Default to true to reduce requests by 50%
    batchSize: 5, // Process in smaller batches
    maxTeamsPerSession: 10, // Limit teams per session to avoid rate limits
    useIncrementalScraping: true,
  };

  private readonly tableCache = new Map<string, any>();
  private readonly cornersCache = new Map<string, CornersCacheEntry>();
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours cache
  private requestCount = 0;
  private sessionStartTime = Date.now();
  private readonly MAX_REQUESTS_PER_HOUR = 50; // Conservative limit

  private isRateLimited(): boolean {
    const hoursSinceStart = (Date.now() - this.sessionStartTime) / (60 * 60 * 1000);
    return this.requestCount >= (this.MAX_REQUESTS_PER_HOUR * hoursSinceStart);
  }

  private async waitForRateLimit(): Promise<void> {
    if (this.isRateLimited()) {
      const timeToWait = 60 * 60 * 1000 - (Date.now() - this.sessionStartTime);
      if (timeToWait > 0) {
        console.log(`[TeamMatchLogs] Rate limit reached. Waiting ${Math.ceil(timeToWait / 60000)} minutes...`);
        await this.delay(timeToWait);
        this.requestCount = 0;
        this.sessionStartTime = Date.now();
      }
    }
  }

  /**
   * PRIORITY 1: Try to get corner data from cache first
   */
  private getCachedCorners(teamName: string, season: string): TeamSeasonCorners | null {
    const cacheKey = `${normalizeTeamName(teamName)}_${season}`;
    const cached = this.cornersCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[TeamMatchLogs] Using cached data for ${teamName}`);
      return cached.data;
    }
    
    if (cached) {
      this.cornersCache.delete(cacheKey); // Remove stale cache
    }
    
    return null;
  }

  private setCachedCorners(teamName: string, season: string, data: TeamSeasonCorners): void {
    const cacheKey = `${normalizeTeamName(teamName)}_${season}`;
    this.cornersCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      season
    });
  }

  /**
   * PRIORITY 2: Smart batch processing with rate limiting
   */
  async scrapeMultipleTeams(
    teams: Array<{ teamId: string; teamName: string; season: string; competitionId: string }>, 
    options: Partial<ScrapeOptions> = {}
  ): Promise<TeamSeasonCorners[]> {
    const opts = { ...this.defaultOptions, ...options };
    const results: TeamSeasonCorners[] = [];
    const failedTeams: string[] = [];

    if (opts.enableLogging) {
      console.log(`[TeamMatchLogs] Starting optimized batch scrape for ${teams.length} teams`);
      console.log(`[TeamMatchLogs] Options: delay=${opts.delayBetweenRequests}ms, skipDefensive=${opts.skipDefensiveData}, batchSize=${opts.batchSize}`);
    }

    // STEP 1: Check cache first
    const teamsToScrape: typeof teams = [];
    for (const team of teams) {
      const cached = this.getCachedCorners(team.teamName, team.season);
      if (cached) {
        results.push(cached);
      } else {
        teamsToScrape.push(team);
      }
    }

    if (opts.enableLogging) {
      console.log(`[TeamMatchLogs] Cache hit: ${results.length}/${teams.length} teams. Need to scrape: ${teamsToScrape.length}`);
    }

    if (teamsToScrape.length === 0) {
      return results;
    }

    // STEP 2: Limit teams per session to avoid rate limits
    const teamsThisSession = teamsToScrape.slice(0, opts.maxTeamsPerSession);
    const remainingTeams = teamsToScrape.slice(opts.maxTeamsPerSession);

    if (remainingTeams.length > 0 && opts.enableLogging) {
      console.log(`[TeamMatchLogs] Processing ${teamsThisSession.length} teams this session. ${remainingTeams.length} teams deferred to avoid rate limits.`);
    }

    // STEP 3: Process in batches
    for (let i = 0; i < teamsThisSession.length; i += opts.batchSize) {
      const batch = teamsThisSession.slice(i, i + opts.batchSize);
      
      if (opts.enableLogging) {
        console.log(`[TeamMatchLogs] Processing batch ${Math.floor(i / opts.batchSize) + 1}/${Math.ceil(teamsThisSession.length / opts.batchSize)} (${batch.length} teams)`);
      }

      for (const team of batch) {
        // Check rate limit before each request
        await this.waitForRateLimit();

        try {
          if (opts.enableLogging) {
            console.log(`[TeamMatchLogs] Scraping ${team.teamName}...`);
          }

          const corners = await this.scrapeTeamCorners(
            team.teamId, 
            team.season, 
            team.competitionId, 
            team.teamName, 
            opts
          );

          if (corners) {
            this.setCachedCorners(team.teamName, team.season, corners);
            results.push(corners);
          } else {
            failedTeams.push(team.teamName);
          }

        } catch (error) {
          if (opts.enableLogging) {
            console.error(`[TeamMatchLogs] Failed to scrape ${team.teamName}:`, error);
          }
          failedTeams.push(team.teamName);
        }

        // Delay between requests (even within batch)
        if (batch.indexOf(team) < batch.length - 1) {
          await this.delay(opts.delayBetweenRequests);
        }
      }

      // Longer delay between batches
      if (i + opts.batchSize < teamsThisSession.length) {
        const batchDelay = opts.delayBetweenRequests * 2;
        if (opts.enableLogging) {
          console.log(`[TeamMatchLogs] Waiting ${batchDelay}ms between batches...`);
        }
        await this.delay(batchDelay);
      }
    }

    if (opts.enableLogging) {
      console.log(`[TeamMatchLogs] Batch complete. Success: ${results.length}, Failed: ${failedTeams.length}`);
      if (failedTeams.length) {
        console.warn(`[TeamMatchLogs] Failed teams: ${failedTeams.join(", ")}`);
      }
      if (remainingTeams.length) {
        console.warn(`[TeamMatchLogs] ${remainingTeams.length} teams deferred. Call again later to process remaining teams.`);
      }
    }

    return results;
  }

  /**
   * PRIORITY 3: Incremental scraping - process remaining teams
   */
  async scrapeRemainingTeams(
    allTeams: Array<{ teamId: string; teamName: string; season: string; competitionId: string }>,
    options: Partial<ScrapeOptions> = {}
  ): Promise<TeamSeasonCorners[]> {
    const opts = { ...this.defaultOptions, ...options };
    
    // Find teams not in cache
    const remainingTeams = allTeams.filter(team => {
      const cached = this.getCachedCorners(team.teamName, team.season);
      return !cached;
    });

    if (remainingTeams.length === 0) {
      console.log(`[TeamMatchLogs] All teams already cached!`);
      return [];
    }

    console.log(`[TeamMatchLogs] Scraping ${remainingTeams.length} remaining teams...`);
    return this.scrapeMultipleTeams(remainingTeams, opts);
  }

  /**
   * PRIORITY 4: Get all cached data + fresh data combined
   */
  async getAllTeamCorners(
    teams: Array<{ teamId: string; teamName: string; season: string; competitionId: string }>,
    options: Partial<ScrapeOptions> = {}
  ): Promise<TeamSeasonCorners[]> {
    const results: TeamSeasonCorners[] = [];
    
    // Get all cached data first
    for (const team of teams) {
      const cached = this.getCachedCorners(team.teamName, team.season);
      if (cached) {
        results.push(cached);
      }
    }

    // If we have some but not all, try to get remaining (with limits)
    if (results.length < teams.length && results.length > 0) {
      const remaining = await this.scrapeRemainingTeams(teams, {
        ...options,
        maxTeamsPerSession: Math.min(5, teams.length - results.length) // Very conservative
      });
      results.push(...remaining);
    }

    // If we have nothing cached, do initial limited scrape
    if (results.length === 0) {
      const initial = await this.scrapeMultipleTeams(teams, {
        ...options,
        maxTeamsPerSession: 8 // Conservative first batch
      });
      results.push(...initial);
    }

    return results;
  }

  async scrapeTeamCorners(
    teamId: string, 
    season: string, 
    competitionId: string, 
    teamName: string,
    options: Partial<ScrapeOptions> = {}
  ): Promise<TeamSeasonCorners | null> {
    const opts = { ...this.defaultOptions, ...options };
    
    try {
      this.requestCount++;
      
      // Scrape offensive data (always needed)
      const offensiveData = await this.scrapePassingTypes(teamId, season, competitionId, false, opts);
      if (!offensiveData) {
        if (opts.enableLogging) console.error(`[TeamMatchLogs] Failed to get offensive data for ${teamName}`);
        return null;
      }

      // Scrape defensive data only if not skipped (saves 50% requests)
      let defensiveData: TeamMatchLogCorners[] | null = null;
      if (!opts.skipDefensiveData) {
        this.requestCount++;
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
        // Exponential backoff on retries
        if (attempt > 1) {
          const backoffDelay = options.delayBetweenRequests * Math.pow(2, attempt - 2);
          await this.delay(backoffDelay);
        }

        const scraped = await fbrefScraper.scrapeUrl(url);
        let table = this.findMatchLogsTable(scraped, url, isOpposition);

        // Fallback: try hidden JSON tables
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
          if (options.enableLogging) {
            console.warn(`[TeamMatchLogs] No suitable table found in ${url} (attempt ${attempt})`);
          }
          if (attempt <= options.retries) continue;
          return null;
        }

        return this.extractCornersFromMatchLogsTable(table, isOpposition, options);
      } catch (err) {
        if (options.enableLogging) {
          console.warn(`[TeamMatchLogs] Attempt ${attempt} failed for ${url}:`, err);
        }
        if (attempt > options.retries) throw err;
      }
    }

    return null;
  }

  // [Rest of the existing methods remain the same...]
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
    
    if (options.enableLogging) {
      console.log(`[TeamMatchLogs] Extracted ${matches.length} matches (${isOpposition ? 'defensive' : 'offensive'})`);
    }
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

  // Utility methods
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

  // Cache management methods
  public clearCache(): void {
    this.tableCache.clear();
    this.cornersCache.clear();
    this.requestCount = 0;
    this.sessionStartTime = Date.now();
  }

  public getCacheStats() {
    return {
      cornersCache: {
        size: this.cornersCache.size,
        teams: Array.from(this.cornersCache.keys()),
        oldestEntry: Math.min(...Array.from(this.cornersCache.values()).map(e => e.timestamp)),
      },
      requestStats: {
        requestCount: this.requestCount,
        sessionDuration: Date.now() - this.sessionStartTime,
        rateLimited: this.isRateLimited(),
      }
    };
  }

  public getTeamFromCache(teamName: string, season: string): TeamSeasonCorners | null {
    return this.getCachedCorners(teamName, season);
  }
}

// URL Builder remains the same
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
