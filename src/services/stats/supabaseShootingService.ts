// src/services/stats/supabaseShootingService.ts
import { supabase } from '../supabaseClient';
import { normalizeTeamName } from '../../utils/teamUtils';

export interface SupabaseShootingData {
  id: string;
  team_name: string;
  opponent: string;
  team_shots: number;
  opp_shots: number;
  team_shots_on_target: number;
  opp_shots_on_target: number;
  match_date?: string;
  matchweek?: number;
  venue?: 'home' | 'away';
}

export interface DetailedShootingStats {
  shots: number;                    // Total shots this team took
  shotsAgainst: number;            // Total shots opponents took
  shotsOnTarget: number;           // Total shots on target this team took
  shotsOnTargetAgainst: number;    // Total shots on target opponents took
  matches: number;
  matchDetails: Array<{
    opponent: string;
    totalShots: number;            // shots + shotsAgainst for this match
    shotsFor: number;              // Shots this team took
    shotsAgainst: number;          // Shots opponent took
    shotsOnTargetFor: number;      // Shots on target this team took
    shotsOnTargetAgainst: number;  // Shots on target opponent took
    date?: string;
    matchweek?: number;
  }>;
}

export class SupabaseShootingService {
  private shootingCache: Map<string, DetailedShootingStats> = new Map();
  private shootingCacheTime = 0;
  private readonly shootingCacheTimeout = 30 * 60 * 1000; // 30 minutes cache

  private isCacheValid(): boolean {
    return this.shootingCache.size > 0 && Date.now() - this.shootingCacheTime < this.shootingCacheTimeout;
  }

  public clearCache(): void {
    this.shootingCache.clear();
    this.shootingCacheTime = 0;
    console.log('[SupabaseShooting] Cache cleared');
  }

  /**
   * Fetch shooting data for all teams from Supabase
   */
  private async fetchShootingDataFromSupabase(): Promise<SupabaseShootingData[]> {
    console.log('[SupabaseShooting] 🔄 Fetching shooting data from Supabase...');
    
    try {
      const { data, error } = await supabase
        .from('team_shooting_stats')
        .select(`
          id,
          team_name,
          opponent,
          team_shots,
          opp_shots,
          team_shots_on_target,
          opp_shots_on_target,
          match_date,
          matchweek,
          venue
        `)
        .order('team_name')
        .order('match_date');

      if (error) {
        console.error('[SupabaseShooting] ❌ Supabase fetch error:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Supabase Error (${error.code}): ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('[SupabaseShooting] ⚠️ No shooting data found in database');
        return [];
      }

      console.log('[SupabaseShooting] ✅ Fetched shooting data:', {
        totalRecords: data.length,
        uniqueTeams: new Set(data.map(d => d.team_name)).size
      });

      // Log sample data for debugging
      console.log('[SupabaseShooting] 📊 Sample shooting data:', data.slice(0, 2));

      return data.map(row => ({
        id: row.id,
        team_name: normalizeTeamName(row.team_name),
        opponent: normalizeTeamName(row.opponent),
        team_shots: row.team_shots || 0,
        opp_shots: row.opp_shots || 0,
        team_shots_on_target: row.team_shots_on_target || 0,
        opp_shots_on_target: row.opp_shots_on_target || 0,
        match_date: row.match_date,
        matchweek: row.matchweek,
        venue: row.venue
      }));

    } catch (err) {
      console.error('[SupabaseShooting] 💥 Error fetching shooting data:', err);
      throw err;
    }
  }

  /**
   * Process raw shooting data into structured team stats
   */
  private processShootingData(rawData: SupabaseShootingData[]): Map<string, DetailedShootingStats> {
    const teamStats = new Map<string, DetailedShootingStats>();

    // Group data by team
    const teamGroups = new Map<string, SupabaseShootingData[]>();
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
      const totalShots = matches.reduce((sum, match) => sum + match.team_shots, 0);
      const totalShotsAgainst = matches.reduce((sum, match) => sum + match.opp_shots, 0);
      const totalShotsOnTarget = matches.reduce((sum, match) => sum + match.team_shots_on_target, 0);
      const totalShotsOnTargetAgainst = matches.reduce((sum, match) => sum + match.opp_shots_on_target, 0);

      // Create detailed match data
      const matchDetails = matches.map(match => ({
        opponent: match.opponent,
        totalShots: match.team_shots + match.opp_shots,
        shotsFor: match.team_shots,
        shotsAgainst: match.opp_shots,
        shotsOnTargetFor: match.team_shots_on_target,
        shotsOnTargetAgainst: match.opp_shots_on_target,
        date: match.match_date,
        matchweek: match.matchweek
      }));

      teamStats.set(teamName, {
        shots: totalShots,
        shotsAgainst: totalShotsAgainst,
        shotsOnTarget: totalShotsOnTarget,
        shotsOnTargetAgainst: totalShotsOnTargetAgainst,
        matches: matches.length,
        matchDetails
      });

      console.log(`[SupabaseShooting] ${teamName}: ${totalShots} shots, ${totalShotsOnTarget} on target (${matches.length} matches)`);
      
      // Debug: show shooting data for first match
      if (matches.length > 0) {
        const firstMatch = matches[0];
        console.log(`[SupabaseShooting] ${teamName} vs ${firstMatch.opponent}: ${firstMatch.team_shots} shots (${firstMatch.team_shots_on_target} on target)`);
      }
    });

