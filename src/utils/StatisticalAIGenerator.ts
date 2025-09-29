import { ThresholdAnalysis, ConflictFlag } from '../types/BettingAITypes';

// ====================================================================
// 1. SHARED CONSTANTS (Extracted from all three services)
// ====================================================================

/**
 * Standardized hit rate percentage thresholds for confidence levels.
 * e.g., A 75%+ hit rate suggests High confidence.
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.75, // 75%+ hit rate
  MEDIUM: 0.60, // 60-74% hit rate
  LOW: 0.45 // 45-59% hit rate
};

/**
 * Standardized recent form consistency thresholds (based on last 5 matches).
 */
export const CONSISTENCY_THRESHOLDS = {
  EXCELLENT: 0.8, // 4/5 or 5/5 recent matches
  GOOD: 0.6, // 3/5 recent matches
  POOR: 0.4 // 2/5 or less recent matches
};

/**
 * Global penalty value for cross-market conflicts (e.g., High Confidence Under Goals
 * conflicting with Over Corners). This should be a large negative number 
 * relative to a good EV score (EV is typically between 0.00 and 0.25).
 */
const CROSS_MARKET_PENALTY_EV = -0.50;

/**
 * Global constant for the penalty applied to consistency when the historical 
 * sample size is low (from CardsAIService).
 */
const LOW_SAMPLE_SIZE_PENALTY_FACTOR = 0.2; 

// ====================================================================
// 2. CORE STATISTICAL UTILITIES
// ====================================================================

export class StatisticalAIGenerator {

  /**
   * Calculates consistency score and applies penalty for low sample size.
   * This logic is extracted and standardized from CardsAIService.
   * @param recentHits The number of hits in the recent window (e.g., 3)
   * @param sampleSize The actual size of the recent window (e.g., 5, or less if incomplete)
   * @returns A consistency score between 0 and 1, penalized for low sample.
   */
  public calculateConsistency(recentHits: number, sampleSize: number): number {
    if (sampleSize === 0) return 0;

    let consistency = recentHits / sampleSize;

    // Apply penalty for low sample size (standardized from CardsAIService)
    if (sampleSize < 5) {
      // Consistency factor: 1.0 for 5 matches, 0.8 for 4, 0.6 for 3.
      const maxConsistencyFactor = sampleSize * LOW_SAMPLE_SIZE_PENALTY_FACTOR; 
      consistency = consistency * maxConsistencyFactor;
      consistency = Math.max(consistency, 0.1); // Floor for stability
    }
    
    return consistency;
  }

  /**
   * Calculates the Weighted Expected Value (EV) of a bet.
   * This is the standardized value model from CardsAIService.
   * EV = [ (P_win * Profit) - (P_loss * Loss) ] * Consistency
   * * @param probability Our calculated success probability (0-100)
   * @param consistency The calculated consistency score (0-1)
   * @param odds The bookmaker's odds (e.g., 2.05)
   * @param conflictFlag Optional flag to apply cross-market penalty if a conflict exists.
   * @returns The Weighted Expected Value (EV). Positive EV suggests a value bet.
   */
  public calculateExpectedValue(
    probability: number,
    consistency: number,
    odds?: number,
    conflictFlag?: ConflictFlag | null
  ): number {
    
    // Require minimal odds for EV calculation
    if (!odds || odds <= 1.05) { 
        return 0; 
    }

    const calculatedProbability = probability / 100;
    const impliedProbability = 1 / odds;
    
    // Core Expected Value (EV) calculation:
    // EV = (P_win * Profit) - (P_loss * Loss) where Profit = Odds - 1
    const rawEdge = (calculatedProbability * (odds - 1)) - ((1 - calculatedProbability) * 1);
    
    // Weight the raw EV by consistency. This rewards highly consistent patterns.
    let weightedEV = rawEdge * consistency;
    
    // Apply cross-market conflict penalty (standardized from CornersAIService logic)
    // NOTE: The conflict flag needs domain logic in the calling service to decide if it applies.
    if (conflictFlag && weightedEV > 0) { // Only penalize if it was initially a value bet
        weightedEV += CROSS_MARKET_PENALTY_EV; 
    }
    
    // Ensure result is a clean number for display
    return Math.round(weightedEV * 10000) / 10000;
  }

  /**
   * Determines the confidence level based on hit percentage and consistency.
   * @returns 'high', 'medium', or 'low'.
   */
  public getConfidenceLevel(percentage: number, consistency: number): 'high' | 'medium' | 'low' {
    if (percentage >= CONFIDENCE_THRESHOLDS.HIGH * 100 && consistency >= CONSISTENCY_THRESHOLDS.GOOD) {
      return 'high';
    } else if (percentage >= CONFIDENCE_THRESHOLDS.MEDIUM * 100 && consistency >= CONSISTENCY_THRESHOLDS.POOR) {
      return 'medium';
    }
    return 'low';
  }
  
  /**
   * Helper to downgrade confidence one level (e.g., for variance penalties).
   */
  public downgradeConfidence(confidence: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
      if (confidence === 'high') return 'medium';
      if (confidence === 'medium') return 'low';
      return 'low';
  }

  // ====================================================================
  // 3. CORE SELECTION & REASONING UTILITIES
  // ====================================================================

  /**
   * Finds the optimal threshold analysis based on Confidence then Expected Value.
   * This logic is extracted and standardized from all three services.
   */
  public findOptimal<T extends ThresholdAnalysis>(
    analyses: T[], 
    betType?: 'over' | 'under'
  ): { analysis: T, reasoning: string, alternativeConsidered: T[] } | null {
    
    // Only filter out "low" confidence predictions for the optimal threshold finder.
    let validAnalyses = analyses.filter(a => a.confidence !== 'low');
    
    if (betType) {
      validAnalyses = validAnalyses.filter(a => a.betType === betType);
    }
    
    if (validAnalyses.length === 0) return null;
    
    // Sort by Expected Value (EV), favoring the highest value bets
    const sorted = validAnalyses.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    const optimal = sorted[0];
    
    const reasoning = this.generateReasoning(optimal, sorted.slice(1, 3));
    
    return {
      analysis: optimal,
      reasoning,
      alternativeConsidered: sorted.slice(1, 3)
    };
  }

  /**
   * Generates technical reasoning for the selected optimal threshold (used in supporting data).
   */
  private generateReasoning(optimal: ThresholdAnalysis, alternatives: ThresholdAnalysis[]): string {
    let reasoning = `Optimal EV Score: ${optimal.value.toFixed(4)}`;
    
    if (alternatives.length > 0) {
      const alt = alternatives[0];
      const optimalValue = optimal.value ?? 0;
      const altValue = alt.value ?? 0;

      // Only add detail if a meaningful alternative was considered and beaten
      if (optimalValue > altValue + 0.005) {
        reasoning += `. Beat Alt (${alt.betType} ${alt.threshold}, EV ${alt.value.toFixed(4)}) for higher EV edge.`;
      } else if (optimal.betType !== alt.betType) {
        reasoning += `. Best option chosen over alternative bet type (EV: ${alt.value.toFixed(4)}).`;
      }
    }
    
    return reasoning;
  }
}

export const statisticalAIGenerator = new StatisticalAIGenerator();
