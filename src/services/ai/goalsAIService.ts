import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService'; 
import { statisticalAIGenerator } from '../../utils/StatisticalAIGenerator'; 

import { 
  AIInsight, 
  MatchOdds, 
  ThresholdAnalysis, 
  OptimalThreshold,
  GoalThresholdAnalysis // Use specific extension for clarity
} from '../../types/BettingAITypes'; 

// Note: GoalsAIService specific type definitions
interface OptimalThresholdType extends OptimalThreshold<GoalThresholdAnalysis> {}

interface TeamGoalPattern {
  team: string;
  venue: 'home' | 'away';
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  averageTotalGoals: number;
  bttsPercentage: number;
  thresholdAnalysis: {
    [key: string]: GoalThresholdAnalysis; 
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
  
  /**
   * Analyze goal threshold for an 'Over' bet type.
   */
  private analyzeGoalThresholdOver(
    matches: Array<{ totalGoals: number; goalsFor: number; goalsAgainst: number }>,
    threshold: number,
    type: GoalType,
    odds?: number 
  ): GoalThresholdAnalysis {
    
    const getCount = (match: { totalGoals: number; goalsFor: number; goalsAgainst: number }) => this.getGoalCount(match, type);

    const matchesOver = matches.filter(match => getCount(match) > threshold);
    const overPercentage = (matchesOver.length / matches.length) * 100;

    const recentMatches = matches.slice(0, 5);
    const recentOverForm = recentMatches.map(match => getCount(match) > threshold);
    const overHits = recentOverForm.filter(Boolean).length;
    
    const overConsistency = statisticalAIGenerator.calculateConsistency(overHits, Math.min(5, recentMatches.length));

    const overConfidence = statisticalAIGenerator.getConfidenceLevel(overPercentage, overConsistency);
    const overValue = statisticalAIGenerator.calculateExpectedValue(overPercentage, overConsistency, odds);

    return {
      threshold,
      percentage: Math.round(overPercentage * 10) / 10,
      consistency: Math.round(overConsistency * 100) / 100,
      confidence: overConfidence,
      recentForm: recentOverForm,
      betType: 'over',
      value: overValue, 
      odds,
    } as GoalThresholdAnalysis; 
  }

  /**
   * Analyze goal threshold for an 'Under' bet type.
   */
  private analyzeGoalThresholdUnder(
    matches: Array<{ totalGoals: number; goalsFor: number; goalsAgainst: number }>,
    threshold: number,
    type: GoalType,
    odds?: number 
  ): GoalThresholdAnalysis {
    
    const getCount = (match: { totalGoals: number; goalsFor: number; goalsAgainst: number }) => this.getGoalCount(match, type);

    const matchesUnder = matches.filter(match => getCount(match) < threshold);
    const underPercentage = (matchesUnder.length / matches.length) * 100;

    const recentMatches = matches.slice(0, 5);
    const recentUnderForm = recentMatches.map(match => getCount(match) < threshold);
    const underHits = recentUnderForm.filter(Boolean).length;
    
    const underConsistency = statisticalAIGenerator.calculateConsistency(underHits, Math.min(5, recentMatches.length));

    const underConfidence = statisticalAIGenerator.getConfidenceLevel(underPercentage, underConsistency);
    const underValue = statisticalAIGenerator.calculateExpectedValue(underPercentage, underConsistency, odds);

    return {
      threshold,
      percentage: Math.round(underPercentage * 10) / 10,
      consistency: Math.round(underConsistency * 100) / 100,
      confidence: underConfidence,
      recentForm: recentUnderForm,
      betType: 'under',
      value: underValue, 
      odds,
    } as GoalThresholdAnalysis; 
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

  /**
   * Find optimal threshold from multiple options
   */
  private findOptimalThreshold(analyses: GoalThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThresholdType | null {
    const result = statisticalAIGenerator.findOptimal(analyses, betType);
    
    if (!result) return null;
    return result as OptimalThresholdType; 
  }

  /**
   * Analyze goal patterns for a specific team (Home or Away).
   */
  private async analyzeTeamGoalPattern(
      teamName: string, 
      venue: 'home' | 'away'
  ): Promise<TeamGoalPattern> {
      // NOTE: Assuming supabaseGoalsService.getTeamGoalStats returns the structure needed.
      const teamStats = await supabaseGoalsService.getTeamGoalStats(teamName);
      
      if (!teamStats) {
        throw new Error(`No goal data found for team: ${teamName}`);
      }

      const relevantMatches = teamStats.matchDetails.map((match: any) => ({
        opponent: match.opponent,
        goalsFor: match.goalsFor,
        goalsAgainst: match.goalsAgainst,
        totalGoals: match.totalGoals,
        bothTeamsScored: match.goalsFor > 0 && match.goalsAgainst > 0,
      }));
      
      const averageGoalsFor = teamStats.goalsFor / teamStats.matches;
      const averageGoalsAgainst = teamStats.goalsAgainst / teamStats.matches;
      const averageTotalGoals = averageGoalsFor + averageGoalsAgainst;
      const bttsHits = relevantMatches.filter(m => m.bothTeamsScored).length;
      const bttsPercentage = (bttsHits / relevantMatches.length) * 100;

      const thresholdAnalysis: { [key: string]: GoalThresholdAnalysis } = {};
      const GOAL_THRESHOLDS = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5]; 

      GOAL_THRESHOLDS.forEach((threshold: number) => {
        thresholdAnalysis[`total_${threshold}`] = this.analyzeGoalThreshold(relevantMatches, threshold, 'total', null);
      });

      return {
        team: teamName,
        venue,
        averageGoalsFor: Math.round(averageGoalsFor * 100) / 100,
        averageGoalsAgainst: Math.round(averageGoalsAgainst * 100) / 100,
        averageTotalGoals: Math.round(averageTotalGoals * 100) / 100,
        bttsPercentage: Math.round(bttsPercentage * 10) / 10,
        thresholdAnalysis,
        recentMatches: relevantMatches.slice(0, 5)
      };
  }

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

      const overOdds = (threshold === 2.5) ? matchOdds?.totalGoalsOdds?.overOdds : undefined;
      const underOdds = (threshold === 2.5) ? matchOdds?.totalGoalsOdds?.underOdds : undefined;

      // --- OVER COMBINED ANALYSIS ---
      const combinedOverPercentage = (homeOver.percentage + awayOver.percentage) / 2;
      const combinedOverConsistency = (homeOver.consistency + awayOver.consistency) / 2;
      
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

    const optimalOver = this.findOptimalThreshold(combinedAnalyses, 'over');
    if (optimalOver) {
      const analysis = optimalOver.analysis;
      const isValueBet = analysis.value > 0.0001;
      
      insights.push({
        id: `optimal-total-goals-over-${analysis.threshold}`,
        title: `Total Goals ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        description: `Optimal ${analysis.betType} bet: ${analysis.percentage.toFixed(1)}% hit rate. ${isValueBet ? 'Value edge detected.' : 'Strong confidence selection.'}`,
        market: `Total Goals ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `Historical Hit Rate: ${analysis.percentage.toFixed(1)}% | EV Edge: ${analysis.value.toFixed(4)} | Reasoning: ${optimalOver.reasoning}`,
        aiEnhanced: true,
        valueScore: analysis.value,
      });
    }

    const optimalUnder = this.findOptimalThreshold(combinedAnalyses, 'under');
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
        supportingData: `Historical Hit Rate: ${analysis.percentage.toFixed(1)}% | EV Edge: ${analysis.value.toFixed(4)} | Reasoning: ${optimalUnder.reasoning}`,
        aiEnhanced: true,
        valueScore: analysis.value,
      });
    }
    
    // Final sorting
    return insights.sort((a, b) => {
      const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const confDiff = (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
      if (confDiff !== 0) return confDiff;
      return (b.valueScore ?? 0) - (a.valueScore ?? 0);
    });
  }
  
  // NOTE: Other specific goal analysis generators would go here

  /**
   * Main method: Generate optimized goal-related betting insights
   */
  async generateGoalInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    try {
      const homePattern = await this.analyzeTeamGoalPattern(homeTeam, 'home');
      const awayPattern = await this.analyzeTeamGoalPattern(awayTeam, 'away');
      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam); 
      
      const allInsights: AIInsight[] = [];
      
      allInsights.push(...this.generateOptimalTotalGoalsInsights(homePattern, awayPattern, matchOdds));
      // ... (add other insights, e.g., BTTS, Team Goals)

      const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
      
      const insightsToFilter = resolutionResult.resolvedInsights;
      
      const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      
      const filteredInsights = insightsToFilter
        .sort((a, b) => {
            // 1. Sort by Confidence (High, Medium, Low)
            const confDiff = (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
            if (confDiff !== 0) return confDiff;
            // 2. Then sort by Value Score (EV)
            return (b.valueScore ?? 0) - (a.valueScore ?? 0);
        })
        .filter(insight => {
            // CRITICAL FILTER FIX: 
            // - ALWAYS allow 'high' confidence insights through, even if odds are missing (ValueScore = 0).
            if (insight.confidence === 'high') {
                return true; 
            }
            // - Only allow 'medium' confidence if it has a positive value edge (odds were found and EV > 0).
            if (insight.confidence === 'medium') {
                return (insight.valueScore ?? 0) > 0;
            }
            // - Filter out 'low' confidence insights.
            return false; // Automatically filters out 'low' confidence
        })
        .slice(0, 6); // Take the top 6 most confident/highest value insights
      
      console.log(`[GoalsAI] ✅ Final insights after standardization: ${filteredInsights.length}`);
      return filteredInsights;
      
    } catch (error) {
      console.error('[GoalsAI] Error generating goal insights:', error);
      return [];
    }
  }
}

export const goalsAIService = new GoalsAIService();
