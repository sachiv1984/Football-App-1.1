// --- 1. NEW: Imports only what's necessary, relying on Utilities/Types ---
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService'; 
import { statisticalAIGenerator } from '../../utils/StatisticalAIGenerator'; // 🚀 NEW UTILITY IMPORT

// 💡 NEW: Import standardized types from the central file
import { 
  AIInsight, 
  MatchOdds, 
  ThresholdAnalysis, 
  OptimalThreshold 
} from '../../types/BettingAITypes'; 

// --- 2. NEW: Use standardized GoalThresholdAnalysis interface ---
// Note: We use the GoalThresholdAnalysis interface which now extends ThresholdAnalysis
interface GoalThresholdAnalysis extends ThresholdAnalysis {}

// Note: We use the OptimalThreshold interface which now uses the generic type
interface OptimalThresholdType extends OptimalThreshold<GoalThresholdAnalysis> {}

// Simplified local types (many internal types can be removed or simplified)
interface TeamGoalPattern {
  team: string;
  venue: 'home' | 'away';
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  averageTotalGoals: number;
  bttsPercentage: number;
  thresholdAnalysis: {
    [key: string]: GoalThresholdAnalysis; // Use the standardized type
  };
  recentMatches: Array<{
    opponent: string;
    goalsFor: number;
    goalsAgainst: number;
    totalGoals: number;
    bothTeamsScored: boolean;
  }>;
}

type GoalType = 'total' | 'for' | 'against';

export class GoalsAIService {
  // ❌ REMOVED: CONFIDENCE_THRESHOLDS
  // ❌ REMOVED: CONSISTENCY_THRESHOLDS

  /**
   * Helper to get goal count based on type
   */
  private getGoalCount(
    match: { totalGoals: number; goalsFor: number; goalsAgainst: number },
    type: GoalType
  ) {
    switch (type) {
      case 'for': return match.goalsFor;
      case 'against': return match.goalsAgainst;
      default: return match.totalGoals;
    }
  }
  
  // --- Core Goal Threshold Analysis Functions ---

  /**
   * Analyze goal threshold for an 'Over' bet type.
   * 💡 REFACTORED: Delegates Confidence and Value calculation to the utility.
   */
  private analyzeGoalThresholdOver(
    matches: Array<{ totalGoals: number; goalsFor: number; goalsAgainst: number }>,
    threshold: number,
    type: GoalType,
    odds?: number 
  ): GoalThresholdAnalysis {
    
    const getCount = (match: { totalGoals: number; goalsFor: number; goalsAgainst: number }) => this.getGoalCount(match, type);

    // 1. Calculate historical percentage
    const matchesOver = matches.filter(match => getCount(match) > threshold);
    const overPercentage = (matchesOver.length / matches.length) * 100;

    // 2. Analyze recent form & consistency
    const recentMatches = matches.slice(0, 5);
    const recentOverForm = recentMatches.map(match => getCount(match) > threshold);
    const overHits = recentOverForm.filter(Boolean).length;
    
    // 🚀 NEW: Use utility to calculate consistency (including low sample penalty)
    const overConsistency = statisticalAIGenerator.calculateConsistency(overHits, Math.min(5, recentMatches.length));

    // 🚀 NEW: Use utility to get Confidence and Value (EV)
    const overConfidence = statisticalAIGenerator.getConfidenceLevel(overPercentage, overConsistency);
    const overValue = statisticalAIGenerator.calculateExpectedValue(overPercentage, overConsistency, odds);

    return {
      threshold,
      percentage: Math.round(overPercentage * 10) / 10,
      consistency: Math.round(overConsistency * 100) / 100,
      confidence: overConfidence,
      recentForm: recentOverForm,
      betType: 'over',
      value: overValue, // The EV score
      odds,
    } as GoalThresholdAnalysis; // Cast to ensure it matches the interface
  }

