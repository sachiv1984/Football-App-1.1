// src/services/stats/supabaseGoalsService.ts
import { supabase } from '../supabaseClient';
import { normalizeTeamName } from '../../utils/teamUtils';

export interface SupabaseGoalData {
  id: string;
  team_name: string;
  opponent: string;
  goals_for: number;
  goals_against: number;
  match_date?: string;
  matchweek?: number;
  venue?: 'home' | 'away' | 'Home' | 'Away'; // Updated type to reflect reality
}

export interface DetailedGoalStats {
  goalsFor: number;              // Total goals this team scored
  goalsAgainst: number;          // Total goals conceded
  matches: number;
  matchDetails: Array<{
    opponent: string;
    totalGoals: number;          // goalsFor + goalsAgainst for this match
    goalsFor: number;            // Goals this team scored
    goalsAgainst: number;        // Goals this team conceded
    bothTeamsScored: boolean;    // Did both teams score?
    date?: string;
    matchweek?: number;
    isHome?: boolean;            // NEW: Track if match was at home
    teamCleanSheet: boolean;     // 👈 FIX: ADDED
    opponentCleanSheet: boolean; // 👈 FIX: ADDED
  }>;
}

export class SupabaseGoalsService {
  private goalsCache: Map<string, DetailedGoalStats> = new Map();
  private goalsCacheTime = 0;
  private readonly goalsCacheTimeout = 30 * 60 * 1000; // 30 minutes cache

  private isCacheValid(): boolean {
    return this.goalsCache.size > 0 && Date.now() - this.goalsCacheTime < this.goalsCacheTimeout;
  }

  public clearCache(): void {
    this.goalsCache.clear();
    this.goalsCacheTime = 0;
    console.log('[SupabaseGoals] Cache cleared');
  }

  /**
   * Fetch goal data for all teams from Supabase (from shooting stats table)
   */
  private async fetchGoalDataFromSupabase(): Promise<SupabaseGoalData[]> {
    console.log('[SupabaseGoals] 🔄 Fetching goal data from Supabase...');
    
    try {
      const { data, error } = await supabase
        .from('team_shooting_stats')
        .select(`
          id,
          team_name,
          opponent,
          goals_for,
          goals_against,
          match_date,
          matchweek,
          venue
        `)
        .order('team_name')
        .order('match_date');

      if (error) {
        console.error('[SupabaseGoals] ❌ Supabase fetch error:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Supabase Error (${error.code}): ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('[SupabaseGoals] ⚠️ No goal data found in database');
        return [];
      }

      console.log('[SupabaseGoals] ✅ Fetched goal data:', {
        totalRecords: data.length,
        uniqueTeams: new Set(data.map(d => d.team_name)).size
      });

      return data.map(row => ({
        id: row.id,
        team_name: normalizeTeamName(row.team_name),
        opponent: normalizeTeamName(row.opponent),
        goals_for: row.goals_for || 0,
        goals_against: row.goals_against || 0,
        match_date: row.match_date,
        matchweek: row.matchweek,
        venue: row.venue // Raw value is fetched
      }));

    } catch (err) {
      console.error('[SupabaseGoals] 💥 Error fetching goal data:', err);
      throw err;
    }
  }

  /**
   * Process raw goal data into structured team stats
   */
  private processGoalData(rawData: SupabaseGoalData[]): Map<string, DetailedGoalStats> {
    const teamStats = new Map<string, DetailedGoalStats>();

    // Group data by team
    const teamGroups = new Map<string, SupabaseGoalData[]>();
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
      const totalGoalsFor = matches.reduce((sum, match) => sum + match.goals_for, 0);
      const totalGoalsAgainst = matches.reduce((sum, match) => sum + match.goals_against, 0);

      // Create detailed match data with isHome field
      const matchDetails = matches.map(match => {
        // FIX: Convert raw venue to lowercase for reliable comparison
        const venueLower = match.venue?.toLowerCase(); 

        // 🎯 FIX: Calculate Clean Sheet flags
        const teamCleanSheet = match.goals_against === 0;
        const opponentCleanSheet = match.goals_for === 0;

        return {
          opponent: match.opponent,
          totalGoals: match.goals_for + match.goals_against,
          goalsFor: match.goals_for,
          goalsAgainst: match.goals_against,
          bothTeamsScored: match.goals_for > 0 && match.goals_against > 0,
          date: match.match_date,
          matchweek: match.matchweek,
          isHome: venueLower === 'home', // ✅ Fixed: Case-insensitive check
          teamCleanSheet,                // 👈 FIX: Added to match interface
          opponentCleanSheet             // 👈 FIX: Added to match interface
        };
      });

      teamStats.set(teamName, {
        goalsFor: totalGoalsFor,
        goalsAgainst: totalGoalsAgainst,
        matches: matches.length,
        matchDetails
      });

      console.log(`[SupabaseGoals] ${teamName}: ${totalGoalsFor} goals for, ${totalGoalsAgainst} against (${matches.length} matches)`);
      
      // Debug: show goal data for first match
      if (matches.length > 0) {
        const firstMatch = matches[0];
        console.log(`[SupabaseGoals] ${teamName} vs ${firstMatch.opponent} (${firstMatch.venue}): ${firstMatch.goals_for}-${firstMatch.goals_against}`);
      }
    });

