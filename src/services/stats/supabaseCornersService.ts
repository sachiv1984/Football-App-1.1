// src/services/stats/supabaseCornersService.ts
import { supabase } from '../supabaseClient';
import { normalizeTeamName } from '../../utils/teamUtils';

export interface SupabaseCornerData {
  id: string;
  team_name: string;
  opponent: string;
  team_corner_kicks: number;
  opp_corner_kicks: number;
  match_date?: string;
  matchweek?: number;
  venue?: 'home' | 'away' | 'Home' | 'Away'; // Updated type to reflect reality
}

export interface DetailedCornerStats {
  corners: number;
  cornersAgainst: number;
  matches: number;
  matchDetails: Array<{
    opponent: string;
    totalCorners: number;
    cornersFor: number;
    cornersAgainst: number;
    date?: string;
    matchweek?: number;
    isHome?: boolean;        // NEW: Track if match was at home
  }>;
}

export class SupabaseCornersService {
  private cornersCache: Map<string, DetailedCornerStats> = new Map();
  private cornersCacheTime = 0;
  private readonly cornersCacheTimeout = 30 * 60 * 1000; // 30 minutes cache

  private isCacheValid(): boolean {
    return this.cornersCache.size > 0 && Date.now() - this.cornersCacheTime < this.cornersCacheTimeout;
  }

  public clearCache(): void {
    this.cornersCache.clear();
    this.cornersCacheTime = 0;
    console.log('[SupabaseCorners] Cache cleared');
  }

  /**
   * Fetch corner data for all teams from Supabase
   */
  private async fetchCornerDataFromSupabase(): Promise<SupabaseCornerData[]> {
    console.log('[SupabaseCorners] 🔄 Fetching corner data from Supabase...');
    
    try {
      const { data, error } = await supabase
        .from('team_passing_types_stats')
        .select(`
          id,
          team_name,
          opponent,
          team_corner_kicks,
          opp_corner_kicks,
          match_date,
          matchweek,
          venue
        `)
        .order('team_name')
        .order('match_date');

      if (error) {
        console.error('[SupabaseCorners] ❌ Supabase fetch error:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Supabase Error (${error.code}): ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('[SupabaseCorners] ⚠️ No corner data found in database');
        return [];
      }

      console.log('[SupabaseCorners] ✅ Fetched corner data:', {
        totalRecords: data.length,
        uniqueTeams: new Set(data.map(d => d.team_name)).size
      });

      // Log sample data for debugging
      console.log('[SupabaseCorners] 📊 Sample corner data:', data.slice(0, 2));

      return data.map(row => ({
        id: row.id,
        team_name: normalizeTeamName(row.team_name),
        opponent: normalizeTeamName(row.opponent),
        team_corner_kicks: row.team_corner_kicks || 0,
        opp_corner_kicks: row.opp_corner_kicks || 0,
        match_date: row.match_date,
        matchweek: row.matchweek,
        venue: row.venue
      }));

    } catch (err) {
      console.error('[SupabaseCorners] 💥 Error fetching corner data:', err);
      throw err;
    }
  }

  /**
   * Process raw corner data into structured team stats
   */
  private processCornerData(rawData: SupabaseCornerData[]): Map<string, DetailedCornerStats> {
    const teamStats = new Map<string, DetailedCornerStats>();

    // Group data by team
    const teamGroups = new Map<string, SupabaseCornerData[]>();
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
      const totalCorners = matches.reduce((sum, match) => sum + match.team_corner_kicks, 0);
      const totalCornersAgainst = matches.reduce((sum, match) => sum + match.opp_corner_kicks, 0);

      // Create detailed match data with isHome field
      const matchDetails = matches.map(match => {
        // FIX: Convert raw venue to lowercase for reliable comparison
        const venueLower = match.venue?.toLowerCase();

        return {
          opponent: match.opponent,
          totalCorners: match.team_corner_kicks + match.opp_corner_kicks,
          cornersFor: match.team_corner_kicks,
          cornersAgainst: match.opp_corner_kicks,
          date: match.match_date,
          matchweek: match.matchweek,
          isHome: venueLower === 'home' // ✅ FIXED: Case-insensitive check
        };
      });

      teamStats.set(teamName, {
        corners: totalCorners,
        cornersAgainst: totalCornersAgainst,
        matches: matches.length,
        matchDetails
      });

      console.log(`[SupabaseCorners] ${teamName}: ${totalCorners} corners, ${totalCornersAgainst} against (${matches.length} matches)`);
      
      // Debug: show corner data for first match
      if (matches.length > 0) {
        const firstMatch = matches[0];
        console.log(`[SupabaseCorners] ${teamName} vs ${firstMatch.opponent} (${firstMatch.venue}): ${firstMatch.team_corner_kicks} corners`);
      }
    });

