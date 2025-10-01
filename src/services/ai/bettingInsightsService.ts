// src/services/stats/bettingInsightsService.ts

import { supabaseCardsService } from '../stats/supabaseCardsService';
import { supabaseCornersService } from '../stats/supabaseCornersService';
import { supabaseFoulsService } from '../stats/supabaseFoulsService';
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { supabaseShootingService } from '../stats/supabaseShootingService';

interface BaseMatchDetail {
  opponent: string;
  date?: string;
}

interface GoalsDetail extends BaseMatchDetail {
  totalGoals: number;
  bothTeamsScored: boolean; // Used in detectBTTSPattern
}

interface CardsMatchDetail extends BaseMatchDetail {
  cardsFor: number;
}

interface CornersMatchDetail extends BaseMatchDetail {
  cornersFor: number;
}

interface FoulsMatchDetail extends BaseMatchDetail {
  foulsCommittedFor: number;
}

interface ShotsMatchDetail extends BaseMatchDetail {
  shotsOnTargetFor: number;
}

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

/**
 * Defines the comparison type for a threshold bet (Over/Under)
 */
export enum Comparison {
    OVER = 'Over',
    UNDER = 'Under'
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
  comparison: Comparison | 'binary';  // Added for filtering/redundancy check
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

/**
 * Configuration type for generic analysis loop
 */
interface MarketAnalysisConfig<T> {
  market: BettingMarket;
  service: { getStatistics: () => Promise<Map<string, { matches: number, matchDetails: T[] }>> };
  valueExtractor: (detail: T) => number;
  label: string;
}

/**
 * Define a specific Union Type for the configuration array
 */
type AllMarketConfigs = 
    | MarketAnalysisConfig<CardsMatchDetail>
    | MarketAnalysisConfig<CornersMatchDetail>
    | MarketAnalysisConfig<FoulsMatchDetail>
    | MarketAnalysisConfig<GoalsDetail>
    | MarketAnalysisConfig<ShotsMatchDetail>;


export class BettingInsightsService {
  private readonly ROLLING_WINDOW = 5;
  private readonly STREAK_THRESHOLD = 7;

  /**
   * Consolidated market analysis configurations for the generic loop.
   */
  private readonly MARKET_ANALYSIS_CONFIGS: AllMarketConfigs[] = [
    {
      market: BettingMarket.CARDS,
      service: { getStatistics: () => supabaseCardsService.getCardStatistics() },
      valueExtractor: (m: CardsMatchDetail) => m.cardsFor,
      label: 'cards'
    },
    {
      market: BettingMarket.CORNERS,
      service: { getStatistics: () => supabaseCornersService.getCornerStatistics() },
      valueExtractor: (m: CornersMatchDetail) => m.cornersFor,
      label: 'corners'
    },
    {
      market: BettingMarket.FOULS,
      service: { getStatistics: () => supabaseFoulsService.getFoulStatistics() },
      valueExtractor: (m: FoulsMatchDetail) => m.foulsCommittedFor,
      label: 'fouls'
    },
    {
      market: BettingMarket.GOALS,
      service: { getStatistics: () => supabaseGoalsService.getGoalStatistics() },
      valueExtractor: (m: GoalsDetail) => m.totalGoals,
      label: 'goals'
    },
    {
      market: BettingMarket.SHOTS_ON_TARGET,
      service: { getStatistics: () => supabaseShootingService.getShootingStatistics() },
      valueExtractor: (m: ShotsMatchDetail) => m.shotsOnTargetFor,
      label: 'shots'
    }
  ];

  /**
   * Helper function to filter out redundant patterns (Max Specificity Principle).
   * * FIX: Made BTTS key more robust by using explicit 'YES'/'NO' instead of the full outcome string.
   */
  private filterRedundantInsights(insights: BettingInsight[]): BettingInsight[] {
    // Key: 'TeamName_Market_Comparison(OVER/UNDER/YES/NO)'
    const mostSpecificInsights = new Map<string, BettingInsight>();

    for (const insight of insights) {
      const comparisonType = insight.comparison === 'binary' 
        ? insight.outcome.includes('Yes') ? 'YES' : 'NO' // R-FIX: Use 'YES'/'NO' for robustness
        : insight.comparison;
      
      const key = `${insight.team}_${insight.market}_${comparisonType}`;
      const existingInsight = mostSpecificInsights.get(key);

      if (!existingInsight) {
        // First pattern for this team/market/comparison combination
        mostSpecificInsights.set(key, insight);
      } else {
        // Only run logic for threshold markets (OVER/UNDER)
        if (insight.comparison !== 'binary') {
          let shouldReplace = false;

          if (insight.comparison === Comparison.OVER) {
            // Keep the one with the highest threshold (most specific OVER bet)
            shouldReplace = insight.threshold > existingInsight.threshold;
          } else if (insight.comparison === Comparison.UNDER) {
            // Keep the one with the lowest threshold (most specific UNDER bet)
            shouldReplace = insight.threshold < existingInsight.threshold;
          }
          
          if (shouldReplace) {
            mostSpecificInsights.set(key, insight);
          }
        }
      }
    }

    return Array.from(mostSpecificInsights.values());
  }

