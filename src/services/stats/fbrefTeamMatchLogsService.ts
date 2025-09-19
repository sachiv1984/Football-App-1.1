// src/services/stats/fbrefTeamMatchLogsService.ts

import { fbrefScraper, type ScrapedData } from "../scrape/Fbref";
import { normalizeTeamName } from "../../utils/teamUtils";

export interface TeamMatchLogCorners {
  date: string;
  opponent: string;
  venue: 'Home' | 'Away';
  corners: number;
  cornersAgainst?: number; // Available when scraping opposition data
  matchUrl?: string;
}

export interface TeamSeasonCorners {
  teamName: string;
  season: string;
  competition: string;
  matches: TeamMatchLogCorners[];
}

export class FBrefTeamMatchLogsService {
  
  /**
   * Scrape team's match logs for corner statistics
   * @param teamId - Team ID from fbref URL (e.g., '822bd0ba' for Liverpool)
   * @param season - Season (e.g., '2025-2026')
   * @param competitionId - Competition ID (e.g., 'c9' for Premier League)
   * @param teamName - Team name for reference
   */
  async scrapeTeamCorners(
    teamId: string, 
    season: string, 
    competitionId: string, 
    teamName: string
  ): Promise<TeamSeasonCorners | null> {
    
    // First get offensive corners (CK column)
    const offensiveData = await this.scrapePassingTypes(teamId, season, competitionId, false);
    if (!offensiveData) {
      console.error(`[TeamMatchLogs] Failed to get offensive data for ${teamName}`);
      return null;
    }

    // Then get defensive corners (vs Opposition)
    const defensiveData = await this.scrapePassingTypes(teamId, season, competitionId, true);
    
    // Merge the data
    const matches = this.mergeOffensiveAndDefensive(offensiveData, defensiveData);

    return {
      teamName: normalizeTeamName(teamName),
      season,
      competition: this.getCompetitionName(competitionId),
      matches
    };
  }

  private async scrapePassingTypes(
    teamId: string, 
    season: string, 
    competitionId: string, 
    isOpposition: boolean
  ): Promise<TeamMatchLogCorners[] | null> {
    
    const baseUrl = `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/passing_types`;
    const url = isOpposition ? `${baseUrl}/vs` : baseUrl;
    
    console.log(`[TeamMatchLogs] Scraping ${isOpposition ? 'defensive' : 'offensive'} corners: ${url}`);

    let scraped: ScrapedData;
    try {
      scraped = await fbrefScraper.scrapeUrl(url);
    } catch (err) {
      console.error(`[TeamMatchLogs] Error fetching ${url}:`, err);
      return null;
    }

    // Find the match logs table
    const table = this.findMatchLogsTable(scraped);
    if (!table) {
      console.error(`[TeamMatchLogs] No suitable table found in ${url}`);
      return null;
    }

    return this.extractCornersFromMatchLogsTable(table, isOpposition);
  }

  private findMatchLogsTable(scraped: ScrapedData): any | null {
    // Look for the main match logs table
    const table = scraped.tables.find(t => {
      const cap = (t.caption || "").toLowerCase();
      const id = (t.id || "").toLowerCase();
      
      // Should contain match logs indicators and corners column
      const hasMatchLogs = cap.includes("match logs") || cap.includes("matchlogs") || id.includes("matchlogs");
      const hasCorners = t.headers.some((h: string) => h.toLowerCase().includes("ck") || h.toLowerCase().includes("corner"));
      
      return hasMatchLogs && hasCorners && t.rows.length > 0;
    });

    if (table) {
      console.log(`[TeamMatchLogs] Found table with ${table.rows.length} rows and headers:`, table.headers);
    }

    return table;
  }

  private extractCornersFromMatchLogsTable(table: any, isOpposition: boolean): TeamMatchLogCorners[] {
    const headers = table.headers.map((h: string) => h.trim().toLowerCase());
    
    // Find key column indices
    const dateIdx = this.findColumnIndex(headers, ['date', 'day']);
    const opponentIdx = this.findColumnIndex(headers, ['opponent', 'opp', 'vs']);
    const venueIdx = this.findColumnIndex(headers, ['venue', 'home/away', 'h/a']);
    const cornersIdx = this.findColumnIndex(headers, ['ck', 'corners', 'corner kicks']);
    
    if (dateIdx === -1 || opponentIdx === -1 || cornersIdx === -1) {
      console.error('[TeamMatchLogs] Missing required columns:', {
        date: dateIdx,
        opponent: opponentIdx,
        corners: cornersIdx,
        headers
      });
      return [];
    }

    const matches: TeamMatchLogCorners[] = [];

    for (const row of table.rows) {
      try {
        const date = this.extractCellText(row[dateIdx]);
        const opponent = normalizeTeamName(this.extractCellText(row[opponentIdx]));
        const venueText = venueIdx !== -1 ? this.extractCellText(row[venueIdx]) : '';
        const corners = this.safeParseNumber(this.extractCellText(row[cornersIdx]));

        // Skip header rows or invalid data
        if (!date || !opponent || date.toLowerCase().includes('date')) {
          continue;
        }

        const venue = this.parseVenue(venueText);
        
        const matchData: TeamMatchLogCorners = {
          date,
          opponent,
          venue,
          corners: isOpposition ? 0 : corners, // For opposition data, corners go in cornersAgainst
        };

        if (isOpposition) {
          matchData.cornersAgainst = corners;
        }

        matches.push(matchData);
      } catch (err) {
        console.warn('[TeamMatchLogs] Error processing row:', err);
      }
    }

    console.log(`[TeamMatchLogs] Extracted ${matches.length} matches (${isOpposition ? 'defensive' : 'offensive'})`);
    return matches;
  }

