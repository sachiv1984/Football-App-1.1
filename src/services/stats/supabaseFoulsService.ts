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
  venue?: 'home' | 'away' | 'Home' | 'Away'; // Updated type to reflect reality
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
    isHome?: boolean;             // NEW: Track if match was at home
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

      // Create detailed match data with isHome field
      const matchDetails = matches.map(match => {
        // FIX: Convert raw venue to lowercase for reliable comparison
        const venueLower = match.venue?.toLowerCase();
        
        return {
          opponent: match.opponent,
          totalFouls: match.team_fouls + match.opp_fouls,
          foulsCommittedFor: match.team_fouls,
          foulsWonFor: match.team_fouled,
          foulsCommittedAgainst: match.opp_fouls,
          foulsWonAgainst: match.opp_fouled,
          date: match.match_date,
          matchweek: match.matchweek,
          isHome: venueLower === 'home' // ✅ FIXED: Case-insensitive check
        };
      });

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
      isHome?: boolean;
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
