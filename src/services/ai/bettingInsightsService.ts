// src/services/ai/bettingInsightsService.ts

// NOTE: These are your original, real data service imports. They remain untouched.
import { supabaseCardsService } from '../stats/supabaseCardsService';
import { supabaseCornersService } from '../stats/supabaseCornersService';
import { supabaseFoulsService } from '../stats/supabaseFoulsService';
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { supabaseShootingService } from '../stats/supabaseShootingService';

// ----------------------------------------------------------------------
// Interfaces and Enums (Taken from your original code)
// ----------------------------------------------------------------------

interface BaseMatchDetail {
  opponent: string;
  date?: string;
  isHome?: boolean; // Track home/away context
}

interface GoalsDetail extends BaseMatchDetail {
  totalGoals: number;
  bothTeamsScored: boolean;
  goalsAgainst?: number; // Added for context service
}

interface CardsMatchDetail extends BaseMatchDetail {
  cardsFor: number;
  cardsAgainst?: number; // Added for context service
}

interface CornersMatchDetail extends BaseMatchDetail {
  cornersFor: number;
  cornersAgainst?: number; // Added for context service
}

interface FoulsMatchDetail extends BaseMatchDetail {
  foulsCommittedFor: number;
  foulsCommittedAgainst?: number; // Added for context service
}

interface ShotsMatchDetail extends BaseMatchDetail {
  shotsOnTargetFor: number;
  shotsFor: number;
  shotsOnTargetAgainst?: number; // Added for context service
  shotsAgainst?: number; // Added for context service
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
  TOTAL_SHOTS = 'total_shots',
  BOTH_TEAMS_TO_SCORE = 'both_teams_to_score'
}

/**
 * Defines the comparison type for a threshold bet
 */
export enum Comparison {
    OVER = 'Over',
    UNDER = 'Under',
    OR_MORE = 'Or More'
}

interface Confidence {
    level: 'Low' | 'Medium' | 'High' | 'Very High';
    score: number;
    factors: string[];
}

/**
 * Define the reusable type for HomeAwaySupport for cleaner signature
 */
// FIX: Added 'export' to make the type visible to other modules
export type HomeAwaySupport = {
    home: { hitRate: number; matches: number; average: number };
    away: { hitRate: number; matches: number; average: number };
};

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
    isHome?: boolean;
  }>;
  context?: {
    // UPDATED: Renamed to specify the sample data
    homeAwaySupportForSample?: HomeAwaySupport; 
    // NEW: Added for the overall season data
    homeAwaySupportOverall?: HomeAwaySupport;   
    headToHeadSupport?: {
      opponent: string;
      hitRate: number;
      matches: number;
    };
    confidence?: Confidence;
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
  useOrMore?: boolean;
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
    thresholds: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13],
    minValue: 0,
    label: 'Team Shots on Target',
    useOrMore: true
  },
  [BettingMarket.TOTAL_SHOTS]: {
    thresholds: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25],
    minValue: 0,
    label: 'Team Total Shots',
    useOrMore: true
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


// ----------------------------------------------------------------------
// BettingInsightsService Implementation
// ----------------------------------------------------------------------

export class BettingInsightsService {
  private readonly ROLLING_WINDOW = 5;
  private readonly STREAK_THRESHOLD = 7;
  
  // NEW CONFIGURATION CONSTANTS
  private readonly MIN_HIT_RATE = 80; // Detect patterns with 80%+ hit rate
  private readonly MIN_SAMPLE_SIZE = 8; // Minimum matches for non-100% patterns
  
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
      
      // Use the hitRate in the key to allow different hit rates for the same market/threshold
      const key = `${insight.team}_${insight.market}_${comparisonType}_${insight.threshold}_${insight.hitRate}`;
      
      const genericKey = `${insight.team}_${insight.market}_${comparisonType}`;
      const existingInsight = mostSpecificInsights.get(genericKey);

