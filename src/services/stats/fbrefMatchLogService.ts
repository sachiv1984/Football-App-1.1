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
    if (!matchUrl.startsWith("https://fbref.com/")) {
      throw new Error("URL must be from fbref.com");
    }

    if (!matchUrl.includes("/matches/") || matchUrl.endsWith("/matches/")) {
      console.error(`[MatchLog] Invalid match URL format: ${matchUrl}`);
      return null;
    }

    let scraped: ScrapedData;
    try {
      scraped = await fbrefScraper.scrapeUrl(matchUrl);
    } catch (err) {
      console.error(`[MatchLog] Error fetching ${matchUrl}:`, err);
      return null;
    }

    // Debug: log table info
    scraped.tables.forEach((table, idx) => {
      console.log(`[MatchLog] Table ${idx}:`, { caption: table.caption, headers: table.headers, rowCount: table.rows.length });
    });

    return this.scrapeWithStrategies(scraped, matchUrl);
  }

  private scrapeWithStrategies(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    return (
      this.tryMatchSummaryStrategy(scraped, matchUrl) ||
      this.tryTeamStatsStrategy(scraped, matchUrl) ||
      this.tryGeneralTableStrategy(scraped, matchUrl)
    );
  }

  private tryMatchSummaryStrategy(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    const table = scraped.tables.find(t => {
      const cap = (t.caption || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      return cap.includes("team stats") || cap.includes("match stats") || cap.includes("summary") || id.includes("team_stats");
    });
    return table ? this.extractCornersFromTable(table, matchUrl) : null;
  }

  private tryTeamStatsStrategy(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    const table = scraped.tables.find(t => {
      const cap = (t.caption || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      return cap.includes("corners") || id.includes("corners") || t.headers.some(h => h.toLowerCase().includes("corner"));
    });
    return table ? this.extractCornersFromTable(table, matchUrl) : null;
  }

  private tryGeneralTableStrategy(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    for (const table of scraped.tables) {
      if (table.rows.length >= 2) {
        const result = this.extractCornersFromTable(table, matchUrl);
        if (result) return result;
      }
    }
    return null;
  }

  private extractCornersFromTable(table: any, matchUrl: string): MatchLogCorners | null {
    const headers = table.headers.map((h: string) => h.trim().toLowerCase());
    let teamColIdx = headers.findIndex(h => ["team", "squad", "club"].some(t => h.includes(t)));
    if (teamColIdx === -1) teamColIdx = 0;

    const cornersIdx = this.findCornersColumnIndex(headers);
    if (cornersIdx === -1) return null;
    if (table.rows.length < 2) return null;

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

  private findCornersColumnIndex(headers: string[]): number {
    const cornerHeaders = ["crn", "corners", "corner", "corners taken", "corner kicks", "ck"];
    for (const ch of cornerHeaders) {
      const idx = headers.findIndex(h => h.replace(/[_\s]/g, "") === ch.replace(/[_\s]/g, ""));
      if (idx !== -1) return idx;
    }
    return headers.findIndex(h => h.includes("corn") || h.includes("crn"));
  }

  private extractCellText(cell: any): string {
    if (typeof cell === "object" && cell !== null) return cell.text || String(cell);
    return String(cell || "");
  }

  private safeParseNumber(raw: any): number {
    const n = parseInt(String(raw || "").replace(/[^\d\-]/g, ""), 10);
    return isNaN(n) ? 0 : Math.max(0, n);
  }

  async scrapeMultiple(urls: string[]): Promise<MatchLogCorners[]> {
    const results: MatchLogCorners[] = [];
    for (let i = 0; i < urls.length; i++) {
      const corners = await this.scrapeCorners(urls[i]);
      if (corners) results.push(corners);
      await new Promise(r => setTimeout(r, 500)); // polite delay
    }
    return results;
  }
}

export const fbrefMatchLogService = new FBrefMatchLogService();
