// src/services/stats/bettingInsightsService.ts
import { supabaseCardsService } from './supabaseCardsService';
import { supabaseCornersService } from './supabaseCornersService';
import { supabaseFoulsService } from './supabaseFoulsService';
import { supabaseGoalsService } from './supabaseGoalsService';
import { supabaseShootingService } from './supabaseShootingService';

/**
 * Betting market categories mapped to available data
 */
export enum BettingMarket {
  CARDS = 'cards',
  CORNERS = 'corners',
  FOULS = 'fouls',
  GOALS = 'goals',
  SHOTS_ON_TARGET = 'shots_on_target',
  BOTH_TEAMS_TO_SCORE = 'both_teams_to_score'
}

export interface BettingInsight {
  team: string;
  market: BettingMarket;
  outcome: string;                    // e.g., "Over 1.5 Team Cards"
  hitRate: number;                    // 100 for rolling basis
  matchesAnalyzed: number;            // Rolling window size (5 or streak length)
  isStreak: boolean;                  // True if 7+ matches
  streakLength?: number;              // If isStreak, how many consecutive matches
  threshold: number;                  // The line being analyzed (e.g., 1.5)
  averageValue: number;               // Average stat value in period
  recentMatches: Array<{
    opponent: string;
    value: number;                    // Actual stat value
    hit: boolean;                     // Did it hit the threshold?
    date?: string;
  }>;
  context?: {
    homeAwaySupport?: {
      home: { hitRate: number; matches: number };
      away: { hitRate: number; matches: number };
    };
    headToHeadSupport?: {
      opponent: string;
      hitRate: number;
      matches: number;
    };
  };
}

export interface InsightsResponse {
  insights: BettingInsight[];
  timestamp: string;
  teamsAnalyzed: number;
  totalPatterns: number;
}

/**
 * Configuration for betting markets and their thresholds
 */
const MARKET_CONFIGS = {
  [BettingMarket.CARDS]: {
    thresholds: [0.5, 1.5, 2.5, 3.5],
    minValue: 0,
    label: 'Team Cards'
  },
  [BettingMarket.CORNERS]: {
    thresholds: [3.5, 4.5, 5.5, 6.5],
    minValue: 0,
    label: 'Team Corners'
  },
  [BettingMarket.FOULS]: {
    thresholds: [8.5, 9.5, 10.5, 11.5],
    minValue: 0,
    label: 'Team Fouls Committed'
  },
  [BettingMarket.GOALS]: {
    thresholds: [0.5, 1.5, 2.5],
    minValue: 0,
    label: 'Match Goals'
  },
  [BettingMarket.SHOTS_ON_TARGET]: {
    thresholds: [2.5, 3.5, 4.5, 5.5],
    minValue: 0,
    label: 'Team Shots on Target'
  },
  [BettingMarket.BOTH_TEAMS_TO_SCORE]: {
    thresholds: [0.5], // Binary: BTTS yes/no
    minValue: 0,
    label: 'Both Teams to Score'
  }
};

export class BettingInsightsService {
  private readonly ROLLING_WINDOW = 5;
  private readonly STREAK_THRESHOLD = 7;

  /**
   * Main method: Get all betting insights for all teams
   */
  async getAllInsights(): Promise<InsightsResponse> {
    console.log('[BettingInsights] 🎯 Starting insights analysis...');
    
    const allInsights: BettingInsight[] = [];
    
    // Analyze each market
    const cardsInsights = await this.analyzeCardsMarket();
    const cornersInsights = await this.analyzeCornersMarket();
    const foulsInsights = await this.analyzeFoulsMarket();
    const goalsInsights = await this.analyzeGoalsMarket();
    const shotsInsights = await this.analyzeShotsMarket();
    
    allInsights.push(
      ...cardsInsights,
      ...cornersInsights,
      ...foulsInsights,
      ...goalsInsights,
      ...shotsInsights
    );

    // Count unique teams
    const uniqueTeams = new Set(allInsights.map(i => i.team));

    console.log('[BettingInsights] ✅ Analysis complete:', {
      totalInsights: allInsights.length,
      teamsAnalyzed: uniqueTeams.size
    });

    return {
      insights: allInsights,
      timestamp: new Date().toISOString(),
      teamsAnalyzed: uniqueTeams.size,
      totalPatterns: allInsights.length
    };
  }

  /**
   * Get insights for a specific team
   */
  async getTeamInsights(teamName: string): Promise<BettingInsight[]> {
    const allInsights = await this.getAllInsights();
    return allInsights.insights.filter(
      insight => insight.team.toLowerCase() === teamName.toLowerCase()
    );
  }

  /**
   * Get insights for a specific market across all teams
   */
  async getMarketInsights(market: BettingMarket): Promise<BettingInsight[]> {
    const allInsights = await this.getAllInsights();
    return allInsights.insights.filter(insight => insight.market === market);
  }

