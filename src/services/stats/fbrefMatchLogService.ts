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
    // Validate URL format
    if (!matchUrl.startsWith("https://fbref.com/")) {
      throw new Error("URL must be from fbref.com");
    }

    // Check if URL looks like a proper match URL (should contain "/matches/" and a match ID)
    if (!matchUrl.includes("/matches/") || matchUrl.endsWith("/matches/")) {
      console.error(`[MatchLog] Invalid match URL format: ${matchUrl}`);
      console.error(`[MatchLog] Expected format: https://fbref.com/en/matches/[match-id]/[team-names-and-date]`);
      console.error(`[MatchLog] Example: https://fbref.com/en/matches/a071faa8/Liverpool-Bournemouth-August-15-2025-Premier-League`);
      return null;
    }

    let scraped: ScrapedData;
    try {
      scraped = await fbrefScraper.scrapeUrl(matchUrl);
    } catch (err) {
      console.error(`[MatchLog] Error fetching ${matchUrl}:`, err);
      return null;
    }

    // Debug: log all available tables
    console.log(`[MatchLog] Found ${scraped.tables.length} tables at ${matchUrl}`);
    scraped.tables.forEach((table, index) => {
      console.log(`Table ${index}:`, {
        caption: table.caption,
        id: table.id,
        headers: table.headers,
        rowCount: table.rows.length
      });
    });

    // Use the improved multi-strategy approach
    return this.scrapeWithStrategies(scraped, matchUrl);
  }

  /**
   * Use all strategies to find corners data
   */
  private scrapeWithStrategies(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    // Try multiple strategies to find corners data
    let cornersData = this.tryMatchSummaryStrategy(scraped, matchUrl);
    if (cornersData) return cornersData;

    cornersData = this.tryTeamStatsStrategy(scraped, matchUrl);
    if (cornersData) return cornersData;

    cornersData = this.tryGeneralTableStrategy(scraped, matchUrl);
    if (cornersData) return cornersData;

    console.warn(`[MatchLog] No corners data found at ${matchUrl}`);
    return null;
  }

  /**
   * Strategy 1: Look for match summary or stats summary tables
   * FBRef typically has a "Team Stats" table or similar with corners data
   */
  private tryMatchSummaryStrategy(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    // Look for tables that might contain match summary stats
    // FBRef often uses specific IDs like "team_stats" or captions like "Team Stats"
    const summaryTable = scraped.tables.find(t => {
      const cap = (t.caption || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      return cap.includes("team stats") || 
             cap.includes("match stats") ||
             cap.includes("summary") ||
             id.includes("team_stats") ||
             id.includes("match_stats") ||
             // FBRef sometimes uses "Stats" as caption
             cap === "stats" ||
             // Look for tables with "vs" which might be team comparison
             cap.includes(" vs ");
    });

    if (!summaryTable) return null;

    console.log(`[MatchLog] Trying match summary strategy with table:`, {
      caption: summaryTable.caption,
      id: summaryTable.id,
      headers: summaryTable.headers
    });

    return this.extractCornersFromTable(summaryTable, matchUrl, "summary");
  }

  /**
   * Strategy 2: Look specifically for corners tables
   */
  private tryTeamStatsStrategy(scraped: ScrapedData, matchUrl: string): MatchLogCorners | null {
    const cornersTable = scraped.tables.find(t => {
      const cap = (t.caption || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      return cap.includes("corners") || 
             id.includes("corners") ||
             t.headers.some(h => h.toLowerCase().includes("corner"));
    });

    if (!cornersTable) return null;

    console.log(`[MatchLog] Trying corners table strategy with table:`, {
      caption: cornersTable.caption,
      headers: cornersTable.headers
    });

    return this.extractCornersFromTable(cornersTable, matchUrl, "corners");
  }

  /**
   * Strategy 3: Look through all tables for any that might contain team vs team stats
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
   * Extract corners data from a table using various column detection methods
   * FBRef typically structures match data with teams as rows and stats as columns
   */
  private extractCornersFromTable(table: any, matchUrl: string, strategy: string): MatchLogCorners | null {
    const headers = table.headers.map((h: string) => h.trim().toLowerCase());
    
    console.log(`[MatchLog] ${strategy} strategy - Headers:`, headers);
    console.log(`[MatchLog] ${strategy} strategy - Rows:`, table.rows.length);

    // FBRef match pages often have team names in first column, stats in subsequent columns
    // Try different approaches for team identification
    
    // Approach 1: Look for explicit team column
    let teamColIdx = this.findTeamColumnIndex(headers);
    
    // Approach 2: If no explicit team column, assume first column contains team names
    if (teamColIdx === -1 && headers.length > 1) {
      teamColIdx = 0;
      console.log(`[MatchLog] ${strategy} strategy - Using first column as team column`);
    }

    if (teamColIdx === -1) {
      console.log(`[MatchLog] ${strategy} strategy - No suitable team column found`);
      return null;
    }

    // Try to find corners column with various possible names
    const cornersIdx = this.findCornersColumnIndex(headers);
    if (cornersIdx === -1) {
      console.log(`[MatchLog] ${strategy} strategy - No corners column found. Available headers:`, headers);
      return null;
    }

    console.log(`[MatchLog] ${strategy} strategy - Found team col: ${teamColIdx} (${headers[teamColIdx]}), corners col: ${cornersIdx} (${headers[cornersIdx]})`);

    // Need at least 2 rows for home/away teams
    if (table.rows.length < 2) {
      console.log(`[MatchLog] ${strategy} strategy - Not enough rows (${table.rows.length})`);
      return null;
    }

    // Log first few rows for debugging
    console.log(`[MatchLog] ${strategy} strategy - First row:`, table.rows[0]);
    console.log(`[MatchLog] ${strategy} strategy - Second row:`, table.rows[1]);

    // Try to extract team names and corners
    try {
      // FBRef typically shows home team first, away team second
      const homeRow = table.rows[0];
      const awayRow = table.rows[1];

      const rawHomeTeam = this.extractCellText(homeRow[teamColIdx]);
      const rawAwayTeam = this.extractCellText(awayRow[teamColIdx]);

      console.log(`[MatchLog] ${strategy} strategy - Raw team names: "${rawHomeTeam}" vs "${rawAwayTeam}"`);

      // Skip if team names look invalid
      if (!rawHomeTeam || !rawAwayTeam || 
          rawHomeTeam.toLowerCase().includes('total') || 
          rawAwayTeam.toLowerCase().includes('total') ||
          rawHomeTeam.toLowerCase() === rawAwayTeam.toLowerCase()) {
        console.log(`[MatchLog] ${strategy} strategy - Invalid team names: ${rawHomeTeam}, ${rawAwayTeam}`);
        return null;
      }

      const homeTeam = normalizeTeamName(rawHomeTeam);
      const awayTeam = normalizeTeamName(rawAwayTeam);

      const homeCornersRaw = this.extractCellText(homeRow[cornersIdx]);
      const awayCornersRaw = this.extractCellText(awayRow[cornersIdx]);

      console.log(`[MatchLog] ${strategy} strategy - Raw corners: "${homeCornersRaw}" vs "${awayCornersRaw}"`);

      const homeCorners = this.safeParseNumber(homeCornersRaw);
      const awayCorners = this.safeParseNumber(awayCornersRaw);

      console.log(`[MatchLog] ${strategy} strategy - Extracted: ${homeTeam} (${homeCorners}) vs ${awayTeam} (${awayCorners})`);

      // Basic validation - corners should be reasonable numbers
      if (homeCorners < 0 || awayCorners < 0 || homeCorners > 50 || awayCorners > 50) {
        console.log(`[MatchLog] ${strategy} strategy - Unreasonable corner values`);
        return null;
      }

      // Additional validation: both teams shouldn't have 0 corners unless it's a very unusual match
      if (homeCorners === 0 && awayCorners === 0) {
        console.log(`[MatchLog] ${strategy} strategy - Both teams have 0 corners, might be invalid data`);
        // Don't return null here as 0-0 corners is possible, but log it
      }

      return {
        matchUrl,
        homeTeam,
        awayTeam,
        homeCorners,
        awayCorners,
      };
    } catch (err) {
      console.error(`[MatchLog] ${strategy} strategy - Error extracting data:`, err);
      return null;
    }
  }

  private findTeamColumnIndex(headers: string[]): number {
    const teamHeaders = ['team', 'squad', 'club'];
    for (const teamHeader of teamHeaders) {
      const idx = headers.findIndex(h => h === teamHeader || h.includes(teamHeader));
      if (idx !== -1) return idx;
    }
    return -1;
  }

  private findCornersColumnIndex(headers: string[]): number {
    // FBRef commonly uses these for corners data
    const cornerHeaders = [
      'crn',           // Most common abbreviation
      'corners', 
      'corner',
      'corners for', 
      'corners taken',
      'crn for',       // Sometimes seen
      'corner kicks',
      'ck',            // Another abbreviation
    ];
    
    for (const cornerHeader of cornerHeaders) {
      const idx = headers.findIndex(h => 
        h === cornerHeader || 
        h.includes(cornerHeader) ||
        // Handle cases where it might be "crn_for" or similar
        h.replace(/[_\s]/g, '') === cornerHeader.replace(/[_\s]/g, '')
      );
      if (idx !== -1) {
        console.log(`[MatchLog] Found corners column "${headers[idx]}" at index ${idx}`);
        return idx;
      }
    }
    
    // If no exact match, look for any header containing "corn" or "crn"
    const partialIdx = headers.findIndex(h => 
      h.includes('corn') || 
      h.includes('crn')
    );
    if (partialIdx !== -1) {
      console.log(`[MatchLog] Found partial corners match "${headers[partialIdx]}" at index ${partialIdx}`);
      return partialIdx;
    }
    
    return -1;
  }

  private extractCellText(cell: any): string {
    if (typeof cell === "object" && cell !== null) {
      return cell.text || cell.value || String(cell);
    }
    return String(cell || "");
  }

  private safeParseNumber(raw: any): number {
    if (!raw && raw !== 0) return 0;
    const str = String(raw).trim();
    // Remove commas, spaces, and other non-numeric characters except minus
    const clean = str.replace(/[^\d\-]/g, "");
    const n = parseInt(clean, 10);
    return isNaN(n) ? 0 : Math.max(0, n); // Ensure non-negative
  }

  /**
   * Scrape multiple match log URLs with better error handling and progress tracking
   */
  async scrapeMultiple(urls: string[]): Promise<MatchLogCorners[]> {
    console.log(`[MatchLog] Starting to scrape ${urls.length} match URLs`);
    const results: MatchLogCorners[] = [];
    const errors: string[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[MatchLog] Progress: ${i + 1}/${urls.length} - Processing ${url}`);
      
      try {
        const corners = await this.scrapeCorners(url);
        if (corners) {
          results.push(corners);
          console.log(`[MatchLog] ✓ Success: ${corners.homeTeam} vs ${corners.awayTeam}`);
        } else {
          errors.push(`No data found: ${url}`);
          console.log(`[MatchLog] ✗ No data: ${url}`);
        }
      } catch (err) {
        const errorMsg = `Error scraping ${url}: ${err}`;
        errors.push(errorMsg);
        console.error(`[MatchLog] ✗ ${errorMsg}`);
      }
      
      // Add small delay to be respectful to the server
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`[MatchLog] Completed: ${results.length} successful, ${errors.length} failed`);
    if (errors.length > 0) {
      console.warn(`[MatchLog] Errors:`, errors.slice(0, 5)); // Log first 5 errors
    }

    return results;
  }
}

export const fbrefMatchLogService = new FBrefMatchLogService();
