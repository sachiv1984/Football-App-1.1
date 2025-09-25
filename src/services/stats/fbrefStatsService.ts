// src/services/stats/fbrefStatsService.ts
import { fbrefFixtureService, type TeamSeasonStats } from '../fixtures/fbrefFixtureService';
import { supabaseCornersService, type DetailedCornerStats } from './supabaseCornersService';
import { supabaseCardsService, type DetailedCardStats } from './supabaseCardsService';
import { supabaseShootingService, type DetailedShootingStats } from './supabaseShootingService';
import { supabaseFoulsService, type DetailedFoulStats } from './supabaseFoulsService';
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
  
  // Cards stats
  cardsMatchesPlayed: { homeValue: number; awayValue: number };
  cardsShown: { homeValue: number; awayValue: number };
  cardsAgainst: { homeValue: number; awayValue: number };
  totalCards: { homeValue: number; awayValue: number };
  over05TeamCards: { homeValue: number; awayValue: number };
  over15TeamCards: { homeValue: number; awayValue: number };
  over25TeamCards: { homeValue: number; awayValue: number };
  over35TeamCards: { homeValue: number; awayValue: number };
  
  // Shooting stats
  shootingMatchesPlayed: { homeValue: number; awayValue: number };
  shots: { homeValue: number; awayValue: number };
  shotsAgainst: { homeValue: number; awayValue: number };
  shotsOnTarget: { homeValue: number; awayValue: number };
  shotsOnTargetAgainst: { homeValue: number; awayValue: number };
  over25TeamShotsOnTarget: { homeValue: number; awayValue: number };
  over35TeamShotsOnTarget: { homeValue: number; awayValue: number };
  over45TeamShotsOnTarget: { homeValue: number; awayValue: number };
  over55TeamShotsOnTarget: { homeValue: number; awayValue: number };
  
  // Fouls stats
  foulsMatchesPlayed: { homeValue: number; awayValue: number };
  foulsCommitted: { homeValue: number; awayValue: number };
  foulsWon: { homeValue: number; awayValue: number };
  foulsAgainst: { homeValue: number; awayValue: number };
  foulsLost: { homeValue: number; awayValue: number };
  over85TeamFoulsCommitted: { homeValue: number; awayValue: number };
  over95TeamFoulsCommitted: { homeValue: number; awayValue: number };
  over105TeamFoulsCommitted: { homeValue: number; awayValue: number };
  over115TeamFoulsCommitted: { homeValue: number; awayValue: number };
}

export class FBrefStatsService {
  private currentLeague: string = 'premierLeague';
  private currentSeason = '2025-2026';

