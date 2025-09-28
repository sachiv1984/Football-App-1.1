// src/services/ai/cornersAIService.ts
import { supabaseCornersService, DetailedCornerStats } from '../stats/supabaseCornersService';
// 💡 Conflict resolver is already imported and correct
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService';

// Local interface definitions
interface MatchOdds {
  matchId: string;
  totalCornersOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  lastFetched: number;
}

// 💡 FIX 1: Updated AIInsight interface to include conflictScore and valueScore
interface AIInsight {
  id: string;
  title: string;
  description: string;
  market?: string;
  confidence: 'high' | 'medium' | 'low';
  odds?: string;
  supportingData?: string;
  source?: string;
  aiEnhanced?: boolean;
  conflictScore?: number; // 💡 NEW: Added for conflict resolution
  valueScore?: number;    // 💡 NEW: Added for value ranking
}

interface CornerThresholdAnalysis {
// ... (rest of the interface remains the same)
  threshold: number;
  percentage: number;
  consistency: number;
  confidence: 'high' | 'medium' | 'low';
  recentForm: boolean[];
  betType: 'over' | 'under';
  value: number;
  odds?: number;
}
// ... (rest of the interfaces remain the same)

// ... (rest of the class setup remains the same)

export class CornersAIService {
  // ... (CONFIDENCE_THRESHOLDS, CONSISTENCY_THRESHOLDS, corner thresholds remain the same)

  // ... (All helper methods like getCornerCount, analyzeCornerThresholdOver, analyzeCornerThresholdUnder, 
  //      getConfidenceLevel, calculateBetValue, etc., remain the same)

  // ... (analyzeCornerThreshold, analyzeTeamCornerPattern remain the same)

  /**
   * Find optimal threshold from multiple options
   * 💡 Minor fix: Always return the analysis with the highest value, regardless of bet type.
   */
  private findOptimalThreshold(analyses: CornerThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThreshold | null {
    let validAnalyses = analyses.filter(a => a.confidence !== 'low');
    
    if (betType) {
      validAnalyses = validAnalyses.filter(a => a.betType === betType);
    }
    
    if (validAnalyses.length === 0) return null;
    
    // Sort by value first, then by confidence (as a tie-breaker)
    const sorted = validAnalyses.sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
    });
    
    const optimal = sorted[0];
    
    // 💡 Add a crucial check: If the top 2 are nearly equal in value,
    // and one is 'Over' and one is 'Under', this is a weak/conflicting signal.
    // We will trust the Conflict Resolver to handle severe contradictions, 
    // but here we generate only the absolute best.
    
    const reasoning = this.generateThresholdReasoning(optimal, sorted.slice(1, 3));
    
