// src/services/stats/supabaseFoulsService.ts
import { supabase } from '../supabaseClient';
import { normalizeTeamName } from '../../utils/teamUtils';

export interface SupabaseFoulData {
  id: string;
  team_name: string;
  opponent: string;
  team_fouls: number;
  team_fouled: number;
  opp_fouls: number;
  opp_fouled: number;
  match_date?: string;
  matchweek?: number;
  venue?: 'home' | 'away';
}

export interface DetailedFoulStats {
  foulsCommitted: number;          // Total fouls this team committed
  foulsWon: number;               // Total fouls this team won
  foulsAgainst: number;           // Total fouls opponents committed
  foulsLost: number;              // Total fouls opponents won
  matches: number;
  matchDetails: Array<{
    opponent: string;
    totalFouls: number;           // foulsCommitted + foulsAgainst for this match
    foulsCommittedFor: number;    // Fouls this team committed
    foulsWonFor: number;          // Fouls this team won
    foulsCommittedAgainst: number; // Fouls opponent committed
    foulsWonAgainst: number;      // Fouls opponent won
    date?: string;
    matchweek?: number;
  }>;
}

export class SupabaseFoulsService {
  private foulsCache: Map<string, DetailedFoulStats> = new Map();
  private foulsCacheTime = 0;
  private readonly foulsCacheTimeout = 30 * 60 * 1000; // 30 minutes cache

  private isCacheValid(): boolean {
    return this.foulsCache.size > 0 && Date.now() - this.foulsCacheTime < this.foulsCacheTimeout;
  }

  public clearCache(): void {
    this.foulsCache.clear();
    this.foulsCacheTime = 0;
    console.log('[SupabaseFouls] Cache cleared');
  }

