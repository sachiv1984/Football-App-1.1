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

  // Corners stats
  cornersMatchesPlayed: { homeValue: number; awayValue: number };
  cornersTaken: { homeValue: number; awayValue: number };
  cornersAgainst: { homeValue: number; awayValue: number };
  totalCorners: { homeValue: number; awayValue: number };
  over75MatchCorners: { homeValue: number; awayValue: number };
  over85MatchCorners: { homeValue: number; awayValue: number };
  over95MatchCorners: { homeValue: number; awayValue: number };
  over105MatchCorners: { homeValue: number; awayValue: number };
  over115MatchCorners: { homeValue: number; awayValue: number };
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
  private cornersCache: Map<string, { corners: number; cornersAgainst: number; matches: number }> = new Map();
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
   * Get corner statistics using the team-based approach
   * Only scrapes if corner data is not cached or outdated
   */
  private async getCornerStatistics(teamStats: Map<string, TeamSeasonStats>): Promise<Map<string, { corners: number; cornersAgainst: number; matches: number }>> {
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
      
      // Process the corner data
      allTeamsCornerData.forEach(teamData => {
        const totalCorners = teamData.matches.reduce((sum, match) => sum + match.corners, 0);
        const totalCornersAgainst = teamData.matches.reduce((sum, match) => sum + (match.cornersAgainst || 0), 0);
        
        this.cornersCache.set(teamData.teamName, {
          corners: totalCorners,
          cornersAgainst: totalCornersAgainst,
          matches: teamData.matches.length
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
   * Main method to get comprehensive match stats
   * Uses fixture service for basic stats and only scrapes corners when needed
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

    // Get corner statistics (uses cache or scrapes if needed)
    const cornersMap = await this.getCornerStatistics(allTeamStats);
    
    // Merge corner data with basic stats
    const homeCornerData = cornersMap.get(homeStats.team) || { corners: 0, cornersAgainst: 0, matches: homeStats.matchesPlayed };
    const awayCornerData = cornersMap.get(awayStats.team) || { corners: 0, cornersAgainst: 0, matches: awayStats.matchesPlayed };

    // Update team stats with corner data
    const enhancedHomeStats = {
      ...homeStats,
      corners: homeCornerData.corners,
      cornersAgainst: homeCornerData.cornersAgainst,
    };

    const enhancedAwayStats = {
      ...awayStats,
      corners: awayCornerData.corners,
      cornersAgainst: awayCornerData.cornersAgainst,
    };

    const calculateOverPercentage = (total: number, matches: number, threshold: number): number => {
      if (matches === 0) return 0;
      const avg = total / matches;
      return avg > threshold ? Math.min(90, Math.round(60 + (avg - threshold) * 10)) : Math.max(10, Math.round(50 - (threshold - avg) * 10));
    };

    return {
      recentForm: {
        homeResults: enhancedHomeStats.recentForm || [],
        awayResults: enhancedAwayStats.recentForm || [],
        homeStats: { 
          matchesPlayed: enhancedHomeStats.matchesPlayed, 
          won: enhancedHomeStats.won, 
          drawn: enhancedHomeStats.drawn, 
          lost: enhancedHomeStats.lost 
        },
        awayStats: { 
          matchesPlayed: enhancedAwayStats.matchesPlayed, 
          won: enhancedAwayStats.won, 
          drawn: enhancedAwayStats.drawn, 
          lost: enhancedAwayStats.lost 
        },
      },
      cornersMatchesPlayed: { 
        homeValue: enhancedHomeStats.matchesPlayed, 
        awayValue: enhancedAwayStats.matchesPlayed 
      },
      cornersTaken: { 
        homeValue: enhancedHomeStats.corners || 0, 
        awayValue: enhancedAwayStats.corners || 0 
      },
      cornersAgainst: { 
        homeValue: enhancedHomeStats.cornersAgainst || 0, 
        awayValue: enhancedAwayStats.cornersAgainst || 0 
      },
      totalCorners: { 
        homeValue: (enhancedHomeStats.corners || 0) + (enhancedHomeStats.cornersAgainst || 0), 
        awayValue: (enhancedAwayStats.corners || 0) + (enhancedAwayStats.cornersAgainst || 0) 
      },
      over75MatchCorners: { 
        homeValue: calculateOverPercentage((enhancedHomeStats.corners || 0) + (enhancedHomeStats.cornersAgainst || 0), enhancedHomeStats.matchesPlayed, 7.5), 
        awayValue: calculateOverPercentage((enhancedAwayStats.corners || 0) + (enhancedAwayStats.cornersAgainst || 0), enhancedAwayStats.matchesPlayed, 7.5) 
      },
      over85MatchCorners: { 
        homeValue: calculateOverPercentage((enhancedHomeStats.corners || 0) + (enhancedHomeStats.cornersAgainst || 0), enhancedHomeStats.matchesPlayed, 8.5), 
        awayValue: calculateOverPercentage((enhancedAwayStats.corners || 0) + (enhancedAwayStats.cornersAgainst || 0), enhancedAwayStats.matchesPlayed, 8.5) 
      },
      over95MatchCorners: { 
        homeValue: calculateOverPercentage((enhancedHomeStats.corners || 0) + (enhancedHomeStats.cornersAgainst || 0), enhancedHomeStats.matchesPlayed, 9.5), 
        awayValue: calculateOverPercentage((enhancedAwayStats.corners || 0) + (enhancedAwayStats.cornersAgainst || 0), enhancedAwayStats.matchesPlayed, 9.5) 
      },
      over105MatchCorners: { 
        homeValue: calculateOverPercentage((enhancedHomeStats.corners || 0) + (enhancedHomeStats.cornersAgainst || 0), enhancedHomeStats.matchesPlayed, 10.5), 
        awayValue: calculateOverPercentage((enhancedAwayStats.corners || 0) + (enhancedAwayStats.cornersAgainst || 0), enhancedAwayStats.matchesPlayed, 10.5) 
      },
      over115MatchCorners: { 
        homeValue: calculateOverPercentage((enhancedHomeStats.corners || 0) + (enhancedHomeStats.cornersAgainst || 0), enhancedHomeStats.matchesPlayed, 11.5), 
        awayValue: calculateOverPercentage((enhancedAwayStats.corners || 0) + (enhancedAwayStats.cornersAgainst || 0), enhancedAwayStats.matchesPlayed, 11.5) 
      },
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
        teams: Array.from(this.cornersCache.keys())
      },
      currentLeague: this.currentLeague,
      currentSeason: this.currentSeason
    };
  }
}

export const fbrefStatsService = new FBrefStatsService();