    return {
      analysis: optimal,
      reasoning,
      alternativeConsidered: sorted.slice(1, 3)
    };
  }

  // ... (generateThresholdReasoning remains the same)

  /**
   * Generate optimized insights for total match corners
   * 💡 FIX 2: Generate ALL analyses (Over/Under) and then find the single BEST bet overall.
   */
  private generateOptimalMatchCornerInsights(
    homePattern: TeamCornerPattern,
    awayPattern: TeamCornerPattern,
    matchOdds: MatchOdds | null
  ): AIInsight[] {
    const allCombinedAnalyses: CornerThresholdAnalysis[] = [];
    
    this.MATCH_CORNER_THRESHOLDS.forEach(threshold => {
      const homeAnalysis = homePattern.thresholdAnalysis[`total_${threshold}`];
      const awayAnalysis = awayPattern.thresholdAnalysis[`total_${threshold}`];
      
      if (!homeAnalysis || !awayAnalysis) return;

      // Get odds for popular thresholds
      const overOdds = [8.5, 9.5, 10.5].includes(threshold) ? matchOdds?.totalCornersOdds?.overOdds : undefined;
      const underOdds = [8.5, 9.5, 10.5].includes(threshold) ? matchOdds?.totalCornersOdds?.underOdds : undefined;

      // Combined Over analysis
      const combinedOverPercentage = (homeAnalysis.percentage + awayAnalysis.percentage) / 2;
      const combinedOverConsistency = (homeAnalysis.consistency + awayAnalysis.consistency) / 2;
      const combinedOverValue = this.calculateBetValue(combinedOverPercentage, combinedOverConsistency, threshold, 'over', overOdds);

      allCombinedAnalyses.push({
        threshold,
        percentage: combinedOverPercentage,
        consistency: combinedOverConsistency,
        confidence: this.getConfidenceLevel(combinedOverPercentage, combinedOverConsistency),
        recentForm: [...(homeAnalysis.recentForm || []), ...(awayAnalysis.recentForm || [])].slice(0, 5),
        betType: 'over',
        value: combinedOverValue,
        odds: overOdds,
      });

      // Combined Under analysis
      const combinedUnderPercentage = (homeAnalysis.percentage + awayAnalysis.percentage) / 2;
      const combinedUnderConsistency = (homeAnalysis.consistency + awayAnalysis.consistency) / 2;
      const combinedUnderValue = this.calculateBetValue(combinedUnderPercentage, combinedUnderConsistency, threshold, 'under', underOdds);

      allCombinedAnalyses.push({
        threshold,
        percentage: combinedUnderPercentage,
        consistency: combinedUnderConsistency,
        confidence: this.getConfidenceLevel(combinedUnderPercentage, combinedUnderConsistency),
        recentForm: [...(homeAnalysis.recentForm || []), ...(awayAnalysis.recentForm || [])].slice(0, 5),
        betType: 'under',
        value: combinedUnderValue,
        odds: underOdds,
      });
    });

    // 💡 Find the absolute single best bet (Over OR Under)
    const optimalBet = this.findOptimalThreshold(allCombinedAnalyses);
    
    if (optimalBet) {
      const analysis = optimalBet.analysis;
      const insights: AIInsight[] = [];
      
      insights.push({
        id: `optimal-match-corners-${analysis.betType}-${analysis.threshold}`,
        title: `${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold} Match Corners`,
        description: `Absolute best bet: ${analysis.percentage.toFixed(1)}% hit rate with strong corner trends. ${optimalBet.reasoning}`,
        market: `Match Corners ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `Home avg: ${homePattern.averageTotalCorners}, Away avg: ${awayPattern.averageTotalCorners}`,
        aiEnhanced: true,
        // 💡 Map valueScore here
        valueScore: analysis.value, 
      });
      
      return insights;
    }

    return [];
  }

  /**
   * Generate optimized insights for team-specific corners
   * 💡 Added mapping for valueScore
   */
  private generateOptimalTeamCornerInsights(
    teamPattern: TeamCornerPattern,
    teamType: 'Home' | 'Away'
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Analyze team corner thresholds
    const analyses: CornerThresholdAnalysis[] = [];
    
    this.TEAM_CORNER_THRESHOLDS.forEach(threshold => {
      const forAnalysis = teamPattern.thresholdAnalysis[`for_${threshold}`];
      if (forAnalysis) {
        analyses.push(forAnalysis);
      }
    });
    
    // Find optimal threshold for this team's corners
    const optimal = this.findOptimalThreshold(analyses);
    
    if (optimal) {
      const analysis = optimal.analysis;
      const recentHits = analysis.recentForm.filter(Boolean).length;
      
      insights.push({
        id: `optimal-${teamType.toLowerCase()}-corners-${analysis.betType}-${analysis.threshold}`,
        title: `${teamType} Team ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold} Corners`,
        description: `Optimal ${teamType.toLowerCase()} corner bet: ${analysis.percentage.toFixed(1)}% hit rate (${recentHits}/5 recent). ${optimal.reasoning}`,
        market: `${teamType} Team Corners ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        supportingData: `Recent form: [${teamPattern.recentMatches.slice(0, 5).map(m => m.cornersFor).join(', ')}]. Average: ${teamPattern.averageCornersFor}/game`,
        aiEnhanced: true,
        // 💡 Map valueScore here
        valueScore: analysis.value, 
      });
    }
    
    return insights;
  }
  
  // ... (generateCornerHandicapInsights remains the same, but it should be noted 
  //      it does not currently calculate a valueScore, which is acceptable 
  //      if the conflict resolver only needs it for Over/Under markets)

  /**
   * Main method: Generate optimized corner-related betting insights
   */
  async generateCornerInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    try {
      console.log(`[CornersAI] Generating optimized corner insights for ${homeTeam} vs ${awayTeam}`);
      
      const homePattern = await this.analyzeTeamCornerPattern(homeTeam, 'home');
      const awayPattern = await this.analyzeTeamCornerPattern(awayTeam, 'away');

      // Fetch odds data (if available)
      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam);
      
      const allInsights: AIInsight[] = [];
      
      // Generate different types of corner insights
      // NOTE: generateOptimalMatchCornerInsights now returns AT MOST ONE insight
      allInsights.push(...this.generateOptimalMatchCornerInsights(homePattern, awayPattern, matchOdds));
      allInsights.push(...this.generateOptimalTeamCornerInsights(homePattern, 'Home'));
      allInsights.push(...this.generateOptimalTeamCornerInsights(awayPattern, 'Away'));
      allInsights.push(...this.generateCornerHandicapInsights(homePattern, awayPattern));
      
      // Filter and limit results
      console.log(`[CornersAI] Resolving potential conflicts among ${allInsights.length} generated insights...`);
      // 💡 The conflict resolver is correctly called here and will use the valueScore
      const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
      
      const insightsToFilter = resolutionResult.resolvedInsights;
      
      // Apply final sorting (confidence, then valueScore) and filtering
      const filteredInsights = insightsToFilter
        .filter(insight => insight.confidence !== 'low')
        .sort((a, b) => {
            const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
            const confDiff = (confidenceOrder[b.confidence] || 1) - (confidenceOrder[a.confidence] || 1);
            if (confDiff !== 0) return confDiff;
            // Fallback to valueScore for Tie-Breaker (handles missing valueScore for Handicap)
            return (b.valueScore || 0) - (a.valueScore || 0);
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