  /**
   * Main method: Get all betting insights for all teams
   */
  async getAllInsights(): Promise<InsightsResponse> {
    console.log('[BettingInsights] 🎯 Starting insights analysis...');
    
    const allInsights: BettingInsight[] = [];
    
    // FIX: Using `as any` to bypass the strict compiler check on the union type 
    // and allow T to be inferred correctly within the generic function call for each iteration.
    const marketAnalyses = this.MARKET_ANALYSIS_CONFIGS.map(
      config => this.analyzeGenericMarket(config as any)
    );
    
    // Handle the special BTTS market separately
    marketAnalyses.push(this.analyzeBTTSMarket()); 

    const results = await Promise.all(marketAnalyses);
    allInsights.push(...results.flat()); 
    
    const finalInsights = this.filterRedundantInsights(allInsights);

    // Count unique teams
    const uniqueTeams = new Set(finalInsights.map(i => i.team));

    console.log('[BettingInsights] ✅ Analysis complete:', {
      totalInsights: finalInsights.length,
      teamsAnalyzed: uniqueTeams.size
    });

    return {
      insights: finalInsights,
      timestamp: new Date().toISOString(),
      teamsAnalyzed: uniqueTeams.size,
      totalPatterns: finalInsights.length
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
   * Generic method to analyze standard threshold markets
   */
  private async analyzeGenericMarket<T extends BaseMatchDetail>(config: MarketAnalysisConfig<T>): Promise<BettingInsight[]> {
    console.log(`[BettingInsights] 📊 Analyzing ${config.label} market...`);
    const insights: BettingInsight[] = [];
    
    const allStats = await config.service.getStatistics();
    const marketConfig = MARKET_CONFIGS[config.market];

    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;

      const values = stats.matchDetails.map(config.valueExtractor); 
      
      for (const threshold of marketConfig.thresholds) {
        const baseOutcome = `${threshold} ${marketConfig.label}`;
        
        // 1. Detect OVER pattern
        const overPattern = this.detectPattern(
          values,
          threshold,
          teamName,
          config.market,
          `${Comparison.OVER} ${baseOutcome}`,
          stats.matchDetails,
          Comparison.OVER
        );
        if (overPattern) insights.push(overPattern);
        
        // 2. Detect UNDER pattern
        const underPattern = this.detectPattern(
          values,
          threshold,
          teamName,
          config.market,
          `${Comparison.UNDER} ${baseOutcome}`,
          stats.matchDetails,
          Comparison.UNDER
        );
        if (underPattern) insights.push(underPattern);
      }
    }

    console.log(`[BettingInsights] Found ${insights.length} ${config.label} patterns`);
    return insights;
  }
  
  /**
   * Dedicated method for BTTS analysis (Yes/No).
   */
  private async analyzeBTTSMarket(): Promise<BettingInsight[]> {
    console.log('[BettingInsights] 📊 Analyzing Both Teams to Score market...');
    const insights: BettingInsight[] = [];
    const allStats = await supabaseGoalsService.getGoalStatistics();

    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;
      
      // 1. BTTS - YES (Condition: bothTeamsScored is true)
      const yesPattern = this.detectBTTSPattern(
        stats.matchDetails, 
        teamName, 
        true, 
        'Both Teams to Score - Yes'
      );
      if (yesPattern) insights.push(yesPattern);
      
      // 2. BTTS - NO (Condition: bothTeamsScored is false)
      const noPattern = this.detectBTTSPattern(
        stats.matchDetails, 
        teamName, 
        false, 
        'Both Teams to Score - No'
      );
      if (noPattern) insights.push(noPattern);
    }

    return insights;
  }
  