  /**
   * Fetch foul data for all teams from Supabase (same table as cards)
   */
  private async fetchFoulDataFromSupabase(): Promise<SupabaseFoulData[]> {
    console.log('[SupabaseFouls] 🔄 Fetching foul data from Supabase...');
    
    try {
      const { data, error } = await supabase
        .from('team_misc_stats')
        .select(`
          id,
          team_name,
          opponent,
          team_fouls,
          team_fouled,
          opp_fouls,
          opp_fouled,
          match_date,
          matchweek,
          venue
        `)
        .order('team_name')
        .order('match_date');

      if (error) {
        console.error('[SupabaseFouls] ❌ Supabase fetch error:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Supabase Error (${error.code}): ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('[SupabaseFouls] ⚠️ No foul data found in database');
        return [];
      }

      console.log('[SupabaseFouls] ✅ Fetched foul data:', {
        totalRecords: data.length,
        uniqueTeams: new Set(data.map(d => d.team_name)).size
      });

      return data.map(row => ({
        id: row.id,
        team_name: normalizeTeamName(row.team_name),
        opponent: normalizeTeamName(row.opponent),
        team_fouls: row.team_fouls || 0,
        team_fouled: row.team_fouled || 0,
        opp_fouls: row.opp_fouls || 0,
        opp_fouled: row.opp_fouled || 0,
        match_date: row.match_date,
        matchweek: row.matchweek,
        venue: row.venue
      }));

    } catch (err) {
      console.error('[SupabaseFouls] 💥 Error fetching foul data:', err);
      throw err;
    }
  }

  /**
   * Process raw foul data into structured team stats
   */
  private processFoulData(rawData: SupabaseFoulData[]): Map<string, DetailedFoulStats> {
    const teamStats = new Map<string, DetailedFoulStats>();

    // Group data by team
    const teamGroups = new Map<string, SupabaseFoulData[]>();
    rawData.forEach(row => {
      const teamName = row.team_name;
      if (!teamGroups.has(teamName)) {
        teamGroups.set(teamName, []);
      }
      teamGroups.get(teamName)!.push(row);
    });

    // Process each team's data
    teamGroups.forEach((matches, teamName) => {
      // Sort matches by date (most recent first for consistency)
      matches.sort((a, b) => {
        if (!a.match_date || !b.match_date) return 0;
        return new Date(b.match_date).getTime() - new Date(a.match_date).getTime();
      });

      // Calculate totals
      const totalFoulsCommitted = matches.reduce((sum, match) => sum + match.team_fouls, 0);
      const totalFoulsWon = matches.reduce((sum, match) => sum + match.team_fouled, 0);
      const totalFoulsAgainst = matches.reduce((sum, match) => sum + match.opp_fouls, 0);
      const totalFoulsLost = matches.reduce((sum, match) => sum + match.opp_fouled, 0);

      // Create detailed match data
      const matchDetails = matches.map(match => ({
        opponent: match.opponent,
        totalFouls: match.team_fouls + match.opp_fouls,
        foulsCommittedFor: match.team_fouls,
        foulsWonFor: match.team_fouled,
        foulsCommittedAgainst: match.opp_fouls,
        foulsWonAgainst: match.opp_fouled,
        date: match.match_date,
        matchweek: match.matchweek
      }));

      teamStats.set(teamName, {
        foulsCommitted: totalFoulsCommitted,
        foulsWon: totalFoulsWon,
        foulsAgainst: totalFoulsAgainst,
        foulsLost: totalFoulsLost,
        matches: matches.length,
        matchDetails
      });

      console.log(`[SupabaseFouls] ${teamName}: ${totalFoulsCommitted} fouls committed, ${totalFoulsWon} fouls won (${matches.length} matches)`);
    });

    return teamStats;
  }

  /**
   * Get foul statistics for all teams (main method)
   */
  async getFoulStatistics(): Promise<Map<string, DetailedFoulStats>> {
    if (this.isCacheValid()) {
      console.log('[SupabaseFouls] Using cached foul statistics');
      return this.foulsCache;
    }

    try {
      console.log('[SupabaseFouls] Refreshing foul statistics from Supabase...');
      
      const rawData = await this.fetchFoulDataFromSupabase();
      const processedStats = this.processFoulData(rawData);

      // Update cache
      this.foulsCache = processedStats;
      this.foulsCacheTime = Date.now();

      console.log(`[SupabaseFouls] Foul statistics cached for ${this.foulsCache.size} teams`);
      return this.foulsCache;

    } catch (error) {
      console.error('[SupabaseFouls] Error fetching foul statistics:', error);
      
      if (this.foulsCache.size > 0) {
        console.warn('[SupabaseFouls] Returning stale cache data due to error');
        return this.foulsCache;
      }
      
      throw error;
    }
  }

  /**
   * Get foul statistics for a specific team
   */
  async getTeamFoulStats(teamName: string): Promise<DetailedFoulStats | null> {
    const allStats = await this.getFoulStatistics();
    return allStats.get(normalizeTeamName(teamName)) || null;
  }

  /**
   * Get foul data for two specific teams (for match stats)
   */
  async getMatchFoulStats(homeTeam: string, awayTeam: string): Promise<{
    homeStats: DetailedFoulStats | null;
    awayStats: DetailedFoulStats | null;
  }> {
    const allStats = await this.getFoulStatistics();
    
    return {
      homeStats: allStats.get(normalizeTeamName(homeTeam)) || null,
      awayStats: allStats.get(normalizeTeamName(awayTeam)) || null
    };
  }

  /**
   * Calculate percentage of matches over a certain fouls threshold
   */
  calculateOverPercentage(matchDetails: Array<{foulsCommittedFor: number}>, threshold: number): number {
    if (matchDetails.length === 0) return 0;
    
    const gamesOver = matchDetails.filter(match => match.foulsCommittedFor > threshold).length;
    const percentage = (gamesOver / matchDetails.length) * 100;
    
    return Math.round(percentage * 100) / 100;
  }

  /**
   * Calculate average fouls per game
   */
  calculateAverage(total: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((total / matches) * 100) / 100;
  }

  /**
   * Get comprehensive team foul breakdown
   */
  async getTeamFoulBreakdown(teamName: string): Promise<{
    averages: {
      foulsCommitted: number;
      foulsWon: number;
      foulsAgainst: number;
      foulsLost: number;
      totalFouls: number;
    };
    percentages: {
      over85TeamFoulsCommitted: number;
      over95TeamFoulsCommitted: number;
      over105TeamFoulsCommitted: number;
      over115TeamFoulsCommitted: number;
    };
    matchCount: number;
    recentMatches: Array<{
      opponent: string;
      totalFouls: number;
      foulsCommittedFor: number;
      foulsWonFor: number;
      foulsCommittedAgainst: number;
      foulsWonAgainst: number;
      date?: string;
    }>;
  } | null> {
    const foulData = await this.getTeamFoulStats(teamName);
    
    if (!foulData) return null;

    return {
      averages: {
        foulsCommitted: this.calculateAverage(foulData.foulsCommitted, foulData.matches),
        foulsWon: this.calculateAverage(foulData.foulsWon, foulData.matches),
        foulsAgainst: this.calculateAverage(foulData.foulsAgainst, foulData.matches),
        foulsLost: this.calculateAverage(foulData.foulsLost, foulData.matches),
        totalFouls: this.calculateAverage(foulData.foulsCommitted + foulData.foulsAgainst, foulData.matches)
      },
      percentages: {
        over85TeamFoulsCommitted: this.calculateOverPercentage(foulData.matchDetails, 8.5),
        over95TeamFoulsCommitted: this.calculateOverPercentage(foulData.matchDetails, 9.5),
        over105TeamFoulsCommitted: this.calculateOverPercentage(foulData.matchDetails, 10.5),
        over115TeamFoulsCommitted: this.calculateOverPercentage(foulData.matchDetails, 11.5),
      },
      matchCount: foulData.matches,
      recentMatches: foulData.matchDetails.slice(0, 5)
    };
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    const sampleTeams = Array.from(this.foulsCache.entries()).slice(0, 3);
    
    return {
      size: this.foulsCache.size,
      isValid: this.isCacheValid(),
      cacheTime: this.foulsCacheTime,
      lastUpdate: this.foulsCacheTime ? new Date(this.foulsCacheTime).toISOString() : null,
      teams: Array.from(this.foulsCache.keys()),
      sampleData: sampleTeams.map(([team, data]) => ({
        team,
        matches: data.matches,
        avgFoulsCommitted: this.calculateAverage(data.foulsCommitted, data.matches),
        avgFoulsWon: this.calculateAverage(data.foulsWon, data.matches),
        over85Percentage: this.calculateOverPercentage(data.matchDetails, 8.5)
      }))
    };
  }

  /**
   * Manual refresh for debugging/testing
   */
  async refresh(): Promise<void> {
    this.clearCache();
    await this.getFoulStatistics();
  }
}

export const supabaseFoulsService = new SupabaseFoulsService();

// Complete fbrefStatsService.ts with ALL stats
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