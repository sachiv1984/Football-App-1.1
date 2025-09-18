// src/services/stats/fbrefMatchLogService.ts

import { fbrefScraper, type ScrapedData } from "../scrape/Fbref";
import { normalizeTeamName } from "../../utils/teamUtils";

export interface MatchLogCorners {
  matchUrl: string;
  homeTeam: string;
  awayTeam: string;
  homeCorners: number;
  awayCorners: number;
  // you could expand later: shots, fouls etc.
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

    let scraped: ScrapedData;
    try {
      scraped = await fbrefScraper.scrapeUrl(matchUrl);
    } catch (err) {
      console.error(`[MatchLog] Error fetching ${matchUrl}:`, err);
      return null;
    }

    // Likely corner table caption contains "Corners", or maybe a stats table with corners row
    const table = scraped.tables.find(t => {
      const cap = (t.caption || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      // “Corners by half”, “Corners summary”, etc
      return cap.includes("corners") || id.includes("corners") || cap.includes("match log");
    });

    if (!table) {
      console.warn(`[MatchLog] No table with corners found at ${matchUrl}`);
      return null;
    }

    // Debug: print headers
    // console.log("[MatchLog] Table headers:", table.headers);

    const headers = table.headers.map(h => h.trim().toLowerCase());

    // We need to find which columns correspond to team, and which to corners for home/away
    const teamColIdx = headers.findIndex(h => h === "team" || h.includes("team"));
    // FBref might use “Crn” or “Corners” or "Corners for" etc
    const cornersIdx = headers.findIndex(h => h === "crn" || h.includes("corner"));

    if (teamColIdx === -1 || cornersIdx === -1) {
      console.warn(`[MatchLog] Did not find team or corners column in the table at ${matchUrl}`);
      return null;
    }

    // Usually rows[0] = home team, rows[1] = away team (or vice versa)
    if (table.rows.length < 2) {
      console.warn(`[MatchLog] Table has less than 2 rows for teams at ${matchUrl}`);
      return null;
    }

    const homeRow = table.rows[0];
    const awayRow = table.rows[1];

    const rawHomeTeam = typeof homeRow[teamColIdx] === "object"
      ? homeRow[teamColIdx].text
      : homeRow[teamColIdx];
    const rawAwayTeam = typeof awayRow[teamColIdx] === "object"
      ? awayRow[teamColIdx].text
      : awayRow[teamColIdx];

    const homeTeam = normalizeTeamName(rawHomeTeam);
    const awayTeam = normalizeTeamName(rawAwayTeam);

    // parse corners, default 0 if missing
    const homeCornersRaw = typeof homeRow[cornersIdx] === "object"
      ? homeRow[cornersIdx].text
      : homeRow[cornersIdx];
    const awayCornersRaw = typeof awayRow[cornersIdx] === "object"
      ? awayRow[cornersIdx].text
      : awayRow[cornersIdx];

    const homeCorners = this.safeParseNumber(homeCornersRaw);
    const awayCorners = this.safeParseNumber(awayCornersRaw);

    return {
      matchUrl,
      homeTeam,
      awayTeam,
      homeCorners,
      awayCorners,
    };
  }

  private safeParseNumber(raw: any): number {
    if (!raw && raw !== 0) return 0;
    const str = String(raw).trim();
    // Remove commas, etc
    const clean = str.replace(/[^\d\-]/g, "");
    const n = parseInt(clean, 10);
    return isNaN(n) ? 0 : n;
  }

  /**
   * Scrape multiple match log URLs
   */
  async scrapeMultiple(urls: string[]): Promise<MatchLogCorners[]> {
    const results: MatchLogCorners[] = [];
    for (const url of urls) {
      try {
        const corners = await this.scrapeCorners(url);
        if (corners) {
          results.push(corners);
        } else {
          // could push a fallback or an object marking failure if needed
        }
      } catch (err) {
        console.error(`[MatchLog] Error scraping ${url}:`, err);
      }
    }
    return results;
  }
}

export const fbrefMatchLogService = new FBrefMatchLogService();
