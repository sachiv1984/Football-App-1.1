// src/services/ai/goalsAIService.ts
import { supabaseGoalsService, DetailedGoalStats } from '../stats/supabaseGoalsService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService'; // 📦 NEW IMPORT PATH

// 👇 NEW: Define the MatchOdds interface locally
interface MatchOdds {
  matchId: string;
  totalGoalsOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  bttsOdds?: {
    market: string;
    yesOdds: number;
    noOdds: number;
  };
  lastFetched: number;
}


// Local type definition to avoid import conflicts
interface AIInsight {
  id: string;
  title: string;
  description: string;
  market?: string;
  confidence: 'high' | 'medium' | 'low';
  odds?: string; // 💰 NOW POPULATED WITH EXTERNAL ODDS
  supportingData?: string;
  source?: string;
  aiEnhanced?: boolean;
}

interface GoalThresholdAnalysis {
  threshold: number;
  percentage: number;
  consistency: number;
  confidence: 'high' | 'medium' | 'low';
  recentForm: boolean[]; // Last 5 matches - did they hit this threshold?
  betType: 'over' | 'under';
  value: number; // Value score for betting (higher = better bet)
}

interface OptimalThreshold {
  analysis: GoalThresholdAnalysis;
  reasoning: string;
  alternativeConsidered: GoalThresholdAnalysis[];
}

interface TeamGoalPattern {
  team: string;
  venue: 'home' | 'away';
  averageGoalsFor: number;
  averageGoalsAgainst: number;
  averageTotalGoals: number;
  bttsPercentage: number;
  thresholdAnalysis: {
    over05: GoalThresholdAnalysis;
    over15: GoalThresholdAnalysis;
    over25: GoalThresholdAnalysis;
    over35: GoalThresholdAnalysis;
    over45: GoalThresholdAnalysis;
    over55?: GoalThresholdAnalysis;
  };
  recentMatches: Array<{
    opponent: string;
    goalsFor: number;
    goalsAgainst: number;
    totalGoals: number;
    bothTeamsScored: boolean;
  }>;
}

export class GoalsAIService {
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
   * Analyze goal patterns for a specific team
   * NOTE: This method is left UNMODIFIED as it only relies on internal stats.
   * Odds are injected at the analysis level (analyzeGoalThreshold).
   */
  private async analyzeTeamGoalPattern(teamName: string, venue: 'home' | 'away'): Promise<TeamGoalPattern> {
    const teamStats = await supabaseGoalsService.getTeamGoalStats(teamName);
    
    if (!teamStats) {
      throw new Error(`No goal data found for team: ${teamName}`);
    }

    const relevantMatches = teamStats.matchDetails;
    
    const averageGoalsFor = teamStats.goalsFor / teamStats.matches;
    const averageGoalsAgainst = teamStats.goalsAgainst / teamStats.matches;
    const averageTotalGoals = averageGoalsFor + averageGoalsAgainst;

    // Analyze each threshold with both over and under
    const thresholdAnalysis = {
      over05: this.analyzeGoalThreshold(relevantMatches, 0.5, 'total'),
      over15: this.analyzeGoalThreshold(relevantMatches, 1.5, 'total'),
      over25: this.analyzeGoalThreshold(relevantMatches, 2.5, 'total'),
      over35: this.analyzeGoalThreshold(relevantMatches, 3.5, 'total'),
      over45: this.analyzeGoalThreshold(relevantMatches, 4.5, 'total'),
      over55: this.analyzeGoalThreshold(relevantMatches, 5.5, 'total')
    };

    const bttsMatches = relevantMatches.filter(m => m.bothTeamsScored).length;
    const bttsPercentage = (bttsMatches / relevantMatches.length) * 100;

    return {
      team: teamName,
      venue,
      averageGoalsFor: Math.round(averageGoalsFor * 100) / 100,
      averageGoalsAgainst: Math.round(averageGoalsAgainst * 100) / 100,
      averageTotalGoals: Math.round(averageTotalGoals * 100) / 100,
      bttsPercentage: Math.round(bttsPercentage * 100) / 100,
      thresholdAnalysis,
      recentMatches: relevantMatches.slice(0, 5).map(match => ({
        opponent: match.opponent,
        goalsFor: match.goalsFor,
        goalsAgainst: match.goalsAgainst,
        totalGoals: match.totalGoals,
        bothTeamsScored: match.bothTeamsScored
      }))
    };
  }

