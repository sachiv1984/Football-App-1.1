// src/services/ai/cornersAIService.ts
import { supabaseCornersService, DetailedCornerStats } from '../stats/supabaseCornersService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService';
import { statisticalAIGenerator } from '../../utils/StatisticalAIGenerator'; // 🚀 NEW UTILITY IMPORT

// 💡 NEW: Import standardized types
import {
  AIInsight,
  MatchOdds,
  ThresholdAnalysis,
  OptimalThreshold,
  ConflictFlag,
} from '../../types/BettingAITypes'; 

// --- NEW/UPDATED INTERFACES FOR FIX ---

// Use standardized interfaces, extending ThresholdAnalysis for clarity
interface CornerThresholdAnalysis extends ThresholdAnalysis {}
interface OptimalThresholdType extends OptimalThreshold<CornerThresholdAnalysis> {}

// Local interface definitions (simplified where possible)
interface TeamCornerPattern {
  team: string;
  venue: 'home' | 'away';
  averageCornersFor: number;
  averageCornersAgainst: number;
  averageTotalCorners: number;
  thresholdAnalysis: {
    [key: string]: CornerThresholdAnalysis;
  };
  recentMatches: Array<{
    opponent: string;
    cornersFor: number;
    cornersAgainst: number;
    totalCorners: number;
  }>;
}

type CornerType = 'total' | 'for' | 'against';

export class CornersAIService {
  // ❌ REMOVED: CONFIDENCE_THRESHOLDS (Now in StatisticalAIGenerator)
  // ❌ REMOVED: CONSISTENCY_THRESHOLDS (Now in StatisticalAIGenerator)
  
  // NOTE: The penalty value is now a constant inside the utility file.
  // We keep a reference constant for the service's domain logic.
  private readonly GOAL_CONFLICT_THRESHOLD = 2.5;
  private readonly GOAL_CONFLICT_CONFIDENCE = 'high';

  private readonly MATCH_CORNER_THRESHOLDS = [4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5];
  private readonly TEAM_CORNER_THRESHOLDS = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

  /**
   * Helper to get corner count based on type
   */
  private getCornerCount(
    match: { totalCorners: number; cornersFor: number; cornersAgainst: number },
    type: CornerType
  ) {
    switch (type) {
      case 'for': return match.cornersFor;
      case 'against': return match.cornersAgainst;
      default: return match.totalCorners;
    }
  }

  /**
   * Helper to determine if a specific bet is in conflict with the goals insight.
   */
  private checkConflict(betType: 'over' | 'under', conflictFlag: ConflictFlag | null): ConflictFlag | null {
    if (conflictFlag && betType === 'over') {
        // Conflict scenario: Corners OVER strongly contradicts Goals UNDER 2.5/3.5
        // We only care about High Confidence Under Bets for a penalty
        if (conflictFlag.betType === 'under' && 
            conflictFlag.betLine <= this.GOAL_CONFLICT_THRESHOLD && 
            conflictFlag.confidence === this.GOAL_CONFLICT_CONFIDENCE) {
            
            console.log(`[CornersAI] Detected conflict: Over Corners vs ${conflictFlag.confidence} Under ${conflictFlag.betLine} Goals.`);
            return conflictFlag;
        }
    }
    return null;
  }

  /**
   * Analyze corner threshold for an 'Over' bet type
   * 💡 REFACTORED: Delegates all statistical calculations to utility.
   */
  private analyzeCornerThresholdOver(
    matches: Array<{ totalCorners: number; cornersFor: number; cornersAgainst: number }>,
    threshold: number,
    type: CornerType,
    odds: number | undefined,
    conflictFlag: ConflictFlag | null
  ): CornerThresholdAnalysis {
    
    const getCount = (match: { totalCorners: number; cornersFor: number; cornersAgainst: number }) => 
      this.getCornerCount(match, type);

    const matchesOver = matches.filter(match => getCount(match) > threshold);
    const overPercentage = (matchesOver.length / matches.length) * 100;

    const recentMatches = matches.slice(0, 5);
    const recentOverForm = recentMatches.map(match => getCount(match) > threshold);
    const overHits = recentOverForm.filter(Boolean).length;
    
    // 🚀 NEW: Use utility for Consistency
    const overConsistency = statisticalAIGenerator.calculateConsistency(overHits, Math.min(5, recentMatches.length));

    // 🎯 NEW: Apply Conflict Check
    const finalConflictFlag = this.checkConflict('over', conflictFlag);

    // 🚀 NEW: Use utility for Confidence and Value (passing the conflict flag)
    const overConfidence = statisticalAIGenerator.getConfidenceLevel(overPercentage, overConsistency);
    const overValue = statisticalAIGenerator.calculateExpectedValue(overPercentage, overConsistency, odds, finalConflictFlag);

    return {
      threshold,
      percentage: Math.round(overPercentage * 10) / 10,
      consistency: Math.round(overConsistency * 100) / 100,
      confidence: overConfidence,
      recentForm: recentOverForm,
      betType: 'over',
      value: overValue,
      odds,
    } as CornerThresholdAnalysis;
  }