  private mergeOffensiveAndDefensive(
    offensiveData: TeamMatchLogCorners[],
    defensiveData: TeamMatchLogCorners[] | null
  ): TeamMatchLogCorners[] {
    
    if (!defensiveData) {
      console.warn('[TeamMatchLogs] No defensive data available, using offensive only');
      return offensiveData;
    }

    // Merge by matching date and opponent
    const merged = offensiveData.map(offMatch => {
      const defMatch = defensiveData.find(dm => 
        dm.date === offMatch.date && dm.opponent === offMatch.opponent
      );
      
      return {
        ...offMatch,
        cornersAgainst: defMatch?.cornersAgainst
      };
    });

    console.log(`[TeamMatchLogs] Merged ${merged.length} matches with both offensive and defensive data`);
    return merged;
  }

  private findColumnIndex(headers: string[], searchTerms: string[]): number {
    for (const term of searchTerms) {
      const idx = headers.findIndex(h => 
        h.includes(term) || h.replace(/[_\s]/g, "") === term.replace(/[_\s]/g, "")
      );
      if (idx !== -1) return idx;
    }
    return -1;
  }

  private extractCellText(cell: any): string {
    if (typeof cell === "object" && cell !== null) {
      return cell.text || String(cell);
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
    if (text.includes('home') || text === 'h' || text === '') {
      return 'Home';
    }
    return 'Away';
  }

  private getCompetitionName(competitionId: string): string {
    const competitions: Record<string, string> = {
      'c9': 'Premier League',
      'c11': 'Champions League',
      'c16': 'FA Cup',
      'c21': 'EFL Cup',
      // Add more as needed
    };
    return competitions[competitionId] || `Competition ${competitionId}`;
  }

  /**
   * Scrape multiple teams' corner statistics
   */
  async scrapeMultipleTeams(teams: Array<{
    teamId: string;
    teamName: string;
    season: string;
    competitionId: string;
  }>): Promise<TeamSeasonCorners[]> {
    
    const results: TeamSeasonCorners[] = [];
    
    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      console.log(`[TeamMatchLogs] Processing ${team.teamName} (${i + 1}/${teams.length})`);
      
      const corners = await this.scrapeTeamCorners(
        team.teamId, 
        team.season, 
        team.competitionId, 
        team.teamName
      );
      
      if (corners) {
        results.push(corners);
      }
      
      // Polite delay between requests
      if (i < teams.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    console.log(`[TeamMatchLogs] Completed scraping for ${results.length}/${teams.length} teams`);
    return results;
  }
}

/**
 * Utility class for building FBRef URLs and managing team data
 */
export class FBrefUrlBuilder {
  
  /**
   * Build the passing types match logs URL
   */
  static buildPassingTypesUrl(
    teamId: string, 
    season: string, 
    competitionId: string, 
    isOpposition: boolean = false
  ): string {
    const baseUrl = `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/passing_types`;
    return isOpposition ? `${baseUrl}/vs` : baseUrl;
  }

  /**
   * Build team stats URL
   */
  static buildTeamStatsUrl(teamId: string, season?: string): string {
    const base = `https://fbref.com/en/squads/${teamId}`;
    return season ? `${base}/${season}` : `${base}-Stats`;
  }

  /**
   * Build fixtures URL
   */
  static buildFixturesUrl(teamId: string, season: string, competitionId: string): string {
    return `https://fbref.com/en/squads/${teamId}/${season}/matchlogs/${competitionId}/schedule`;
  }

  /**
   * Extract team ID from FBRef team URL
   */
  static extractTeamId(url: string): string | null {
    const match = url.match(/\/squads\/([a-f0-9]+)\//);
    return match ? match[1] : null;
  }
}

// Common Premier League teams with their IDs for convenience
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