  /**
   * Analyze specific goal threshold with enhanced value calculation
   * 🎯 UPDATED to accept MatchOdds
   */
  private analyzeGoalThreshold(
  matches: Array<{ totalGoals: number; goalsFor: number; goalsAgainst: number }>,
  threshold: number,
  type: 'total' | 'for' | 'against',
  matchOdds?: MatchOdds // 🎯 NEW PARAMETER
): GoalThresholdAnalysis {
  
  const getGoalCount = (match: { totalGoals: number; goalsFor: number; goalsAgainst: number }) => {
    switch (type) {
      case 'for': return match.goalsFor;
      case 'against': return match.goalsAgainst;
      default: return match.totalGoals;
    }
  };

  // Calculate over percentage
  const matchesOver = matches.filter(match => getGoalCount(match) > threshold);
  const overPercentage = (matchesOver.length / matches.length) * 100;

  // Calculate under percentage
  const matchesUnder = matches.filter(match => getGoalCount(match) < threshold);
  const underPercentage = (matchesUnder.length / matches.length) * 100;

  // Analyze recent form
  const recentMatches = matches.slice(0, 5);
  const recentOverForm = recentMatches.map(match => getGoalCount(match) > threshold);
  const recentUnderForm = recentMatches.map(match => getGoalCount(match) < threshold);

  const overHits = recentOverForm.filter(Boolean).length;
  const underHits = recentUnderForm.filter(Boolean).length;

  const overConsistency = overHits / Math.min(5, recentMatches.length);
  const underConsistency = underHits / Math.min(5, recentMatches.length);

  // Confidence levels
  const overConfidence = this.getConfidenceLevel(overPercentage, overConsistency);
  const underConfidence = this.getConfidenceLevel(underPercentage, underConsistency);

  // 💰 NEW: Get specific odds for Total Goals 2.5
  let overOdds: number | undefined;
  let underOdds: number | undefined;
  
  // We only integrate odds for Total Goals 2.5 for efficiency
  if (type === 'total' && threshold === 2.5) {
      overOdds = matchOdds?.totalGoalsOdds?.overOdds;
      underOdds = matchOdds?.totalGoalsOdds?.underOdds;
  }
  
  // Value scores - pass the specific odds
  const overValue = this.calculateBetValue(overPercentage, overConsistency, threshold, 'over', overOdds);
  const underValue = this.calculateBetValue(underPercentage, underConsistency, threshold, 'under', underOdds);

  // Pick best option
  if (overValue > underValue && overConfidence !== 'low') {
    return {
      threshold,
      percentage: Math.round(overPercentage * 10) / 10,
      consistency: Math.round(overConsistency * 100) / 100,
      confidence: overConfidence,
      recentForm: recentOverForm,
      betType: 'over',
      value: overValue,
    };
  } else if (underConfidence !== 'low') {
    return {
      threshold,
      percentage: Math.round(underPercentage * 10) / 10,
      consistency: Math.round(underConsistency * 100) / 100,
      confidence: underConfidence,
      recentForm: recentUnderForm,
      betType: 'under',
      value: underValue,
    };
  } else {
    return {
      threshold,
      percentage: Math.round(overPercentage * 10) / 10,
      consistency: Math.round(overConsistency * 100) / 100,
      confidence: overConfidence,
      recentForm: recentOverForm,
      betType: 'over',
      value: overValue,
    };
  }
}