  /**
   * Analyze goal threshold for an 'Under' bet type.
   * 💡 REFACTORED: Delegates Confidence and Value calculation to the utility.
   */
  private analyzeGoalThresholdUnder(
    matches: Array<{ totalGoals: number; goalsFor: number; goalsAgainst: number }>,
    threshold: number,
    type: GoalType,
    odds?: number 
  ): GoalThresholdAnalysis {
    
    const getCount = (match: { totalGoals: number; goalsFor: number; goalsAgainst: number }) => this.getGoalCount(match, type);

    // 1. Calculate historical percentage
    const matchesUnder = matches.filter(match => getCount(match) < threshold);
    const underPercentage = (matchesUnder.length / matches.length) * 100;

    // 2. Analyze recent form & consistency
    const recentMatches = matches.slice(0, 5);
    const recentUnderForm = recentMatches.map(match => getCount(match) < threshold);
    const underHits = recentUnderForm.filter(Boolean).length;
    
    // 🚀 NEW: Use utility to calculate consistency
    const underConsistency = statisticalAIGenerator.calculateConsistency(underHits, Math.min(5, recentMatches.length));

    // 🚀 NEW: Use utility to get Confidence and Value (EV)
    const underConfidence = statisticalAIGenerator.getConfidenceLevel(underPercentage, underConsistency);
    const underValue = statisticalAIGenerator.calculateExpectedValue(underPercentage, underConsistency, odds);

    return {
      threshold,
      percentage: Math.round(underPercentage * 10) / 10,
      consistency: Math.round(underConsistency * 100) / 100,
      confidence: underConfidence,
      recentForm: recentUnderForm,
      betType: 'under',
      value: underValue, // The EV score
      odds,
    } as GoalThresholdAnalysis; // Cast to ensure it matches the interface
  }
  
