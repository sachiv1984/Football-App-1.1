// src/services/ai/cardsAIService.ts
import { supabaseCardsService, DetailedCardStats } from '../stats/supabaseCardsService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService';

// Define the MatchOdds interface locally to match oddsAPIService
interface MatchOdds {
  matchId: string;
  totalGoalsOdds?: any; // Added for completeness, but not used here
  bttsOdds?: any;      // Added for completeness, but not used here
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
  totalCornersOdds?: any; // Added for completeness, but not used here
  homeCornersOdds?: any;  // Added for completeness, but not used here
  awayCornersOdds?: any;  // Added for completeness, but not used here
  mostCornersOdds?: any;  // Added for completeness, but not used here
  lastFetched: number;
}


// Local type definition for AI insights (must align with conflictResolverService)
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
  valueScore?: number; // Added for compatibility with conflictResolverService
  conflictScore?: number; // Added for resolution output
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
    [key: string]: CardThresholdAnalysis; // Use string keys for flexibility
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

  private readonly CARD_THRESHOLDS = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5];

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
    
    // Total Match Cards: Use the common 4.5 line from the API
    if (type === 'total' && threshold === 4.5 && matchOdds?.totalCardsOdds) {
      overOdds = matchOdds.totalCardsOdds.overOdds;
      underOdds = matchOdds.totalCardsOdds.underOdds;
    } 
    // Home Team Cards: Use the common 2.5 line from the API
    else if (type === 'for' && threshold === 2.5 && matchOdds?.homeCardsOdds) {
      overOdds = matchOdds.homeCardsOdds.overOdds;
      underOdds = matchOdds.homeCardsOdds.underOdds;
    } 
    // Away Team Cards: Use the common 2.5 line from the API
    else if (type === 'against' && threshold === 2.5 && matchOdds?.awayCardsOdds) {
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
  private async analyzeTeamCardPattern(
    teamName: string, 
    venue: 'home' | 'away', 
    matchOdds: MatchOdds | null // Passed from generateCardInsights
  ): Promise<TeamCardPattern> {
    const teamStats = await supabaseCardsService.getTeamCardStats(teamName);
    
    if (!teamStats) {
      throw new Error(`No card data found for team: ${teamName}`);
    }

    // Filter relevant matches based on venue for a stricter analysis
    const relevantMatches = teamStats.matchDetails.filter(m => m.venue === venue).slice(0, 10);
    
    if (relevantMatches.length === 0) {
      // Fallback to all matches if no specific venue data is available
      console.warn(`[CardsAI] Insufficient ${venue} data for ${teamName}. Using all matches.`);
      relevantMatches.push(...teamStats.matchDetails.slice(0, 10));
    }

    const averageCardsShown = teamStats.cardsShown / teamStats.matches;
    const averageCardsAgainst = teamStats.cardsAgainst / teamStats.matches;
    const averageTotalCards = averageCardsShown + averageCardsAgainst;

    const thresholdAnalysis: { [key: string]: CardThresholdAnalysis } = {};
    
    // Analyze each threshold for Total, For, and Against
    this.CARD_THRESHOLDS.forEach(threshold => {
      // Total Match Cards
      thresholdAnalysis[`total_${threshold}`] = this.analyzeCardThreshold(relevantMatches, threshold, 'total', matchOdds);
      
      // Cards For (Team-specific cards shown)
      thresholdAnalysis[`for_${threshold}`] = this.analyzeCardThreshold(relevantMatches, threshold, 'for', matchOdds);

      // Cards Against (Team-specific cards received)
      thresholdAnalysis[`against_${threshold}`] = this.analyzeCardThreshold(relevantMatches, threshold, 'against', matchOdds);
    });

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
    
    // Apply threshold difficulty adjustment 
    // Goal: Insights with higher odds (harder to hit) get a slightly higher score if they hit
    if (betType === 'over') {
      baseValue += (threshold * 3); 
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
         // Slightly penalize high negative edge, but allow the base value to lead
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
    // Only consider medium or high confidence insights for optimality
    let validAnalyses = analyses.filter(a => a.confidence !== 'low');
    
    if (betType) {
      validAnalyses = validAnalyses.filter(a => a.betType === betType);
    }
    
    if (validAnalyses.length === 0) return null;
    
    // Sort by value, which prioritizes odds/edge and confidence
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
      // Check if the alternative is a viable, less-valuable option
      if (optimal.betType === alt.betType && optimal.value > alt.value) {
        if (optimal.betType === 'over' && alt.threshold < optimal.threshold) {
            reasoning += `. Higher-risk, higher-reward threshold chosen over ${alt.threshold} for significant value edge.`;
        } else if (optimal.betType === 'under' && alt.threshold > optimal.threshold) {
            reasoning += `. Lower-risk, higher-reward threshold chosen over ${alt.threshold} for significant value edge.`;
        } else {
            reasoning += `. Beats alternative ${alt.betType} ${alt.threshold} by value score.`;
        }
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

    // Combine total match card analysis (from both teams' overall match stats)
    const combinedAnalyses: CardThresholdAnalysis[] = [];
    
    for (const threshold of this.CARD_THRESHOLDS) {
      
      const homeTotalAnalyses = homePattern.thresholdAnalysis[`total_${threshold}`];
      const awayTotalAnalyses = awayPattern.thresholdAnalysis[`total_${threshold}`];
      
      if (!homeTotalAnalyses || !awayTotalAnalyses) continue;

      // Extract Over/Under components
      const homeOver = homeTotalAnalyses.betType === 'over' ? homeTotalAnalyses : homePattern.thresholdAnalysis[`total_${threshold}`]; // Simplified, assuming analyzeCardThreshold returns the optimal
      const homeUnder = homeTotalAnalyses.betType === 'under' ? homeTotalAnalyses : homePattern.thresholdAnalysis[`total_${threshold}`]; // Simplified

      const awayOver = awayTotalAnalyses.betType === 'over' ? awayTotalAnalyses : awayPattern.thresholdAnalysis[`total_${threshold}`]; // Simplified
      const awayUnder = awayTotalAnalyses.betType === 'under' ? awayTotalAnalyses : awayPattern.thresholdAnalysis[`total_${threshold}`]; // Simplified
      
      // Safety check: ensure we have both over and under analysis before combining
      if (!homeOver || !awayOver || !homeUnder || !awayUnder) continue;

      // Inject odds only for the 4.5 threshold (most popular total card market)
      const overOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.overOdds : undefined;
      const underOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.underOdds : undefined;

      // OVER COMBINED ANALYSIS (Average team stats)
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

      // UNDER COMBINED ANALYSIS (Average team stats)
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
        valueScore: analysis.value,
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
        valueScore: analysis.value,
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
    
    const teamOdds = teamType === 'Home' ? matchOdds?.homeCardsOdds : matchOdds?.awayCardsOdds;
    const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5];
    
    const analyses: CardThresholdAnalysis[] = [];
    
    thresholds.forEach(threshold => {
      
      let overOddsForValue: number | undefined;
      let underOddsForValue: number | undefined;

      // Only inject the odds if the threshold is 2.5 (the typical market line)
      if (threshold === 2.5) {
        overOddsForValue = teamOdds?.overOdds;
        underOddsForValue = teamOdds?.underOdds;
      }

      // We re-analyze the thresholds using the 'for' card count (cards received by the team)
      const overAnalysis = this.analyzeCardThresholdOver(teamPattern.recentMatches, threshold, 'for', overOddsForValue);
      const underAnalysis = this.analyzeCardThresholdUnder(teamPattern.recentMatches, threshold, 'for', underOddsForValue);
      
      analyses.push(overAnalysis);
      analyses.push(underAnalysis);
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
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `Recent form: [${teamPattern.recentMatches.slice(0, 5).map(m => m.cardsFor).join(', ')}]. Average: ${teamPattern.averageCardsShown}/game`,
        aiEnhanced: true,
        valueScore: analysis.value,
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
    
    // Use the match data to determine the head-to-head tendency for *this specific match context*
    const homeMatches = homePattern.recentMatches;
    const awayMatches = awayPattern.recentMatches;

    // We can't use 'cardsFor > cardsAgainst' for a single team's matches because that's about their own opponent.
    // We should compare the two teams' disciplinary averages and records to predict MOST CARDS in THIS match.
    
    // Simple prediction based on average cards shown
    const homeAvg = homePattern.averageCardsShown;
    const awayAvg = awayPattern.averageCardsShown;
    
    let predictedWinner: 'home' | 'away' | 'draw' = 'draw';
    if (homeAvg > awayAvg + 0.5) { // 0.5 threshold for home advantage
        predictedWinner = 'home';
    } else if (awayAvg > homeAvg + 0.5) {
        predictedWinner = 'away';
    }

    // Get odds if available
    const homeOdds = matchOdds?.mostCardsOdds?.homeOdds;
    const awayOdds = matchOdds?.mostCardsOdds?.awayOdds;
    const drawOdds = matchOdds?.mostCardsOdds?.drawOdds;
    
    // Calculate a conceptual percentage for confidence
    const totalAvg = homeAvg + awayAvg;
    const homeProb = homeAvg / totalAvg;
    const awayProb = awayAvg / totalAvg;
    const drawProb = 1 - homeProb - awayProb; // Rough estimate
    
    const betType = predictedWinner;
    const percentage = betType === 'home' ? homeProb * 100 : betType === 'away' ? awayProb * 100 : drawProb * 100;
    const odds = betType === 'home' ? homeOdds : betType === 'away' ? awayOdds : drawOdds;

    // Calculate value for the predicted bet
    const value = this.calculateBetValue(percentage, 0.7, 4.5, 'over', odds); // Use 'over' for value calculation style
    
    if (percentage > 35) { // Only suggest if reasonable chance
      const confidence = percentage > 55 ? 'high' : percentage > 45 ? 'medium' : 'low';
      
      insights.push({
        id: `most-cards-${betType}`,
        title: `Most Cards: ${betType.charAt(0).toUpperCase() + betType.slice(1)}`,
        description: `${betType === 'home' ? homePattern.team : betType === 'away' ? awayPattern.team : 'Referee likely to call a card draw'} based on average disciplinary tendency (${percentage.toFixed(1)}% conceptual chance).`,
        market: `Most Cards - ${betType.charAt(0).toUpperCase() + betType.slice(1)}`,
        confidence,
        odds: odds ? odds.toFixed(2) : undefined,
        supportingData: `Home avg cards: ${homePattern.averageCardsShown}, Away avg cards: ${awayPattern.averageCardsShown}`,
        aiEnhanced: true,
        valueScore: value
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
      
      // Fetch odds data (efficiently via cache)
      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam); 
      
      // Pass matchOdds down to team analysis
      const homePattern = await this.analyzeTeamCardPattern(homeTeam, 'home', matchOdds);
      const awayPattern = await this.analyzeTeamCardPattern(awayTeam, 'away', matchOdds);

      const allInsights: AIInsight[] = [];
      
      // Generate all types of insights
      allInsights.push(...this.generateOptimalTotalCardsInsights(homePattern, awayPattern, matchOdds));
      allInsights.push(...this.generateOptimalTeamCardsInsights(homePattern, 'Home', matchOdds));
      allInsights.push(...this.generateOptimalTeamCardsInsights(awayPattern, 'Away', matchOdds));
      allInsights.push(...this.generateMostCardsInsights(homePattern, awayPattern, matchOdds));
      
      // --------------------------------------------------------
      // 🏆 CONFLICT RESOLUTION STEP
      // --------------------------------------------------------
      console.log(`[CardsAI] Resolving potential conflicts among ${allInsights.length} generated insights...`);
      const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
      
      const insightsToFilter = resolutionResult.resolvedInsights as AIInsight[];
      // --------------------------------------------------------
      
      const filteredInsights = insightsToFilter
        .filter(insight => insight.confidence !== 'low') // Filter out low confidence after conflicts resolved
        .sort((a, b) => (b.valueScore || 0) - (a.valueScore || 0)) // Sort by value score
        .slice(0, 6); // Limit the final output count
      
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
