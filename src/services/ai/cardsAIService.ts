// src/services/ai/cardsAIService.ts
import { supabaseCardsService, DetailedCardStats } from '../stats/supabaseCardsService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService';

// Define the MatchOdds interface locally to match oddsAPIService
interface MatchOdds {
  matchId: string;
  totalCardsOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  homeCardsOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  awayCardsOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  mostCardsOdds?: {
    market: string;
    homeOdds: number;
    awayOdds: number;
    drawOdds: number;
  };
  lastFetched: number;
}

// Local type definition for AI insights
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
}

interface CardThresholdAnalysis {
  threshold: number;
  percentage: number;
  consistency: number;
  confidence: 'high' | 'medium' | 'low';
  recentForm: boolean[]; // Last 5 matches - did they hit this threshold?
  betType: 'over' | 'under';
  value: number; // Value score for betting (higher = better bet)
  odds?: number; // Store the specific odds used for the value calculation
}

interface OptimalThreshold {
  analysis: CardThresholdAnalysis;
  reasoning: string;
  alternativeConsidered: CardThresholdAnalysis[];
}

interface TeamCardPattern {
  team: string;
  venue: 'home' | 'away';
  averageCardsShown: number;
  averageCardsAgainst: number;
  averageTotalCards: number;
  thresholdAnalysis: {
    over05: CardThresholdAnalysis;
    over15: CardThresholdAnalysis;
    over25: CardThresholdAnalysis;
    over35: CardThresholdAnalysis;
    over45: CardThresholdAnalysis;
    over55: CardThresholdAnalysis;
    over65?: CardThresholdAnalysis;
    over75?: CardThresholdAnalysis;
    over85?: CardThresholdAnalysis;
  };
  recentMatches: Array<{
    opponent: string;
    cardsFor: number;
    cardsAgainst: number;
    totalCards: number;
  }>;
}

type CardType = 'total' | 'for' | 'against';