  /**
   * Analyze corner threshold for an 'Under' bet type
   * 💡 REFACTORED: Delegates all statistical calculations to utility.
   */
  private analyzeCornerThresholdUnder(
    matches: Array<{ totalCorners: number; cornersFor: number; cornersAgainst: number }>,
    threshold: number,
    type: CornerType,
    odds: number | undefined,
    conflictFlag: ConflictFlag | null
  ): CornerThresholdAnalysis {
    
    const getCount = (match: { totalCorners: number; cornersFor: number; cornersAgainst: number }) => 
      this.getCornerCount(match, type);

    const matchesUnder = matches.filter(match => getCount(match) < threshold);
    const underPercentage = (matchesUnder.length / matches.length) * 100;

    const recentMatches = matches.slice(0, 5);
    const recentUnderForm = recentMatches.map(match => getCount(match) < threshold);
    const underHits = recentUnderForm.filter(Boolean).length;
    
    // 🚀 NEW: Use utility for Consistency
    const underConsistency = statisticalAIGenerator.calculateConsistency(underHits, Math.min(5, recentMatches.length));
    
    // NOTE: Under bets are generally NOT penalized by the Under Goal conflict, 
    // but we can pass null for the flag here.
    
    // 🚀 NEW: Use utility for Confidence and Value
    const underConfidence = statisticalAIGenerator.getConfidenceLevel(underPercentage, underConsistency);
    const underValue = statisticalAIGenerator.calculateExpectedValue(underPercentage, underConsistency, odds, null);

    return {
      threshold,
      percentage: Math.round(underPercentage * 10) / 10,
      consistency: Math.round(underConsistency * 100) / 100,
      confidence: underConfidence,
      recentForm: recentUnderForm,
      betType: 'under',
      value: underValue,
      odds,
    } as CornerThresholdAnalysis;
  }

  /**
   * Analyze specific corner threshold with enhanced value calculation
   */
  private analyzeCornerThreshold(
    matches: Array<{ totalCorners: number; cornersFor: number; cornersAgainst: number }>,
    threshold: number,
    type: CornerType,
    matchOdds: MatchOdds | null,
    conflictFlag: ConflictFlag | null 
  ): CornerThresholdAnalysis {
    let overOdds: number | undefined;
    let underOdds: number | undefined;
    
    if (type === 'total' && this.MATCH_CORNER_THRESHOLDS.includes(threshold) && matchOdds?.totalCornersOdds) {
      overOdds = matchOdds.totalCornersOdds.overOdds;
      underOdds = matchOdds.totalCornersOdds.underOdds;
    }

    const overAnalysis = this.analyzeCornerThresholdOver(matches, threshold, type, overOdds, conflictFlag);
    const underAnalysis = this.analyzeCornerThresholdUnder(matches, threshold, type, underOdds, conflictFlag);

    // 💡 REFACTORED: Use standard selection logic (Confidence then Value)
    const overValue = overAnalysis.value ?? 0;
    const underValue = underAnalysis.value ?? 0;

    if (overAnalysis.confidence === 'high' && overValue >= underValue) {
      return overAnalysis;
    } else if (underAnalysis.confidence === 'high' && underValue >= overValue) {
      return underAnalysis;
    } else if (overAnalysis.confidence === 'medium' && overValue >= underValue) {
      return overAnalysis;
    } else if (underAnalysis.confidence === 'medium' && underValue >= overValue) {
      return underAnalysis;
    } else {
      return overValue > underValue ? overAnalysis : underAnalysis;
    }
  }

