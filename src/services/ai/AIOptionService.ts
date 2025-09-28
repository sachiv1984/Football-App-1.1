import { goalsAIService } from './goalsAIService';
import { cornersAIService } from './cornersAIService';
import { conflictResolverService } from './conflictResolverService';

// Re-defining shared interfaces for clarity and independence
interface AIInsight {
  id: string;
  title: string;
  description: string;
  market?: string;
  confidence: 'high' | 'medium' | 'low';
  odds?: string;
  supportingData?: string;
  aiEnhanced?: boolean;
  valueScore?: number;
}

interface ConflictingGoalInsight {
    betLine: number;
    betType: 'over' | 'under';
    confidence: 'high' | 'medium' | 'low';
}

/**
 * Orchestrates the Goal AI and Corner AI services.
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

    // 1. Generate Goal Insights FIRST
    const goalInsights = await goalsAIService.generateGoalInsights(homeTeam, awayTeam);
    
    // 2. Determine the CONFLICTING GOAL INSIGHT (Penalty Flag)
    const conflictingGoalInsight: ConflictingGoalInsight | null = this.getConflictFlag(goalInsights);
    
    if (conflictingGoalInsight) {
        console.log(`[Orchestrator] 🚩 Conflict Flag: High Confidence ${conflictingGoalInsight.betType.toUpperCase()} ${conflictingGoalInsight.betLine} Goals detected.`);
    }

    // 3. Generate Corner Insights, passing the conflict flag (penalty is applied internally)
    // NOTE: We assume the external Goal AI will generate the full list, and the 
    // Corner AI will handle the penalty on Over Corners based on the flag.
    const cornerInsights = await cornersAIService.generateCornerInsights(homeTeam, awayTeam, conflictingGoalInsight);

    // 4. Combine Insights
    const allInsights = [...goalInsights, ...cornerInsights];

    // 5. Run Final Conflict Resolution (Direct Over/Under, Redundancy, etc.)
    const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
    
    // 6. Final Sort and Limit (Prioritize High Confidence, then Value Score)
    const finalInsights = resolutionResult.resolvedInsights
      .sort((a, b) => {
        const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
        const confDiff = (confidenceOrder[b.confidence] || 1) - (confidenceOrder[a.confidence] || 1);
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
  private getConflictFlag(insights: AIInsight[]): ConflictingGoalInsight | null {
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
