// src/services/stats/fbrefStatsService.ts
import { fbrefTeamMatchLogsService, PREMIER_LEAGUE_TEAMS } from './fbrefTeamMatchLogsService';
import { fbrefFixtureService, type TeamSeasonStats } from '../fixtures/fbrefFixtureService';
import { normalizeTeamName } from '../../utils/teamUtils';

interface TeamFormData {
  homeResults: ('W' | 'D' | 'L')[];
  awayResults: ('W' | 'D' | 'L')[];
  homeStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
  awayStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
}

interface TeamStatsData {
  recentForm: TeamFormData;

  // Corners stats (now as averages per game and actual percentages)
  cornersMatchesPlayed: { homeValue: number; awayValue: number };
  cornersTaken: { homeValue: number; awayValue: number }; // Average corners for per game
  cornersAgainst: { homeValue: number; awayValue: number }; // Average corners against per game
  totalCorners: { homeValue: number; awayValue: number }; // Average total corners per game
  over75MatchCorners: { homeValue: number; awayValue: number }; // % of games with 7.5+ total corners
  over85MatchCorners: { homeValue: number; awayValue: number }; // % of games with 8.5+ total corners
  over95MatchCorners: { homeValue: number; awayValue: number }; // % of games with 9.5+ total corners
  over105MatchCorners: { homeValue: number; awayValue: number }; // % of games with 10.5+ total corners
  over115MatchCorners: { homeValue: number; awayValue: number }; // % of games with 11.5+ total corners
}

// Enhanced interface for detailed corner statistics
interface DetailedCornerStats {
  corners: number;
  cornersAgainst: number;
  matches: number;
  matchDetails: Array<{
    opponent: string;
    totalCorners: number; // corners + cornersAgainst for this specific match
    corners: number;
    cornersAgainst: number;
  }>;
}

// Competition ID mappings
const COMPETITION_IDS = {
  premierLeague: 'c9',
  laLiga: 'c12',
  bundesliga: 'c20',
  serieA: 'c11',
  ligue1: 'c13',
} as const;

// Team ID mappings for different leagues
const LEAGUE_TEAMS: Record<string, Record<string, string>> = {
  premierLeague: PREMIER_LEAGUE_TEAMS,
  laLiga: {
    'Real Madrid': 'real-madrid-id',
    'Barcelona': 'barcelona-id',
    // Add more La Liga teams
  },
  bundesliga: {
    'Bayern Munich': 'bayern-munich-id',
    'Borussia Dortmund': 'borussia-dortmund-id',
    // Add more Bundesliga teams
  },
  serieA: {
    'Juventus': 'juventus-id',
    'AC Milan': 'ac-milan-id',
    // Add more Serie A teams
  },
  ligue1: {
    'Paris Saint-Germain': 'psg-id',
    'Marseille': 'marseille-id',
    // Add more Ligue 1 teams
  },
};

export class FBrefStatsService {
  private cornersCache: Map<string, DetailedCornerStats> = new Map();
  private cornersCacheTime = 0;
  private readonly cornersCacheTimeout = 60 * 60 * 1000; // 1 hour (corners change less frequently)

  private currentLeague: string = 'premierLeague';
  private currentSeason = '2025-2026';

  private isCornersCacheValid(): boolean {
    return this.cornersCache.size > 0 && Date.now() - this.cornersCacheTime < this.cornersCacheTimeout;
  }

  public clearCache(): void {
    this.cornersCache.clear();
    this.cornersCacheTime = 0;
    console.log('[FBrefStats] Corner stats cache cleared');
  }

  setLeague(league: string): void {
    if (this.currentLeague !== league) {
      this.currentLeague = league;
      this.clearCache();
      // Also set league in fixture service
      fbrefFixtureService.setLeague(league as any);
    }
  }

  setSeason(season: string): void {
    if (this.currentSeason !== season) {
      this.currentSeason = season;
      this.clearCache();
    }
  }

  /**
   * Get team stats from the fixture service (no additional scraping needed)
   */
  async getTeamStats(teamName: string): Promise<TeamSeasonStats | null> {
    console.log(`[FBrefStats] Getting team stats for ${teamName} from fixture service...`);
    return await fbrefFixtureService.getTeamStats(teamName);
  }

