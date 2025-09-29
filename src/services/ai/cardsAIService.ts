// src/services/ai/cardsAIService.ts
import { supabaseCardsService, DetailedCardStats } from '../stats/supabaseCardsService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService';
import { statisticalAIGenerator } from '../../utils/StatisticalAIGenerator'; // 🚀 NEW UTILITY IMPORT

// 💡 NEW: Import standardized types
import { 
  AIInsight, 
  MatchOdds, 
  ThresholdAnalysis, 
  OptimalThreshold 
} from '../../types/BettingAITypes'; 

// Use standardized interfaces, extending ThresholdAnalysis for clarity
interface CardThresholdAnalysis extends ThresholdAnalysis {}
interface OptimalThresholdType extends OptimalThreshold<CardThresholdAnalysis> {}


// CRITICAL FIX: Explicitly define the match detail structure to include 'venue'
interface CardPatternMatchDetail {
    opponent: string;
    cardsFor: number;
    cardsAgainst: number;
    totalCards: number;
    venue: 'home' | 'away' | string; 
    date?: string; 
    matchweek?: number;
}

interface TeamCardPattern {
  team: string;
  venue: 'home' | 'away';
  averageCardsShown: number;
  averageCardsAgainst: number;
  averageTotalCards: number;
  thresholdAnalysis: {
    [key: string]: CardThresholdAnalysis; 
  };
  recentMatches: Array<CardPatternMatchDetail>;
}

type CardType = 'total' | 'for' | 'against';

export class CardsAIService {
  // --- CACHING PROPERTIES REMAINS DOMAIN-SPECIFIC ---
  private patternCache: Map<string, { pattern: TeamCardPattern; timestamp: number }> = new Map();
  private readonly PATTERN_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  // --- END CACHING PROPERTIES ---

