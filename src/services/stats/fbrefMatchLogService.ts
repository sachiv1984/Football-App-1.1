// src/services/stats/fbrefMatchLogService.ts

import { fbrefScraper, type ScrapedData } from "../scrape/Fbref";
import { normalizeTeamName } from "../../utils/teamUtils";

export interface MatchLogCorners {
  matchUrl: string;
  homeTeam: string;
  awayTeam: string;
  homeCorners: number;
  awayCorners: number;
}

export class FBrefMatchLogService {

  /**
   * Scrape a match log page for corner stats (home / away).
   * Returns null if corners data is not found.
   */
  async scrapeCorners(matchUrl: string): Promise<MatchLogCorners | null> {
    if (!matchUrl.startsWith("https://fbref.com/") || !matchUrl.includes("/matches/")) {
      console.warn(`[MatchLog] Invalid match URL: ${matchUrl}`);
      return null;
    }

    let scraped: ScrapedData;
    try {
      scraped = await fbrefScraper.scrapeUrl(matchUrl);
    } catch (err) {
      console.error(`[MatchLog] Error fetching ${matchUrl}:`, err);
      return null;
    }

    // Attempt all strategies
    return this.scrapeWithStrategies(scraped, matchUrl);
  }

  /**
   * Attempt multiple strategies to find corners data
   */
  private scrapeWithStrategies(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    return (
      this.tryTeamStatsStrategy(scraped, matchUrl) ||
      this.tryMatchSummaryStrategy(scraped, matchUrl) ||
      this.tryGeneralTableStrategy(scraped, matchUrl)
    );
  }

  /**
   * Strategy 1: Look for Team Stats tables (preferred)
   */
  private tryTeamStatsStrategy(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    const table = scraped.tables.find(t => {
      const cap = (t.caption || "").toLowerCase();
      return cap.includes("team stats") || cap.includes("match stats") || t.headers.some(h => h.toLowerCase().includes("corner"));
    });
    return table ? this.extractCornersFromTable(table, matchUrl, "team-stats") : null;
  }

  /**
   * Strategy 2: Fallback to match summary tables
   */
  private tryMatchSummaryStrategy(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    const table = scraped.tables.find(t => {
      const cap = (t.caption || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      return cap.includes("summary") || id.includes("match_stats") || cap.includes(" vs ");
    });
    return table ? this.extractCornersFromTable(table, matchUrl, "summary") : null;
  }

  /**
   * Strategy 3: Check all tables for corners data
   */
  private tryGeneralTableStrategy(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    for (const table of scraped.tables) {
      if (table.rows.length >= 2) {
        const result = this.extractCornersFromTable(table, matchUrl, "general");
        if (result) return result;
      }
    }
    return null;
  }

  /**
   * Extract corners from a given table
   */
  private extractCornersFromTable(table: any, matchUrl: string, strategy: string): MatchLogCorners | null {
    const headers = table.headers.map((h: string) => h.trim().toLowerCase());

    // Identify columns
    let teamColIdx = this.findTeamColumnIndex(headers);
    if (teamColIdx === -1 && headers.length > 1) teamColIdx = 0;

    const cornersIdx = this.findCornersColumnIndex(headers);
    if (cornersIdx === -1 || table.rows.length < 2) return null;

    try {
      const homeRow = table.rows[0];
      const awayRow = table.rows[1];

      const homeTeam = normalizeTeamName(this.extractCellText(homeRow[teamColIdx]));
      const awayTeam = normalizeTeamName(this.extractCellText(awayRow[teamColIdx]));

      const homeCorners = this.safeParseNumber(this.extractCellText(homeRow[cornersIdx]));
      const awayCorners = this.safeParseNumber(this.extractCellText(awayRow[cornersIdx]));

      return { matchUrl, homeTeam, awayTeam, homeCorners, awayCorners };
    } catch {
      return null;
    }
  }

  private findTeamColumnIndex(headers: string[]): number {
    const teamHeaders = ['team', 'squad', 'club'];
    return headers.findIndex(h => teamHeaders.some(th => h.includes(th)));
  }

  private findCornersColumnIndex(headers: string[]): number {
    const cornerHeaders = ['crn', 'corners', 'corner', 'corners taken', 'ck', 'corner kicks'];
    for (const ch of cornerHeaders) {
      const idx = headers.findIndex(h => h.includes(ch));
      if (idx !== -1) return idx;
    }
    return headers.findIndex(h => h.includes('corn') || h.includes('crn'));
  }

  private extractCellText(cell: any): string {
    if (typeof cell === "object" && cell !== null) return cell.text || cell.value || String(cell);
    return String(cell || "");
  }

  private safeParseNumber(raw: any): number {
    const n = parseInt(String(raw || "").replace(/[^\d\-]/g, ""), 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  }

  /**
   * Scrape multiple match log URLs
   */
  async scrapeMultiple(urls: string[]): Promise<MatchLogCorners[]> {
    const results: MatchLogCorners[] = [];
    for (let i = 0; i < urls.length; i++) {
      const corners = await this.scrapeCorners(urls[i]);
      if (corners) results.push(corners);
      await new Promise(res => setTimeout(res, 500));
    }
    return results;
  }
}

export const fbrefMatchLogService = new FBrefMatchLogService();
