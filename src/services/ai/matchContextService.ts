// src/services/ai/bettingInsightsService.ts

import { supabaseCardsService } from '../stats/supabaseCardsService';
import { supabaseCornersService } from '../stats/supabaseCornersService';
import { supabaseFoulsService } from '../stats/supabaseFoulsService';
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { supabaseShootingService } from '../stats/supabaseShootingService';
import { fbrefFixtureService, MatchResultDetail } from '../fixtures/fbrefFixtureService'; 

// ----------------------------------------------------------------------
// Interfaces and Enums 
// ----------------------------------------------------------------------

interface BaseMatchDetail {
  opponent: string;
  date?: string;
  isHome?: boolean; 
}

interface GoalsDetail extends BaseMatchDetail {
  totalGoals: number; // Redundant, but required to match source interface
  goalsFor: number;   // Goals SCORED BY THE TEAM being analyzed.
  goalsAgainst: number;
  bothTeamsScored: boolean;
}

interface CardsMatchDetail extends BaseMatchDetail {
  cardsFor: number;
  cardsAgainst?: number;
}

interface CornersMatchDetail extends BaseMatchDetail {
  cornersFor: number;
  cornersAgainst?: number;
}

interface FoulsMatchDetail extends BaseMatchDetail {
  foulsCommittedFor: number;
  foulsCommittedAgainst?: number;
}

interface ShotsMatchDetail extends BaseMatchDetail {
  shotsOnTargetFor: number;
  shotsFor: number;
  shotsOnTargetAgainst?: number;
  shotsAgainst?: number;
}

/**
 * Betting market categories mapped to available data
 */