  /**
   * Calculate betting value score
   * 🎯 UPDATED to prioritize positive edge when odds are available
   */
  private calculateBetValue(
    percentage: number, 
    consistency: number,
    threshold: number,
    betType: 'over' | 'under',
    odds?: number // 💰 NEW PARAMETER
  ): number {
    // Start with the existing model score
    let baseValue = percentage * consistency;
    
    // Apply existing threshold difficulty adjustment
    if (betType === 'over') {
      baseValue += (threshold * 5); 
    } else {
      baseValue += ((6 - threshold) * 5);
    }
    
    // --- ODDS-BASED VALUE CALCULATION (The Edge) ---
    if (odds && odds > 1.05) { // Ensure odds are valid and worth betting on
      // 1. Convert model percentage (e.g., 75) to probability (0.75)
      const calculatedProbability = percentage / 100;
      // 2. Implied Probability from Bookmaker (1 / Odds)
      const impliedProbability = 1 / odds;
      
      // 3. Calculate the Edge/Value
      const edge = calculatedProbability - impliedProbability;
      
      if (edge > 0.05) { // Significant positive edge (5%+)
         // Dramatically amplify the score: this is a value bet!
         baseValue += (edge * 2000) * consistency; // Edge provides a massive boost
         baseValue += 500; // Fixed bonus for a proven value
      } else if (edge < -0.10) {
         // Decrease the score if the bet is extremely low value
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
  private findOptimalThreshold(analyses: GoalThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThreshold | null {
    // Filter to only good bets
    let validAnalyses = analyses.filter(a => a.confidence !== 'low');
    
    // Filter by bet type if specified
    if (betType) {
      validAnalyses = validAnalyses.filter(a => a.betType === betType);
    }
    
    if (validAnalyses.length === 0) return null;
    
    // Sort by value score (highest first)
    const sorted = validAnalyses.sort((a, b) => b.value - a.value);
    const optimal = sorted[0];
    
    // Generate reasoning
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
  private generateThresholdReasoning(optimal: GoalThresholdAnalysis, alternatives: GoalThresholdAnalysis[]): string {
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
 * Generate optimized insights for total match goals
 * 🎯 UPDATED to accept MatchOdds
 */
private generateOptimalTotalGoalsInsights(
  homePattern: TeamGoalPattern,
  awayPattern: TeamGoalPattern,
  matchOdds?: MatchOdds // 🎯 NEW PARAMETER
): AIInsight[] {
  const insights: AIInsight[] = [];

  // Mapping thresholds to keys
  const thresholdKeyMap: Record<number, keyof TeamGoalPattern['thresholdAnalysis']> = {
    0.5: 'over05',
    1.5: 'over15',
    2.5: 'over25',
    3.5: 'over35',
    4.5: 'over45',
    5.5: 'over55',
  };

  // Get all threshold analyses for both teams
  // NOTE: These analyses DO NOT contain the odds-boosted value score yet, 
  // unless the threshold is 2.5, which is handled in analyzeGoalThreshold.
  const homeAnalyses = Object.values(homePattern.thresholdAnalysis);
  const awayAnalyses = Object.values(awayPattern.thresholdAnalysis);

  const combinedAnalyses: GoalThresholdAnalysis[] = [];
  const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5];

  for (const threshold of thresholds) {
    const homeAnalysis = homeAnalyses.find(a => a.threshold === threshold);
    const awayAnalysis = awayAnalyses.find(a => a.threshold === threshold);

    if (homeAnalysis && awayAnalysis) {
      
      // 💰 Inject odds for the 2.5 threshold for the value calculation
      let overOdds = (threshold === 2.5) ? matchOdds?.totalGoalsOdds?.overOdds : undefined;
      let underOdds = (threshold === 2.5) ? matchOdds?.totalGoalsOdds?.underOdds : undefined;

      // Average the statistics
      const avgPercentage = (homeAnalysis.percentage + awayAnalysis.percentage) / 2;
      const avgConsistency = (homeAnalysis.consistency + awayAnalysis.consistency) / 2;

      // Use the same bet type if both agree, otherwise pick the stronger one
      const betType =
        homeAnalysis.betType === awayAnalysis.betType
          ? homeAnalysis.betType
          : homeAnalysis.value > awayAnalysis.value
          ? homeAnalysis.betType
          : awayAnalysis.betType;
          
      // Calculate the combined value using the odds for 2.5 threshold
      const avgValue = this.calculateBetValue(avgPercentage, avgConsistency, threshold, betType, betType === 'over' ? overOdds : underOdds);

      combinedAnalyses.push({
        threshold,
        percentage: avgPercentage,
        consistency: avgConsistency,
        confidence: this.getConfidenceLevel(avgPercentage, avgConsistency),
        recentForm: [...homeAnalysis.recentForm, ...awayAnalysis.recentForm].slice(0, 5),
        betType,
        value: avgValue, // Use the odds-boosted value
      });
    }
  }

  // Find optimal over threshold
  const optimalOver = this.findOptimalThreshold(combinedAnalyses, 'over');
  if (optimalOver) {
    const analysis = optimalOver.analysis;
    const key = thresholdKeyMap[analysis.threshold];
    const homeRecent =
      homePattern.thresholdAnalysis[key]?.recentForm.filter(Boolean).length || 0;
    const awayRecent =
      awayPattern.thresholdAnalysis[key]?.recentForm.filter(Boolean).length || 0;
      
    // 💰 Get the odds for the final insight (only available for 2.5 here)
    const oddsValue = optimalOver.analysis.threshold === 2.5 ? matchOdds?.totalGoalsOdds?.overOdds : undefined;

    insights.push({
      id: `optimal-total-goals-over-${analysis.threshold}`,
      title: `Over ${analysis.threshold} Total Goals`,
      description: `Optimal over bet: ${analysis.percentage.toFixed(
        1
      )}% hit rate with strong consistency. ${optimalOver.reasoning}`,
      market: `Total Goals Over ${analysis.threshold}`,
      confidence: analysis.confidence,
      odds: oddsValue ? oddsValue.toFixed(2) : undefined, // 💰 NEW: Include odds
      supportingData: `Combined analysis: ${homeRecent + awayRecent}/10 recent matches. Home avg: ${homePattern.averageTotalGoals}, Away avg: ${awayPattern.averageTotalGoals}`,
      aiEnhanced: true,
    });
  }

  // Find optimal under threshold
  const optimalUnder = this.findOptimalThreshold(combinedAnalyses, 'under');
  if (optimalUnder) {
    const analysis = optimalUnder.analysis;
    
    // 💰 Get the odds for the final insight (only available for 2.5 here)
    const oddsValue = optimalUnder.analysis.threshold === 2.5 ? matchOdds?.totalGoalsOdds?.underOdds : undefined;

    insights.push({
      id: `optimal-total-goals-under-${analysis.threshold}`,
      title: `Under ${analysis.threshold} Total Goals`,
      description: `Optimal under bet: ${analysis.percentage.toFixed(
        1
      )}% hit rate with defensive trends identified. ${optimalUnder.reasoning}`,
      market: `Total Goals Under ${analysis.threshold}`,
      confidence: analysis.confidence,
      odds: oddsValue ? oddsValue.toFixed(2) : undefined, // 💰 NEW: Include odds
      supportingData: `Defensive strength detected. Combined average: ${(
        (homePattern.averageTotalGoals + awayPattern.averageTotalGoals) /
        2
      ).toFixed(1)} goals per game`,
      aiEnhanced: true,
    });
  }

  return insights.sort((a, b) => {
    const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
    return (confidenceOrder[b.confidence] || 1) - (confidenceOrder[a.confidence] || 1);
  });
}


  /**
   * Generate optimized insights for team-specific goals
   * NOTE: Odds are NOT integrated here for efficiency (to save API calls)
   */
  private generateOptimalTeamGoalsInsights(
    teamPattern: TeamGoalPattern,
    teamType: 'Home' | 'Away',
    matchOdds?: MatchOdds // Kept for consistency, but not used internally
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Analyze team-specific goal thresholds
    const matches = teamPattern.recentMatches;
    const thresholds = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
    
    // Calls the default analyzeGoalThreshold without odds
    const analyses: GoalThresholdAnalysis[] = thresholds.map(threshold => 
      this.analyzeGoalThreshold(matches, threshold, 'for')
    );
    
    // Find optimal threshold for this team
    const optimal = this.findOptimalThreshold(analyses);
    
    if (optimal) {
      const analysis = optimal.analysis;
      const recentHits = analysis.recentForm.filter(Boolean).length;
      
      insights.push({
        id: `optimal-${teamType.toLowerCase()}-goals-${analysis.betType}-${analysis.threshold}`,
        title: `${teamType} Team ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold} Goals`,
        description: `Optimal ${teamType.toLowerCase()} team bet: ${analysis.percentage.toFixed(1)}% hit rate (${recentHits}/5 recent). ${optimal.reasoning}`,
        market: `${teamType} Team Goals ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        // odds is undefined here
        supportingData: `Recent form: [${matches.slice(0, 5).map(m => m.goalsFor).join(', ')}]. Average: ${teamPattern.averageGoalsFor}/game`,
        aiEnhanced: true
      });
    }
    
    return insights;
  }

  /**
   * Generate Both Teams to Score insights 
   * 🎯 UPDATED to accept MatchOdds and include odds in output
   */
  private generateBTTSInsights(
    homePattern: TeamGoalPattern,
    awayPattern: TeamGoalPattern,
    matchOdds?: MatchOdds // 🎯 NEW PARAMETER
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    const combinedBTTSPercentage = (homePattern.bttsPercentage + awayPattern.bttsPercentage) / 2;
    const homeRecentBTTS = homePattern.recentMatches.filter(m => m.bothTeamsScored).length;
    const awayRecentBTTS = awayPattern.recentMatches.filter(m => m.bothTeamsScored).length;
    const avgRecentBTTS = (homeRecentBTTS + awayRecentBTTS) / 2;
    
    // Get the actual BTTS odds
    const bttsYesOdds = matchOdds?.bttsOdds?.yesOdds;
    const bttsNoOdds = matchOdds?.bttsOdds?.noOdds;
    
    // Calculate a simple value score for BTTS Yes
    const yesConfidence = this.getConfidenceLevel(combinedBTTSPercentage, avgRecentBTTS / 5);
    const yesValue = this.calculateBetValue(combinedBTTSPercentage, avgRecentBTTS / 5, 2.5, 'over', bttsYesOdds);
    
    // BTTS - YES
    if (yesConfidence !== 'low') { // Check confidence level
      insights.push({
        id: 'optimal-btts-yes',
        title: 'Both Teams to Score - YES',
        description: `Strong BTTS opportunity: ${combinedBTTSPercentage.toFixed(1)}% rate. Both teams show consistent scoring ability. Value Score: ${yesValue.toFixed(0)}`,
        market: 'Both Teams to Score - Yes',
        confidence: yesConfidence,
        odds: bttsYesOdds ? bttsYesOdds.toFixed(2) : undefined, // 💰 NEW: Include odds
        supportingData: `Home: ${homeRecentBTTS}/5 recent, Away: ${awayRecentBTTS}/5 recent. Combined BTTS: ${combinedBTTSPercentage.toFixed(1)}%`
      });
    }
    
    // BTTS - NO
    const bttsNoPercentage = 100 - combinedBTTSPercentage;
    const noConsistency = (10 - homeRecentBTTS - awayRecentBTTS) / 10;
    const noConfidence = this.getConfidenceLevel(bttsNoPercentage, noConsistency);
    const noValue = this.calculateBetValue(bttsNoPercentage, noConsistency, 2.5, 'under', bttsNoOdds);

    // Only suggest BTTS No if it has at least medium confidence AND a positive value edge
    if (noConfidence !== 'low' && (bttsNoOdds && (bttsNoPercentage / 100) > (1 / bttsNoOdds))) {
      insights.push({
        id: 'optimal-btts-no',
        title: 'Both Teams to Score - NO',
        description: `Strong defensive trend: ${bttsNoPercentage.toFixed(1)}% of matches see at least one team fail to score. Value Score: ${noValue.toFixed(0)}`,
        market: 'Both Teams to Score - No',
        confidence: noConfidence,
        odds: bttsNoOdds ? bttsNoOdds.toFixed(2) : undefined, // 💰 NEW: Include odds
        supportingData: `One or both teams struggle to score. Home avg: ${homePattern.averageGoalsFor}, Away avg: ${awayPattern.averageGoalsFor}`
      });
    }
    
    return insights;
  }

  /**
   * Main method: Generate optimized goal-related betting insights
   * 🎯 UPDATED to fetch and pass MatchOdds
   */
  async generateGoalInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    try {
      console.log(`[GoalsAI] Generating optimized insights for ${homeTeam} vs ${awayTeam}`);
      
      const homePattern = await this.analyzeTeamGoalPattern(homeTeam, 'home');
      const awayPattern = await this.analyzeTeamGoalPattern(awayTeam, 'away');

      // 🎯 NEW STEP: Fetch odds data here (efficiently via cache)
      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam); 
      
      const allInsights: AIInsight[] = [];
      
      // Pass matchOdds to generation functions
      allInsights.push(...this.generateOptimalTotalGoalsInsights(homePattern, awayPattern, matchOdds));
      allInsights.push(...this.generateOptimalTeamGoalsInsights(homePattern, 'Home', matchOdds));
      allInsights.push(...this.generateOptimalTeamGoalsInsights(awayPattern, 'Away', matchOdds));
      allInsights.push(...this.generateBTTSInsights(homePattern, awayPattern, matchOdds));
      
      // Filter and limit results
      console.log(`[GoalsAI] Resolving potential conflicts among ${allInsights.length} generated insights...`);
      const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
      
      const insightsToFilter = resolutionResult.resolvedInsights;
      
      const filteredInsights = insightsToFilter
        .filter(insight => insight.confidence !== 'low')
        .slice(0, 6);
      
      console.log(`[GoalsAI] ✅ Final insights after resolution: ${filteredInsights.length}`);
      console.log(`[GoalsAI] Resolution Summary: ${resolutionResult.summary}`);
      return filteredInsights;
      
    } catch (error) {
      console.error('[GoalsAI] Error generating goal insights:', error);
      return [];
    }
  }
}

export const goalsAIService = new GoalsAIService();