    return teamStats;
  }

  /**
   * Get goal statistics for all teams (main method)
   */
  async getGoalStatistics(): Promise<Map<string, DetailedGoalStats>> {
    if (this.isCacheValid()) {
      console.log('[SupabaseGoals] Using cached goal statistics');
      return this.goalsCache;
    }

    try {
      console.log('[SupabaseGoals] Refreshing goal statistics from Supabase...');
      
      const rawData = await this.fetchGoalDataFromSupabase();
      const processedStats = this.processGoalData(rawData);

      // Update cache
      this.goalsCache = processedStats;
      this.goalsCacheTime = Date.now();

      console.log(`[SupabaseGoals] Goal statistics cached for ${this.goalsCache.size} teams`);
      return this.goalsCache;

    } catch (error) {
      console.error('[SupabaseGoals] Error fetching goal statistics:', error);
      
      // Return existing cache if available, even if stale
      if (this.goalsCache.size > 0) {
        console.warn('[SupabaseGoals] Returning stale cache data due to error');
        return this.goalsCache;
      }
      
      throw error;
    }
  }

  /**
   * Get goal statistics for a specific team
   */
  async getTeamGoalStats(teamName: string): Promise<DetailedGoalStats | null> {
    const allStats = await this.getGoalStatistics();
    return allStats.get(normalizeTeamName(teamName)) || null;
  }

  /**
   * Get goal data for two specific teams (for match stats)
   */
  async getMatchGoalStats(homeTeam: string, awayTeam: string): Promise<{
    homeStats: DetailedGoalStats | null;
    awayStats: DetailedGoalStats | null;
  }> {
    const allStats = await this.getGoalStatistics();
    
    return {
      homeStats: allStats.get(normalizeTeamName(homeTeam)) || null,
      awayStats: allStats.get(normalizeTeamName(awayTeam)) || null
    };
  }

  /**
   * Calculate percentage of matches over a certain goal threshold
   */
  calculateOverPercentage(matchDetails: Array<{totalGoals: number}>, threshold: number): number {
    if (matchDetails.length === 0) return 0;
    
    const gamesOver = matchDetails.filter(match => match.totalGoals > threshold).length;
    const percentage = (gamesOver / matchDetails.length) * 100;
    
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate Both Teams to Score percentage
   */
  calculateBothTeamsToScorePercentage(matchDetails: Array<{bothTeamsScored: boolean}>): number {
    if (matchDetails.length === 0) return 0;
    
    const bttsGames = matchDetails.filter(match => match.bothTeamsScored).length;
    const percentage = (bttsGames / matchDetails.length) * 100;
    
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate average goals per game
   */
  calculateAverage(total: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((total / matches) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get comprehensive team goal breakdown
   */
  async getTeamGoalBreakdown(teamName: string): Promise<{
    averages: {
      goalsFor: number;
      goalsAgainst: number;
      totalGoals: number;
    };
    percentages: {
      over15MatchGoals: number;      // Over 1.5 match goals
      over25MatchGoals: number;      // Over 2.5 match goals
      over35MatchGoals: number;      // Over 3.5 match goals
      bothTeamsToScore: number;      // Both teams to score %
    };
    matchCount: number;
    recentMatches: Array<{
      opponent: string;
      totalGoals: number;
      goalsFor: number;
      goalsAgainst: number;
      bothTeamsScored: boolean;
      date?: string;
      isHome?: boolean;
    }>;
  } | null> {
    const goalData = await this.getTeamGoalStats(teamName);
    
    if (!goalData) return null;

    return {
      averages: {
        goalsFor: this.calculateAverage(goalData.goalsFor, goalData.matches),
        goalsAgainst: this.calculateAverage(goalData.goalsAgainst, goalData.matches),
        totalGoals: this.calculateAverage(goalData.goalsFor + goalData.goalsAgainst, goalData.matches)
      },
      percentages: {
        over15MatchGoals: this.calculateOverPercentage(goalData.matchDetails, 1.5),
        over25MatchGoals: this.calculateOverPercentage(goalData.matchDetails, 2.5),
        over35MatchGoals: this.calculateOverPercentage(goalData.matchDetails, 3.5),
        bothTeamsToScore: this.calculateBothTeamsToScorePercentage(goalData.matchDetails),
      },
      matchCount: goalData.matches,
      recentMatches: goalData.matchDetails.slice(0, 5).map(match => ({
        opponent: match.opponent,
        totalGoals: match.totalGoals,
        goalsFor: match.goalsFor,
        goalsAgainst: match.goalsAgainst,
        bothTeamsScored: match.bothTeamsScored,
        date: match.date,
        isHome: match.isHome
      }))
    };
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    const sampleTeams = Array.from(this.goalsCache.entries()).slice(0, 3);
    
    return {
      size: this.goalsCache.size,
      isValid: this.isCacheValid(),
      cacheTime: this.goalsCacheTime,
      lastUpdate: this.goalsCacheTime ? new Date(this.goalsCacheTime).toISOString() : null,
      teams: Array.from(this.goalsCache.keys()),
      sampleData: sampleTeams.map(([team, data]) => ({
        team,
        matches: data.matches,
        avgGoalsFor: this.calculateAverage(data.goalsFor, data.matches),
        avgGoalsAgainst: this.calculateAverage(data.goalsAgainst, data.matches),
        over25Percentage: this.calculateOverPercentage(data.matchDetails, 2.5),
        bttsPercentage: this.calculateBothTeamsToScorePercentage(data.matchDetails)
      }))
    };
  }

  /**
   * Manual refresh for debugging/testing
   */
  async refresh(): Promise<void> {
    this.clearCache();
    await this.getGoalStatistics();
  }
}

export const supabaseGoalsService = new SupabaseGoalsService();
