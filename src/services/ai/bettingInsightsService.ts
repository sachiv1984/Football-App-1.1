// src/services/stats/bettingInsightsService.ts

import { supabaseCardsService } from '../stats/supabaseCardsService';
import { supabaseCornersService } from '../stats/supabaseCornersService';
import { supabaseFoulsService } from '../stats/supabaseFoulsService';
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { supabaseShootingService } from '../stats/supabaseShootingService';

interface BaseMatchDetail {
  opponent: string;
  date?: string;
  isHome?: boolean; // NEW: Track home/away context
}

interface GoalsDetail extends BaseMatchDetail {
  totalGoals: number;
  bothTeamsScored: boolean;
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
  shotsFor: number; // Added for total shots market
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
  TOTAL_SHOTS = 'total_shots', // NEW: Total shots market
  BOTH_TEAMS_TO_SCORE = 'both_teams_to_score'
}

/**
 * Defines the comparison type for a threshold bet
 */
export enum Comparison {
    OVER = 'Over',
    UNDER = 'Under',
    OR_MORE = 'Or More' // NEW: For whole number markets (3+ shots)
}

export interface BettingInsight {
  team: string;
  market: BettingMarket;
  outcome: string;
  hitRate: number;
  matchesAnalyzed: number;
  isStreak: boolean;
  streakLength?: number;
  threshold: number;
  averageValue: number;
  comparison: Comparison | 'binary';
  recentMatches: Array<{
    opponent: string;
    value: number;
    hit: boolean;
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
interface MarketConfig {
  thresholds: number[];
  minValue: number;
  label: string;
  useOrMore?: boolean; // Optional flag for "or more" logic
}

const MARKET_CONFIGS: Record<BettingMarket, MarketConfig> = {
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
    thresholds: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], // UPDATED: Whole numbers only
    minValue: 0,
    label: 'Team Shots on Target',
    useOrMore: true // NEW: Flag for "or more" logic
  },
  [BettingMarket.TOTAL_SHOTS]: {
    thresholds: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25], // NEW
    minValue: 0,
    label: 'Team Total Shots',
    useOrMore: true // NEW: Flag for "or more" logic
  },
  [BettingMarket.BOTH_TEAMS_TO_SCORE]: {
    thresholds: [0.5],
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
      label: 'shots on target'
    },
    // NEW: Total shots market
    {
      market: BettingMarket.TOTAL_SHOTS,
      service: { getStatistics: () => supabaseShootingService.getShootingStatistics() },
      valueExtractor: (m: ShotsMatchDetail) => m.shotsFor,
      label: 'total shots'
    }
  ];

  /**
   * Helper function to filter out redundant patterns (Max Specificity Principle).
   */
  private filterRedundantInsights(insights: BettingInsight[]): BettingInsight[] {
    const mostSpecificInsights = new Map<string, BettingInsight>();

    for (const insight of insights) {
      const comparisonType = insight.comparison === 'binary' 
        ? insight.outcome.includes('Yes') ? 'YES' : 'NO'
        : insight.comparison;
      
      const key = `${insight.team}_${insight.market}_${comparisonType}`;
      const existingInsight = mostSpecificInsights.get(key);

      if (!existingInsight) {
        mostSpecificInsights.set(key, insight);
      } else {
        // For OR_MORE comparisons, keep the highest threshold
        if (insight.comparison === Comparison.OR_MORE) {
          const shouldReplace = insight.threshold > existingInsight.threshold;
          if (shouldReplace) {
            mostSpecificInsights.set(key, insight);
          }
        } 
        // For OVER/UNDER comparisons (unchanged logic)
        else if (insight.comparison !== 'binary') {
          let shouldReplace = false;

          if (insight.comparison === Comparison.OVER) {
            shouldReplace = insight.threshold > existingInsight.threshold;
          } else if (insight.comparison === Comparison.UNDER) {
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
    
    const marketAnalyses = this.MARKET_ANALYSIS_CONFIGS.map(
      config => this.analyzeGenericMarket(config as any)
    );
    
    marketAnalyses.push(this.analyzeBTTSMarket()); 

    const results = await Promise.all(marketAnalyses);
    allInsights.push(...results.flat()); 
    
    const finalInsights = this.filterRedundantInsights(allInsights);

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
   * UPDATED: Handles both OVER/UNDER markets and OR_MORE markets
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
        // Check if this market uses "or more" logic (whole numbers)
        if (marketConfig.useOrMore) {
          // Only analyze "X or more" patterns (no UNDER for whole number markets)
          const orMorePattern = this.detectPattern(
            values,
            threshold,
            teamName,
            config.market,
            `${threshold}+ ${marketConfig.label}`,
            stats.matchDetails,
            Comparison.OR_MORE
          );
          if (orMorePattern) insights.push(orMorePattern);
        } else {
          // Traditional OVER/UNDER analysis for decimal thresholds
          const baseOutcome = `${threshold} ${marketConfig.label}`;
          
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
      
      const yesPattern = this.detectBTTSPattern(
        stats.matchDetails, 
        teamName, 
        true, 
        'Both Teams to Score - Yes'
      );
      if (yesPattern) insights.push(yesPattern);
      
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
   * UPDATED: Handles OVER, UNDER, and OR_MORE comparisons
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
    
    // Define the hit condition based on comparison type
    const isHit = (value: number) => {
      if (comparison === Comparison.OVER) {
        return value > threshold;
      } else if (comparison === Comparison.UNDER) {
        return value < threshold;
      } else if (comparison === Comparison.OR_MORE) {
        // For "X or more" bets, value must be >= threshold
        return value >= threshold;
      }
      return false;
    };

    // Check for streaks (7+ consecutive matches)
    let streakLength = 0;
    for (const value of values) {
      if (isHit(value)) {
        streakLength++;
      } else {
        break;
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
        false,
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
    targetHit: boolean,
    outcomeLabel: string
  ): BettingInsight | null {
    
    const isHit = (m: GoalsDetail) => m.bothTeamsScored === targetHit;

    let streakLength = 0;
    for (const match of matchDetails) {
      if (isHit(match)) {
        streakLength++;
      } else {
        break;
      }
    }

    const rolling = matchDetails.slice(0, this.ROLLING_WINDOW);
    const rollingHits = rolling.filter(isHit).length;
    const rollingHitRate = (rollingHits / rolling.length) * 100;

    if (streakLength >= this.STREAK_THRESHOLD || rollingHitRate === 100) {
      const isStreak = streakLength >= this.STREAK_THRESHOLD;
      
      const analyzedMatches = isStreak 
        ? matchDetails.slice(0, streakLength)
        : rolling;

      return {
        team: teamName,
        market: BettingMarket.BOTH_TEAMS_TO_SCORE,
        outcome: outcomeLabel,
        hitRate: 100,
        matchesAnalyzed: analyzedMatches.length,
        isStreak: isStreak,
        streakLength: isStreak ? streakLength : undefined,
        threshold: 0.5,
        averageValue: 1,
        comparison: 'binary',
        recentMatches: analyzedMatches.map(m => ({
          opponent: m.opponent,
          value: m.bothTeamsScored ? 1 : 0,
          hit: isHit(m),
          date: m.date
        }))
      };
    }

    return null;
  }

  /**
   * Build insight object with all relevant data
   * UPDATED: Handles OR_MORE comparison
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
    
    const isHit = (value: number) => {
      if (comparison === Comparison.OVER) {
        return value > threshold;
      } else if (comparison === Comparison.UNDER) {
        return value < threshold;
      } else if (comparison === Comparison.OR_MORE) {
        return value >= threshold;
      }
      return false;
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
      comparison,
      averageValue: Math.round(avgValue * 100) / 100,
      recentMatches: values.map((value, idx) => ({
        opponent: matchDetails[idx]?.opponent || 'Unknown',
        value,
        hit: isHit(value),
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