      if (!existingInsight) {
        mostSpecificInsights.set(genericKey, insight);
      } else {
        // TIE-BREAKING LOGIC: Prioritize by (1) Hit Rate, (2) Threshold, (3) Sample Size
        let shouldReplace = false;
        
        // 1. Prioritize higher Hit Rate
        if (insight.hitRate > existingInsight.hitRate) {
            shouldReplace = true;
        } else if (insight.hitRate === existingInsight.hitRate) {
            // 2. Prioritize more specific Threshold (Over: higher, Under: lower, OR_MORE: higher)
            if (insight.comparison === Comparison.OR_MORE || insight.comparison === Comparison.OVER) {
                if (insight.threshold > existingInsight.threshold) {
                    shouldReplace = true;
                } else if (insight.threshold === existingInsight.threshold) {
                    // 3. Prioritize larger Sample Size
                    if (insight.matchesAnalyzed > existingInsight.matchesAnalyzed) {
                        shouldReplace = true;
                    }
                }
            } else if (insight.comparison === Comparison.UNDER) {
                if (insight.threshold < existingInsight.threshold) {
                    shouldReplace = true;
                } else if (insight.threshold === existingInsight.threshold) {
                    // 3. Prioritize larger Sample Size
                    if (insight.matchesAnalyzed > existingInsight.matchesAnalyzed) {
                        shouldReplace = true;
                    }
                }
            } else if (insight.comparison === 'binary') { // BTTS
                 // 3. Prioritize larger Sample Size
                if (insight.matchesAnalyzed > existingInsight.matchesAnalyzed) {
                    shouldReplace = true;
                }
            }
        }

        if (shouldReplace) {
          mostSpecificInsights.set(genericKey, insight);
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

    try {
        const results = await Promise.all(marketAnalyses);
        allInsights.push(...results.flat()); 
    } catch (error) {
        console.error('[BettingInsights] Error during market analysis:', error);
        throw new Error('Failed to complete all market analyses.');
    }
    
    // NOTE: The filterRedundantInsights method has been updated to handle the new hit rates.
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
   */
  private async analyzeGenericMarket<T extends BaseMatchDetail>(config: MarketAnalysisConfig<T>): Promise<BettingInsight[]> {
    console.log(`[BettingInsights] 📊 Analyzing ${config.label} market...`);
    const insights: BettingInsight[] = [];
    
    const allStats = await config.service.getStatistics();
    const marketConfig = MARKET_CONFIGS[config.market];

    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;

      const allValues = stats.matchDetails.map(config.valueExtractor); 
      const allMatchDetails = stats.matchDetails; // Full dataset to be passed to detectPattern
      
      for (const threshold of marketConfig.thresholds) {
        
        if (marketConfig.useOrMore) {
          // Only analyze "X or more" patterns (no UNDER for whole number markets)
          const orMorePattern = this.detectPattern(
            allValues, // Passed as full dataset
            threshold,
            teamName,
            config.market,
            `${threshold}+ ${marketConfig.label}`,
            allMatchDetails, // Passed as full dataset
            Comparison.OR_MORE
          );
          if (orMorePattern) insights.push(orMorePattern);
        } else {
          // Traditional OVER/UNDER analysis for decimal thresholds
          const baseOutcome = `${threshold} ${marketConfig.label}`;
          
          const overPattern = this.detectPattern(
            allValues, // Passed as full dataset
            threshold,
            teamName,
            config.market,
            `${Comparison.OVER} ${baseOutcome}`,
            allMatchDetails, // Passed as full dataset
            Comparison.OVER
          );
          if (overPattern) insights.push(overPattern);
          
          const underPattern = this.detectPattern(
            allValues, // Passed as full dataset
            threshold,
            teamName,
            config.market,
            `${Comparison.UNDER} ${baseOutcome}`,
            allMatchDetails, // Passed as full dataset
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
      
      // Calculate overall BTTS support from ALL games
      const isHit = (m: GoalsDetail) => m.bothTeamsScored;
      const allValues = stats.matchDetails.map(m => m.bothTeamsScored ? 1 : 0);
      
      const homeAwaySupportOverall = this.calculateHomeAwaySupport(
          stats.matchDetails,
          allValues,
          (value) => value === 1 // isHit for total games
      );

      // Detect Yes pattern
      const yesPattern = this.detectBTTSPattern(
        stats.matchDetails, 
        teamName, 
        true, 
        'Both Teams to Score - Yes',
        homeAwaySupportOverall
      );
      if (yesPattern) insights.push(yesPattern);
      
      // Detect No pattern
      const noPattern = this.detectBTTSPattern(
        stats.matchDetails, 
        teamName, 
        false, 
        'Both Teams to Score - No',
        homeAwaySupportOverall
      );
      if (noPattern) insights.push(noPattern);
    }

    return insights;
  }
  
  // ====================================================================
  // ⚡️ UPDATED CORE METHODS (Implementing 80%+ Hit Rate Logic) ⚡️
  // ====================================================================

  /**
   * UPDATED: Core pattern detection logic
   * Now detects 80%+, 90%+, and 100% patterns over different sample sizes.
   */
  private detectPattern(
    allValues: number[],
    threshold: number,
    teamName: string,
    market: BettingMarket,
    outcome: string,
    allMatchDetails: Array<{ opponent: string; date?: string; isHome?: boolean }>,
    comparison: Comparison
  ): BettingInsight | null {
    
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

    // ===== TIER 1: Check for STREAKS (7+ consecutive) - 100% hit rate required by definition =====
    let streakLength = 0;
    for (const value of allValues) {
      if (isHit(value)) {
        streakLength++;
      } else {
        break;
      }
    }
    
    if (streakLength >= this.STREAK_THRESHOLD) {
      // STREAK PATTERN FOUND
      const sampleValues = allValues.slice(0, streakLength);
      const sampleMatchDetails = allMatchDetails.slice(0, streakLength);
      
      return this.buildInsight(
        sampleValues,
        threshold,
        teamName,
        market,
        outcome,
        sampleMatchDetails,
        allValues,
        allMatchDetails,
        true, // isStreak
        comparison,
        streakLength
      );
    }
    
    // ===== TIER 2: Check ROLLING 5 for 100% hit rate =====
    const rolling5 = allValues.slice(0, this.ROLLING_WINDOW);
    const rolling5Hits = rolling5.filter(isHit).length;
    const rolling5HitRate = (rolling5Hits / rolling5.length) * 100;
    
    if (rolling5HitRate === 100) {
      // PERFECT RECENT FORM
      const sampleValues = rolling5;
      const sampleMatchDetails = allMatchDetails.slice(0, this.ROLLING_WINDOW);
      
      return this.buildInsight(
        sampleValues,
        threshold,
        teamName,
        market,
        outcome,
        sampleMatchDetails,
        allValues,
        allMatchDetails,
        false, // not a streak
        comparison,
        undefined
      );
    }
    
    // ===== TIER 3: Check LARGER SAMPLE for 80%+ hit rate (Max 20 matches) =====
    const extendedSampleCount = Math.min(20, allValues.length);
    
    if (extendedSampleCount >= this.MIN_SAMPLE_SIZE) {
      const sampleValues = allValues.slice(0, extendedSampleCount);
      const sampleHits = sampleValues.filter(isHit).length;
      const hitRate = (sampleHits / sampleValues.length) * 100;
      
      if (hitRate >= this.MIN_HIT_RATE) {
        // HIGH CONSISTENCY PATTERN (80%+)
        const sampleMatchDetails = allMatchDetails.slice(0, extendedSampleCount);
        
        return this.buildInsight(
          sampleValues,
          threshold,
          teamName,
          market,
          outcome,
          sampleMatchDetails,
          allValues,
          allMatchDetails,
          false, // not a streak
          comparison,
          undefined
        );
      }
    }
    
    // No pattern found
    return null;
  }

  /**
   * UPDATED: Detect Both Teams to Score patterns (Yes/No) - also supports non-100% patterns
   */
  private detectBTTSPattern(
    allMatchDetails: GoalsDetail[],
    teamName: string,
    targetHit: boolean,
    outcomeLabel: string,
    homeAwaySupportOverall: HomeAwaySupport | undefined
  ): BettingInsight | null {
    
    const isHit = (m: GoalsDetail) => m.bothTeamsScored === targetHit;
    
    // 1. Check for streak
    let streakLength = 0;
    for (const match of allMatchDetails) {
      if (isHit(match)) {
        streakLength++;
      } else {
        break;
      }
    }

    // 2. Check rolling 5 for 100%
    const rolling = allMatchDetails.slice(0, this.ROLLING_WINDOW);
    const rollingHits = rolling.filter(isHit).length;
    const rollingHitRate = (rollingHits / rolling.length) * 100;

    // 3. Check larger sample for 80%+ (Max 15 matches for BTTS)
    const extendedSampleCount = Math.min(15, allMatchDetails.length);
    let analyzedMatches: GoalsDetail[];
    let actualHitRate: number;
    let isStreak = false;
    
    if (streakLength >= this.STREAK_THRESHOLD) {
      // Streak found
      analyzedMatches = allMatchDetails.slice(0, streakLength);
      actualHitRate = 100;
      isStreak = true;
    } else if (rollingHitRate === 100) {
      // Perfect recent form
      analyzedMatches = rolling;
      actualHitRate = 100;
    } else if (extendedSampleCount >= this.MIN_SAMPLE_SIZE) {
      // Check extended sample
      const sample = allMatchDetails.slice(0, extendedSampleCount);
      const hits = sample.filter(isHit).length;
      const hitRate = (hits / sample.length) * 100;
      
      if (hitRate >= this.MIN_HIT_RATE) {
        analyzedMatches = sample;
        actualHitRate = Math.round(hitRate);
      } else {
        return null; // No pattern
      }
    } else {
      return null; // No pattern
    }
    
    // Build the insight
    const sampleValues = analyzedMatches!.map(m => m.bothTeamsScored ? 1 : 0);
    const homeAwaySupportForSample = this.calculateHomeAwaySupport(
        analyzedMatches!,
        sampleValues,
        (value) => value === 1
    );
    
    const confidence = this.calculateConfidenceScore(
        sampleValues,
        0.5,
        'binary',
        homeAwaySupportForSample,
        actualHitRate! // Pass actual hit rate
    );

    return {
      team: teamName,
      market: BettingMarket.BOTH_TEAMS_TO_SCORE,
      outcome: outcomeLabel,
      hitRate: actualHitRate!, // NOW VARIABLE
      matchesAnalyzed: analyzedMatches!.length,
      isStreak,
      streakLength: isStreak ? streakLength : undefined,
      threshold: 0.5,
      averageValue: targetHit ? 1 : 0,
      comparison: 'binary',
      recentMatches: analyzedMatches!.map(m => ({
        opponent: m.opponent,
        value: m.bothTeamsScored ? 1 : 0,
        hit: isHit(m),
        date: m.date,
        isHome: m.isHome 
      })),
      context: {
        homeAwaySupportForSample,
        homeAwaySupportOverall,
        confidence
      }
    };
  }

  /**
   * UPDATED: Build insight object with all relevant data
   */
  private buildInsight(
    sampleValues: number[], // Sample values (streak/rolling 5/extended sample)
    threshold: number,
    teamName: string,
    market: BettingMarket,
    outcome: string,
    sampleMatchDetails: Array<{ opponent: string; date?: string; isHome?: boolean }>, // Sample details
    allValues: number[], // Full season values
    allMatchDetails: Array<{ opponent: string; date?: string; isHome?: boolean }>, // Full season details
    isStreak: boolean,
    comparison: Comparison,
    streakLength?: number
  ): BettingInsight {
    const avgValue = sampleValues.reduce((sum, v) => sum + v, 0) / sampleValues.length;
    
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

    // CALCULATE ACTUAL HIT RATE (now variable 80%-100%)
    const hits = sampleValues.filter(isHit).length;
    const actualHitRate = Math.round((hits / sampleValues.length) * 100);

    // 1. Calculate Home/Away Support for the SAMPLE
    const homeAwaySupportForSample = this.calculateHomeAwaySupport(
        sampleMatchDetails,
        sampleValues,
        isHit
    );

    // 2. Calculate Home/Away Support for ALL GAMES
    const homeAwaySupportOverall = this.calculateHomeAwaySupport(
        allMatchDetails,
        allValues,
        isHit
    );

    // 3. Calculate Confidence using the SAMPLE data
    const confidence = this.calculateConfidenceScore(
        sampleValues,
        threshold,
        comparison,
        homeAwaySupportForSample, // Pass the sample split to confidence
        actualHitRate // PASS ACTUAL HIT RATE
    );

    // 4. Build the final Insight object
    return {
      team: teamName,
      market,
      outcome,
      hitRate: actualHitRate,
      matchesAnalyzed: sampleValues.length,
      isStreak,
      streakLength,
      threshold,
      comparison,
      averageValue: Math.round(avgValue * 100) / 100,
      recentMatches: sampleValues.map((value, idx) => ({
        opponent: sampleMatchDetails[idx]?.opponent || 'Unknown',
        value,
        hit: isHit(value),
        date: sampleMatchDetails[idx]?.date,
        isHome: sampleMatchDetails[idx]?.isHome, 
      })),
      context: {
          homeAwaySupportForSample: homeAwaySupportForSample,
          homeAwaySupportOverall: homeAwaySupportOverall,
          confidence: confidence 
      }
    };
  }

  /**
   * Helper to calculate Home/Away Support for a given set of match details (full or sample).
   */
  private calculateHomeAwaySupport(
    matchDetails: Array<{ opponent: string; date?: string; isHome?: boolean }>,
    values: number[],
    isHit: (value: number) => boolean
  ): HomeAwaySupport | undefined {

    const combinedData = matchDetails.map((detail, idx) => ({
      ...detail,
      value: values[idx],
      hit: isHit(values[idx]!)
    })).filter(d => d.isHome !== undefined); 

    const homeHits = combinedData.filter(d => d.isHome && d.hit).length;
    const awayHits = combinedData.filter(d => !d.isHome && d.hit).length;
    const totalHome = combinedData.filter(d => d.isHome).length;
    const totalAway = combinedData.filter(d => !d.isHome).length;
    
    const homeValues = combinedData.filter(d => d.isHome).map(d => d.value!);
    const awayValues = combinedData.filter(d => !d.isHome).map(d => d.value!);

    const avgHome = homeValues.length > 0 ? homeValues.reduce((s, v) => s + v, 0) / homeValues.length : 0;
    const avgAway = awayValues.length > 0 ? awayValues.reduce((s, v) => s + v, 0) / awayValues.length : 0;
    
    return (totalHome > 0 || totalAway > 0) ? {
      home: { 
        hitRate: totalHome > 0 ? Math.round((homeHits / totalHome) * 100) : 0, 
        matches: totalHome,
        average: Math.round(avgHome * 100) / 100
      },
      away: { 
        hitRate: totalAway > 0 ? Math.round((awayHits / totalAway) * 100) : 0, 
        matches: totalAway,
        average: Math.round(avgAway * 100) / 100
      }
    } : undefined;
  }

  /**
   * UPDATED: Calculates a detailed confidence score now considering the actual hit rate.
   */
  private calculateConfidenceScore(
    values: number[],
    threshold: number,
    comparison: Comparison | 'binary',
    homeAwaySupportForSample?: HomeAwaySupport,
    hitRate: number = 100 // NEW PARAMETER
  ): Confidence {
    const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
    
    let baseScore = 0;
    let factors: string[] = [];

    // 1. HIT RATE SCORE (30 points max)
    if (hitRate === 100) {
      baseScore += 30;
      factors.push('Perfect Hit Rate (100%) in sample.');
    } else if (hitRate >= 90) {
      baseScore += 25;
      factors.push(`Excellent Hit Rate (${hitRate}%) in sample.`);
    } else if (hitRate >= 85) {
      baseScore += 20;
      factors.push(`Very Good Hit Rate (${hitRate}%) in sample.`);
    } else if (hitRate >= 80) {
      baseScore += 15;
      factors.push(`Good Hit Rate (${hitRate}%) in sample.`);
    } else {
      // Should not hit this branch based on detection logic, but as a fallback:
      baseScore += 10;
      factors.push(`Moderate Hit Rate (${hitRate}%) in sample.`);
    }

    // 2. Base Score based on Average Value proximity (40 points max)
    if (comparison === Comparison.OVER || comparison === Comparison.OR_MORE) {
        const valueDifference = avgValue - threshold;
        const maxExpectedDifference = 3.0;
        
        baseScore += Math.min(40, Math.round((valueDifference / maxExpectedDifference) * 40));

        if (avgValue >= threshold + 1.5) {
            factors.push(`Team average (${avgValue.toFixed(1)}) significantly exceeds threshold.`);
        }
    } 
    else if (comparison === Comparison.UNDER) {
        const valueDifference = threshold - avgValue;
        const maxExpectedDifference = 3.0;
        
        baseScore += Math.min(40, Math.round((valueDifference / maxExpectedDifference) * 40));
        
        if (avgValue <= threshold - 1.5) {
            factors.push(`Team average (${avgValue.toFixed(1)}) is well below threshold.`);
        }
    } else if (comparison === 'binary') {
        baseScore += 20;
    }

    // 3. Match Volume Bonus (15 points max)
    if (values.length >= 15) {
      baseScore += 15;
      factors.push(`Large sample size (${values.length} matches).`);
    } else if (values.length >= 10) {
      baseScore += 10;
      factors.push(`Good sample size (${values.length} matches).`);
    } else if (values.length >= 7) {
      baseScore += 5;
      factors.push(`Adequate sample size (${values.length} matches).`);
    }

    // 4. Home/Away Support (15 points max)
    let homeAwayBonus = 0;
    if (homeAwaySupportForSample) {
        const { home, away } = homeAwaySupportForSample;
        
        // Both venues strong
        if (home.matches > 0 && away.matches > 0 && home.hitRate >= 80 && away.hitRate >= 80) {
            homeAwayBonus = 15;
            factors.push('Strong consistency at both home and away venues.');
        } 
        // One venue excellent
        else if (home.matches > 0 && home.hitRate >= 90 || away.matches > 0 && away.hitRate >= 90) {
             homeAwayBonus = 10;
             factors.push(`Excellent hit rate at ${home.hitRate >= 90 ? 'Home' : 'Away'} venue.`);
        }
        // One venue good
        else if (home.matches > 0 && home.hitRate >= 80 || away.matches > 0 && away.hitRate >= 80) {
             homeAwayBonus = 5;
             factors.push(`Good hit rate at ${home.hitRate >= 80 ? 'Home' : 'Away'} venue.`);
        }
    }
    baseScore += homeAwayBonus;

    let finalScore = Math.min(100, Math.max(0, baseScore));

    // 5. PENALTIES
    
    // Penalty for hit rate below 90% in small samples (rolling 5-9)
    if (hitRate < 90 && values.length < 10) {
      finalScore -= 10;
      factors.push('Small sample size with non-perfect hit rate reduces confidence.');
    }
    
    // Penalty for proximity to threshold
    const proximityTolerance = (comparison === Comparison.OVER || comparison === Comparison.OR_MORE) 
        ? avgValue - threshold 
        : threshold - avgValue;
        
    if (proximityTolerance < 0.2 && comparison !== 'binary') { 
        finalScore = Math.max(finalScore - 20, 15);
        factors.push('Average value too close to threshold (fragile pattern).');
    }

    let level: Confidence['level'];
    if (finalScore >= 80) level = 'Very High';
    else if (finalScore >= 60) level = 'High';
    else if (finalScore >= 40) level = 'Medium';
    else level = 'Low';

    return {
        level,
        score: finalScore,
        factors: Array.from(new Set(factors))
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