  public clearCache(): void {
    supabaseCornersService.clearCache();
    supabaseCardsService.clearCache();
    supabaseShootingService.clearCache();
    supabaseFoulsService.clearCache();
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
   * Enhanced team stats with all Supabase data
   */
  async getEnhancedTeamStats(teamName: string): Promise<TeamSeasonStats | null> {
    const basicStats = await this.getTeamStats(teamName);
    if (!basicStats) return null;

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
   * Calculate average per game
   */
  private calculateAverage(total: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((total / matches) * 100) / 100;
  }

  /**
   * Calculate over/under percentages for corners
   */
  private calculateOverPercentage(matchDetails: Array<{totalCorners: number}>, threshold: number): number {
    return supabaseCornersService.calculateOverPercentage(matchDetails, threshold);
  }

  /**
   * Main method to get comprehensive match stats using ALL Supabase data
   */
  async getMatchStats(homeTeam: string, awayTeam: string): Promise<TeamStatsData> {
    console.log(`[FBrefStats] Getting complete match stats for ${homeTeam} vs ${awayTeam} from Supabase`);

    try {
      // Get team form data from fixture service
      const allTeamStats = await fbrefFixtureService.getAllTeamStats();
      const homeStats = allTeamStats.get(normalizeTeamName(homeTeam));
      const awayStats = allTeamStats.get(normalizeTeamName(awayTeam));
      
      if (!homeStats || !awayStats) {
        throw new Error(`Form stats not found for teams: ${homeTeam} vs ${awayTeam}`);
      }

      // Get data from ALL Supabase services
      const { homeStats: homeCornerData, awayStats: awayCornerData } = 
        await supabaseCornersService.getMatchCornerStats(homeTeam, awayTeam);
      
      const { homeStats: homeCardData, awayStats: awayCardData } = 
        await supabaseCardsService.getMatchCardStats(homeTeam, awayTeam);

      const { homeStats: homeShootingData, awayStats: awayShootingData } = 
        await supabaseShootingService.getMatchShootingStats(homeTeam, awayTeam);

      const { homeStats: homeFoulData, awayStats: awayFoulData } = 
        await supabaseFoulsService.getMatchFoulStats(homeTeam, awayTeam);

      // Fallback defaults for missing data
      const defaultCornerData: DetailedCornerStats = {
        corners: 0, cornersAgainst: 0, matches: homeStats.matchesPlayed, matchDetails: []
      };

      const defaultCardData: DetailedCardStats = {
        cardsShown: 0, cardsAgainst: 0, matches: homeStats.matchesPlayed, matchDetails: []
      };

      const defaultShootingData: DetailedShootingStats = {
        shots: 0, shotsAgainst: 0, shotsOnTarget: 0, shotsOnTargetAgainst: 0,
        matches: homeStats.matchesPlayed, matchDetails: []
      };

      const defaultFoulData: DetailedFoulStats = {
        foulsCommitted: 0, foulsWon: 0, foulsAgainst: 0, foulsLost: 0,
        matches: homeStats.matchesPlayed, matchDetails: []
      };

      // Use actual data or fallback to defaults
      const homeCorners = homeCornerData || defaultCornerData;
      const awayCorners = awayCornerData || defaultCornerData;
      const homeCards = homeCardData || defaultCardData;
      const awayCards = awayCardData || defaultCardData;
      const homeShooting = homeShootingData || defaultShootingData;
      const awayShooting = awayShootingData || defaultShootingData;
      const homeFouls = homeFoulData || defaultFoulData;
      const awayFouls = awayFoulData || defaultFoulData;

      // Log details for debugging
      console.log(`[FBrefStats] ${homeTeam} complete stats:`, {
        corners: { avg: this.calculateAverage(homeCorners.corners, homeCorners.matches) },
        cards: { avg: this.calculateAverage(homeCards.cardsShown, homeCards.matches) },
        shooting: { avgShots: this.calculateAverage(homeShooting.shots, homeShooting.matches) },
        fouls: { avgCommitted: this.calculateAverage(homeFouls.foulsCommitted, homeFouls.matches) }
      });

      return {
        // Form data
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
        
        // Corner data
        cornersMatchesPlayed: { homeValue: homeCorners.matches, awayValue: awayCorners.matches },
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

        // Card data
        cardsMatchesPlayed: { homeValue: homeCards.matches, awayValue: awayCards.matches },
        cardsShown: { 
          homeValue: this.calculateAverage(homeCards.cardsShown, homeCards.matches), 
          awayValue: this.calculateAverage(awayCards.cardsShown, awayCards.matches)
        },
        cardsAgainst: { 
          homeValue: this.calculateAverage(homeCards.cardsAgainst, homeCards.matches), 
          awayValue: this.calculateAverage(awayCards.cardsAgainst, awayCards.matches)
        },
        totalCards: { 
          homeValue: this.calculateAverage(homeCards.cardsShown + homeCards.cardsAgainst, homeCards.matches), 
          awayValue: this.calculateAverage(awayCards.cardsShown + awayCards.cardsAgainst, awayCards.matches)
        },
        over05TeamCards: { 
          homeValue: supabaseCardsService.calculateOverPercentage(homeCards.matchDetails, 0.5), 
          awayValue: supabaseCardsService.calculateOverPercentage(awayCards.matchDetails, 0.5)
        },
        over15TeamCards: { 
          homeValue: supabaseCardsService.calculateOverPercentage(homeCards.matchDetails, 1.5), 
          awayValue: supabaseCardsService.calculateOverPercentage(awayCards.matchDetails, 1.5)
        },
        over25TeamCards: { 
          homeValue: supabaseCardsService.calculateOverPercentage(homeCards.matchDetails, 2.5), 
          awayValue: supabaseCardsService.calculateOverPercentage(awayCards.matchDetails, 2.5)
        },
        over35TeamCards: { 
          homeValue: supabaseCardsService.calculateOverPercentage(homeCards.matchDetails, 3.5), 
          awayValue: supabaseCardsService.calculateOverPercentage(awayCards.matchDetails, 3.5)
        },

        // Shooting data
        shootingMatchesPlayed: { homeValue: homeShooting.matches, awayValue: awayShooting.matches },
        shots: { 
          homeValue: this.calculateAverage(homeShooting.shots, homeShooting.matches), 
          awayValue: this.calculateAverage(awayShooting.shots, awayShooting.matches)
        },
        shotsAgainst: { 
          homeValue: this.calculateAverage(homeShooting.shotsAgainst, homeShooting.matches), 
          awayValue: this.calculateAverage(awayShooting.shotsAgainst, awayShooting.matches)
        },
        shotsOnTarget: { 
          homeValue: this.calculateAverage(homeShooting.shotsOnTarget, homeShooting.matches), 
          awayValue: this.calculateAverage(awayShooting.shotsOnTarget, awayShooting.matches)
        },
        shotsOnTargetAgainst: { 
          homeValue: this.calculateAverage(homeShooting.shotsOnTargetAgainst, homeShooting.matches), 
          awayValue: this.calculateAverage(awayShooting.shotsOnTargetAgainst, awayShooting.matches)
        },
        over25TeamShotsOnTarget: { 
          homeValue: supabaseShootingService.calculateOverPercentage(homeShooting.matchDetails, 2.5), 
          awayValue: supabaseShootingService.calculateOverPercentage(awayShooting.matchDetails, 2.5)
        },
        over35TeamShotsOnTarget: { 
          homeValue: supabaseShootingService.calculateOverPercentage(homeShooting.matchDetails, 3.5), 
          awayValue: supabaseShootingService.calculateOverPercentage(awayShooting.matchDetails, 3.5)
        },
        over45TeamShotsOnTarget: { 
          homeValue: supabaseShootingService.calculateOverPercentage(homeShooting.matchDetails, 4.5), 
          awayValue: supabaseShootingService.calculateOverPercentage(awayShooting.matchDetails, 4.5)
        },
        over55TeamShotsOnTarget: { 
          homeValue: supabaseShootingService.calculateOverPercentage(homeShooting.matchDetails, 5.5), 
          awayValue: supabaseShootingService.calculateOverPercentage(awayShooting.matchDetails, 5.5)
        },

        // Fouls data
        foulsMatchesPlayed: { homeValue: homeFouls.matches, awayValue: awayFouls.matches },
        foulsCommitted: { 
          homeValue: this.calculateAverage(homeFouls.foulsCommitted, homeFouls.matches), 
          awayValue: this.calculateAverage(awayFouls.foulsCommitted, awayFouls.matches)
        },
        foulsWon: { 
          homeValue: this.calculateAverage(homeFouls.foulsWon, homeFouls.matches), 
          awayValue: this.calculateAverage(awayFouls.foulsWon, awayFouls.matches)
        },
        foulsAgainst: { 
          homeValue: this.calculateAverage(homeFouls.foulsAgainst, homeFouls.matches), 
          awayValue: this.calculateAverage(awayFouls.foulsAgainst, awayFouls.matches)
        },
        foulsLost: { 
          homeValue: this.calculateAverage(homeFouls.foulsLost, homeFouls.matches), 
          awayValue: this.calculateAverage(awayFouls.foulsLost, awayFouls.matches)
        },
        over85TeamFoulsCommitted: { 
          homeValue: supabaseFoulsService.calculateOverPercentage(homeFouls.matchDetails, 8.5), 
          awayValue: supabaseFoulsService.calculateOverPercentage(awayFouls.matchDetails, 8.5)
        },
        over95TeamFoulsCommitted: { 
          homeValue: supabaseFoulsService.calculateOverPercentage(homeFouls.matchDetails, 9.5), 
          awayValue: supabaseFoulsService.calculateOverPercentage(awayFouls.matchDetails, 9.5)
        },
        over105TeamFoulsCommitted: { 
          homeValue: supabaseFoulsService.calculateOverPercentage(homeFouls.matchDetails, 10.5), 
          awayValue: supabaseFoulsService.calculateOverPercentage(awayFouls.matchDetails, 10.5)
        },
        over115TeamFoulsCommitted: { 
          homeValue: supabaseFoulsService.calculateOverPercentage(homeFouls.matchDetails, 11.5), 
          awayValue: supabaseFoulsService.calculateOverPercentage(awayFouls.matchDetails, 11.5)
        },
      };

    } catch (error) {
      console.error('[FBrefStats] Error getting complete match stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed breakdowns for specific teams
   */
  async getTeamCornerBreakdown(teamName: string) {
    return await supabaseCornersService.getTeamCornerBreakdown(teamName);
  }

  async getTeamCardBreakdown(teamName: string) {
    return await supabaseCardsService.getTeamCardBreakdown(teamName);
  }

  async getTeamShootingBreakdown(teamName: string) {
    return await supabaseShootingService.getTeamShootingBreakdown(teamName);
  }

  async getTeamFoulBreakdown(teamName: string) {
    return await supabaseFoulsService.getTeamFoulBreakdown(teamName);
  }

  /**
   * Utility method to refresh ALL data manually
   */
  async refreshAllData(): Promise<void> {
    console.log('[FBrefStats] Manually refreshing ALL data...');
    this.clearCache();
    
    // Force refresh of all services
    await Promise.all([
      supabaseCornersService.refresh(),
      supabaseCardsService.refresh(),
      supabaseShootingService.refresh(),
      supabaseFoulsService.refresh(),
      fbrefFixtureService.getAllTeamStats()
    ]);
    
    console.log('[FBrefStats] ALL data refresh completed');
  }

  /**
   * Get comprehensive cache status for debugging
   */
  getCacheStatus() {
    return {
      cornersCache: supabaseCornersService.getCacheStatus(),
      cardsCache: supabaseCardsService.getCacheStatus(),
      shootingCache: supabaseShootingService.getCacheStatus(),
      foulsCache: supabaseFoulsService.getCacheStatus(),
      currentLeague: this.currentLeague,
      currentSeason: this.currentSeason,
      dataSource: 'Supabase',
      totalServices: 4
    };
  }

  /**
   * Get summary of all stats for a team (useful for debugging)
   */
  async getTeamStatsSummary(teamName: string) {
    try {
      const [corners, cards, shooting, fouls] = await Promise.all([
        this.getTeamCornerBreakdown(teamName),
        this.getTeamCardBreakdown(teamName),
        this.getTeamShootingBreakdown(teamName),
        this.getTeamFoulBreakdown(teamName)
      ]);

      return {
        team: teamName,
        corners: corners ? {
          avgFor: corners.averages.cornersFor,
          avgAgainst: corners.averages.cornersAgainst,
          over95: corners.percentages.over95
        } : null,
        cards: cards ? {
          avgShown: cards.averages.cardsShown,
          avgAgainst: cards.averages.cardsAgainst,
          over15: cards.percentages.over15TeamCards
        } : null,
        shooting: shooting ? {
          avgShots: shooting.averages.shots,
          avgShotsOnTarget: shooting.averages.shotsOnTarget,
          over35SOT: shooting.percentages.over35TeamShotsOnTarget
        } : null,
        fouls: fouls ? {
          avgCommitted: fouls.averages.foulsCommitted,
          avgWon: fouls.averages.foulsWon,
          over95: fouls.percentages.over95TeamFoulsCommitted
        } : null
      };
    } catch (error) {
      console.error(`[FBrefStats] Error getting summary for ${teamName}:`, error);
      return null;
    }
  }
}

export const fbrefStatsService = new FBrefStatsService();