  /**
   * Analyze corner patterns for a specific team
   */
  private async analyzeTeamCornerPattern(
    teamName: string, 
    venue: 'home' | 'away',
    conflictFlag: ConflictFlag | null
  ): Promise<TeamCornerPattern> {
    const teamStats = await supabaseCornersService.getTeamCornerStats(teamName);
    
    if (!teamStats) {
      throw new Error(`No corner data found for team: ${teamName}`);
    }

    const relevantMatches = teamStats.matchDetails.map(match => ({
      opponent: match.opponent,
      cornersFor: match.cornersFor,
      cornersAgainst: match.cornersAgainst,
      totalCorners: match.totalCorners,
    }));
    
    const averageCornersFor = teamStats.corners / teamStats.matches;
    const averageCornersAgainst = teamStats.cornersAgainst / teamStats.matches;
    const averageTotalCorners = averageCornersFor + averageCornersAgainst;

    const thresholdAnalysis: { [key: string]: CornerThresholdAnalysis } = {};
    
    // For team-specific corners (for/against)
    this.TEAM_CORNER_THRESHOLDS.forEach((threshold: number) => {
      // Pass the conflict flag down
      thresholdAnalysis[`for_${threshold}`] = this.analyzeCornerThreshold(relevantMatches, threshold, 'for', null, conflictFlag);
      thresholdAnalysis[`against_${threshold}`] = this.analyzeCornerThreshold(relevantMatches, threshold, 'against', null, conflictFlag);
    });

    // For match total corners
    this.MATCH_CORNER_THRESHOLDS.forEach((threshold: number) => {
      // Pass the conflict flag down
      thresholdAnalysis[`total_${threshold}`] = this.analyzeCornerThreshold(relevantMatches, threshold, 'total', null, conflictFlag);
    });

    return {
      team: teamName,
      venue,
      averageCornersFor: Math.round(averageCornersFor * 100) / 100,
      averageCornersAgainst: Math.round(averageCornersAgainst * 100) / 100,
      averageTotalCorners: Math.round(averageTotalCorners * 100) / 100,
      thresholdAnalysis,
      recentMatches: relevantMatches.slice(0, 5)
    };
  }

  // ❌ REMOVED: calculateBetValue (Now in StatisticalAIGenerator)
  // ❌ REMOVED: getConfidenceLevel (Now in StatisticalAIGenerator)