export class CardsAIService {
  private readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.75,    // 75%+ hit rate
    MEDIUM: 0.60,  // 60-74% hit rate  
    LOW: 0.45      // 45-59% hit rate
  };

  private readonly CONSISTENCY_THRESHOLDS = {
    EXCELLENT: 0.8,  // 4/5 or 5/5 recent matches
    GOOD: 0.6,       // 3/5 recent matches
    POOR: 0.4        // 2/5 or less recent matches
  };

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
   * Analyze card threshold for an 'Over' bet type.
   */
  private analyzeCardThresholdOver(
    matches: Array<{ totalCards: number; cardsFor: number; cardsAgainst: number }>,
    threshold: number,
    type: CardType,
    odds?: number // Specific odds for this over bet
  ): CardThresholdAnalysis {
    
    const getCount = (match: { totalCards: number; cardsFor: number; cardsAgainst: number }) => 
      this.getCardCount(match, type);

    // Calculate over percentage
    const matchesOver = matches.filter(match => getCount(match) > threshold);
    const overPercentage = (matchesOver.length / matches.length) * 100;

    // Analyze recent form
    const recentMatches = matches.slice(0, 5);
    const recentOverForm = recentMatches.map(match => getCount(match) > threshold);
    const overHits = recentOverForm.filter(Boolean).length;
    const overConsistency = overHits / Math.min(5, recentMatches.length);

    // Confidence and Value
    const overConfidence = this.getConfidenceLevel(overPercentage, overConsistency);
    const overValue = this.calculateBetValue(overPercentage, overConsistency, threshold, 'over', odds);

    return {
      threshold,
      percentage: Math.round(overPercentage * 10) / 10,
      consistency: Math.round(overConsistency * 100) / 100,
      confidence: overConfidence,
      recentForm: recentOverForm,
      betType: 'over',
      value: overValue,
      odds,
    };
  }

  /**
   * Analyze card threshold for an 'Under' bet type.
   */
  private analyzeCardThresholdUnder(
    matches: Array<{ totalCards: number; cardsFor: number; cardsAgainst: number }>,
    threshold: number,
    type: CardType,
    odds?: number // Specific odds for this under bet
  ): CardThresholdAnalysis {
    
    const getCount = (match: { totalCards: number; cardsFor: number; cardsAgainst: number }) => 
      this.getCardCount(match, type);

    // Calculate under percentage
    const matchesUnder = matches.filter(match => getCount(match) < threshold);
    const underPercentage = (matchesUnder.length / matches.length) * 100;

    // Analyze recent form
    const recentMatches = matches.slice(0, 5);
    const recentUnderForm = recentMatches.map(match => getCount(match) < threshold);
    const underHits = recentUnderForm.filter(Boolean).length;
    const underConsistency = underHits / Math.min(5, recentMatches.length);

    // Confidence and Value
    const underConfidence = this.getConfidenceLevel(underPercentage, underConsistency);
    const underValue = this.calculateBetValue(underPercentage, underConsistency, threshold, 'under', odds);

    return {
      threshold,
      percentage: Math.round(underPercentage * 10) / 10,
      consistency: Math.round(underConsistency * 100) / 100,
      confidence: underConfidence,
      recentForm: recentUnderForm,
      betType: 'under',
      value: underValue,
      odds,
    };
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
    
    // Get specific odds based on type and threshold
    let overOdds: number | undefined;
    let underOdds: number | undefined;
    
    // Only integrate odds for specific thresholds to save API calls
    if (type === 'total' && threshold === 4.5 && matchOdds?.totalCardsOdds) {
      overOdds = matchOdds.totalCardsOdds.overOdds;
      underOdds = matchOdds.totalCardsOdds.underOdds;
    } else if (type === 'for' && matchOdds?.homeCardsOdds) {
      overOdds = matchOdds.homeCardsOdds.overOdds;
      underOdds = matchOdds.homeCardsOdds.underOdds;
    } else if (type === 'against' && matchOdds?.awayCardsOdds) {
      overOdds = matchOdds.awayCardsOdds.overOdds;
      underOdds = matchOdds.awayCardsOdds.underOdds;
    }

    const overAnalysis = this.analyzeCardThresholdOver(matches, threshold, type, overOdds);
    const underAnalysis = this.analyzeCardThresholdUnder(matches, threshold, type, underOdds);

    // Pick best option: prioritize high confidence, then value
    if (overAnalysis.confidence === 'high' && overAnalysis.value >= underAnalysis.value) {
      return overAnalysis;
    } else if (underAnalysis.confidence === 'high' && underAnalysis.value >= overAnalysis.value) {
      return underAnalysis;
    } else if (overAnalysis.confidence === 'medium' && overAnalysis.value >= underAnalysis.value) {
      return overAnalysis;
    } else if (underAnalysis.confidence === 'medium' && underAnalysis.value >= overAnalysis.value) {
      return underAnalysis;
    } else {
      // Fallback: Return the one with the highest value
      return overAnalysis.value > underAnalysis.value ? overAnalysis : underAnalysis;
    }
  }

  /**
   * Analyze card patterns for a specific team
   */
  private async analyzeTeamCardPattern(teamName: string, venue: 'home' | 'away'): Promise<TeamCardPattern> {
    const teamStats = await supabaseCardsService.getTeamCardStats(teamName);
    
    if (!teamStats) {
      throw new Error(`No card data found for team: ${teamName}`);
    }

    const relevantMatches = teamStats.matchDetails;
    
    const averageCardsShown = teamStats.cardsShown / teamStats.matches;
    const averageCardsAgainst = teamStats.cardsAgainst / teamStats.matches;
    const averageTotalCards = averageCardsShown + averageCardsAgainst;

    // Analyze each threshold with both over and under
    const thresholdAnalysis = {
      over05: this.analyzeCardThreshold(relevantMatches, 0.5, 'total', null),
      over15: this.analyzeCardThreshold(relevantMatches, 1.5, 'total', null),
      over25: this.analyzeCardThreshold(relevantMatches, 2.5, 'total', null),
      over35: this.analyzeCardThreshold(relevantMatches, 3.5, 'total', null),
      over45: this.analyzeCardThreshold(relevantMatches, 4.5, 'total', null),
      over55: this.analyzeCardThreshold(relevantMatches, 5.5, 'total', null),
      over65: this.analyzeCardThreshold(relevantMatches, 6.5, 'total', null),
      over75: this.analyzeCardThreshold(relevantMatches, 7.5, 'total', null),
      over85: this.analyzeCardThreshold(relevantMatches, 8.5, 'total', null)
    };

    return {
      team: teamName,
      venue,
      averageCardsShown: Math.round(averageCardsShown * 100) / 100,
      averageCardsAgainst: Math.round(averageCardsAgainst * 100) / 100,
      averageTotalCards: Math.round(averageTotalCards * 100) / 100,
      thresholdAnalysis,
      recentMatches: relevantMatches.slice(0, 5).map(match => ({
        opponent: match.opponent,
        cardsFor: match.cardsFor,
        cardsAgainst: match.cardsAgainst,
        totalCards: match.totalCards
      }))
    };
  }

  /**
   * Calculate betting value score
   */
  private calculateBetValue(
    percentage: number, 
    consistency: number,
    threshold: number,
    betType: 'over' | 'under',
    odds?: number
  ): number {
    // Start with the base model score
    let baseValue = percentage * consistency;
    
    // Apply threshold difficulty adjustment (cards are more common than goals)
    if (betType === 'over') {
      baseValue += (threshold * 3); // Reduced multiplier for cards
    } else {
      baseValue += ((10 - threshold) * 3);
    }
    
    // Odds-based value calculation (The Edge)
    if (odds && odds > 1.05) {
      const calculatedProbability = percentage / 100;
      const impliedProbability = 1 / odds;
      const edge = calculatedProbability - impliedProbability;
      
      if (edge > 0.05) { // Significant positive edge (5%+)
         baseValue += (edge * 2000) * consistency;
         baseValue += 500;
      } else if (edge < -0.10) {
         baseValue += edge * 100;
      }
    }
    
    return baseValue;
  }

  /**
   * Get confidence level based on percentage and consistency
   */
  private getConfidenceLevel(percentage: number, consistency: number): 'high' | 'medium' | 'low' {
    if (percentage >= this.CONFIDENCE_THRESHOLDS.HIGH * 100 && consistency >= this.CONSISTENCY_THRESHOLDS.GOOD) {
      return 'high';
    } else if (percentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM * 100 && consistency >= this.CONSISTENCY_THRESHOLDS.POOR) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Find optimal threshold from multiple options
   */
  private findOptimalThreshold(analyses: CardThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThreshold | null {
    let validAnalyses = analyses.filter(a => a.confidence !== 'low');
    
    if (betType) {
      validAnalyses = validAnalyses.filter(a => a.betType === betType);
    }
    
    if (validAnalyses.length === 0) return null;
    
    const sorted = validAnalyses.sort((a, b) => b.value - a.value);
    const optimal = sorted[0];
    
    const reasoning = this.generateThresholdReasoning(optimal, sorted.slice(1, 3));
    
    return {
      analysis: optimal,
      reasoning,
      alternativeConsidered: sorted.slice(1, 3)
    };
  }

  /**
   * Generate reasoning for threshold selection
   */
  private generateThresholdReasoning(optimal: CardThresholdAnalysis, alternatives: CardThresholdAnalysis[]): string {
    let reasoning = `${optimal.betType === 'over' ? 'Over' : 'Under'} ${optimal.threshold} selected for optimal value`;
    
    if (alternatives.length > 0) {
      const alt = alternatives[0];
      if (optimal.betType === 'over' && alt.betType === 'over' && alt.threshold < optimal.threshold) {
        reasoning += `. Higher threshold chosen over ${alt.threshold} for better odds despite ${alt.percentage}% hit rate.`;
      } else if (optimal.betType === 'under' && alt.betType === 'under' && alt.threshold > optimal.threshold) {
        reasoning += `. Lower threshold chosen over ${alt.threshold} for better odds despite ${alt.percentage}% hit rate.`;
      }
    }
    
    return reasoning;
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

    const homeAnalyses = Object.values(homePattern.thresholdAnalysis);
    const awayAnalyses = Object.values(awayPattern.thresholdAnalysis);

    const combinedAnalyses: CardThresholdAnalysis[] = [];
    const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5];

    for (const threshold of thresholds) {
      const homeOver = homeAnalyses.find(a => a.threshold === threshold && a.betType === 'over');
      const awayOver = awayAnalyses.find(a => a.threshold === threshold && a.betType === 'over');
      const homeUnder = homeAnalyses.find(a => a.threshold === threshold && a.betType === 'under');
      const awayUnder = awayAnalyses.find(a => a.threshold === threshold && a.betType === 'under');
      
      if (!homeOver || !awayOver || !homeUnder || !awayUnder) continue;

      // Inject odds for the 4.5 threshold (most popular card market)
      const overOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.overOdds : undefined;
      const underOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.underOdds : undefined;

      // OVER COMBINED ANALYSIS
      const combinedOverPercentage = (homeOver.percentage + awayOver.percentage) / 2;
      const combinedOverConsistency = (homeOver.consistency + awayOver.consistency) / 2;
      const combinedOverValue = this.calculateBetValue(combinedOverPercentage, combinedOverConsistency, threshold, 'over', overOdds);

      combinedAnalyses.push({
        threshold,
        percentage: combinedOverPercentage,
        consistency: combinedOverConsistency,
        confidence: this.getConfidenceLevel(combinedOverPercentage, combinedOverConsistency),
        recentForm: [...homeOver.recentForm, ...awayOver.recentForm].slice(0, 5),
        betType: 'over',
        value: combinedOverValue,
        odds: overOdds,
      });

      // UNDER COMBINED ANALYSIS
      const combinedUnderPercentage = (homeUnder.percentage + awayUnder.percentage) / 2;
      const combinedUnderConsistency = (homeUnder.consistency + awayUnder.consistency) / 2;
      const combinedUnderValue = this.calculateBetValue(combinedUnderPercentage, combinedUnderConsistency, threshold, 'under', underOdds);

      combinedAnalyses.push({
        threshold,
        percentage: combinedUnderPercentage,
        consistency: combinedUnderConsistency,
        confidence: this.getConfidenceLevel(combinedUnderPercentage, combinedUnderConsistency),
        recentForm: [...homeUnder.recentForm, ...awayUnder.recentForm].slice(0, 5),
        betType: 'under',
        value: combinedUnderValue,
        odds: underOdds,
      });
    }

    // Find optimal over threshold
    const optimalOver = this.findOptimalThreshold(combinedAnalyses, 'over');
    if (optimalOver) {
      const analysis = optimalOver.analysis;
      
      insights.push({
        id: `optimal-total-cards-over-${analysis.threshold}`,
        title: `Over ${analysis.threshold} Total Cards`,
        description: `Optimal over bet: ${analysis.percentage.toFixed(1)}% hit rate with strong consistency. ${optimalOver.reasoning}`,
        market: `Total Cards Over ${analysis.threshold}`,
        confidence: analysis.confidence,
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `Home avg: ${homePattern.averageTotalCards}, Away avg: ${awayPattern.averageTotalCards}`,
        aiEnhanced: true,
      });
    }

    // Find optimal under threshold
    const optimalUnder = this.findOptimalThreshold(combinedAnalyses, 'under');
    if (optimalUnder) {
      const analysis = optimalUnder.analysis;
      
      insights.push({
        id: `optimal-total-cards-under-${analysis.threshold}`,
        title: `Under ${analysis.threshold} Total Cards`,
        description: `Optimal under bet: ${analysis.percentage.toFixed(1)}% hit rate with disciplined trends identified. ${optimalUnder.reasoning}`,
        market: `Total Cards Under ${analysis.threshold}`,
        confidence: analysis.confidence,
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `Combined average: ${((homePattern.averageTotalCards + awayPattern.averageTotalCards) / 2).toFixed(1)} cards per game`,
        aiEnhanced: true,
      });
    }

    return insights.sort((a, b) => {
      const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      return (confidenceOrder[b.confidence] || 1) - (confidenceOrder[a.confidence] || 1);
    });
  }

  /**
   * Generate optimized insights for team-specific cards
   */
  private generateOptimalTeamCardsInsights(
    teamPattern: TeamCardPattern,
    teamType: 'Home' | 'Away',
    matchOdds: MatchOdds | null
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    const matches = teamPattern.recentMatches;
    const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5]; // Limit thresholds for team-specific
    
    const analyses: CardThresholdAnalysis[] = [];
    thresholds.forEach(threshold => {
      analyses.push(this.analyzeCardThresholdOver(matches, threshold, 'for', undefined));
      analyses.push(this.analyzeCardThresholdUnder(matches, threshold, 'for', undefined));
    });
    
    const optimal = this.findOptimalThreshold(analyses);
    
    if (optimal) {
      const analysis = optimal.analysis;
      const recentHits = analysis.recentForm.filter(Boolean).length;
      
      insights.push({
        id: `optimal-${teamType.toLowerCase()}-cards-${analysis.betType}-${analysis.threshold}`,
        title: `${teamType} Team ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold} Cards`,
        description: `Optimal ${teamType.toLowerCase()} team bet: ${analysis.percentage.toFixed(1)}% hit rate (${recentHits}/5 recent). ${optimal.reasoning}`,
        market: `${teamType} Team Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        supportingData: `Recent form: [${matches.slice(0, 5).map(m => m.cardsFor).join(', ')}]. Average: ${teamPattern.averageCardsShown}/game`,
        aiEnhanced: true
      });
    }
    
    return insights;
  }

  /**
   * Generate Most Cards insights (Home/Away/Draw)
   */
  private generateMostCardsInsights(
    homePattern: TeamCardPattern,
    awayPattern: TeamCardPattern,
    matchOdds: MatchOdds | null
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Calculate percentage where home team gets more cards
    const homeMoreCards = homePattern.recentMatches.filter(m => m.cardsFor > m.cardsAgainst).length;
    const homeMorePercentage = (homeMoreCards / homePattern.recentMatches.length) * 100;
    
    // Calculate percentage where away team gets more cards
    const awayMoreCards = awayPattern.recentMatches.filter(m => m.cardsFor > m.cardsAgainst).length;
    const awayMorePercentage = (awayMoreCards / awayPattern.recentMatches.length) * 100;
    
    // Calculate draw (equal cards) percentage
    const drawCards = [...homePattern.recentMatches, ...awayPattern.recentMatches]
      .filter(m => m.cardsFor === m.cardsAgainst).length;
    const drawPercentage = (drawCards / (homePattern.recentMatches.length + awayPattern.recentMatches.length)) * 100;
    
    const combinedPercentage = (homeMorePercentage + awayMorePercentage) / 2;
    
    // Get odds if available
    const homeOdds = matchOdds?.mostCardsOdds?.homeOdds;
    const awayOdds = matchOdds?.mostCardsOdds?.awayOdds;
    const drawOdds = matchOdds?.mostCardsOdds?.drawOdds;
    
    // Determine best bet based on percentage and odds
    const bets = [
      { type: 'home', percentage: homeMorePercentage, odds: homeOdds },
      { type: 'away', percentage: awayMorePercentage, odds: awayOdds },
      { type: 'draw', percentage: drawPercentage, odds: drawOdds }
    ];
    
    // Calculate value for each bet
    const betsWithValue = bets.map(bet => {
      const value = bet.odds 
        ? this.calculateBetValue(bet.percentage, 0.6, 2.5, 'over', bet.odds)
        : bet.percentage;
      return { ...bet, value };
    });
    
    // Sort by value and pick best
    const bestBet = betsWithValue.sort((a, b) => b.value - a.value)[0];
    
    if (bestBet.percentage > 45) { // Only suggest if reasonable confidence
      const confidence = bestBet.percentage > 65 ? 'high' : bestBet.percentage > 55 ? 'medium' : 'low';
      
      insights.push({
        id: `most-cards-${bestBet.type}`,
        title: `Most Cards: ${bestBet.type.charAt(0).toUpperCase() + bestBet.type.slice(1)}`,
        description: `${bestBet.type === 'home' ? homePattern.team : bestBet.type === 'away' ? awayPattern.team : 'Both teams'} likely to receive most cards (${bestBet.percentage.toFixed(1)}% based on recent disciplinary records)`,
        market: `Most Cards - ${bestBet.type.charAt(0).toUpperCase() + bestBet.type.slice(1)}`,
        confidence,
        odds: bestBet.odds ? bestBet.odds.toFixed(2) : undefined,
        supportingData: `Home avg cards: ${homePattern.averageCardsShown}, Away avg cards: ${awayPattern.averageCardsShown}`,
        aiEnhanced: true
      });
    }
    
    return insights;
  }

  /**
   * Main method: Generate optimized card-related betting insights
   */
  async generateCardInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    try {
      console.log(`[CardsAI] Generating optimized insights for ${homeTeam} vs ${awayTeam}`);
      
      const homePattern = await this.analyzeTeamCardPattern(homeTeam, 'home');
      const awayPattern = await this.analyzeTeamCardPattern(awayTeam, 'away');

      // Fetch odds data (efficiently via cache)
      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam); 
      
      const allInsights: AIInsight[] = [];
      
      // Generate all types of insights
      allInsights.push(...this.generateOptimalTotalCardsInsights(homePattern, awayPattern, matchOdds));
      allInsights.push(...this.generateOptimalTeamCardsInsights(homePattern, 'Home', matchOdds));
      allInsights.push(...this.generateOptimalTeamCardsInsights(awayPattern, 'Away', matchOdds));
      allInsights.push(...this.generateMostCardsInsights(homePattern, awayPattern, matchOdds));
      
      // Filter and limit results
      console.log(`[CardsAI] Resolving potential conflicts among ${allInsights.length} generated insights...`);
      const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
      
      const insightsToFilter = resolutionResult.resolvedInsights;
      
      const filteredInsights = insightsToFilter
        .filter(insight => insight.confidence !== 'low')
        .slice(0, 6);
      
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