    return teamStats;
  }

  /**
   * Get shooting statistics for all teams (main method)
   */
  async getShootingStatistics(): Promise<Map<string, DetailedShootingStats>> {
    if (this.isCacheValid()) {
      console.log('[SupabaseShooting] Using cached shooting statistics');
      return this.shootingCache;
    }

    try {
      console.log('[SupabaseShooting] Refreshing shooting statistics from Supabase...');
      
      const rawData = await this.fetchShootingDataFromSupabase();
      const processedStats = this.processShootingData(rawData);

      // Update cache
      this.shootingCache = processedStats;
      this.shootingCacheTime = Date.now();

      console.log(`[SupabaseShooting] Shooting statistics cached for ${this.shootingCache.size} teams`);
      return this.shootingCache;

    } catch (error) {
      console.error('[SupabaseShooting] Error fetching shooting statistics:', error);
      
      // Return existing cache if available, even if stale
      if (this.shootingCache.size > 0) {
        console.warn('[SupabaseShooting] Returning stale cache data due to error');
        return this.shootingCache;
      }
      
      throw error;
    }
  }

  /**
   * Get shooting statistics for a specific team
   */
  async getTeamShootingStats(teamName: string): Promise<DetailedShootingStats | null> {
    const allStats = await this.getShootingStatistics();
    return allStats.get(normalizeTeamName(teamName)) || null;
  }

  /**
   * Get shooting data for two specific teams (for match stats)
   */
  async getMatchShootingStats(homeTeam: string, awayTeam: string): Promise<{
    homeStats: DetailedShootingStats | null;
    awayStats: DetailedShootingStats | null;
  }> {
    const allStats = await this.getShootingStatistics();
    
    return {
      homeStats: allStats.get(normalizeTeamName(homeTeam)) || null,
      awayStats: allStats.get(normalizeTeamName(awayTeam)) || null
    };
  }

  /**
   * Calculate percentage of matches over a certain shots on target threshold
   */
  calculateOverPercentage(matchDetails: Array<{shotsOnTargetFor: number}>, threshold: number): number {
    if (matchDetails.length === 0) return 0;
    
    const gamesOver = matchDetails.filter(match => match.shotsOnTargetFor > threshold).length;
    const percentage = (gamesOver / matchDetails.length) * 100;
    
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate average shots per game
   */
  calculateAverage(total: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((total / matches) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get comprehensive team shooting breakdown
   */
  async getTeamShootingBreakdown(teamName: string): Promise<{
    averages: {
      shots: number;
      shotsAgainst: number;
      shotsOnTarget: number;
      shotsOnTargetAgainst: number;
      totalShots: number;
    };
    percentages: {
      over25TeamShotsOnTarget: number;   // Over 2.5 team shots on target
      over35TeamShotsOnTarget: number;   // Over 3.5 team shots on target  
      over45TeamShotsOnTarget: number;   // Over 4.5 team shots on target
      over55TeamShotsOnTarget: number;   // Over 5.5 team shots on target
    };
    matchCount: number;
    recentMatches: Array<{
      opponent: string;
      totalShots: number;
      shotsFor: number;
      shotsAgainst: number;
      shotsOnTargetFor: number;
      shotsOnTargetAgainst: number;
      date?: string;
    }>;
  } | null> {
    const shootingData = await this.getTeamShootingStats(teamName);
    
    if (!shootingData) return null;

    return {
      averages: {
        shots: this.calculateAverage(shootingData.shots, shootingData.matches),
        shotsAgainst: this.calculateAverage(shootingData.shotsAgainst, shootingData.matches),
        shotsOnTarget: this.calculateAverage(shootingData.shotsOnTarget, shootingData.matches),
        shotsOnTargetAgainst: this.calculateAverage(shootingData.shotsOnTargetAgainst, shootingData.matches),
        totalShots: this.calculateAverage(shootingData.shots + shootingData.shotsAgainst, shootingData.matches)
      },
      percentages: {
        over25TeamShotsOnTarget: this.calculateOverPercentage(shootingData.matchDetails, 2.5),
        over35TeamShotsOnTarget: this.calculateOverPercentage(shootingData.matchDetails, 3.5),
        over45TeamShotsOnTarget: this.calculateOverPercentage(shootingData.matchDetails, 4.5),
        over55TeamShotsOnTarget: this.calculateOverPercentage(shootingData.matchDetails, 5.5),
      },
      matchCount: shootingData.matches,
      recentMatches: shootingData.matchDetails.slice(0, 5).map(match => ({
        opponent: match.opponent,
        totalShots: match.totalShots,
        shotsFor: match.shotsFor,
        shotsAgainst: match.shotsAgainst,
        shotsOnTargetFor: match.shotsOnTargetFor,
        shotsOnTargetAgainst: match.shotsOnTargetAgainst,
        date: match.date
      }))
    };
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    const sampleTeams = Array.from(this.shootingCache.entries()).slice(0, 3);
    
    return {
      size: this.shootingCache.size,
      isValid: this.isCacheValid(),
      cacheTime: this.shootingCacheTime,
      lastUpdate: this.shootingCacheTime ? new Date(this.shootingCacheTime).toISOString() : null,
      teams: Array.from(this.shootingCache.keys()),
      sampleData: sampleTeams.map(([team, data]) => ({
        team,
        matches: data.matches,
        avgShots: this.calculateAverage(data.shots, data.matches),
        avgShotsOnTarget: this.calculateAverage(data.shotsOnTarget, data.matches),
        over25Percentage: this.calculateOverPercentage(data.matchDetails, 2.5)
      }))
    };
  }

  /**
   * Manual refresh for debugging/testing
   */
  async refresh(): Promise<void> {
    this.clearCache();
    await this.getShootingStatistics();
  }
}