  /**
   * Enhanced team stats with corner data
   */
  async getEnhancedTeamStats(teamName: string): Promise<TeamSeasonStats | null> {
    const basicStats = await this.getTeamStats(teamName);
    if (!basicStats) return null;

    // Add corner data if not present and available in cache
    if (!basicStats.corners && this.cornersCache.has(normalizeTeamName(teamName))) {
      const cornerData = this.cornersCache.get(normalizeTeamName(teamName))!;
      return {
        ...basicStats,
        corners: cornerData.corners,
        cornersAgainst: cornerData.cornersAgainst,
      };
    }

    return basicStats;
  }

  /**
   * Enhanced corner statistics calculation with detailed match data
   */
  private async getCornerStatistics(teamStats: Map<string, TeamSeasonStats>): Promise<Map<string, DetailedCornerStats>> {
    // Use cached data if valid
    if (this.isCornersCacheValid() && this.cornersCache.size > 0) {
      console.log('[FBrefStats] Using cached corner statistics');
      return this.cornersCache;
    }

    console.log('[FBrefStats] Fetching corner statistics using team match logs...');
    
    this.cornersCache.clear();
    const competitionId = COMPETITION_IDS[this.currentLeague as keyof typeof COMPETITION_IDS];
    const leagueTeams = LEAGUE_TEAMS[this.currentLeague] || {};
    
    // Prepare teams for scraping
    const teamsToScrape: Array<{
      teamId: string;
      teamName: string;
      season: string;
      competitionId: string;
    }> = [];

    for (const [teamName] of teamStats) {
      const teamId = this.findTeamId(teamName, leagueTeams);
      if (teamId) {
        teamsToScrape.push({
          teamId,
          teamName,
          season: this.currentSeason,
          competitionId
        });
      } else {
        console.warn(`[FBrefStats] Team ID not found for: ${teamName}`);
      }
    }

    if (teamsToScrape.length === 0) {
      console.warn('[FBrefStats] No teams found for corner statistics scraping');
      return this.cornersCache;
    }

    try {
      // Scrape corner data for all teams
      const allTeamsCornerData = await fbrefTeamMatchLogsService.scrapeMultipleTeams(teamsToScrape);
      
      // Process the corner data with detailed match information
      allTeamsCornerData.forEach(teamData => {
        const totalCorners = teamData.matches.reduce((sum, match) => sum + match.corners, 0);
        const totalCornersAgainst = teamData.matches.reduce((sum, match) => sum + (match.cornersAgainst || 0), 0);
        
        // Create detailed match data for over/under calculations
        const matchDetails = teamData.matches.map(match => ({
          opponent: match.opponent,
          totalCorners: match.corners + (match.cornersAgainst || 0),
          corners: match.corners,
          cornersAgainst: match.cornersAgainst || 0,
        }));

        this.cornersCache.set(teamData.teamName, {
          corners: totalCorners,
          cornersAgainst: totalCornersAgainst,
          matches: teamData.matches.length,
          matchDetails
        });

        console.log(`[FBrefStats] ${teamData.teamName}: ${totalCorners} corners, ${totalCornersAgainst} conceded (${teamData.matches.length} matches)`);
      });

      this.cornersCacheTime = Date.now();
      console.log(`[FBrefStats] Corner statistics cached for ${this.cornersCache.size} teams`);

    } catch (error) {
      console.error('[FBrefStats] Error fetching corner statistics:', error);
    }

    return this.cornersCache;
  }