export enum BettingMarket {
  CARDS = 'cards',
  CORNERS = 'corners',
  FOULS = 'fouls',
  TEAM_GOALS = 'team_goals', // Team-specific goals
  SHOTS_ON_TARGET = 'shots_on_target',
  TOTAL_SHOTS = 'total_shots',
  BOTH_TEAMS_TO_SCORE = 'both_teams_to_score',
  MATCH_RESULT = 'match_result',
  GOALS = 'goals' // Added for the proximity helper only
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

export type HomeAwaySupport = {
    home: { hitRate: number; matches: number; average: number };
    away: { hitRate: number; matches: number; average: number };
};

export interface BettingInsight {
  team: string; // This can be a specific team or "Fixture" for match-level bets
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
    context?: string;
  }>;
  context?: {
    homeAwaySupportForSample?: HomeAwaySupport; 
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

interface MarketConfig {
  thresholds: number[];
  minValue: number;
  label: string;
  useOrMore?: boolean;
}

const MARKET_CONFIGS: Record<Exclude<BettingMarket, BettingMarket.MATCH_RESULT | BettingMarket.GOALS>, MarketConfig> = {
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
  [BettingMarket.TEAM_GOALS]: { 
    thresholds: [0.5, 1.5, 2.5],
    minValue: 0,
    label: 'Team Goals'
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

interface MarketAnalysisConfig<T> {
  market: BettingMarket;
  service: { getStatistics: () => Promise<Map<string, { matches: number, matchDetails: T[] }>> };
  valueExtractor: (detail: T) => number;
  label: string;
}

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
  private readonly MIN_HIT_RATE = 80; 
  private readonly MIN_SAMPLE_SIZE = 8; 
  private readonly CACHE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  
  // 1. Caching Layer Implementation
  private cache: { data: InsightsResponse, timestamp: number } | null = null;
  
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
      market: BettingMarket.TEAM_GOALS, 
      service: { getStatistics: () => supabaseGoalsService.getGoalStatistics() },
      // 🎯 FIX: Explicitly use goalsFor (Goals scored by the team being analyzed)
      valueExtractor: (m: GoalsDetail) => m.goalsFor, 
      label: 'team goals' 
    },
    {
      market: BettingMarket.SHOTS_ON_TARGET,
      service: { getStatistics: () => supabaseShootingService.getShootingStatistics() },
      valueExtractor: (m: ShotsMatchDetail) => m.shotsOnTargetFor,
      label: 'shots on target'
    },
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
      // Key now considers the team name AND the market/comparison
      const comparisonType = insight.market === BettingMarket.MATCH_RESULT 
        ? insight.outcome.split(' - ')[1] 
        : insight.comparison === 'binary' 
            ? insight.outcome.includes('Yes') || insight.outcome.includes('Win') ? 'YES' : 'NO'
            : insight.comparison;
      
      // NOTE: BTTS insights should remain team-specific; they do not get grouped under "Fixture"
      const genericKey = `${insight.team}_${insight.market}_${comparisonType}`;
      const existingInsight = mostSpecificInsights.get(genericKey);

      if (!existingInsight) {
        mostSpecificInsights.set(genericKey, insight);
      } else {
        let shouldReplace = false;
        
        // 1. Prioritize higher Hit Rate
        if (insight.hitRate > existingInsight.hitRate) {
            shouldReplace = true;
        } else if (insight.hitRate === existingInsight.hitRate) {
            
            // 2. Prioritize more specific Threshold (Only applies to threshold markets)
            if (insight.market !== BettingMarket.MATCH_RESULT && insight.comparison !== 'binary') {
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
                }
            } else {
                 // 3. Prioritize larger Sample Size for binary/match_result markets
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
    const now = Date.now();
    
    // 1. Caching Check
    if (this.cache && (now - this.cache.timestamp) < this.CACHE_TIMEOUT_MS) {
      console.log('[BettingInsights] ♻️ Returning cached insights.');
      return this.cache.data;
    }
      
    console.log('[BettingInsights] 🎯 Starting insights analysis...');
    
    const allInsights: BettingInsight[] = [];
    
    // Parallelize market analysis
    const marketAnalyses = [
        ...this.MARKET_ANALYSIS_CONFIGS.map(config => this.analyzeGenericMarket(config as any)),
        this.analyzeBTTSMarket(), 
        this.analyzeMatchResultMarket() 
    ];

    try {
        const results = await Promise.all(marketAnalyses);
        allInsights.push(...results.flat()); 
    } catch (error) {
        console.error('[BettingInsights] Error during market analysis:', error);
        throw new Error('Failed to complete all market analyses.');
    }
    
    
    const finalInsights = this.filterRedundantInsights(allInsights);

    const uniqueTeams = new Set(finalInsights.map(i => i.team).filter(t => t !== "Fixture"));

    console.log('[BettingInsights] ✅ Analysis complete:', {
      totalInsights: finalInsights.length,
      teamsAnalyzed: uniqueTeams.size
    });

    const response: InsightsResponse = {
        insights: finalInsights,
        timestamp: new Date().toISOString(),
        teamsAnalyzed: uniqueTeams.size,
        totalPatterns: finalInsights.length
    };
    
    // 1. Cache the result
    this.cache = { data: response, timestamp: now };

    return response;
  }

  /**
   * Get insights for a specific team
   */
  async getTeamInsights(teamName: string): Promise<BettingInsight[]> {
    const allInsights = await this.getAllInsights();
    return allInsights.insights.filter(
      insight => insight.team.toLowerCase() === teamName.toLowerCase() || insight.team === "Fixture"
    );
  }

  /**
   * Get insights for a specific market across all teams
   */
  async getMarketInsights(market: BettingMarket): Promise<BettingInsight[]> {
    const allInsights = await this.getAllInsights();
    return allInsights.insights.filter(insight => insight.market === market);
  }

  // -----------------------------------------------------------
  // 📊 MARKET ANALYZERS
  // -----------------------------------------------------------
  
  private async analyzeGenericMarket<T extends BaseMatchDetail>(config: MarketAnalysisConfig<T>): Promise<BettingInsight[]> {
    console.log(`[BettingInsights] 📊 Analyzing ${config.label} market...`);
    const insights: BettingInsight[] = [];
    
    // This call fetches stats for ALL teams in one go. Cannot parallelize here.
    const allStats = await config.service.getStatistics(); 
    const marketConfig = MARKET_CONFIGS[config.market as Exclude<BettingMarket, BettingMarket.MATCH_RESULT | BettingMarket.GOALS>];

    // NOTE: If the data structure allowed, we would map the team iteration and use Promise.all here
    // But since `allStats.entries()` is a generator/iterator, we process teams sequentially.
    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;

      const allValues = stats.matchDetails.map(config.valueExtractor); 
      const allMatchDetails = stats.matchDetails; 
      
      for (const threshold of marketConfig.thresholds) {
        
        if (marketConfig.useOrMore) {
          const orMorePattern = this.detectPattern(
            allValues,
            threshold,
            teamName,
            config.market,
            `${threshold}+ ${marketConfig.label}`,
            allMatchDetails,
            Comparison.OR_MORE
          );
          if (orMorePattern) insights.push(orMorePattern);
        } else {
          const baseOutcome = `${marketConfig.label}`;
          
          const overPattern = this.detectPattern(
            allValues,
            threshold,
            teamName,
            config.market,
            `${Comparison.OVER} ${threshold} ${baseOutcome}`,
            allMatchDetails,
            Comparison.OVER
          );
          if (overPattern) insights.push(overPattern);
          
          const underPattern = this.detectPattern(
            allValues,
            threshold,
            teamName,
            config.market,
            `${Comparison.UNDER} ${threshold} ${baseOutcome}`,
            allMatchDetails,
            Comparison.UNDER
          );
          if (underPattern) insights.push(underPattern);
        }
      }
    }

    console.log(`[BettingInsights] Found ${insights.length} ${config.label} patterns`);
    return insights;
  }
  
  
  private async analyzeBTTSMarket(): Promise<BettingInsight[]> {
    console.log('[BettingInsights] 📊 Analyzing Both Teams to Score market...');
    const insights: BettingInsight[] = [];
    const allStats = await supabaseGoalsService.getGoalStatistics();

    for (const [teamName, stats] of allStats.entries()) {
      if (stats.matches < this.ROLLING_WINDOW) continue;
      
      const allDetails = stats.matchDetails as GoalsDetail[];
      
      // BTTS - YES
      const yesPattern = this._detectBinaryPattern<GoalsDetail>(
          allDetails,
          allDetails.map(m => m.bothTeamsScored ? 1 : 0),
          teamName,
          BettingMarket.BOTH_TEAMS_TO_SCORE,
          'Both Teams to Score - Yes'
          // No getContext needed for BTTS
      );
      if (yesPattern) insights.push(yesPattern);
      
      // BTTS - NO
      const noPattern = this._detectBinaryPattern<GoalsDetail>(
          allDetails,
          allDetails.map(m => m.bothTeamsScored ? 0 : 1), // Invert for "No"
          teamName,
          BettingMarket.BOTH_TEAMS_TO_SCORE,
          'Both Teams to Score - No'
      );
      if (noPattern) insights.push(noPattern);
    }

    return insights; 
  }

  /**
   * Dedicated method for Match Result (Home Win, Away Win, Draw, Double Chance) analysis.
   * FIX: Replaced original implementation with fixture-centric logic.
   */
  private async analyzeMatchResultMarket(): Promise<BettingInsight[]> {
    console.log('[BettingInsights] 🏆 Analyzing Match Result and Double Chance markets...');
    const insights: BettingInsight[] = [];
    
    // Get all team names (using a reliable service key set)
    const allStats = await supabaseCardsService.getCardStatistics(); 
    const teamNames = Array.from(allStats.keys());

    for (const teamName of teamNames) {
      
      const allMatchResults = await fbrefFixtureService.getTeamMatchResultsByVenue(teamName);

      if (allMatchResults.length < this.ROLLING_WINDOW) continue;
      
      // ----------------------------------------------------------------------
      // Helper function to map team-relative result (Win/Draw/Loss) 
      // to the FIXTURE outcome (Home Win, Away Win, Draw)
      // ----------------------------------------------------------------------
      
      const getFixtureOutcome = (m: MatchResultDetail): 'HomeWin' | 'AwayWin' | 'Draw' => {
          if (m.outcome === 'Draw') return 'Draw';
          if (m.outcome === 'Win') {
              return m.isHome ? 'HomeWin' : 'AwayWin';
          }
          // If the team analyzed lost
          return m.isHome ? 'AwayWin' : 'HomeWin';
      };

      const fixtureOutcomes = allMatchResults.map(getFixtureOutcome);
      
      // Reusable context formatter: (H/A vs Opponent Score-AgainstScore)
      const contextFormatter = (m: MatchResultDetail) => 
          `${m.isHome ? 'H' : 'A'} vs ${m.opponent} (${m.scoreFor}-${m.scoreAgainst})`;

      // ----------------------------------------------------------------------
      // 1. HOME WIN
      // ----------------------------------------------------------------------
      const homeWinPattern = this._detectBinaryPattern(
          allMatchResults,
          fixtureOutcomes.map(o => o === 'HomeWin' ? 1 : 0),
          teamName,
          BettingMarket.MATCH_RESULT,
          'Match Result - Home Win',
          contextFormatter
      );
      if (homeWinPattern) insights.push(homeWinPattern);

      // ----------------------------------------------------------------------
      // 2. AWAY WIN
      // ----------------------------------------------------------------------
      const awayWinPattern = this._detectBinaryPattern(
          allMatchResults,
          fixtureOutcomes.map(o => o === 'AwayWin' ? 1 : 0),
          teamName,
          BettingMarket.MATCH_RESULT,
          'Match Result - Away Win',
          contextFormatter
      );
      if (awayWinPattern) insights.push(awayWinPattern);
      
      // ----------------------------------------------------------------------
      // 3. DRAW
      // ----------------------------------------------------------------------
      const drawPattern = this._detectBinaryPattern(
          allMatchResults,
          fixtureOutcomes.map(o => o === 'Draw' ? 1 : 0),
          teamName,
          BettingMarket.MATCH_RESULT,
          'Match Result - Draw',
          contextFormatter
      );
      if (drawPattern) insights.push(drawPattern);

      // ----------------------------------------------------------------------
      // 4. DOUBLE CHANCE - Home or Draw (1X)
      // ----------------------------------------------------------------------
      const homeOrDrawPattern = this._detectBinaryPattern(
          allMatchResults,
          fixtureOutcomes.map(o => (o === 'HomeWin' || o === 'Draw') ? 1 : 0),
          teamName,
          BettingMarket.MATCH_RESULT, 
          'Double Chance - Home or Draw',
          contextFormatter
      );
      if (homeOrDrawPattern) insights.push(homeOrDrawPattern);
      
      // ----------------------------------------------------------------------
      // 5. DOUBLE CHANCE - Away or Draw (X2)
      // ----------------------------------------------------------------------
      const awayOrDrawPattern = this._detectBinaryPattern(
          allMatchResults,
          fixtureOutcomes.map(o => (o === 'AwayWin' || o === 'Draw') ? 1 : 0),
          teamName,
          BettingMarket.MATCH_RESULT,
          'Double Chance - Away or Draw',
          contextFormatter
      );
      if (awayOrDrawPattern) insights.push(awayOrDrawPattern);

    }

    console.log(`[BettingInsights] Found ${insights.length} fixture result patterns`);
    return insights;
  }

  // -----------------------------------------------------------
  // 🔍 CORE DETECTION LOGIC (REMAINS UNCHANGED)
  // -----------------------------------------------------------

  /**
   * Core pattern detection logic for numerical thresholds
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

    // TIER 1: Check for STREAKS
    let streakLength = 0;
    for (const value of allValues) {
      if (isHit(value)) {
        streakLength++;
      } else {
        break;
      }
    }
    
    if (streakLength >= this.STREAK_THRESHOLD) {
      const sampleValues = allValues.slice(0, streakLength);
      const sampleMatchDetails = allMatchDetails.slice(0, streakLength);
      
      return this.buildInsight(
        sampleValues, threshold, teamName, market, outcome, sampleMatchDetails,
        allValues, allMatchDetails, true, comparison, streakLength
      );
    }
    
    // TIER 2: Check ROLLING 5 for 100%
    const rolling5 = allValues.slice(0, this.ROLLING_WINDOW);
    const rolling5Hits = rolling5.filter(isHit).length;
    const rolling5HitRate = (rolling5Hits / rolling5.length) * 100;
    
    if (rolling5HitRate === 100) {
      const sampleValues = rolling5;
      const sampleMatchDetails = allMatchDetails.slice(0, this.ROLLING_WINDOW);
      
      return this.buildInsight(
        sampleValues, threshold, teamName, market, outcome, sampleMatchDetails,
        allValues, allMatchDetails, false, comparison, undefined
      );
    }
    
    // TIER 3: Check LARGER SAMPLE for 80%+
    const extendedSampleCount = Math.min(20, allValues.length);
    
    if (extendedSampleCount >= this.MIN_SAMPLE_SIZE) {
      const sampleValues = allValues.slice(0, extendedSampleCount);
      const sampleHits = sampleValues.filter(isHit).length;
      const hitRate = (sampleHits / sampleValues.length) * 100;
      
      if (hitRate >= this.MIN_HIT_RATE) {
        const sampleMatchDetails = allMatchDetails.slice(0, extendedSampleCount);
        
        return this.buildInsight(
          sampleValues, threshold, teamName, market, outcome, sampleMatchDetails,
          allValues, allMatchDetails, false, comparison, undefined
        );
      }
    }
    
    return null;
  }

  // ------------------------------------------------------------------
  // 3. TYPE OVERLOADED BINARY DETECTION (BTTS and Match Result)
  // ------------------------------------------------------------------

  /**
   * Overload 1: For MatchResultDetail (requires a context formatter function)
   */
  private _detectBinaryPattern(
    allMatchDetails: MatchResultDetail[],
    allValues: number[],
    teamName: string,
    market: BettingMarket.MATCH_RESULT,
    outcomeLabel: string,
    getContext: (m: MatchResultDetail) => string
  ): BettingInsight | null;
  
  /**
   * Overload 2: Generic for other binary markets like BTTS (does not require a context formatter)
   */
  private _detectBinaryPattern<T extends BaseMatchDetail>(
    allMatchDetails: T[],
    allValues: number[],
    teamName: string,
    market: BettingMarket.BOTH_TEAMS_TO_SCORE,
    outcomeLabel: string,
  ): BettingInsight | null;

  /**
   * Implementation signature for the private helper.
   */
  private _detectBinaryPattern<T extends BaseMatchDetail>(
    allMatchDetails: T[],
    allValues: number[], // 1 (hit) or 0 (miss)
    teamName: string,
    market: BettingMarket.BOTH_TEAMS_TO_SCORE | BettingMarket.MATCH_RESULT,
    outcomeLabel: string,
    getContext?: (m: T) => string // getContext is optional here
  ): BettingInsight | null {
    
    const isHit = (value: number) => value === 1; // Always check for value 1 (a hit)
    
    let streakLength = 0;
    for (const value of allValues) {
      if (isHit(value)) {
        streakLength++;
      } else {
        break;
      }
    }

    const rolling = allValues.slice(0, this.ROLLING_WINDOW);
    const rollingHitRate = (rolling.filter(isHit).length / rolling.length) * 100;

    const extendedSampleCount = Math.min(
        market === BettingMarket.MATCH_RESULT ? 20 : 15,
        allValues.length
    );
    
    let analyzedValues: number[] | undefined;
    let analyzedDetails: T[] | undefined;
    let actualHitRate: number | undefined;
    let isStreak = false;
    
    if (streakLength >= this.STREAK_THRESHOLD) {
      analyzedValues = allValues.slice(0, streakLength);
      analyzedDetails = allMatchDetails.slice(0, streakLength);
      actualHitRate = 100;
      isStreak = true;
    } else if (rollingHitRate === 100) {
      analyzedValues = rolling;
      analyzedDetails = allMatchDetails.slice(0, this.ROLLING_WINDOW);
      actualHitRate = 100;
    } else if (extendedSampleCount >= this.MIN_SAMPLE_SIZE) {
      const sample = allValues.slice(0, extendedSampleCount);
      const hits = sample.filter(isHit).length;
      const hitRate = (hits / sample.length) * 100;
      
      if (hitRate >= this.MIN_HIT_RATE) {
        analyzedValues = sample;
        analyzedDetails = allMatchDetails.slice(0, extendedSampleCount);
        actualHitRate = Math.round(hitRate);
      } else {
        return null; 
      }
    } else {
      return null; 
    }
    
    const homeAwaySupportForSample = this.calculateHomeAwaySupport(
        analyzedDetails!, analyzedValues!, isHit 
    );
    
    const homeAwaySupportOverall = this.calculateHomeAwaySupport(
        allMatchDetails, allValues, isHit 
    );
    
    const confidence = this.calculateConfidenceScore(
        analyzedValues!, 
        0.5, 
        'binary', 
        market, 
        homeAwaySupportForSample, 
        actualHitRate! 
    );

    return {
      team: teamName,
      market: market,
      outcome: outcomeLabel,
      hitRate: actualHitRate!, 
      matchesAnalyzed: analyzedDetails!.length,
      isStreak,
      streakLength: isStreak ? streakLength : undefined,
      threshold: 0.5,
      averageValue: actualHitRate! / 100, // Use hitRate as the average for binary markets
      comparison: 'binary',
      recentMatches: analyzedDetails!.map((m, idx) => ({
        opponent: m.opponent,
        value: analyzedValues![idx], 
        hit: analyzedValues![idx] === 1,
        date: m.date,
        isHome: m.isHome,
        // The getContext check is now much cleaner thanks to the overloads
        context: getContext ? getContext(m) : undefined
      })),
      context: {
        homeAwaySupportForSample,
        homeAwaySupportOverall,
        confidence
      }
    };
  }


  // -----------------------------------------------------------
  // 🔨 HELPER METHODS (REMAIN UNCHANGED)
  // -----------------------------------------------------------

  /**
   * Build insight object with all relevant data
   */
  private buildInsight(
    sampleValues: number[], 
    threshold: number,
    teamName: string,
    market: BettingMarket,
    outcome: string,
    sampleMatchDetails: Array<{ opponent: string; date?: string; isHome?: boolean }>, 
    allValues: number[], 
    allMatchDetails: Array<{ opponent: string; date?: string; isHome?: boolean }>, 
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

    const hits = sampleValues.filter(isHit).length;
    const actualHitRate = Math.round((hits / sampleValues.length) * 100);

    const homeAwaySupportForSample = this.calculateHomeAwaySupport(
        sampleMatchDetails, sampleValues, isHit
    );

    const homeAwaySupportOverall = this.calculateHomeAwaySupport(
        allMatchDetails, allValues, isHit
    );

    const confidence = this.calculateConfidenceScore(
        sampleValues, 
        threshold, 
        comparison, 
        market, // Pass market type
        homeAwaySupportForSample, 
        actualHitRate
    );

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
   * Defines market-specific proximity thresholds for the penalty logic.
   * Values represent the *minimum required percentage margin* over/under the threshold.
   */
  private getMarketSpecificProximityThresholds(market: BettingMarket): { fragile: number; risky: number } {
      // fragile: Below this percent margin -> CRITICAL penalty
      // risky: Below this percent margin -> MODERATE penalty
      const thresholds: Record<BettingMarket, { fragile: number; risky: number }> = {
          [BettingMarket.CARDS]: { fragile: 15, risky: 30 },
          [BettingMarket.CORNERS]: { fragile: 12, risky: 25 },
          [BettingMarket.FOULS]: { fragile: 8, risky: 15 },
          [BettingMarket.TEAM_GOALS]: { fragile: 15, risky: 30 },
          [BettingMarket.SHOTS_ON_TARGET]: { fragile: 8, risky: 15 },
          [BettingMarket.TOTAL_SHOTS]: { fragile: 5, risky: 10 },
          
          // Binary/Match markets
          [BettingMarket.BOTH_TEAMS_TO_SCORE]: { fragile: 0, risky: 0 }, 
          [BettingMarket.MATCH_RESULT]: { fragile: 0, risky: 0 },
          [BettingMarket.GOALS]: { fragile: 15, risky: 30 }, // Default for total goals if implemented later
      };
      
      return thresholds[market] || { fragile: 10, risky: 20 }; // Default fallback
  }

  /**
   * Helper to calculate Home/Away Support for a given set of match details.
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
   * Calculates a detailed confidence score.
   */
  private calculateConfidenceScore(
    values: number[],
    threshold: number,
    comparison: Comparison | 'binary',
    market: BettingMarket, // Added for market-specific thresholds
    homeAwaySupportForSample?: HomeAwaySupport,
    hitRate: number = 100 
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
      baseScore += 10;
      factors.push(`Moderate Hit Rate (${hitRate}%) in sample.`);
    }

    // 2. Base Score based on Average Value proximity (40 points max)
    if (comparison === Comparison.OVER || comparison === Comparison.OR_MORE) {
        const valueDifference = avgValue - threshold;
        const maxExpectedDifference = 3.0; // Standardize max scaling difference
        
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
        
        if (home.matches > 0 && away.matches > 0 && home.hitRate >= 80 && away.hitRate >= 80) {
            homeAwayBonus = 15;
            factors.push('Strong consistency at both home and away venues.');
        } 
        else if (home.matches > 0 && home.hitRate >= 90 || away.matches > 0 && away.hitRate >= 90) {
             homeAwayBonus = 10;
             factors.push(`Excellent hit rate at ${home.hitRate >= 90 ? 'Home' : 'Away'} venue.`);
        }
        else if (home.matches > 0 && home.hitRate >= 80 || away.matches > 0 && away.hitRate >= 80) {
             homeAwayBonus = 5;
             factors.push(`Good hit rate at ${home.hitRate >= 80 ? 'Home' : 'Away'} venue.`);
        }
    }
    baseScore += homeAwayBonus;

    let finalScore = Math.min(100, Math.max(0, baseScore));

    // 5. PENALTIES
    
    // Penalty for hit rate below 90% in small samples
    if (hitRate < 90 && values.length < 10) {
      finalScore -= 10;
      factors.push('Small sample size with non-perfect hit rate reduces confidence.');
    }
    
    // 🎯 FIXED: MARKET-AWARE PROXIMITY PENALTY
    if (comparison !== 'binary' && threshold > 0) {
      const { fragile, risky } = this.getMarketSpecificProximityThresholds(market);

      // Calculate margin as PERCENTAGE of threshold
      const marginPercent = (comparison === Comparison.OVER || comparison === Comparison.OR_MORE) 
        ? ((avgValue - threshold) / threshold) * 100
        : ((threshold - avgValue) / threshold) * 100;
      
      if (marginPercent < fragile) {
        // CRITICAL: Pattern is extremely fragile
        const penalty = 25;
        finalScore = Math.max(finalScore - penalty, 15);
        factors.push(`⚠️ FRAGILE: Average is only ${marginPercent.toFixed(1)}% margin. High variance risk.`);
      } 
      else if (marginPercent < risky) {
        // MODERATE: Pattern is somewhat risky
        const penalty = 10;
        finalScore = Math.max(finalScore - penalty, 25);
        factors.push(`Moderate risk: Average is ${marginPercent.toFixed(1)}% margin.`);
      } else {
        factors.push(`✓ Safe margin: ${marginPercent.toFixed(1)}% ${comparison === Comparison.OVER ? 'above' : 'below'} threshold.`);
      }
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
      shooting: supabaseShootingService.getCacheStatus(),
    };
  }
}

export const bettingInsightsService = new BettingInsightsService();
