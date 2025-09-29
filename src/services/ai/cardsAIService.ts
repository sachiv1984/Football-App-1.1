import { supabaseCardsService, DetailedCardStats } from '../stats/supabaseCardsService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService';

// Define the MatchOdds interface locally to match oddsAPIService
interface MatchOdds {
  matchId: string;
  totalGoalsOdds?: any; 
  bttsOdds?: any;      
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
  totalCornersOdds?: any; 
  homeCornersOdds?: any;  
  awayCornersOdds?: any;  
  mostCornersOdds?: any;  
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
  valueScore?: number; 
  conflictScore?: number; 
}

interface CardThresholdAnalysis {
  threshold: number;
  percentage: number;
  consistency: number;
  confidence: 'high' | 'medium' | 'low';
  recentForm: boolean[]; 
  betType: 'over' | 'under';
  value: number; 
  odds?: number; 
}

interface OptimalThreshold {
  analysis: CardThresholdAnalysis;
  reasoning: string;
  alternativeConsidered: CardThresholdAnalysis[];
}

// CRITICAL FIX: Explicitly define the match detail structure to include 'venue'
interface CardPatternMatchDetail {
    opponent: string;
    cardsFor: number;
    cardsAgainst: number;
    totalCards: number;
    venue: 'home' | 'away' | string; 
    // Assuming unique identifiers like date and opponent are available for deduplication
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
  private readonly CONFIDENCE_THRESHOLDS = {
    HIGH: 0.75,
    MEDIUM: 0.60,
    LOW: 0.45
  };

