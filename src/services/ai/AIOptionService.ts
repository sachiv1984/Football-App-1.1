import { goalsAIService } from './goalsAIService';
import { cornersAIService } from './cornersAIService';
// 🎯 NEW: Import the Cards AI Service
import { cardsAIService } from './cardsAIService'; 
import { conflictResolverService } from './conflictResolverService';

// 🎯 FIX: Import the necessary types from the shared file
import { AIInsight, ConflictFlag } from '../../types/BettingAITypes'; 

/**
 * Orchestrates all AI services.
 * It enforces cross-market conflict resolution by passing the 
 * "High Confidence Under 2.5 Goals" flag to the Corner AI for penalty application.
 */
export class AIOptionService {

  /**
   * Generates all high-value betting insights for a match.
   * @param homeTeam The name of the home team.
   * @param awayTeam The name of the away team.
   * @returns A prioritized list of the top betting insights.
   */
  async generateMatchInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    console.log(`\n🤖 --- AI ORCHESTRATOR START: ${homeTeam} vs ${awayTeam} --- 🤖`);

    // 1. Generate Goal Insights FIRST (to get the conflict flag)
    const goalInsights = await goalsAIService.generateGoalInsights(homeTeam, awayTeam);
    
    // 2. Determine the CONFLICTING GOAL INSIGHT (Penalty Flag)
    // We use the imported ConflictFlag type here.
    const conflictingGoalInsight: ConflictFlag | null = this.getConflictFlag(goalInsights);
    
    if (conflictingGoalInsight) {
        console.log(`[Orchestrator] 🚩 Conflict Flag: High Confidence ${conflictingGoalInsight.betType.toUpperCase()} ${conflictingGoalInsight.betLine} Goals detected.`);
    }

    // 3. Generate Corner and Card Insights CONCURRENTLY
    
    const [
        cornerInsights,
        // 🎯 INTEGRATION: Add the Cards AI service call
        cardInsights 
    ] = await Promise.all([
        // Corners AI receives the conflict flag
        cornersAIService.generateCornerInsights(homeTeam, awayTeam, conflictingGoalInsight),
        // 🎯 INTEGRATION: Cards AI does not need the conflict flag
        cardsAIService.generateCardInsights(homeTeam, awayTeam)
    ]);

    // 4. Combine ALL Insights
    // 🎯 AGGREGATION: Include cardInsights
    const allInsights = [...goalInsights, ...cornerInsights, ...cardInsights]; 

    // 5. Run Final Conflict Resolution (Direct Over/Under, Redundancy, etc.)
    console.log(`[Orchestrator] Aggregated ${allInsights.length} raw insights. Starting final resolution and sorting.`);
    const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
    
    // 6. Final Sort and Limit (Prioritize High Confidence, then Value Score)
    const finalInsights = resolutionResult.resolvedInsights
      .sort((a, b) => {
        const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        // ConfDiff check uses 0 as fallback, which is safer than 1.
        const confDiff = (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0); 
        if (confDiff !== 0) return confDiff;
        
        // Use penalized/calculated valueScore for final ranking
        return (b.valueScore || 0) - (a.valueScore || 0);
      })
      .slice(0, 8); // Limit to the top 8 best recommendations

    console.log(`\n✅ --- AI ORCHESTRATOR COMPLETE: ${finalInsights.length} Top Insights --- ✅`);
    return finalInsights;
  }

  /**
   * Helper to check the generated goal insights for the specific conflict condition.
   */
  private getConflictFlag(insights: AIInsight[]): ConflictFlag | null {
    // Look for the "Under 2.5 Total Goals" insight with High Confidence
    const under25GoalInsight = insights.find(
      (insight) => 
        insight.title.includes('Under 2.5') && 
        insight.title.includes('Total Goals') &&
        insight.confidence === 'high'
    );

    if (under25GoalInsight) {
      // Return the minimal required structure to trigger the penalty in the Corner AI
      return {
        betLine: 2.5,
        betType: 'under',
        confidence: 'high' // Only interested in high confidence for penalty application
      };
    }
    return null;
  }
}

export const aiOptionService = new AIOptionService();