  /**
   * Find optimal threshold from multiple options
   * 💡 REFACTORED: Uses the centralized utility function.
   */
  private findOptimalThreshold(analyses: CornerThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThresholdType | null {
    // 🚀 NEW: Call the centralized utility method
    const result = statisticalAIGenerator.findOptimal(analyses, betType);
    
    // Cast generic ThresholdAnalysis to local type
    if (!result) return null;
    return result as OptimalThresholdType; 
  }

  /**
   * Generate reasoning for threshold selection
   * ❌ REMOVED: generateThresholdReasoning (Now in StatisticalAIGenerator) - We use the reasoning from the OptimalThreshold result.
   */

  /**
   * Generate optimized insights for total match corners
   */
  private generateOptimalMatchCornerInsights(
    homePattern: TeamCornerPattern,
    awayPattern: TeamCornerPattern,
    matchOdds: MatchOdds | null,
    conflictFlag: ConflictFlag | null
  ): AIInsight[] {
    const insights: AIInsight[] = [];

    const allCombinedAnalyses: CornerThresholdAnalysis[] = [];
    
    const overOdds = matchOdds?.totalCornersOdds?.overOdds; 
    const underOdds = matchOdds?.totalCornersOdds?.underOdds; 

    // 🎯 NEW: Apply Conflict Check only once for the total market odds
    const finalConflictFlag = this.checkConflict('over', conflictFlag); 

    this.MATCH_CORNER_THRESHOLDS.forEach((threshold: number) => {
      const homeAnalysis = homePattern.thresholdAnalysis[`total_${threshold}`];
      const awayAnalysis = awayPattern.thresholdAnalysis[`total_${threshold}`];
      
      if (!homeAnalysis || !awayAnalysis) return;

      // Combined over analysis 
      const combinedOverPercentage = (homeAnalysis.percentage + awayAnalysis.percentage) / 2;
      const combinedOverConsistency = (homeAnalysis.consistency + awayAnalysis.consistency) / 2;
      
      // 🚀 NEW: Use utility for Confidence and Value (passing conflict flag)
      const combinedOverConfidence = statisticalAIGenerator.getConfidenceLevel(combinedOverPercentage, combinedOverConsistency);
      const combinedOverValue = statisticalAIGenerator.calculateExpectedValue(combinedOverPercentage, combinedOverConsistency, overOdds, finalConflictFlag);

      allCombinedAnalyses.push({
        threshold,
        percentage: combinedOverPercentage,
        consistency: combinedOverConsistency,
        confidence: combinedOverConfidence,
        recentForm: [...(homeAnalysis.recentForm || []), ...(awayAnalysis.recentForm || [])].slice(0, 5),
        betType: 'over',
        value: combinedOverValue,
        odds: overOdds,
      } as CornerThresholdAnalysis);

      // Combined under analysis 
      const combinedUnderPercentage = (homeAnalysis.percentage + awayAnalysis.percentage) / 2;
      const combinedUnderConsistency = (homeAnalysis.consistency + awayAnalysis.consistency) / 2;
      
      // 🚀 NEW: Use utility for Confidence and Value (NO conflict flag for under)
      const combinedUnderConfidence = statisticalAIGenerator.getConfidenceLevel(combinedUnderPercentage, combinedUnderConsistency);
      const combinedUnderValue = statisticalAIGenerator.calculateExpectedValue(combinedUnderPercentage, combinedUnderConsistency, underOdds);

      allCombinedAnalyses.push({
        threshold,
        percentage: combinedUnderPercentage,
        consistency: combinedUnderConsistency,
        confidence: combinedUnderConfidence,
        recentForm: [...(homeAnalysis.recentForm || []), ...(awayAnalysis.recentForm || [])].slice(0, 5),
        betType: 'under',
        value: combinedUnderValue,
        odds: underOdds,
      } as CornerThresholdAnalysis);
    });

    // Find the absolute single best bet (Over OR Under)
    const optimalBet = this.findOptimalThreshold(allCombinedAnalyses);
    
    if (optimalBet) {
      const analysis = optimalBet.analysis;
      const isValueBet = analysis.value > 0.0001;
      
      insights.push({
        id: `optimal-match-corners-${analysis.betType}-${analysis.threshold}`,
        title: `${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold} Match Corners`,
        description: `Absolute best bet: ${analysis.percentage.toFixed(1)}% hit rate with strong corner trends. ${isValueBet ? 'Value edge detected.' : 'Strong confidence selection.'}`,
        market: `Match Corners ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `EV: ${analysis.value.toFixed(4)} | Reasoning: ${optimalBet.reasoning}`,
        aiEnhanced: true,
        valueScore: analysis.value, 
      });
    }
    return insights;
  }

  /**
   * Generate optimized insights for team-specific corners
   */
  private generateOptimalTeamCornerInsights(
    teamPattern: TeamCornerPattern,
    teamType: 'Home' | 'Away',
    conflictFlag: ConflictFlag | null
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    const analyses: CornerThresholdAnalysis[] = [];
    
    this.TEAM_CORNER_THRESHOLDS.forEach((threshold: number) => {
      // Re-analyze using the conflict flag for accurate valueScore
      const analysis = this.analyzeCornerThreshold(
        teamPattern.recentMatches.map(m => ({
            totalCorners: m.totalCorners, 
            cornersFor: m.cornersFor, 
            cornersAgainst: m.cornersAgainst
        })), 
        threshold, 
        'for', 
        null, 
        conflictFlag 
      );
      
      if (analysis) {
        analyses.push(analysis);
      }
    });
    
    const optimal = this.findOptimalThreshold(analyses);
    
    if (optimal) {
      const analysis = optimal.analysis;
      const recentHits = analysis.recentForm.filter(Boolean).length;
      const isValueBet = analysis.value > 0.0001;
      
      insights.push({
        id: `optimal-${teamType.toLowerCase()}-corners-${analysis.betType}-${analysis.threshold}`,
        title: `${teamType} Team ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold} Corners`,
        description: `Optimal ${teamType.toLowerCase()} corner bet: ${analysis.percentage.toFixed(1)}% hit rate (${recentHits}/5 recent). ${isValueBet ? 'Value edge detected.' : 'Strong confidence selection.'}`,
        market: `${teamType} Team Corners ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        supportingData: `EV: ${analysis.value.toFixed(4)} | Reasoning: ${optimal.reasoning}`,
        aiEnhanced: true,
        valueScore: analysis.value, 
      });
    }
    
    return insights;
  }
  