  /**
   * Analyze cards market for all teams
   */
  private async analyzeCardsMarket(): Promise<BettingInsight[]> {
    console.log('[BettingInsights] 📊 Analyzing cards market...');
    const insights: BettingInsight[] = [];
    const allStats = await supabaseCardsService.getCardStatistics();

    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;

      const config = MARKET_CONFIGS[BettingMarket.CARDS];
      
      for (const threshold of config.thresholds) {
        const pattern = this.detectPattern(
          stats.matchDetails.map(m => m.cardsFor),
          threshold,
          teamName,
          BettingMarket.CARDS,
          `Over ${threshold} ${config.label}`,
          stats.matchDetails
        );

        if (pattern) {
          insights.push(pattern);
        }
      }
    }

    console.log(`[BettingInsights] Found ${insights.length} cards patterns`);
    return insights;
  }

  /**
   * Analyze corners market for all teams
   */
  private async analyzeCornersMarket(): Promise<BettingInsight[]> {
    console.log('[BettingInsights] 📊 Analyzing corners market...');
    const insights: BettingInsight[] = [];
    const allStats = await supabaseCornersService.getCornerStatistics();

    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;

      const config = MARKET_CONFIGS[BettingMarket.CORNERS];
      
      for (const threshold of config.thresholds) {
        const pattern = this.detectPattern(
          stats.matchDetails.map(m => m.cornersFor),
          threshold,
          teamName,
          BettingMarket.CORNERS,
          `Over ${threshold} ${config.label}`,
          stats.matchDetails
        );

        if (pattern) {
          insights.push(pattern);
        }
      }
    }

    console.log(`[BettingInsights] Found ${insights.length} corners patterns`);
    return insights;
  }

  /**
   * Analyze fouls market for all teams
   */
  private async analyzeFoulsMarket(): Promise<BettingInsight[]> {
    console.log('[BettingInsights] 📊 Analyzing fouls market...');
    const insights: BettingInsight[] = [];
    const allStats = await supabaseFoulsService.getFoulStatistics();

    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;

      const config = MARKET_CONFIGS[BettingMarket.FOULS];
      
      for (const threshold of config.thresholds) {
        const pattern = this.detectPattern(
          stats.matchDetails.map(m => m.foulsCommittedFor),
          threshold,
          teamName,
          BettingMarket.FOULS,
          `Over ${threshold} ${config.label}`,
          stats.matchDetails
        );

        if (pattern) {
          insights.push(pattern);
        }
      }
    }

    console.log(`[BettingInsights] Found ${insights.length} fouls patterns`);
    return insights;
  }

  /**
   * Analyze goals market for all teams
   */
  private async analyzeGoalsMarket(): Promise<BettingInsight[]> {
    console.log('[BettingInsights] 📊 Analyzing goals market...');
    const insights: BettingInsight[] = [];
    const allStats = await supabaseGoalsService.getGoalStatistics();

    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;

      const config = MARKET_CONFIGS[BettingMarket.GOALS];
      
      // Match goals (total goals in the match)
      for (const threshold of config.thresholds) {
        const pattern = this.detectPattern(
          stats.matchDetails.map(m => m.totalGoals),
          threshold,
          teamName,
          BettingMarket.GOALS,
          `Over ${threshold} ${config.label}`,
          stats.matchDetails
        );

        if (pattern) {
          insights.push(pattern);
        }
      }

      // Both Teams to Score
      const bttsPattern = this.detectBTTSPattern(stats.matchDetails, teamName);
      if (bttsPattern) {
        insights.push(bttsPattern);
      }
    }

    console.log(`[BettingInsights] Found ${insights.length} goals patterns`);
    return insights;
  }

  /**
   * Analyze shots on target market for all teams
   */
  private async analyzeShotsMarket(): Promise<BettingInsight[]> {
    console.log('[BettingInsights] 📊 Analyzing shots market...');
    const insights: BettingInsight[] = [];
    const allStats = await supabaseShootingService.getShootingStatistics();

    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;

      const config = MARKET_CONFIGS[BettingMarket.SHOTS_ON_TARGET];
      
      for (const threshold of config.thresholds) {
        const pattern = this.detectPattern(
          stats.matchDetails.map(m => m.shotsOnTargetFor),
          threshold,
          teamName,
          BettingMarket.SHOTS_ON_TARGET,
          `Over ${threshold} ${config.label}`,
          stats.matchDetails
        );

        if (pattern) {
          insights.push(pattern);
        }
      }
    }

    console.log(`[BettingInsights] Found ${insights.length} shots patterns`);
    return insights;
  }

  /**
   * Core pattern detection logic
   * Returns insight only if hit rate is 100% in rolling window OR 7+ streak
   */
  private detectPattern(
    values: number[],
    threshold: number,
    teamName: string,
    market: BettingMarket,
    outcome: string,
    matchDetails: Array<{ opponent: string; date?: string }>
  ): BettingInsight | null {
    // Check rolling 5 matches (most recent)
    const rolling = values.slice(0, this.ROLLING_WINDOW);
    const rollingHits = rolling.filter(v => v > threshold).length;
    const rollingHitRate = (rollingHits / rolling.length) * 100;

    // Check for streaks (7+ consecutive matches)
    let streakLength = 0;
    for (const value of values) {
      if (value > threshold) {
        streakLength++;
      } else {
        break; // Streak broken
      }
    }

    // Only return if 100% hit rate in rolling window OR 7+ streak
    if (rollingHitRate === 100) {
      return this.buildInsight(
        rolling,
        threshold,
        teamName,
        market,
        outcome,
        matchDetails.slice(0, this.ROLLING_WINDOW),
        false,
        streakLength >= this.STREAK_THRESHOLD ? streakLength : undefined
      );
    }

    if (streakLength >= this.STREAK_THRESHOLD) {
      return this.buildInsight(
        values.slice(0, streakLength),
        threshold,
        teamName,
        market,
        outcome,
        matchDetails.slice(0, streakLength),
        true,
        streakLength
      );
    }

    return null;
  }

  /**
   * Detect Both Teams to Score patterns
   */
  private detectBTTSPattern(
    matchDetails: Array<{ bothTeamsScored: boolean; opponent: string; date?: string }>,
    teamName: string
  ): BettingInsight | null {
    const rolling = matchDetails.slice(0, this.ROLLING_WINDOW);
    const rollingHits = rolling.filter(m => m.bothTeamsScored).length;
    const rollingHitRate = (rollingHits / rolling.length) * 100;

    // Check for streaks
    let streakLength = 0;
    for (const match of matchDetails) {
      if (match.bothTeamsScored) {
        streakLength++;
      } else {
        break;
      }
    }

    if (rollingHitRate === 100 || streakLength >= this.STREAK_THRESHOLD) {
      const analyzedMatches = streakLength >= this.STREAK_THRESHOLD 
        ? matchDetails.slice(0, streakLength)
        : rolling;

      return {
        team: teamName,
        market: BettingMarket.BOTH_TEAMS_TO_SCORE,
        outcome: 'Both Teams to Score - Yes',
        hitRate: 100,
        matchesAnalyzed: analyzedMatches.length,
        isStreak: streakLength >= this.STREAK_THRESHOLD,
        streakLength: streakLength >= this.STREAK_THRESHOLD ? streakLength : undefined,
        threshold: 0.5,
        averageValue: 1, // BTTS is binary
        recentMatches: analyzedMatches.map(m => ({
          opponent: m.opponent,
          value: m.bothTeamsScored ? 1 : 0,
          hit: m.bothTeamsScored,
          date: m.date
        }))
      };
    }

    return null;
  }

  /**
   * Build insight object with all relevant data
   */
  private buildInsight(
    values: number[],
    threshold: number,
    teamName: string,
    market: BettingMarket,
    outcome: string,
    matchDetails: Array<{ opponent: string; date?: string }>,
    isStreak: boolean,
    streakLength?: number
  ): BettingInsight {
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;

    return {
      team: teamName,
      market,
      outcome,
      hitRate: 100,
      matchesAnalyzed: values.length,
      isStreak,
      streakLength,
      threshold,
      averageValue: Math.round(avgValue * 100) / 100,
      recentMatches: values.map((value, idx) => ({
        opponent: matchDetails[idx]?.opponent || 'Unknown',
        value,
        hit: value > threshold,
        date: matchDetails[idx]?.date
      }))
    };
  }

  /**
   * Filter insights by minimum streak length
   */
  filterByStreak(insights: BettingInsight[], minStreak: number = 7): BettingInsight[] {
    return insights.filter(i => i.isStreak && (i.streakLength ?? 0) >= minStreak);
  }

  /**
   * Filter insights by market
   */
  filterByMarket(insights: BettingInsight[], market: BettingMarket): BettingInsight[] {
    return insights.filter(i => i.market === market);
  }

  /**
   * Sort insights by streak length (longest first)
   */
  sortByStreak(insights: BettingInsight[]): BettingInsight[] {
    return [...insights].sort((a, b) => {
      const aStreak = a.streakLength ?? 0;
      const bStreak = b.streakLength ?? 0;
      return bStreak - aStreak;
    });
  }

  /**
   * Get cache status from all services
   */
  getCacheStatus() {
    return {
      cards: supabaseCardsService.getCacheStatus(),
      corners: supabaseCornersService.getCacheStatus(),
      fouls: supabaseFoulsService.getCacheStatus(),
      goals: supabaseGoalsService.getCacheStatus(),
      shooting: supabaseShootingService.getCacheStatus()
    };
  }
}

export const bettingInsightsService = new BettingInsightsService();