  /**
   * Analyze specific goal threshold.
   */
  private analyzeGoalThreshold(
    matches: Array<{ totalGoals: number; goalsFor: number; goalsAgainst: number }>,
    threshold: number,
    type: GoalType,
    matchOdds: MatchOdds | null 
  ): GoalThresholdAnalysis {
    
    let overOdds: number | undefined;
    let underOdds: number | undefined;
    
    // Only fetch odds for the 2.5 Total Goals line
    if (type === 'total' && threshold === 2.5 && matchOdds) {
        overOdds = matchOdds.totalGoalsOdds?.overOdds;
        underOdds = matchOdds.totalGoalsOdds?.underOdds;
    }

    const overAnalysis = this.analyzeGoalThresholdOver(matches, threshold, type, overOdds);
    const underAnalysis = this.analyzeGoalThresholdUnder(matches, threshold, type, underOdds);

    // 💡 REFACTORED: Selection logic now prioritizes confidence, then value (EV)
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
      // Fallback: Return the one with the highest value (EV)
      return overValue > underValue ? overAnalysis : underAnalysis;
    }
  }

  // ❌ REMOVED: calculateBetValue (Now in StatisticalAIGenerator)
  // ❌ REMOVED: getConfidenceLevel (Now in StatisticalAIGenerator)
  // ❌ REMOVED: findOptimalThreshold (Now in StatisticalAIGenerator)
  // ❌ REMOVED: generateThresholdReasoning (Now in StatisticalAIGenerator)

  /**
   * Find optimal threshold from multiple options
   * 💡 REFACTORED: Simply wraps the utility function.
   */
  private findOptimalThreshold(analyses: GoalThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThresholdType | null {
    // 🚀 NEW: Call the centralized utility method
    const result = statisticalAIGenerator.findOptimal(analyses, betType);
    
    // Convert generic ThresholdAnalysis to GoalThresholdAnalysis for local type safety
    if (!result) return null;
    return result as OptimalThresholdType; 
  }

  // ... (analyzeTeamGoalPattern function remains largely the same, but uses the refactored analyzeGoalThreshold)

  /**
   * Generate optimized insights for total match goals
   */
  private generateOptimalTotalGoalsInsights(
    homePattern: TeamGoalPattern,
    awayPattern: TeamGoalPattern,
    matchOdds: MatchOdds | null 
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    const combinedAnalyses: GoalThresholdAnalysis[] = [];
    const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];

    for (const threshold of thresholds) {
      const homeAnalyses = Object.values(homePattern.thresholdAnalysis).filter(a => a.threshold === threshold);
      const awayAnalyses = Object.values(awayPattern.thresholdAnalysis).filter(a => a.threshold === threshold);
      
      const homeOver = homeAnalyses.find(a => a.betType === 'over');
      const awayOver = awayAnalyses.find(a => a.betType === 'over');
      const homeUnder = homeAnalyses.find(a => a.betType === 'under');
      const awayUnder = awayAnalyses.find(a => a.betType === 'under');
      
      if (!homeOver || !awayOver || !homeUnder || !awayUnder) continue;

      // 💰 Inject odds only for the 2.5 threshold
      const overOdds = (threshold === 2.5) ? matchOdds?.totalGoalsOdds?.overOdds : undefined;
      const underOdds = (threshold === 2.5) ? matchOdds?.totalGoalsOdds?.underOdds : undefined;

      // --- OVER COMBINED ANALYSIS ---
      const combinedOverPercentage = (homeOver.percentage + awayOver.percentage) / 2;
      const combinedOverConsistency = (homeOver.consistency + awayOver.consistency) / 2; // Average the consistency
      
      // 🚀 NEW: Use utility for final confidence and EV calculation
      const combinedOverConfidence = statisticalAIGenerator.getConfidenceLevel(combinedOverPercentage, combinedOverConsistency);
      const combinedOverValue = statisticalAIGenerator.calculateExpectedValue(combinedOverPercentage, combinedOverConsistency, overOdds);

      combinedAnalyses.push({
        threshold,
        percentage: combinedOverPercentage,
        consistency: combinedOverConsistency,
        confidence: combinedOverConfidence,
        recentForm: [...homeOver.recentForm, ...awayOver.recentForm].slice(0, 5),
        betType: 'over',
        value: combinedOverValue,
        odds: overOdds,
      } as GoalThresholdAnalysis);

      // --- UNDER COMBINED ANALYSIS ---
      const combinedUnderPercentage = (homeUnder.percentage + awayUnder.percentage) / 2;
      const combinedUnderConsistency = (homeUnder.consistency + awayUnder.consistency) / 2;
      
      // 🚀 NEW: Use utility for final confidence and EV calculation
      const combinedUnderConfidence = statisticalAIGenerator.getConfidenceLevel(combinedUnderPercentage, combinedUnderConsistency);
      const combinedUnderValue = statisticalAIGenerator.calculateExpectedValue(combinedUnderPercentage, combinedUnderConsistency, underOdds);

      combinedAnalyses.push({
        threshold,
        percentage: combinedUnderPercentage,
        consistency: combinedUnderConsistency,
        confidence: combinedUnderConfidence,
        recentForm: [...homeUnder.recentForm, ...awayUnder.recentForm].slice(0, 5),
        betType: 'under',
        value: combinedUnderValue,
        odds: underOdds,
      } as GoalThresholdAnalysis);
    }

    // Find optimal over and under thresholds
    const optimalOver = this.findOptimalThreshold(combinedAnalyses, 'over');
    if (optimalOver) {
      const analysis = optimalOver.analysis;
      const isValueBet = analysis.value > 0.0001; // Check for positive EV
      
      insights.push({
        id: `optimal-total-goals-over-${analysis.threshold}`,
        title: `Total Goals ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        description: `Optimal ${analysis.betType} bet: ${analysis.percentage.toFixed(1)}% hit rate. ${isValueBet ? 'Value edge detected.' : 'Strong confidence selection.'}`,
        market: `Total Goals ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `EV: ${analysis.value.toFixed(4)} | Reasoning: ${optimalOver.reasoning}`,
        aiEnhanced: true,
        valueScore: analysis.value,
      });
    }

    const optimalUnder = this.findOptimalThreshold(combinedAnalyses, 'under');
    // ... (generate similar insight for optimalUnder)
    if (optimalUnder) {
      const analysis = optimalUnder.analysis;
      const isValueBet = analysis.value > 0.0001;
      
      insights.push({
        id: `optimal-total-goals-under-${analysis.threshold}`,
        title: `Total Goals ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        description: `Optimal ${analysis.betType} bet: ${analysis.percentage.toFixed(1)}% hit rate. ${isValueBet ? 'Value edge detected.' : 'Strong confidence selection.'}`,
        market: `Total Goals ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `EV: ${analysis.value.toFixed(4)} | Reasoning: ${optimalUnder.reasoning}`,
        aiEnhanced: true,
        valueScore: analysis.value,
      });
    }
    
    // Sort by Confidence, then by EV (Value Score)
    return insights.sort((a, b) => {
      const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const confDiff = (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
      if (confDiff !== 0) return confDiff;
      return (b.valueScore ?? 0) - (a.valueScore ?? 0);
    });
  }
  
  // ... (other generator methods would be refactored similarly)

  /**
   * Main method: Generate optimized goal-related betting insights
   * 💡 NOTE: The primary change here is how insights are sorted at the end.
   */
  async generateGoalInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    try {
      // ... (analysis and insight generation calls remain the same)
      const homePattern = await this.analyzeTeamGoalPattern(homeTeam, 'home');
      const awayPattern = await this.analyzeTeamGoalPattern(awayTeam, 'away');
      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam); 
      
      const allInsights: AIInsight[] = [];
      
      allInsights.push(...this.generateOptimalTotalGoalsInsights(homePattern, awayPattern, matchOdds));
      // ... (add other insights)

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
      
      console.log(`[GoalsAI] ✅ Final insights after standardization: ${filteredInsights.length}`);
      return filteredInsights;
      
    } catch (error) {
      console.error('[GoalsAI] Error generating goal insights:', error);
      return [];
    }
  }
}

export const goalsAIService = new GoalsAIService();