  // ❌ REMOVED: CONFIDENCE_THRESHOLDS (Now in StatisticalAIGenerator)
  // ❌ REMOVED: CONSISTENCY_THRESHOLDS (Now in StatisticalAIGenerator)
  private readonly CARD_THRESHOLDS = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5]; // Keep as reference

  /**
   * Helper to get card count based on type
   */
  private getCardCount(
    match: { totalCards: number; cardsFor: number; cardsAgainst: number },
    type: CardType
  ) {
    switch (type) {
      case 'for': return match.cardsFor;
      case 'against': return match.cardsAgainst;
      default: return match.totalCards;
    }
  }

  // --- Core Card Threshold Analysis Functions ---

  /**
   * Add variance analysis (Remains domain-specific)
   */
  private calculateVariance(matches: CardPatternMatchDetail[]): number {
      if (matches.length === 0) return 0;
      const cards = matches.map(m => m.totalCards);
      const avg = cards.reduce((s, c) => s + c, 0) / cards.length;
      
      const variance = cards.reduce((s, c) => s + Math.pow(c - avg, 2), 0) / cards.length;
      
      return Math.sqrt(variance);
  }

  /**
   * Helper to create an empty analysis object when no match data is available.
   */
  private createEmptyAnalysis(threshold: number, betType: 'over' | 'under', odds?: number): CardThresholdAnalysis {
    console.warn(`[CardsAI] Creating empty analysis for ${betType} ${threshold} - no match data available`);
    return {
        threshold,
        percentage: 0,
        consistency: 0,
        confidence: 'low',
        recentForm: [],
        betType,
        value: 0,
        odds
    } as CardThresholdAnalysis;
  }

  /**
   * Analyze card threshold for an 'Over' bet type.
   * 💡 REFACTORED: Delegates Consistency, Confidence, and Value to utility.
   */
  private analyzeCardThresholdOver(
    matches: Array<{ totalCards: number; cardsFor: number; cardsAgainst: number }>,
    threshold: number,
    type: CardType,
    odds?: number
  ): CardThresholdAnalysis {
    
    if (matches.length === 0) {
      return this.createEmptyAnalysis(threshold, 'over', odds);
    }
    
    const getCount = (match: { totalCards: number; cardsFor: number; cardsAgainst: number }) => 
      this.getCardCount(match, type);

    const matchesOver = matches.filter(match => getCount(match) > threshold);
    const overPercentage = (matchesOver.length / matches.length) * 100;

    const recentMatches = matches.slice(0, 5);
    const recentOverForm = recentMatches.map(match => getCount(match) > threshold);
    const overHits = recentOverForm.filter(Boolean).length;
    
    const sampleSize = Math.min(5, recentMatches.length || 1); 

    // 🚀 NEW: Use utility to calculate consistency (standardized low sample penalty)
    const overConsistency = statisticalAIGenerator.calculateConsistency(overHits, sampleSize);

    // 🚀 NEW: Use utility for Confidence and Value (EV)
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
    } as CardThresholdAnalysis;
  }

  /**
   * Analyze card threshold for an 'Under' bet type.
   * 💡 REFACTORED: Delegates Consistency, Confidence, and Value to utility.
   */
  private analyzeCardThresholdUnder(
    matches: Array<{ totalCards: number; cardsFor: number; cardsAgainst: number }>,
    threshold: number,
    type: CardType,
    odds?: number
  ): CardThresholdAnalysis {

    if (matches.length === 0) {
      return this.createEmptyAnalysis(threshold, 'under', odds);
    }
    
    const getCount = (match: { totalCards: number; cardsFor: number; cardsAgainst: number }) => 
      this.getCardCount(match, type);

    const matchesUnder = matches.filter(match => getCount(match) < threshold);
    const underPercentage = (matchesUnder.length / matches.length) * 100;

    const recentMatches = matches.slice(0, 5);
    const recentUnderForm = recentMatches.map(match => getCount(match) < threshold);
    const underHits = recentUnderForm.filter(Boolean).length;
    
    const sampleSize = Math.min(5, recentMatches.length || 1); 

    // 🚀 NEW: Use utility to calculate consistency
    const underConsistency = statisticalAIGenerator.calculateConsistency(underHits, sampleSize);

    // 🚀 NEW: Use utility for Confidence and Value (EV)
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
    } as CardThresholdAnalysis;
  }
  
  /**
   * Analyze specific card threshold with enhanced value calculation.
   */
  private analyzeCardThreshold(
    matches: Array<{ totalCards: number; cardsFor: number; cardsAgainst: number }>,
    threshold: number,
    type: CardType,
    matchOdds: MatchOdds | null
  ): CardThresholdAnalysis {
    
    if (matches.length === 0) {
        return this.createEmptyAnalysis(threshold, 'over', undefined); 
    }

    let overOdds: number | undefined;
    let underOdds: number | undefined;
    
    // (Odds assignment logic remains the same)
    if (type === 'total' && threshold === 4.5 && matchOdds?.totalCardsOdds) {
      overOdds = matchOdds.totalCardsOdds.overOdds;
      underOdds = matchOdds.totalCardsOdds.underOdds;
    } 
    else if (type === 'for' && threshold === 2.5 && matchOdds?.homeCardsOdds) {
      overOdds = matchOdds.homeCardsOdds.overOdds;
      underOdds = matchOdds.homeCardsOdds.underOdds;
    } 
    else if (type === 'against' && threshold === 2.5 && matchOdds?.awayCardsOdds) {
      overOdds = matchOdds.awayCardsOdds.overOdds;
      underOdds = matchOdds.awayCardsOdds.underOdds;
    }

    const overAnalysis = this.analyzeCardThresholdOver(matches, threshold, type, overOdds);
    const underAnalysis = this.analyzeCardThresholdUnder(matches, threshold, type, underOdds);

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

  // ... (analyzeTeamCardPattern remains the same as it's domain/cache specific)

  // ❌ REMOVED: calculateBetValue (Now in StatisticalAIGenerator)

  // 🚀 NEW: Use utility's downgrade confidence
  private downgradeConfidence(confidence: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
      return statisticalAIGenerator.downgradeConfidence(confidence);
  }

  // ❌ REMOVED: getConfidenceLevel (Now in StatisticalAIGenerator)

  /**
   * Find optimal threshold from multiple options
   * 💡 REFACTORED: Uses the centralized utility function.
   */
  private findOptimalThreshold(analyses: CardThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThresholdType | null {
    // 🚀 NEW: Call the centralized utility method
    const result = statisticalAIGenerator.findOptimal(analyses, betType);
    
    // Cast generic ThresholdAnalysis to local type
    if (!result) return null;
    return result as OptimalThresholdType; 
  }

  // ❌ REMOVED: generateThresholdReasoning (Now in StatisticalAIGenerator) - We use the reasoning from the OptimalThreshold result.
  private generateThresholdReasoning(optimal: CardThresholdAnalysis, alternatives: CardThresholdAnalysis[]): string {
    // We can call the utility directly here if we want to ensure the logic remains centralized
    return statisticalAIGenerator['generateReasoning'](optimal, alternatives);
  }

  /**
   * Generate optimized insights for total match cards
   */
  private generateOptimalTotalCardsInsights(
    homePattern: TeamCardPattern,
    awayPattern: TeamCardPattern,
    matchOdds: MatchOdds | null
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // (Data combination and variance calculation remains domain-specific)
    const combinedMatchDetails = [
      ...homePattern.recentMatches, 
      ...awayPattern.recentMatches
    ];
    // ... (deduplication logic)
    const uniqueMatchesMap = new Map<string, CardPatternMatchDetail>();
    combinedMatchDetails.forEach(match => {
        const dateKey = match.date || 'unknown';
        const matchweekKey = match.matchweek || 'unknown';
        const key = `${dateKey}-${matchweekKey}-${match.totalCards}`; 

        if (!uniqueMatchesMap.has(key)) {
            uniqueMatchesMap.set(key, match);
        }
    });

    const uniqueMatchDetails = Array.from(uniqueMatchesMap.values()).slice(0, 20); 

    const totalMatchCardData: Array<{ totalCards: number; cardsFor: number; cardsAgainst: number }> = 
        uniqueMatchDetails.map(match => ({
            totalCards: match.totalCards,
            cardsFor: match.totalCards,
            cardsAgainst: match.totalCards,
        }));
        
    if (totalMatchCardData.length < 3) return [];
    
    const variance = this.calculateVariance(uniqueMatchDetails);
    let varianceDowngradeReason = '';

    if (variance > 2.5) {
      varianceDowngradeReason = ` (Variance: ${variance.toFixed(2)} - High risk, confidence reduced).`;
    }
    
    const combinedAnalyses: CardThresholdAnalysis[] = [];
    const relevantThresholds = this.getRelevantThresholds(uniqueMatchDetails); 

    relevantThresholds.forEach(threshold => {
      
      const overOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.overOdds : undefined;
      const underOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.underOdds : undefined;

      const overAnalysis = this.analyzeCardThresholdOver(totalMatchCardData, threshold, 'total', overOdds);
      const underAnalysis = this.analyzeCardThresholdUnder(totalMatchCardData, threshold, 'total', underOdds);
      
      combinedAnalyses.push(overAnalysis);
      combinedAnalyses.push(underAnalysis);
    });

    const optimalOver = this.findOptimalThreshold(combinedAnalyses, 'over');
    if (optimalOver) {
      let analysis = optimalOver.analysis;
      
      // Apply Variance Downgrade (Uses the utility method)
      let finalConfidence = analysis.confidence;
      if (variance > 2.5 && analysis.confidence !== 'low') {
        finalConfidence = this.downgradeConfidence(analysis.confidence);
      }
      
      const recentHits = analysis.recentForm.filter(Boolean).length;
      const consistencyAdj = analysis.consistency >= 0.8 ? 'Excellent consistency' : analysis.consistency >= 0.6 ? 'Good consistency' : 'Moderate consistency';

      const isValue = analysis.value > 0.0001;
      const supportReasoning = isValue ? `Reasoning: ${optimalOver.reasoning}` : 'Reasoning: Optimal confidence/probability chosen, EV margin is zero.';

      insights.push({
        id: `optimal-total-cards-over-${analysis.threshold}`,
        title: `Total Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        description: `Strong **${analysis.betType.toUpperCase()} ${analysis.threshold}** bet with **${analysis.percentage.toFixed(1)}%** historical success rate. Recent form: ${recentHits}/5 matches hit this threshold. **${consistencyAdj}**. ${optimalOver.reasoning}${varianceDowngradeReason}`.trim().replace(/\s\s+/g, ' '),
        market: `Total Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: finalConfidence, 
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `EV: ${analysis.value.toFixed(4)} | ${supportReasoning}`,
        aiEnhanced: true,
        valueScore: analysis.value,
      });
    }

    // ... (similar block for optimalUnder)
    const optimalUnder = this.findOptimalThreshold(combinedAnalyses, 'under');
    if (optimalUnder) {
        let analysis = optimalUnder.analysis;
        
        let finalConfidence = analysis.confidence;
        if (variance > 2.5 && analysis.confidence !== 'low') {
            finalConfidence = this.downgradeConfidence(analysis.confidence);
        }
        
        const recentHits = analysis.recentForm.filter(Boolean).length;
        const consistencyAdj = analysis.consistency >= 0.8 ? 'Excellent consistency' : analysis.consistency >= 0.6 ? 'Good consistency' : 'Moderate consistency';

        const isValue = analysis.value > 0.0001;
        const supportReasoning = isValue ? `Reasoning: ${optimalUnder.reasoning}` : 'Reasoning: Optimal confidence/probability chosen, EV margin is zero.';

        insights.push({
            id: `optimal-total-cards-under-${analysis.threshold}`,
            title: `Total Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
            description: `Strong **${analysis.betType.toUpperCase()} ${analysis.threshold}** bet with **${analysis.percentage.toFixed(1)}%** historical success rate. Recent form: ${recentHits}/5 matches hit this threshold. **${consistencyAdj}**. ${optimalUnder.reasoning}${varianceDowngradeReason}`.trim().replace(/\s\s+/g, ' '),
            market: `Total Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
            confidence: finalConfidence, 
            odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
            supportingData: `EV: ${analysis.value.toFixed(4)} | ${supportReasoning}`,
            aiEnhanced: true,
            valueScore: analysis.value,
        });
    }

    // Sort by Confidence, then by EV
    return insights.sort((a, b) => {
      const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const confidenceDiff = (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
      
      if (confidenceDiff !== 0) {
          return confidenceDiff;
      }
      return (b.valueScore ?? 0) - (a.valueScore ?? 0);
    });
  }

  // ... (generateOptimalTeamCardsInsights logic remains largely the same, but uses the refactored threshold analysis)

  /**
   * Main method: Generate optimized card-related betting insights
   */
  async generateCardInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    try {
      console.log(`[CardsAI] Generating optimized insights for ${homeTeam} vs ${awayTeam}`);
      
      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam); 
      
      const homePattern = await this.analyzeTeamCardPattern(homeTeam, 'home', matchOdds);
      const awayPattern = await this.analyzeTeamCardPattern(awayTeam, 'away', matchOdds);

      const allInsights: AIInsight[] = [];
      
      allInsights.push(...this.generateOptimalTotalCardsInsights(homePattern, awayPattern, matchOdds));
      allInsights.push(...this.generateOptimalTeamCardsInsights(homePattern, 'Home', matchOdds));
      allInsights.push(...this.generateOptimalTeamCardsInsights(awayPattern, 'Away', matchOdds));
      allInsights.push(...this.generateMostCardsInsights(homePattern, awayPattern, matchOdds));
      
      console.log(`[CardsAI] Resolving potential conflicts among ${allInsights.length} generated insights...`);
      const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
      
      const insightsToFilter = resolutionResult.resolvedInsights as AIInsight[];
      
      // 🚀 NEW: Standardized final sorting based on Confidence and ValueScore (EV)
      const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      
      const sortedInsights = insightsToFilter
        .filter(insight => insight.confidence !== 'low') 
        .sort((a, b) => {
            const confidenceDiff = (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
            
            if (confidenceDiff !== 0) {
                return confidenceDiff;
            }
            
            return (b.valueScore ?? 0) - (a.valueScore ?? 0);
        });

      const filteredInsights = sortedInsights.slice(0, 6);
      
      console.log(`[CardsAI] ✅ Final insights after resolution: ${filteredInsights.length}`);
      console.log(`[CardsAI] Resolution Summary: ${resolutionResult.summary}`);
      return filteredInsights;
      
    } catch (error) {
      console.error('[CardsAI] Error generating card insights:', error);
      return [];
    }
  }
}

export const cardsAIService = new CardsAIService();
