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
  venue?: 'home' | 'away';
}

export interface DetailedGoalStats {
  goalsFor: number;           // Total goals scored
  goalsAgainst: number;       // Total goals conceded
  matches: number;
  matchDetails: Array<{
    opponent: string;
    totalGoals: number;       // goalsFor + goalsAgainst for this match
    goalsFor: number;
    goalsAgainst: number;
    bothTeamsScored: boolean;
    date?: string;
    matchweek?: number;
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
   * Fetch goal data for all teams from Supabase
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
        console.error('[SupabaseGoals] ❌ Supabase fetch error:', error);
        throw new Error(`Supabase Error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('[SupabaseGoals] ⚠️ No goal data found in database');
        return [];
      }

      console.log('[SupabaseGoals] ✅ Fetched goal data:', {
        totalRecords: data.length,
        uniqueTeams: new Set(data.map(d => d.team_name)).size
      });

      console.log('[SupabaseGoals] 📊 Sample goal data:', data.slice(0, 2));

      return data.map(row => ({
        id: row.id,
        team_name: normalizeTeamName(row.team_name),
        opponent: normalizeTeamName(row.opponent),
        goals_for: row.goals_for || 0,
        goals_against: row.goals_against || 0,
        match_date: row.match_date,
        matchweek: row.matchweek,
        venue: row.venue
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
    const teamGroups = new Map<string, SupabaseGoalData[]>();

    rawData.forEach(row => {
      const team = row.team_name;
      if (!teamGroups.has(team)) teamGroups.set(team, []);
      teamGroups.get(team)!.push(row);
    });

    teamGroups.forEach((matches, teamName) => {
      // Sort matches by date (most recent first)
      matches.sort((a, b) => (b.match_date && a.match_date ? new Date(b.match_date).getTime() - new Date(a.match_date).getTime() : 0));

      const totalGoalsFor = matches.reduce((sum, m) => sum + m.goals_for, 0);
      const totalGoalsAgainst = matches.reduce((sum, m) => sum + m.goals_against, 0);

      const matchDetails = matches.map(m => ({
        opponent: m.opponent,
        totalGoals: m.goals_for + m.goals_against,
        goalsFor: m.goals_for,
        goalsAgainst: m.goals_against,
        bothTeamsScored: m.goals_for > 0 && m.goals_against > 0,
        date: m.match_date,
        matchweek: m.matchweek
      }));

      teamStats.set(teamName, {
        goalsFor: totalGoalsFor,
        goalsAgainst: totalGoalsAgainst,
        matches: matches.length,
        matchDetails
      });

      console.log(`[SupabaseGoals] ${teamName}: ${totalGoalsFor} goals for, ${totalGoalsAgainst} against (${matches.length} matches)`);
      if (matches.length > 0) {
        const firstMatch = matches[0];
        console.log(`[SupabaseGoals] ${teamName} vs ${firstMatch.opponent}: ${firstMatch.goals_for}-${firstMatch.goals_against}`);
      }
    });

    return teamStats;
  }

  /**
   * Get goal statistics for all teams
   */
  async getGoalStatistics(): Promise<Map<string, DetailedGoalStats>> {
    if (this.isCacheValid()) {
      console.log('[SupabaseGoals] Using cached goal statistics');
      return this.goalsCache;
    }

    try {
      console.log('[SupabaseGoals] Refreshing goal statistics from Supabase...');
      const rawData = await this.fetchGoalDataFromSupabase();
      const processed = this.processGoalData(rawData);

      this.goalsCache = processed;
      this.goalsCacheTime = Date.now();

      console.log(`[SupabaseGoals] Goal statistics cached for ${this.goalsCache.size} teams`);
      return this.goalsCache;
    } catch (error) {
      console.error('[SupabaseGoals] Error fetching goal statistics:', error);
      if (this.goalsCache.size > 0) {
        console.warn('[SupabaseGoals] Returning stale cache data due to error');
        return this.goalsCache;
      }
      throw error;
    }
  }

  async getTeamGoalStats(teamName: string): Promise<DetailedGoalStats | null> {
    const allStats = await this.getGoalStatistics();
    return allStats.get(normalizeTeamName(teamName)) || null;
  }

  async getMatchGoalStats(homeTeam: string, awayTeam: string) {
    const allStats = await this.getGoalStatistics();
    return {
      homeStats: allStats.get(normalizeTeamName(homeTeam)) || null,
      awayStats: allStats.get(normalizeTeamName(awayTeam)) || null
    };
  }

  calculateOverPercentage(matchDetails: Array<{ totalGoals: number }>, threshold: number): number {
    if (!matchDetails.length) return 0;
    const over = matchDetails.filter(m => m.totalGoals > threshold).length;
    return Math.round((over / matchDetails.length) * 10000) / 100;
  }

  calculateBothTeamsToScorePercentage(matchDetails: Array<{ bothTeamsScored: boolean }>): number {
    if (!matchDetails.length) return 0;
    const over = matchDetails.filter(m => m.bothTeamsScored).length;
    return Math.round((over / matchDetails.length) * 10000) / 100;
  }

  calculateAverage(total: number, matches: number): number {
    if (!matches) return 0;
    return Math.round((total / matches) * 100) / 100;
  }

  async getTeamGoalBreakdown(teamName: string) {
    const stats = await this.getTeamGoalStats(teamName);
    if (!stats) return null;

    return {
      averages: {
        goalsFor: this.calculateAverage(stats.goalsFor, stats.matches),
        goalsAgainst: this.calculateAverage(stats.goalsAgainst, stats.matches),
        totalGoals: this.calculateAverage(stats.goalsFor + stats.goalsAgainst, stats.matches)
      },
      percentages: {
        over15MatchGoals: this.calculateOverPercentage(stats.matchDetails, 1.5),
        over25MatchGoals: this.calculateOverPercentage(stats.matchDetails, 2.5),
        over35MatchGoals: this.calculateOverPercentage(stats.matchDetails, 3.5),
        bothTeamsToScore: this.calculateBothTeamsToScorePercentage(stats.matchDetails)
      },
      matchCount: stats.matches,
      recentMatches: stats.matchDetails.slice(0, 5)
    };
  }

  getCacheStatus() {
    const sample = Array.from(this.goalsCache.entries()).slice(0, 3);
    return {
      size: this.goalsCache.size,
      isValid: this.isCacheValid(),
      cacheTime: this.goalsCacheTime,
      lastUpdate: this.goalsCacheTime ? new Date(this.goalsCacheTime).toISOString() : null,
      teams: Array.from(this.goalsCache.keys()),
      sampleData: sample.map(([team, data]) => ({
        team,
        matches: data.matches,
        avgGoalsFor: this.calculateAverage(data.goalsFor, data.matches),
        avgGoalsAgainst: this.calculateAverage(data.goalsAgainst, data.matches),
        over25Percentage: this.calculateOverPercentage(data.matchDetails, 2.5),
        bttsPercentage: this.calculateBothTeamsToScorePercentage(data.matchDetails)
      }))
    };
  }

  async refresh() {
    this.clearCache();
    await this.getGoalStatistics();
  }
}

export const supabaseGoalsService = new SupabaseGoalsService();