  /**
   * Calculate actual over/under percentages based on match history
   */
  private calculateOverPercentage(matchDetails: Array<{totalCorners: number}>, threshold: number): number {
    if (matchDetails.length === 0) return 0;
    
    const gamesOver = matchDetails.filter(match => match.totalCorners > threshold).length;
    const percentage = (gamesOver / matchDetails.length) * 100;
    
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate average corners per game
   */
  private calculateAverage(total: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((total / matches) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Find team ID from predefined mappings
   */
  private findTeamId(teamName: string, leagueTeams: Record<string, string>): string | null {
    const normalizedName = normalizeTeamName(teamName);
    
    // Direct match
    if (leagueTeams[normalizedName]) {
      return leagueTeams[normalizedName];
    }
    
    // Try to find partial match
    for (const [key, id] of Object.entries(leagueTeams)) {
      const normalizedKey = normalizeTeamName(key);
      if (normalizedKey.includes(normalizedName) || normalizedName.includes(normalizedKey)) {
        return id;
      }
    }
    
    return null;
  }

  /**
   * Main method to get comprehensive match stats with proper corner calculations
   */
  async getMatchStats(homeTeam: string, awayTeam: string): Promise<TeamStatsData> {
    console.log(`[FBrefStats] Getting match stats for ${homeTeam} vs ${awayTeam}`);

    // Get all team stats from fixture service (includes basic stats + form)
    const allTeamStats = await fbrefFixtureService.getAllTeamStats();
    
    const homeStats = allTeamStats.get(normalizeTeamName(homeTeam));
    const awayStats = allTeamStats.get(normalizeTeamName(awayTeam));
    
    if (!homeStats || !awayStats) {
      throw new Error(`Stats not found for teams: ${homeTeam} vs ${awayTeam}`);
    }

    // Get detailed corner statistics (uses cache or scrapes if needed)
    const cornersMap = await this.getCornerStatistics(allTeamStats);
    
    // Merge corner data with basic stats
    const homeCornerData = cornersMap.get(homeStats.team) || { 
      corners: 0, 
      cornersAgainst: 0, 
      matches: homeStats.matchesPlayed,
      matchDetails: []
    };
    
    const awayCornerData = cornersMap.get(awayStats.team) || { 
      corners: 0, 
      cornersAgainst: 0, 
      matches: awayStats.matchesPlayed,
      matchDetails: []
    };

    console.log(`[FBrefStats] ${homeTeam} corner details:`, {
      totalCorners: homeCornerData.corners,
      totalCornersAgainst: homeCornerData.cornersAgainst,
      matches: homeCornerData.matches,
      avgCornersFor: this.calculateAverage(homeCornerData.corners, homeCornerData.matches),
      avgCornersAgainst: this.calculateAverage(homeCornerData.cornersAgainst, homeCornerData.matches),
      avgTotalCorners: this.calculateAverage(homeCornerData.corners + homeCornerData.cornersAgainst, homeCornerData.matches)
    });

    console.log(`[FBrefStats] ${awayTeam} corner details:`, {
      totalCorners: awayCornerData.corners,
      totalCornersAgainst: awayCornerData.cornersAgainst,
      matches: awayCornerData.matches,
      avgCornersFor: this.calculateAverage(awayCornerData.corners, awayCornerData.matches),
      avgCornersAgainst: this.calculateAverage(awayCornerData.cornersAgainst, awayCornerData.matches),
      avgTotalCorners: this.calculateAverage(awayCornerData.corners + awayCornerData.cornersAgainst, awayCornerData.matches)
    });

    return {
      recentForm: {
        homeResults: homeStats.recentForm || [],
        awayResults: awayStats.recentForm || [],
        homeStats: { 
          matchesPlayed: homeStats.matchesPlayed, 
          won: homeStats.won, 
          drawn: homeStats.drawn, 
          lost: homeStats.lost 
        },
        awayStats: { 
          matchesPlayed: awayStats.matchesPlayed, 
          won: awayStats.won, 
          drawn: awayStats.drawn, 
          lost: awayStats.lost 
        },
      },
      cornersMatchesPlayed: { 
        homeValue: homeCornerData.matches, 
        awayValue: awayCornerData.matches 
      },
      // UPDATED: Now showing averages per game
      cornersTaken: { 
        homeValue: this.calculateAverage(homeCornerData.corners, homeCornerData.matches), 
        awayValue: this.calculateAverage(awayCornerData.corners, awayCornerData.matches)
      },
      cornersAgainst: { 
        homeValue: this.calculateAverage(homeCornerData.cornersAgainst, homeCornerData.matches), 
        awayValue: this.calculateAverage(awayCornerData.cornersAgainst, awayCornerData.matches)
      },
      totalCorners: { 
        homeValue: this.calculateAverage(homeCornerData.corners + homeCornerData.cornersAgainst, homeCornerData.matches), 
        awayValue: this.calculateAverage(awayCornerData.corners + awayCornerData.cornersAgainst, awayCornerData.matches)
      },
      // UPDATED: Now showing actual percentages based on match history
      over75MatchCorners: { 
        homeValue: this.calculateOverPercentage(homeCornerData.matchDetails, 7.5), 
        awayValue: this.calculateOverPercentage(awayCornerData.matchDetails, 7.5)
      },
      over85MatchCorners: { 
        homeValue: this.calculateOverPercentage(homeCornerData.matchDetails, 8.5), 
        awayValue: this.calculateOverPercentage(awayCornerData.matchDetails, 8.5)
      },
      over95MatchCorners: { 
        homeValue: this.calculateOverPercentage(homeCornerData.matchDetails, 9.5), 
        awayValue: this.calculateOverPercentage(awayCornerData.matchDetails, 9.5)
      },
      over105MatchCorners: { 
        homeValue: this.calculateOverPercentage(homeCornerData.matchDetails, 10.5), 
        awayValue: this.calculateOverPercentage(awayCornerData.matchDetails, 10.5)
      },
      over115MatchCorners: { 
        homeValue: this.calculateOverPercentage(homeCornerData.matchDetails, 11.5), 
        awayValue: this.calculateOverPercentage(awayCornerData.matchDetails, 11.5)
      },
    };
  }

  /**
   * NEW: Get detailed corner breakdown for a specific team
   */
  async getTeamCornerBreakdown(teamName: string): Promise<{
    averages: {
      cornersFor: number;
      cornersAgainst: number;
      totalCorners: number;
    };
    percentages: {
      over75: number;
      over85: number;
      over95: number;
      over105: number;
      over115: number;
    };
    matchCount: number;
    recentMatches: Array<{
      opponent: string;
      totalCorners: number;
      cornersFor: number;
      cornersAgainst: number;
    }>;
  } | null> {
    const allTeamStats = await fbrefFixtureService.getAllTeamStats();
    const cornersMap = await this.getCornerStatistics(allTeamStats);
    const cornerData = cornersMap.get(normalizeTeamName(teamName));
    
    if (!cornerData) return null;

    return {
      averages: {
        cornersFor: this.calculateAverage(cornerData.corners, cornerData.matches),
        cornersAgainst: this.calculateAverage(cornerData.cornersAgainst, cornerData.matches),
        totalCorners: this.calculateAverage(cornerData.corners + cornerData.cornersAgainst, cornerData.matches)
      },
      percentages: {
        over75: this.calculateOverPercentage(cornerData.matchDetails, 7.5),
        over85: this.calculateOverPercentage(cornerData.matchDetails, 8.5),
        over95: this.calculateOverPercentage(cornerData.matchDetails, 9.5),
        over105: this.calculateOverPercentage(cornerData.matchDetails, 10.5),
        over115: this.calculateOverPercentage(cornerData.matchDetails, 11.5),
      },
      matchCount: cornerData.matches,
      recentMatches: cornerData.matchDetails.slice(-5) // Last 5 matches
    };
  }

  /**
   * Utility method to refresh corner data manually
   */
  async refreshCornerData(): Promise<void> {
    console.log('[FBrefStats] Manually refreshing corner data...');
    this.clearCache();
    
    // Get team stats to trigger corner data refresh
    const allTeamStats = await fbrefFixtureService.getAllTeamStats();
    await this.getCornerStatistics(allTeamStats);
    
    console.log('[FBrefStats] Corner data refresh completed');
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    return {
      cornersCache: {
        size: this.cornersCache.size,
        isValid: this.isCornersCacheValid(),
        cacheTime: this.cornersCacheTime,
        teams: Array.from(this.cornersCache.keys()),
        sampleData: Array.from(this.cornersCache.entries()).slice(0, 2).map(([team, data]) => ({
          team,
          matches: data.matches,
          avgCornersFor: this.calculateAverage(data.corners, data.matches),
          avgCornersAgainst: this.calculateAverage(data.cornersAgainst, data.matches),
          over75Percentage: this.calculateOverPercentage(data.matchDetails, 7.5)
        }))
      },
      currentLeague: this.currentLeague,
      currentSeason: this.currentSeason
    };
  }
}

export const fbrefStatsService = new FBrefStatsService();
