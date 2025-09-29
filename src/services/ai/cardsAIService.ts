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
  value: number; // This now represents the Weighted Expected Value (EV)
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
  // --- NEW CACHING PROPERTIES ---
  private patternCache: Map<string, { pattern: TeamCardPattern; timestamp: number }> = new Map();
  private readonly PATTERN_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  // --- END NEW CACHING PROPERTIES ---

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

  // NOTE: This full list is no longer used directly in the analysis loop, 
  // but kept as a reference for available thresholds.
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
    
    const sampleSize = Math.min(5, recentMatches.length || 1); // Protect division
    let overConsistency = overHits / sampleSize;

    // --- Apply Penalty for Low Sample Size (3 or 4 matches) ---
    if (sampleSize < 5) {
        // Penalty factor: 1.0 for 5 matches, 0.8 for 4 matches, 0.6 for 3 matches.
        const maxConsistencyFactor = sampleSize * 0.2; 
        overConsistency = overConsistency * maxConsistencyFactor;
        overConsistency = Math.max(overConsistency, 0.1); // Floor for stability
    }
    // --- END PENALTY ---

    // Confidence and Value (UPDATED: Using new EV calculation)
    const overConfidence = this.getConfidenceLevel(overPercentage, overConsistency);
    const overValue = this.calculateBetValue(overPercentage, overConsistency, odds);

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
    
    const sampleSize = Math.min(5, recentMatches.length || 1); // Protect division
    let underConsistency = underHits / sampleSize;

    // --- Apply Penalty for Low Sample Size (3 or 4 matches) ---
    if (sampleSize < 5) {
        // Penalty factor: 1.0 for 5 matches, 0.8 for 4 matches, 0.6 for 3 matches.
        const maxConsistencyFactor = sampleSize * 0.2; 
        underConsistency = underConsistency * maxConsistencyFactor;
        underConsistency = Math.max(underConsistency, 0.1); // Floor for stability
    }
    // --- END PENALTY ---

    // Confidence and Value (UPDATED: Using new EV calculation)
    const underConfidence = this.getConfidenceLevel(underPercentage, underConsistency);
    const underValue = this.calculateBetValue(underPercentage, underConsistency, odds);

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
      // Fallback: Return the one with the highest value (EV)
      return overValue > underValue ? overAnalysis : underAnalysis;
    }
  }

  /**
   * Optimize threshold selection based on the team's historical card data.
   */
  private getRelevantThresholds(matches: CardPatternMatchDetail[]): number[] {
    if (matches.length === 0) return [3.5, 4.5, 5.5]; // Default safe thresholds
    
    const avgCards = matches.reduce((sum, m) => sum + m.totalCards, 0) / matches.length;
    
    // Determine the focused range of thresholds
    if (avgCards < 3) return [0.5, 1.5, 2.5, 3.5, 4.5];
    if (avgCards < 5) return [2.5, 3.5, 4.5, 5.5, 6.5];
    if (avgCards < 7) return [3.5, 4.5, 5.5, 6.5, 7.5];
    return [4.5, 5.5, 6.5, 7.5, 8.5];
  }


  /**
   * Analyze card patterns for a specific team
   * --- CACHE INTEGRATION HERE ---
   */
  private async analyzeTeamCardPattern(
    teamName: string, 
    venue: 'home' | 'away', 
    matchOdds: MatchOdds | null
  ): Promise<TeamCardPattern> {
    const cacheKey = `${teamName}_${venue}`;
    const cached = this.patternCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.PATTERN_CACHE_TTL) {
      console.log(`[CardsAI] Using cached pattern for ${cacheKey}`);
      return cached.pattern;
    }

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
    
    // --- OPTIMIZATION: Use relevant thresholds only ---
    const relevantThresholds = this.getRelevantThresholds(relevantMatches);
    
    // Analyze each threshold for Total, For, and Against
    relevantThresholds.forEach(threshold => {
      // Total Match Cards (based on this team's match history)
      thresholdAnalysis[`total_${threshold}`] = this.analyzeCardThreshold(relevantMatches, threshold, 'total', matchOdds);
      
      // Cards For (Team-specific cards shown)
      thresholdAnalysis[`for_${threshold}`] = this.analyzeCardThreshold(relevantMatches, threshold, 'for', matchOdds);

      // Cards Against (Team-specific cards received)
      thresholdAnalysis[`against_${threshold}`] = this.analyzeCardThreshold(relevantMatches, threshold, 'against', matchOdds);
    });
    // --- END OPTIMIZATION ---

    const pattern: TeamCardPattern = {
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
    
    // --- CACHE THE RESULT ---
    this.patternCache.set(cacheKey, { pattern, timestamp: Date.now() });
    // --- END CACHE THE RESULT ---

    return pattern;
  }

  /**
   * Calculate betting value score (The Edge/Weighted Expected Value).
   * A positive score indicates a profitable edge.
   * @param percentage Our calculated probability of the outcome hitting (0-100)
   * @param consistency How consistently the outcome has hit recently (0-1)
   * @param odds The bookmaker's odds for the bet
   */
  private calculateBetValue(
    percentage: number, 
    consistency: number,
    odds?: number
  ): number {
    // We require a minimal edge/odds to consider it a bet worth tracking
    if (!odds || odds <= 1.05) { 
        return 0; 
    }

    const calculatedProbability = percentage / 100;
    const impliedProbability = 1 / odds;
    
    // Core Expected Value (EV) calculation:
    // EV = (P_win * Profit) - (P_loss * Loss) where Profit = Odds - 1
    const rawEdge = (calculatedProbability * (odds - 1)) - ((1 - calculatedProbability) * 1);
    
    // Weight the raw EV by consistency. This rewards highly consistent patterns.
    const weightedEV = rawEdge * consistency;

    // Return the weighted EV, rounded for clean output
    return Math.round(weightedEV * 10000) / 10000;
  }

  /**
   * Get confidence level based on percentage and consistency
   */
  private getConfidenceLevel(percentage: number, consistency: number): 'high' | 'medium' | 'low' {
    // Note: Consistency here is the PENALIZED consistency for low sample size
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
    // Only filter out "low" confidence predictions for the optimal threshold finder.
    let validAnalyses = analyses.filter(a => a.confidence !== 'low');
    
    if (betType) {
      validAnalyses = validAnalyses.filter(a => a.betType === betType);
    }
    
    if (validAnalyses.length === 0) return null;
    
    // Sort by value (EV), favoring the highest value bets
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
   * REVISED: Output is now strictly technical for internal review/support data.
   */
  private generateThresholdReasoning(optimal: CardThresholdAnalysis, alternatives: CardThresholdAnalysis[]): string {
    // Start with the raw EV score, which is the primary reason for selection
    let reasoning = `Optimal EV Score: ${optimal.value.toFixed(4)}`;
    
    if (alternatives.length > 0) {
      const alt = alternatives[0];
      const optimalValue = optimal.value ?? 0;
      const altValue = alt.value ?? 0;

      // Only add detail if a meaningful alternative was considered and beaten
      if (optimalValue > altValue + 0.005) { // Require a small difference for note
        reasoning += `. Beat Alt (${alt.betType} ${alt.threshold}, EV ${alt.value.toFixed(4)}) for higher EV edge.`;
      } else if (optimal.betType !== alt.betType) {
        reasoning += `. Best option chosen over alternative bet type (EV: ${alt.value.toFixed(4)}).`;
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
        
    if (totalMatchCardData.length < 3) { // LOWERED THRESHOLD TO 3
        console.warn("[CardsAI] Insufficient unique match data for Total Cards analysis (need 3+). Skipping.");
        return [];
    }
    
    const combinedAnalyses: CardThresholdAnalysis[] = [];
    
    // --- OPTIMIZATION: Use relevant thresholds only for total cards ---
    const relevantThresholds = this.getRelevantThresholds(uniqueMatchDetails); 

    // Step 4: Analyze each relevant threshold using the unified match data
    relevantThresholds.forEach(threshold => {
      
      const overOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.overOdds : undefined;
      const underOdds = (threshold === 4.5) ? matchOdds?.totalCardsOdds?.underOdds : undefined;

      const overAnalysis = this.analyzeCardThresholdOver(totalMatchCardData, threshold, 'total', overOdds);
      const underAnalysis = this.analyzeCardThresholdUnder(totalMatchCardData, threshold, 'total', underOdds);
      
      combinedAnalyses.push(overAnalysis);
      combinedAnalyses.push(underAnalysis);
    });
    // --- END OPTIMIZATION ---

    // Step 5: Find optimal over/under thresholds
    const optimalOver = this.findOptimalThreshold(combinedAnalyses, 'over');
    if (optimalOver) {
      const analysis = optimalOver.analysis;
      
      // --- REVISED DESCRIPTION AND TITLE (UX FIX) ---
      const hitDescription = `${analysis.percentage.toFixed(1)}% hit rate (Consistency: ${analysis.consistency.toFixed(2)})`;
      const isValue = analysis.value > 0.0001;
      const title = `Total Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`;
      const description = isValue 
          ? `Value Bet! This outcome is likely (${hitDescription}) and shows a positive edge against the current odds.`
          : `High Confidence. This outcome is very likely (${hitDescription}), though the market odds fully account for the probability.`;
      
      // --- REVISED SUPPORTING DATA LOGIC (UX FIX) ---
      const supportReasoning = isValue 
          ? `Reasoning: ${optimalOver.reasoning}` 
          : 'Reasoning: Optimal confidence/probability chosen, EV margin is zero.';
      // --- END REVISION ---

      insights.push({
        id: `optimal-total-cards-over-${analysis.threshold}`,
        title: title,
        description: description,
        market: `Total Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `EV: ${analysis.value.toFixed(4)} | ${supportReasoning}`,
        aiEnhanced: true,
        valueScore: analysis.value,
      });
    }

    const optimalUnder = this.findOptimalThreshold(combinedAnalyses, 'under');
    if (optimalUnder) {
      const analysis = optimalUnder.analysis;
      
      // --- REVISED DESCRIPTION AND TITLE (UX FIX) ---
      const hitDescription = `${analysis.percentage.toFixed(1)}% hit rate (Consistency: ${analysis.consistency.toFixed(2)})`;
      const isValue = analysis.value > 0.0001;
      const title = `Total Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`;
      const description = isValue 
          ? `Value Bet! This outcome is likely (${hitDescription}) and shows a positive edge against the current odds.`
          : `High Confidence. This outcome is very likely (${hitDescription}), though the market odds fully account for the probability.`;
      
      // --- REVISED SUPPORTING DATA LOGIC (UX FIX) ---
      const supportReasoning = isValue 
          ? `Reasoning: ${optimalUnder.reasoning}` 
          : 'Reasoning: Optimal confidence/probability chosen, EV margin is zero.';
      // --- END REVISION ---
      
      insights.push({
        id: `optimal-total-cards-under-${analysis.threshold}`,
        title: title,
        description: description,
        market: `Total Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
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
    // NOTE: For team cards, we'll keep the analyzed thresholds limited to the common ones 
    // for simplicity, as the team card data is a subset of the total match cards data.
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
      
      // --- REVISED DESCRIPTION AND TITLE (UX FIX) ---
      const hitDescription = `${analysis.percentage.toFixed(1)}% hit rate (${recentHits}/5 recent games)`;
      const isValue = analysis.value > 0.0001;
      const title = `${teamType} Team ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold} Cards`;
      const description = isValue 
          ? `Value Bet! This team outcome is likely (${hitDescription}) and shows a positive edge against the current odds.`
          : `High Confidence. This team outcome is very likely (${hitDescription}), though the market odds fully account for the probability.`;
      
      // --- REVISED SUPPORTING DATA LOGIC (UX FIX) ---
      const supportReasoning = isValue 
          ? `Reasoning: ${optimal.reasoning}` 
          : 'Reasoning: Optimal confidence/probability chosen, EV margin is zero.';
      // --- END REVISION ---
      
      insights.push({
        id: `optimal-${teamType.toLowerCase()}-cards-${analysis.betType}-${analysis.threshold}`,
        title: title,
        description: description,
        market: `${teamType} Team Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
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

  /**
   * Helper to get the average cards shown over the last N matches
   * @param matches The list of recent matches
   * @param count The number of recent matches to consider
   */
  private getRecentCardsAvg(matches: CardPatternMatchDetail[], count: number = 5): number {
    const recent = matches.slice(0, count);
    if (recent.length === 0) return 0;
    return recent.reduce((sum, m) => sum + m.cardsFor, 0) / recent.length;
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
    
    const homeAvg = homePattern.averageCardsShown;
    const awayAvg = awayPattern.averageCardsShown;
    
    if (homeAvg === 0 && awayAvg === 0) return [];

    // --- NEW WEIGHTED AVERAGE CALCULATION ---
    const homeRecentAvg = this.getRecentCardsAvg(homePattern.recentMatches);
    const awayRecentAvg = this.getRecentCardsAvg(awayPattern.recentMatches);

    // Weighted: 60% recent form, 40% overall average
    const homeWeightedAvg = (homeRecentAvg * 0.6) + (homeAvg * 0.4);
    const awayWeightedAvg = (awayRecentAvg * 0.6) + (awayAvg * 0.4);

    const totalWeightedAvg = homeWeightedAvg + awayWeightedAvg;
    
    if (totalWeightedAvg === 0) return [];
    
    let predictedWinner: 'home' | 'away' | 'draw' = 'draw';
    const cardsDifference = Math.abs(homeWeightedAvg - awayWeightedAvg);
    const threshold = 0.8; // The threshold for a confident, non-draw prediction

    // Determine the predicted winner based on the threshold
    if (cardsDifference >= threshold) {
        predictedWinner = homeWeightedAvg > awayWeightedAvg ? 'home' : 'away';
    } else if (cardsDifference <= 0.3) {
        // If averages are very close (<= 0.3 card difference), predict Draw
        predictedWinner = 'draw';
    } else {
        // Ambiguous middle ground (0.3 < diff < 0.8) - skip the market
        return [];
    }
    // --- END NEW WEIGHTED AVERAGE CALCULATION ---
    
    // Calculate conceptual probability and corresponding odds/type
    const homeProb = homeWeightedAvg / totalWeightedAvg;
    const awayProb = awayWeightedAvg / totalWeightedAvg;

    const predictions: Array<{ betType: 'home' | 'away' | 'draw'; percentage: number; odds?: number }> = [];
    
    if (predictedWinner === 'home') {
        predictions.push({ betType: 'home', percentage: homeProb * 100, odds: matchOdds?.mostCardsOdds?.homeOdds });
    } else if (predictedWinner === 'away') {
        predictions.push({ betType: 'away', percentage: awayProb * 100, odds: matchOdds?.mostCardsOdds?.awayOdds });
    } else { // predictedWinner === 'draw'
        const drawOdds = matchOdds?.mostCardsOdds?.drawOdds;
        // Estimate draw probability based on the inverse of the difference and cap it.
        let drawPercentage = (1 - homeProb - awayProb) * 100 + (100 * (1 - cardsDifference / threshold)); 
        drawPercentage = Math.min(drawPercentage, 45); // Cap draw percentage for realism
        predictions.push({ betType: 'draw', percentage: drawPercentage, odds: drawOdds });
    }

    // Find the bet with the best EV (using a fixed "consistency" of 0.6 for this market type due to lack of match-specific data)
    predictions.forEach(p => {
        const value = this.calculateBetValue(p.percentage, 0.6, p.odds); 
        
        // Only generate an insight if EV is positive
        const isValueBet = value > 0.0001;
        
        if (isValueBet) { 
            const confidence = p.percentage > 55 ? 'high' : p.percentage > 45 ? 'medium' : 'low';
            const teamTitle = p.betType.charAt(0).toUpperCase() + p.betType.slice(1);

            // --- REVISED DESCRIPTION AND TITLE (UX FIX) ---
            const description = `Value Bet! Based on weighted disciplinary records, **${teamTitle}** is significantly more likely (${p.percentage.toFixed(1)}% conceptual chance) to receive the most cards.`;
            // --- END REVISION ---

            insights.push({
                id: `most-cards-${p.betType}`,
                title: `Most Cards: ${teamTitle}`,
                description: description,
                market: `Most Cards - ${teamTitle}`,
                confidence,
                odds: p.odds ? p.odds.toFixed(2) : undefined,
                // --- REVISED SUPPORTING DATA (UX FIX) ---
                supportingData: `EV: ${value.toFixed(4)} | Wtd Avg H: ${homeWeightedAvg.toFixed(2)}, Wtd Avg A: ${awayWeightedAvg.toFixed(2)}`,
                // --- END REVISION ---
                aiEnhanced: true,
                valueScore: value
            });
        }
    });
    
    // Sort by EV
    return insights.sort((a, b) => (b.valueScore ?? 0) - (a.valueScore ?? 0));
  }

  /**
   * Main method: Generate optimized card-related betting insights
   */
  async generateCardInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    try {
      console.log(`[CardsAI] Generating optimized insights for ${homeTeam} vs ${awayTeam}`);
      
      // NOTE: We fetch odds first as they are needed for the subsequent pattern analysis calls.
      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam); 
      
      // These calls will now utilize the cache
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
      
      // 1. Sort Insights: High Confidence first, then highest EV (ValueScore)
      const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
      
      const sortedInsights = insightsToFilter
        .filter(insight => insight.confidence !== 'low') // Filter out the least reliable
        .sort((a, b) => {
            const confidenceDiff = (confidenceOrder[b.confidence] || 0) - (confidenceOrder[a.confidence] || 0);
            
            // Primary sort: Confidence (High > Medium)
            if (confidenceDiff !== 0) {
                return confidenceDiff;
            }
            
            // Secondary sort: Expected Value (EV) score
            return (b.valueScore ?? 0) - (a.valueScore ?? 0);
        });

      // 2. Select a maximum of 6 insights
      const filteredInsights = sortedInsights.slice(0, 6);
      
      const valueBets = filteredInsights.filter(i => (i.valueScore ?? 0) > 0.0001).length; // Check for positive EV
      
      console.log(`[CardsAI] ✅ Final insights after resolution: ${filteredInsights.length}`);
      console.log(`[CardsAI] Value Bets identified (EV > 0): ${valueBets}`);
      console.log(`[CardsAI] Resolution Summary: ${resolutionResult.summary}`);
      return filteredInsights;
      
    } catch (error) {
      console.error('[CardsAI] Error generating card insights:', error);
      return [];
    }
  }
}

export const cardsAIService = new CardsAIService();
