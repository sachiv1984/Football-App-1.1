import { fbrefFixtureService, type TeamSeasonStats } from '../fixtures/fbrefFixtureService';
import { supabaseCornersService, type DetailedCornerStats } from './supabaseCornersService';
import { normalizeTeamName } from '../../utils/teamUtils';

interface TeamFormData {
  homeResults: ('W' | 'D' | 'L')[];
  awayResults: ('W' | 'D' | 'L')[];
  homeStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
  awayStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
}

interface TeamStatsData {
  recentForm: TeamFormData;
  
  // Corners stats (as averages per game and actual percentages)
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

export class FBrefStatsService {
  private currentLeague: string = 'premierLeague';
  private currentSeason = '2025-2026';

  public clearCache(): void {
    supabaseCornersService.clearCache();
    fbrefFixtureService.clearCache();
    console.log('[FBrefStats] All caches cleared');
  }

  setLeague(league: string): void {
    if (this.currentLeague !== league) {
      this.currentLeague = league;
      this.clearCache();
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
   * Get team stats from fixture service (form data, W/D/L)
   */
  async getTeamStats(teamName: string): Promise<TeamSeasonStats | null> {
    console.log(`[FBrefStats] Getting team stats for ${teamName} from fixture service...`);
    return await fbrefFixtureService.getTeamStats(teamName);
  }

  /**
   * Enhanced team stats with Supabase corner data
   */
  async getEnhancedTeamStats(teamName: string): Promise<TeamSeasonStats | null> {
    const basicStats = await this.getTeamStats(teamName);
    if (!basicStats) return null;

    // Add corner data from Supabase
    try {
      const cornerData = await supabaseCornersService.getTeamCornerStats(teamName);
      if (cornerData) {
        return {
          ...basicStats,
          corners: cornerData.corners,
          cornersAgainst: cornerData.cornersAgainst,
        };
      }
    } catch (error) {
      console.warn(`[FBrefStats] Could not fetch corner data for ${teamName}:`, error);
    }

    return basicStats;
  }

  /**
   * Calculate average corners per game
   */
  private calculateAverage(total: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((total / matches) * 100) / 100;
  }

  /**
   * Calculate actual over/under percentages based on match history
   */
  private calculateOverPercentage(matchDetails: Array<{totalCorners: number}>, threshold: number): number {
    return supabaseCornersService.calculateOverPercentage(matchDetails, threshold);
  }

  /**
   * Main method to get comprehensive match stats using Supabase data
   */
  async getMatchStats(homeTeam: string, awayTeam: string): Promise<TeamStatsData> {
    console.log(`[FBrefStats] Getting match stats for ${homeTeam} vs ${awayTeam} from Supabase`);

    try {
      // Get team form data from fixture service
      const allTeamStats = await fbrefFixtureService.getAllTeamStats();
      const homeStats = allTeamStats.get(normalizeTeamName(homeTeam));
      const awayStats = allTeamStats.get(normalizeTeamName(awayTeam));
      
      if (!homeStats || !awayStats) {
        throw new Error(`Form stats not found for teams: ${homeTeam} vs ${awayTeam}`);
      }

      // Get corner data from Supabase
      const { homeStats: homeCornerData, awayStats: awayCornerData } = 
        await supabaseCornersService.getMatchCornerStats(homeTeam, awayTeam);

      // Use empty corner data if not found (fallback)
      const defaultCornerData: DetailedCornerStats = {
        corners: 0,
        cornersAgainst: 0,
        matches: homeStats.matchesPlayed,
        matchDetails: []
      };

      const homeCorners = homeCornerData || defaultCornerData;
      const awayCorners = awayCornerData || defaultCornerData;

      // Log corner details for debugging
      console.log(`[FBrefStats] ${homeTeam} corner details:`, {
        totalCorners: homeCorners.corners,
        totalCornersAgainst: homeCorners.cornersAgainst,
        matches: homeCorners.matches,
        avgCornersFor: this.calculateAverage(homeCorners.corners, homeCorners.matches),
        avgCornersAgainst: this.calculateAverage(homeCorners.cornersAgainst, homeCorners.matches),
        avgTotalCorners: this.calculateAverage(homeCorners.corners + homeCorners.cornersAgainst, homeCorners.matches)
      });

      console.log(`[FBrefStats] ${awayTeam} corner details:`, {
        totalCorners: awayCorners.corners,
        totalCornersAgainst: awayCorners.cornersAgainst,
        matches: awayCorners.matches,
        avgCornersFor: this.calculateAverage(awayCorners.corners, awayCorners.matches),
        avgCornersAgainst: this.calculateAverage(awayCorners.cornersAgainst, awayCorners.matches),
        avgTotalCorners: this.calculateAverage(awayCorners.corners + awayCorners.cornersAgainst, awayCorners.matches)
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
          homeValue: homeCorners.matches, 
          awayValue: awayCorners.matches 
        },
        cornersTaken: { 
          homeValue: this.calculateAverage(homeCorners.corners, homeCorners.matches), 
          awayValue: this.calculateAverage(awayCorners.corners, awayCorners.matches)
        },
        cornersAgainst: { 
          homeValue: this.calculateAverage(homeCorners.cornersAgainst, homeCorners.matches), 
          awayValue: this.calculateAverage(awayCorners.cornersAgainst, awayCorners.matches)
        },
        totalCorners: { 
          homeValue: this.calculateAverage(homeCorners.corners + homeCorners.cornersAgainst, homeCorners.matches), 
          awayValue: this.calculateAverage(awayCorners.corners + awayCorners.cornersAgainst, awayCorners.matches)
        },
        over75MatchCorners: { 
          homeValue: this.calculateOverPercentage(homeCorners.matchDetails, 7.5), 
          awayValue: this.calculateOverPercentage(awayCorners.matchDetails, 7.5)
        },
        over85MatchCorners: { 
          homeValue: this.calculateOverPercentage(homeCorners.matchDetails, 8.5), 
          awayValue: this.calculateOverPercentage(awayCorners.matchDetails, 8.5)
        },
        over95MatchCorners: { 
          homeValue: this.calculateOverPercentage(homeCorners.matchDetails, 9.5), 
          awayValue: this.calculateOverPercentage(awayCorners.matchDetails, 9.5)
        },
        over105MatchCorners: { 
          homeValue: this.calculateOverPercentage(homeCorners.matchDetails, 10.5), 
          awayValue: this.calculateOverPercentage(awayCorners.matchDetails, 10.5)
        },
        over115MatchCorners: { 
          homeValue: this.calculateOverPercentage(homeCorners.matchDetails, 11.5), 
          awayValue: this.calculateOverPercentage(awayCorners.matchDetails, 11.5)
        },
      };

    } catch (error) {
      console.error('[FBrefStats] Error getting match stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed corner breakdown for a specific team (uses Supabase data)
   */
  async getTeamCornerBreakdown(teamName: string) {
    return await supabaseCornersService.getTeamCornerBreakdown(teamName);
  }

  /**
   * Utility method to refresh all data manually
   */
  async refreshAllData(): Promise<void> {
    console.log('[FBrefStats] Manually refreshing all data...');
    this.clearCache();
    
    // Force refresh of both services
    await supabaseCornersService.refresh();
    await fbrefFixtureService.getAllTeamStats(); // This will refresh fixture service cache
    
    console.log('[FBrefStats] All data refresh completed');
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    return {
      cornersCache: supabaseCornersService.getCacheStatus(),
      currentLeague: this.currentLeague,
      currentSeason: this.currentSeason,
      dataSource: 'Supabase'
    };
  }
}

export const fbrefStatsService = new FBrefStatsService();