    return teamStats;
  }

  /**
   * Get corner statistics for all teams (main method)
   */
  async getCornerStatistics(): Promise<Map<string, DetailedCornerStats>> {
    if (this.isCacheValid()) {
      console.log('[SupabaseCorners] Using cached corner statistics');
      return this.cornersCache;
    }

    try {
      console.log('[SupabaseCorners] Refreshing corner statistics from Supabase...');
      
      const rawData = await this.fetchCornerDataFromSupabase();
      const processedStats = this.processCornerData(rawData);

      // Update cache
      this.cornersCache = processedStats;
      this.cornersCacheTime = Date.now();

      console.log(`[SupabaseCorners] Corner statistics cached for ${this.cornersCache.size} teams`);
      return this.cornersCache;

    } catch (error) {
      console.error('[SupabaseCorners] Error fetching corner statistics:', error);
      
      // Return existing cache if available, even if stale
      if (this.cornersCache.size > 0) {
        console.warn('[SupabaseCorners] Returning stale cache data due to error');
        return this.cornersCache;
      }
      
      throw error;
    }
  }

  /**
   * Get corner statistics for a specific team
   */
  async getTeamCornerStats(teamName: string): Promise<DetailedCornerStats | null> {
    const allStats = await this.getCornerStatistics();
    return allStats.get(normalizeTeamName(teamName)) || null;
  }

  /**
   * Get corner data for two specific teams (for match stats)
   */
  async getMatchCornerStats(homeTeam: string, awayTeam: string): Promise<{
    homeStats: DetailedCornerStats | null;
    awayStats: DetailedCornerStats | null;
  }> {
    const allStats = await this.getCornerStatistics();
    
    return {
      homeStats: allStats.get(normalizeTeamName(homeTeam)) || null,
      awayStats: allStats.get(normalizeTeamName(awayTeam)) || null
    };
  }

  /**
   * Calculate percentage of matches over a certain corner threshold
   */
  calculateOverPercentage(matchDetails: Array<{totalCorners: number}>, threshold: number): number {
    if (matchDetails.length === 0) return 0;
    
    const gamesOver = matchDetails.filter(match => match.totalCorners > threshold).length;
    const percentage = (gamesOver / matchDetails.length) * 100;
    
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate average corners per game
   */
  calculateAverage(total: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((total / matches) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get comprehensive team corner breakdown
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
      date?: string;
      isHome?: boolean;
    }>;
  } | null> {
    const cornerData = await this.getTeamCornerStats(teamName);
    
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
      recentMatches: cornerData.matchDetails.slice(0, 5)
    };
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    const sampleTeams = Array.from(this.cornersCache.entries()).slice(0, 3);
    
    return {
      size: this.cornersCache.size,
      isValid: this.isCacheValid(),
      cacheTime: this.cornersCacheTime,
      lastUpdate: this.cornersCacheTime ? new Date(this.cornersCacheTime).toISOString() : null,
      teams: Array.from(this.cornersCache.keys()),
      sampleData: sampleTeams.map(([team, data]) => ({
        team,
        matches: data.matches,
        avgCornersFor: this.calculateAverage(data.corners, data.matches),
        avgCornersAgainst: this.calculateAverage(data.cornersAgainst, data.matches),
        over75Percentage: this.calculateOverPercentage(data.matchDetails, 7.5)
      }))
    };
  }

  /**
   * Manual refresh for debugging/testing
   */
  async refresh(): Promise<void> {
    this.clearCache();
    await this.getCornerStatistics();
  }
}

export const supabaseCornersService = new SupabaseCornersService();