  private readonly CONSISTENCY_THRESHOLDS = {
    EXCELLENT: 0.8,
    GOOD: 0.6,
    POOR: 0.4
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
    odds?: number
  ): CardThresholdAnalysis {
    
    // Ensure we don't divide by zero if matches array is empty
    if (matches.length === 0) {
      return this.createEmptyAnalysis(threshold, 'over', odds);
    }
    
    const getCount = (match: { totalCards: number; cardsFor: number; cardsAgainst: number }) => 
      this.getCardCount(match, type);

    // Calculate over percentage
    const matchesOver = matches.filter(match => getCount(match) > threshold);
    const overPercentage = (matchesOver.length / matches.length) * 100;

    // Analyze recent form (using up to the last 5 matches of the provided data)
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
    odds?: number
  ): CardThresholdAnalysis {

    // Ensure we don't divide by zero if matches array is empty
    if (matches.length === 0) {
      return this.createEmptyAnalysis(threshold, 'under', odds);
    }
    
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
   * Helper to create an empty analysis object when no match data is available.
   */
  private createEmptyAnalysis(threshold: number, betType: 'over' | 'under', odds?: number): CardThresholdAnalysis {
    return {
        threshold,
        percentage: 0,
        consistency: 0,
        confidence: 'low',
        recentForm: [],
        betType,
        value: 0,
        odds
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
    
    if (matches.length === 0) {
        return this.createEmptyAnalysis(threshold, 'over', undefined); // Fallback
    }

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
      // Fallback: Return the one with the highest value
      return overValue > underValue ? overAnalysis : underAnalysis;
    }
  }

  /**
   * Analyze card patterns for a specific team
   */
  private async analyzeTeamCardPattern(
    teamName: string, 
    venue: 'home' | 'away', 
    matchOdds: MatchOdds | null
  ): Promise<TeamCardPattern> {
    const teamStats = await supabaseCardsService.getTeamCardStats(teamName);
    
    if (!teamStats) {
      throw new Error(`No card data found for team: ${teamName}`);
    }

    // CRITICAL FIX: Casting to ensure 'venue' property is present for filtering.
    const allMatchDetails = teamStats.matchDetails as CardPatternMatchDetail[]; 

    // Filter relevant matches based on venue for a stricter analysis (using up to 10)
    const relevantMatches = allMatchDetails.filter(m => m.venue === venue).slice(0, 10);
    
    if (relevantMatches.length === 0) {
      console.warn(`[CardsAI] Insufficient ${venue} data for ${teamName}. Using general match data (up to 10).`);
      relevantMatches.push(...allMatchDetails.slice(0, 10));
    }

    const averageCardsShown = teamStats.cardsShown / teamStats.matches;
    const averageCardsAgainst = teamStats.cardsAgainst / teamStats.matches;
    const averageTotalCards = averageCardsShown + averageCardsAgainst;

    const thresholdAnalysis: { [key: string]: CardThresholdAnalysis } = {};
    
    // Analyze each threshold for Total, For, and Against
    this.CARD_THRESHOLDS.forEach(threshold => {
      // Total Match Cards (based on this team's match history)
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
      recentMatches: relevantMatches.slice(0, 10).map(match => ({
        opponent: match.opponent,
        cardsFor: match.cardsFor,
        cardsAgainst: match.cardsAgainst,
        totalCards: match.totalCards,
        venue: match.venue,
        date: match.date, // Include date/matchweek for better deduplication
        matchweek: match.matchweek 
      })) as CardPatternMatchDetail[]
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
    
    // Sort by value (safely handling undefined)
    const sorted = validAnalyses.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
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
      const optimalValue = optimal.value ?? 0;
      const altValue = alt.value ?? 0;

      if (optimal.betType === alt.betType && optimalValue > altValue) {
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

    // 1. Combine recent match details from both teams (assuming 'totalCards' is the match total)
    const combinedMatchDetails = [
      ...homePattern.recentMatches, 
      ...awayPattern.recentMatches
    ];
    
    // 2. Deduplicate and create a single list of unique match data
    const uniqueMatchesMap = new Map<string, CardPatternMatchDetail>();
    
    combinedMatchDetails.forEach(match => {
        // Use a robust key for deduplication (opponent is from the perspective of the team, so use date/matchweek)
        const dateKey = match.date || 'unknown';
        const matchweekKey = match.matchweek || 'unknown';
        // Combining Date/Matchweek with the TOTAL cards is a strong unique identifier for the match itself
        const key = `${dateKey}-${matchweekKey}-${match.totalCards}`; 

        if (!uniqueMatchesMap.has(key)) {
            uniqueMatchesMap.set(key, match);
        }
    });

    const uniqueMatchDetails = Array.from(uniqueMatchesMap.values()).slice(0, 20); // Use up to 20 recent unique games

    // 3. Extract the total card counts for analysis
    const totalMatchCardData: Array<{ totalCards: number; cardsFor: number; cardsAgainst: number }> = 
        uniqueMatchDetails.map(match => ({
            totalCards: match.totalCards,
            cardsFor: match.totalCards,
            cardsAgainst: match.totalCards,
        }));
        
    if (totalMatchCardData.length < 5) {
        console.warn("[CardsAI] Insufficient unique match data for Total Cards analysis (need 5+). Skipping.");
        return [];
    }
    
    const combinedAnalyses: CardThresholdAnalysis[] = [];
    
    // Step 4: Analyze each threshold using the unified match data
    this.CARD_THRESHOLDS.forEach(threshold => {
      
      const overOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.overOdds : undefined;
      const underOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.underOdds : undefined;

      const overAnalysis = this.analyzeCardThresholdOver(totalMatchCardData, threshold, 'total', overOdds);
      const underAnalysis = this.analyzeCardThresholdUnder(totalMatchCardData, threshold, 'total', underOdds);
      
      combinedAnalyses.push(overAnalysis);
      combinedAnalyses.push(underAnalysis);
    });

    // Step 5: Find optimal over/under thresholds
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
        supportingData: `Sampled total card counts: [${totalMatchCardData.map(m => m.totalCards).join(', ')}]`,
        aiEnhanced: true,
        valueScore: analysis.value,
      });
    }

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
        supportingData: `Sampled total card counts: [${totalMatchCardData.map(m => m.totalCards).join(', ')}]`,
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

      if (threshold === 2.5) {
        overOddsForValue = teamOdds?.overOdds;
        underOddsForValue = teamOdds?.underOdds;
      }

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
    
    // Simple prediction based on average cards shown
    const homeAvg = homePattern.averageCardsShown;
    const awayAvg = awayPattern.averageCardsShown;
    
    let predictedWinner: 'home' | 'away' | 'draw' = 'draw';
    if (homeAvg > awayAvg + 0.5) { 
        predictedWinner = 'home';
    } else if (awayAvg > homeAvg + 0.5) {
        predictedWinner = 'away';
    }

    const homeOdds = matchOdds?.mostCardsOdds?.homeOdds;
    const awayOdds = matchOdds?.mostCardsOdds?.awayOdds;
    const drawOdds = matchOdds?.mostCardsOdds?.drawOdds;
    
    const totalAvg = homeAvg + awayAvg;
    const homeProb = homeAvg / totalAvg;
    const awayProb = awayAvg / totalAvg;
    let drawProb = Math.max(0, 1 - homeProb - awayProb); 
    if (Math.abs(homeAvg - awayAvg) < 0.5) {
        drawProb = (homeProb + awayProb) / 4;
    }

    const betType = predictedWinner;
    const percentage = betType === 'home' ? homeProb * 100 : betType === 'away' ? awayProb * 100 : drawProb * 100;
    const odds = betType === 'home' ? homeOdds : betType === 'away' ? awayOdds : drawOdds;

    const value = this.calculateBetValue(percentage, 0.7, 4.5, 'over', odds);
    
    if (percentage > 35) {
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
      
      const filteredInsights = insightsToFilter
        .filter(insight => insight.confidence !== 'low')
        .sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0))
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