  /**
   * Generate corner handicap insights (who will get most corners)
   */
  private generateCornerHandicapInsights(
    homePattern: TeamCornerPattern,
    awayPattern: TeamCornerPattern
  ): AIInsight[] {
      // NOTE: This remains mostly unchanged as it is domain-specific logic
      // and does not use the core statistical analysis methods being refactored.
      const insights: AIInsight[] = [];
      // ... (implementation remains the same)
      const homeWins = homePattern.recentMatches.filter(m => m.cornersFor > m.cornersAgainst).length;
      const awayWins = awayPattern.recentMatches.filter(m => m.cornersFor > m.cornersAgainst).length;
      const homeDraws = homePattern.recentMatches.filter(m => m.cornersFor === m.cornersAgainst).length;
      const awayDraws = awayPattern.recentMatches.filter(m => m.cornersFor === m.cornersAgainst).length;
      
      const homeWinPercentage = (homeWins / Math.max(homePattern.recentMatches.length, 1)) * 100;
      const awayWinPercentage = (awayWins / Math.max(awayPattern.recentMatches.length, 1)) * 100;
      const drawPercentage = ((homeDraws + awayDraws) / Math.max(homePattern.recentMatches.length + awayPattern.recentMatches.length, 1)) * 100;
      
      const homeAdvantage = homePattern.averageCornersFor - homePattern.averageCornersAgainst;
      const awayAdvantage = awayPattern.averageCornersFor - awayPattern.averageCornersAgainst;
      
      if (homeWinPercentage > 60 && homeAdvantage > 1) {
          insights.push({
              id: 'corner-handicap-home',
              title: 'Home Team Corner Advantage',
              description: `Strong home corner dominance: ${homeWinPercentage.toFixed(1)}% win rate. Average advantage: +${homeAdvantage.toFixed(1)} corners`,
              market: 'Corner Handicap - Home',
              confidence: homeWinPercentage > 75 ? 'high' : 'medium',
              supportingData: `Home wins corners in ${homeWins}/${homePattern.recentMatches.length} recent matches. Avg corners: ${homePattern.averageCornersFor} vs ${homePattern.averageCornersAgainst}`,
              aiEnhanced: true
              // NOTE: This insight is typically non-value based unless odds are available.
          });
      } else if (awayWinPercentage > 60 && awayAdvantage > 1) {
          insights.push({
              id: 'corner-handicap-away',
              title: 'Away Team Corner Advantage',
              description: `Strong away corner dominance: ${awayWinPercentage.toFixed(1)}% win rate. Average advantage: +${awayAdvantage.toFixed(1)} corners`,
              market: 'Corner Handicap - Away',
              confidence: awayWinPercentage > 75 ? 'high' : 'medium',
              supportingData: `Away wins corners in ${awayWins}/${awayPattern.recentMatches.length} recent matches. Avg corners: ${awayPattern.averageCornersFor} vs ${awayPattern.averageCornersAgainst}`,
              aiEnhanced: true
          });
      } else if (drawPercentage > 40) {
          insights.push({
              id: 'corner-handicap-draw',
              title: 'Corner Count Draw',
              description: `Balanced corner patterns suggest equal corner counts: ${drawPercentage.toFixed(1)}% draw rate`,
              market: 'Corner Handicap - Draw',
              confidence: drawPercentage > 50 ? 'medium' : 'low',
              supportingData: `Even corner splits common. Home avg: ${homePattern.averageCornersFor}, Away avg: ${awayPattern.averageCornersFor}`,
              aiEnhanced: true
          });
      }
      return insights;
  }

  /**
   * Main method: Generate optimized corner-related betting insights
   */
  async generateCornerInsights(
    homeTeam: string, 
    awayTeam: string, 
    conflictFlag: ConflictFlag | null
  ): Promise<AIInsight[]> {
    try {
      console.log(`[CornersAI] Generating optimized corner insights for ${homeTeam} vs ${awayTeam}`);
      
      const homePattern = await this.analyzeTeamCornerPattern(homeTeam, 'home', conflictFlag);
      const awayPattern = await this.analyzeTeamCornerPattern(awayTeam, 'away', conflictFlag);

      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam);
      
      const allInsights: AIInsight[] = [];
      
      allInsights.push(...this.generateOptimalMatchCornerInsights(homePattern, awayPattern, matchOdds, conflictFlag));
      allInsights.push(...this.generateOptimalTeamCornerInsights(homePattern, 'Home', conflictFlag));
      allInsights.push(...this.generateOptimalTeamCornerInsights(awayPattern, 'Away', conflictFlag));
      allInsights.push(...this.generateCornerHandicapInsights(homePattern, awayPattern));
      
      console.log(`[CornersAI] Resolving potential conflicts among ${allInsights.length} generated insights...`);
      const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
      
      const insightsToFilter = resolutionResult.resolvedInsights;
      
      // 🚀 NEW: Standardized final sorting based on Confidence and ValueScore (EV)
      const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      
      const filteredInsights = insightsToFilter
        .filter(insight => insight.confidence !== 'low')
        .sort((a, b) => {
            const confDiff = (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
            if (confDiff !== 0) return confDiff;
            return (b.valueScore ?? 0) - (a.valueScore ?? 0);
        })
        .slice(0, 6);
      
      console.log(`[CornersAI] ✅ Final corner insights after resolution: ${filteredInsights.length}`);
      console.log(`[CornersAI] Resolution Summary: ${resolutionResult.summary}`);
      return filteredInsights;
      
    } catch (error) {
      console.error('[CornersAI] Error generating corner insights:', error);
      return [];
    }
  }
}

export const cornersAIService = new CornersAIService();