  /**
   * Core pattern detection logic
   * * FIX: Logic updated to prioritize a streak (7+ matches) over the rolling 5-match window.
   */
  private detectPattern(
    values: number[],
    threshold: number,
    teamName: string,
    market: BettingMarket,
    outcome: string,
    matchDetails: Array<{ opponent: string; date?: string }>,
    comparison: Comparison
  ): BettingInsight | null {
    
    // Define the hit condition
    const isHit = (value: number) => {
      // OVER is v > threshold, UNDER is v < threshold
      return comparison === Comparison.OVER ? value > threshold : value < threshold;
    };

    // Check for streaks (7+ consecutive matches)
    let streakLength = 0;
    for (const value of values) {
      if (isHit(value)) {
        streakLength++;
      } else {
        break; // Streak broken
      }
    }
    
    // 1. PRIORITIZE: Return the insight if a 7+ streak is found
    if (streakLength >= this.STREAK_THRESHOLD) {
      return this.buildInsight(
        values.slice(0, streakLength),
        threshold,
        teamName,
        market,
        outcome,
        matchDetails.slice(0, streakLength),
        true,
        comparison,
        streakLength
      );
    }

    // 2. FALLBACK: Check rolling 5 matches (most recent) for 100% hit rate
    const rolling = values.slice(0, this.ROLLING_WINDOW);
    const rollingHits = rolling.filter(isHit).length;
    const rollingHitRate = (rollingHits / rolling.length) * 100;

    if (rollingHitRate === 100) {
      return this.buildInsight(
        rolling,
        threshold,
        teamName,
        market,
        outcome,
        matchDetails.slice(0, this.ROLLING_WINDOW),
        false, // Not an official STREAK_THRESHOLD streak
        comparison,
        undefined
      );
    }

    return null;
  }

  /**
   * Detect Both Teams to Score patterns (Yes/No)
   */
  private detectBTTSPattern(
    matchDetails: GoalsDetail[],
    teamName: string,
    targetHit: boolean, // true for YES, false for NO
    outcomeLabel: string
  ): BettingInsight | null {
    
    const isHit = (m: GoalsDetail) => m.bothTeamsScored === targetHit;

    // Check for streaks
    let streakLength = 0;
    for (const match of matchDetails) {
      if (isHit(match)) {
        streakLength++;
      } else {
        break;
      }
    }

    // Check rolling 5 matches (most recent)
    const rolling = matchDetails.slice(0, this.ROLLING_WINDOW);
    const rollingHits = rolling.filter(isHit).length;
    const rollingHitRate = (rollingHits / rolling.length) * 100;

    // Prioritize streak, then check rolling window
    if (streakLength >= this.STREAK_THRESHOLD || rollingHitRate === 100) {
      const isStreak = streakLength >= this.STREAK_THRESHOLD;
      
      const analyzedMatches = isStreak 
        ? matchDetails.slice(0, streakLength) // Use streak window
        : rolling; // Use rolling window

      return {
        team: teamName,
        market: BettingMarket.BOTH_TEAMS_TO_SCORE,
        outcome: outcomeLabel,
        hitRate: 100,
        matchesAnalyzed: analyzedMatches.length,
        isStreak: isStreak,
        streakLength: isStreak ? streakLength : undefined,
        threshold: 0.5, // Arbitrary threshold for binary market
        averageValue: 1, // BTTS is binary, average is 1 if it hits
        comparison: 'binary', // Indicate this is a binary market
        recentMatches: analyzedMatches.map(m => ({
          opponent: m.opponent,
          value: m.bothTeamsScored ? 1 : 0, // 1 for Yes, 0 for No
          hit: isHit(m), // Use the specific hit condition
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
    comparison: Comparison,
    streakLength?: number
  ): BettingInsight {
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    // Condition for hit check (used in recentMatches mapping)
    const isHit = (value: number) => {
        return comparison === Comparison.OVER ? value > threshold : value < threshold;
    };

    return {
      team: teamName,
      market,
      outcome,
      hitRate: 100,
      matchesAnalyzed: values.length,
      isStreak,
      streakLength,
      threshold,
      comparison, // Include comparison type
      averageValue: Math.round(avgValue * 100) / 100,
      recentMatches: values.map((value, idx) => ({
        opponent: matchDetails[idx]?.opponent || 'Unknown',
        value,
        hit: isHit(value), // Use the comparison-aware hit check
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
