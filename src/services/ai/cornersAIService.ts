// src/services/ai/cornersAIService.ts
import { supabaseCornersService, DetailedCornerStats } from '../stats/supabaseCornersService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService';

// 💡 FIX 1: Local interface definitions must be defined here for global use within the file
interface MatchOdds {
  matchId: string;
  totalCornersOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  lastFetched: number;
}

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
  conflictScore?: number;
  valueScore?: number;
}

interface CornerThresholdAnalysis {
  threshold: number;
  percentage: number;
  consistency: number;
  confidence: 'high' | 'medium' | 'low';
  recentForm: boolean[];
  betType: 'over' | 'under';
  value: number;
  odds?: number;
}

// 💡 FIX 1: Interface is now correctly defined outside the class
interface OptimalThreshold {
  analysis: CornerThresholdAnalysis;
  reasoning: string;
  alternativeConsidered: CornerThresholdAnalysis[];
}

// 💡 FIX 1: Interface is now correctly defined outside the class
interface TeamCornerPattern {
  team: string;
  venue: 'home' | 'away';
  averageCornersFor: number;
  averageCornersAgainst: number;
  averageTotalCorners: number;
  thresholdAnalysis: {
    [key: string]: CornerThresholdAnalysis;
  };
  recentMatches: Array<{
    opponent: string;
    cornersFor: number;
    cornersAgainst: number;
    totalCorners: number;
  }>;
}

type CornerType = 'total' | 'for' | 'against';

export class CornersAIService {
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

  // 💡 FIX 2: Properties were missing 'private readonly' modifier in the previous snippet
  private readonly MATCH_CORNER_THRESHOLDS = [4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5, 13.5, 14.5, 15.5];
  private readonly TEAM_CORNER_THRESHOLDS = [2.5, 3.5, 4.5, 5.5, 6.5, 7.5, 8.5, 9.5, 10.5, 11.5, 12.5];

  /**
   * Helper to get corner count based on type
   */
  private getCornerCount(
    match: { totalCorners: number; cornersFor: number; cornersAgainst: number },
    type: CornerType
  ) {
    switch (type) {
      case 'for': return match.cornersFor;
      case 'against': return match.cornersAgainst;
      default: return match.totalCorners;
    }
  }

  /**
   * Analyze corner threshold for an 'Over' bet type
   */
  private analyzeCornerThresholdOver(
    matches: Array<{ totalCorners: number; cornersFor: number; cornersAgainst: number }>,
    threshold: number,
    type: CornerType,
    odds?: number
  ): CornerThresholdAnalysis {
    const getCount = (match: { totalCorners: number; cornersFor: number; cornersAgainst: number }) => 
      this.getCornerCount(match, type);

    // Calculate over percentage
    const matchesOver = matches.filter(match => getCount(match) > threshold);
    const overPercentage = (matchesOver.length / matches.length) * 100;

    // Analyze recent form
    const recentMatches = matches.slice(0, 5);
    const recentOverForm = recentMatches.map(match => getCount(match) > threshold);
    const overHits = recentOverForm.filter(Boolean).length;
    const overConsistency = overHits / Math.min(5, recentMatches.length);

    // Confidence and Value
    // 💡 FIX 3: Added 'this.' prefix to getConfidenceLevel and calculateBetValue
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
   * Analyze corner threshold for an 'Under' bet type
   */
  private analyzeCornerThresholdUnder(
    matches: Array<{ totalCorners: number; cornersFor: number; cornersAgainst: number }>,
    threshold: number,
    type: CornerType,
    odds?: number
  ): CornerThresholdAnalysis {
    const getCount = (match: { totalCorners: number; cornersFor: number; cornersAgainst: number }) => 
      this.getCornerCount(match, type);

    // Calculate under percentage
    const matchesUnder = matches.filter(match => getCount(match) < threshold);
    const underPercentage = (matchesUnder.length / matches.length) * 100;

    // Analyze recent form
    const recentMatches = matches.slice(0, 5);
    const recentUnderForm = recentMatches.map(match => getCount(match) < threshold);
    const underHits = recentUnderForm.filter(Boolean).length;
    const underConsistency = underHits / Math.min(5, recentMatches.length);

    // Confidence and Value
    // 💡 FIX 3: Added 'this.' prefix to getConfidenceLevel and calculateBetValue
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
   * Analyze specific corner threshold with enhanced value calculation
   */
  private analyzeCornerThreshold(
    matches: Array<{ totalCorners: number; cornersFor: number; cornersAgainst: number }>,
    threshold: number,
    type: CornerType,
    matchOdds: MatchOdds | null
  ): CornerThresholdAnalysis {
    // Get specific odds for popular thresholds if available
    let overOdds: number | undefined;
    let underOdds: number | undefined;
    
    // Only integrate odds for most popular corner totals for efficiency
    if (type === 'total' && this.MATCH_CORNER_THRESHOLDS.includes(threshold) && matchOdds?.totalCornersOdds) {
      overOdds = matchOdds.totalCornersOdds.overOdds;
      underOdds = matchOdds.totalCornersOdds.underOdds;
    }

    const overAnalysis = this.analyzeCornerThresholdOver(matches, threshold, type, overOdds);
    const underAnalysis = this.analyzeCornerThresholdUnder(matches, threshold, type, underOdds);

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
      return overAnalysis.value > underAnalysis.value ? overAnalysis : underAnalysis;
    }
  }

  /**
   * Analyze corner patterns for a specific team
   * 💡 FIX 4: Explicitly typed the return value
   */
  private async analyzeTeamCornerPattern(teamName: string, venue: 'home' | 'away'): Promise<TeamCornerPattern> {
    const teamStats = await supabaseCornersService.getTeamCornerStats(teamName);
    
    if (!teamStats) {
      throw new Error(`No corner data found for team: ${teamName}`);
    }

    // 💡 FIX 5: Ensure 'relevantMatches' is correctly typed if needed, but the map looks fine here
    const relevantMatches = teamStats.matchDetails.map(match => ({
      opponent: match.opponent,
      cornersFor: match.cornersFor,
      cornersAgainst: match.cornersAgainst,
      totalCorners: match.totalCorners,
    }));
    
    const averageCornersFor = teamStats.corners / teamStats.matches;
    const averageCornersAgainst = teamStats.cornersAgainst / teamStats.matches;
    const averageTotalCorners = averageCornersFor + averageCornersAgainst;

    // Analyze team corner thresholds
    const thresholdAnalysis: { [key: string]: CornerThresholdAnalysis } = {};
    
    // For team-specific corners (for/against)
    // 💡 FIX 6: Use 'this.TEAM_CORNER_THRESHOLDS' and specify the type of 'threshold'
    this.TEAM_CORNER_THRESHOLDS.forEach((threshold: number) => {
      thresholdAnalysis[`for_${threshold}`] = this.analyzeCornerThreshold(relevantMatches, threshold, 'for', null);
      thresholdAnalysis[`against_${threshold}`] = this.analyzeCornerThreshold(relevantMatches, threshold, 'against', null);
    });

    // For match total corners
    // 💡 FIX 6: Use 'this.MATCH_CORNER_THRESHOLDS' and specify the type of 'threshold'
    this.MATCH_CORNER_THRESHOLDS.forEach((threshold: number) => {
      thresholdAnalysis[`total_${threshold}`] = this.analyzeCornerThreshold(relevantMatches, threshold, 'total', null);
    });

    return {
      team: teamName,
      venue,
      averageCornersFor: Math.round(averageCornersFor * 100) / 100,
      averageCornersAgainst: Math.round(averageCornersAgainst * 100) / 100,
      averageTotalCorners: Math.round(averageTotalCorners * 100) / 100,
      thresholdAnalysis,
      recentMatches: relevantMatches.slice(0, 5)
    };
  }

  /**
   * Calculate betting value score for corners
   * 💡 FIX 3: This method definition is fine, but calls were missing 'this.'
   */
  private calculateBetValue(
    percentage: number, 
    consistency: number,
    threshold: number,
    betType: 'over' | 'under',
    odds?: number
  ): number {
    // Base value calculation
    let baseValue = percentage * consistency;
    
    // Apply threshold difficulty adjustment
    if (betType === 'over') {
      baseValue += (threshold * 2); // Corners are generally lower scoring than goals
    } else {
      baseValue += ((20 - threshold) * 2); // Adjust for corner range
    }
    
    // Odds-based value calculation
    if (odds && odds > 1.05) {
      const calculatedProbability = percentage / 100;
      const impliedProbability = 1 / odds;
      const edge = calculatedProbability - impliedProbability;
      
      if (edge > 0.05) {
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
   * 💡 FIX 3: This method definition is fine, but calls were missing 'this.'
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
   * 💡 FIX 4: Explicitly typed the return value
   */
  private findOptimalThreshold(analyses: CornerThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThreshold | null {
    let validAnalyses = analyses.filter(a => a.confidence !== 'low');
    
    if (betType) {
      validAnalyses = validAnalyses.filter(a => a.betType === betType);
    }
    
    if (validAnalyses.length === 0) return null;
    
    const sorted = validAnalyses.sort((a, b) => b.value - a.value);
    const optimal = sorted[0];
    
    // 💡 FIX 3: Added 'this.' prefix to generateThresholdReasoning
    const reasoning = this.generateThresholdReasoning(optimal, sorted.slice(1, 3));
    
    return {
      analysis: optimal,
      reasoning,
      alternativeConsidered: sorted.slice(1, 3)
    };
  }

  /**
   * Generate reasoning for threshold selection
   * 💡 FIX 3: This method definition is fine, but calls were missing 'this.'
   */
  private generateThresholdReasoning(optimal: CornerThresholdAnalysis, alternatives: CornerThresholdAnalysis[]): string {
    let reasoning = `${optimal.betType === 'over' ? 'Over' : 'Under'} ${optimal.threshold} corners selected for optimal value`;
    
    if (alternatives.length > 0) {
      const alt = alternatives[0];
      reasoning += `. Preferred over ${alt.threshold} due to ${optimal.percentage > alt.percentage ? 'better hit rate' : 'superior odds value'}.`;
    }
    
    return reasoning;
  }

  /**
   * Generate optimized insights for total match corners
   * 💡 FIX 4: Explicitly typed the input variables
   */
  private generateOptimalMatchCornerInsights(
    homePattern: TeamCornerPattern,
    awayPattern: TeamCornerPattern,
    matchOdds: MatchOdds | null
  ): AIInsight[] {
    const insights: AIInsight[] = [];

    const allCombinedAnalyses: CornerThresholdAnalysis[] = [];
    
    // 💡 FIX 6: Use 'this.MATCH_CORNER_THRESHOLDS' and specify the type of 'threshold'
    this.MATCH_CORNER_THRESHOLDS.forEach((threshold: number) => {
      const homeAnalysis = homePattern.thresholdAnalysis[`total_${threshold}`];
      const awayAnalysis = awayPattern.thresholdAnalysis[`total_${threshold}`];
      
      if (!homeAnalysis || !awayAnalysis) return;

      // Get odds for popular thresholds
      const overOdds = [8.5, 9.5, 10.5].includes(threshold) ? matchOdds?.totalCornersOdds?.overOdds : undefined;
      const underOdds = [8.5, 9.5, 10.5].includes(threshold) ? matchOdds?.totalCornersOdds?.underOdds : undefined;

      // Combined over analysis
      const combinedOverPercentage = (homeAnalysis.percentage + awayAnalysis.percentage) / 2;
      const combinedOverConsistency = (homeAnalysis.consistency + awayAnalysis.consistency) / 2;
      // 💡 FIX 3: Added 'this.' prefix
      const combinedOverValue = this.calculateBetValue(combinedOverPercentage, combinedOverConsistency, threshold, 'over', overOdds);

      allCombinedAnalyses.push({
        threshold,
        percentage: combinedOverPercentage,
        consistency: combinedOverConsistency,
        // 💡 FIX 3: Added 'this.' prefix
        confidence: this.getConfidenceLevel(combinedOverPercentage, combinedOverConsistency),
        recentForm: [...(homeAnalysis.recentForm || []), ...(awayAnalysis.recentForm || [])].slice(0, 5),
        betType: 'over',
        value: combinedOverValue,
        odds: overOdds,
      });

      // Combined under analysis
      const combinedUnderPercentage = (homeAnalysis.percentage + awayAnalysis.percentage) / 2;
      const combinedUnderConsistency = (homeAnalysis.consistency + awayAnalysis.consistency) / 2;
      // 💡 FIX 3: Added 'this.' prefix
      const combinedUnderValue = this.calculateBetValue(combinedUnderPercentage, combinedUnderConsistency, threshold, 'under', underOdds);

      allCombinedAnalyses.push({
        threshold,
        percentage: combinedUnderPercentage,
        consistency: combinedUnderConsistency,
        // 💡 FIX 3: Added 'this.' prefix
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
      
      insights.push({
        id: `optimal-match-corners-${analysis.betType}-${analysis.threshold}`,
        title: `${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold} Match Corners`,
        description: `Absolute best bet: ${analysis.percentage.toFixed(1)}% hit rate with strong corner trends. ${optimalBet.reasoning}`,
        market: `Match Corners ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
        confidence: analysis.confidence,
        odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
        supportingData: `Home avg: ${homePattern.averageTotalCorners}, Away avg: ${awayPattern.averageTotalCorners}`,
        aiEnhanced: true,
        valueScore: analysis.value, 
      });
    }
    return insights;
  }

  /**
   * Generate optimized insights for team-specific corners
   * 💡 FIX 4: Explicitly typed the input variable
   */
  private generateOptimalTeamCornerInsights(
    teamPattern: TeamCornerPattern,
    teamType: 'Home' | 'Away'
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Analyze team corner thresholds
    const analyses: CornerThresholdAnalysis[] = [];
    
    // 💡 FIX 6: Use 'this.TEAM_CORNER_THRESHOLDS' and specify the type of 'threshold'
    this.TEAM_CORNER_THRESHOLDS.forEach((threshold: number) => {
      const forAnalysis = teamPattern.thresholdAnalysis[`for_${threshold}`];
      if (forAnalysis) {
        analyses.push(forAnalysis);
      }
    });
    
    // 💡 FIX 3: Added 'this.' prefix
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
        supportingData: `Recent form: [${teamPattern.recentMatches.slice(0, 5).map((m: { cornersFor: number }) => m.cornersFor).join(', ')}]. Average: ${teamPattern.averageCornersFor}/game`,
        aiEnhanced: true,
        valueScore: analysis.value, 
      });
    }
    
    return insights;
  }

  /**
   * Generate corner handicap insights (who will get most corners)
   * 💡 FIX 4: Explicitly typed the input variables
   */
  private generateCornerHandicapInsights(
    homePattern: TeamCornerPattern,
    awayPattern: TeamCornerPattern
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Calculate corner dominance patterns
    const homeWins = homePattern.recentMatches.filter(m => m.cornersFor > m.cornersAgainst).length;
    const awayWins = awayPattern.recentMatches.filter(m => m.cornersFor > m.cornersAgainst).length;
    const homeDraws = homePattern.recentMatches.filter(m => m.cornersFor === m.cornersAgainst).length;
    const awayDraws = awayPattern.recentMatches.filter(m => m.cornersFor === m.cornersAgainst).length;
    
    const homeWinPercentage = (homeWins / Math.max(homePattern.recentMatches.length, 1)) * 100;
    const awayWinPercentage = (awayWins / Math.max(awayPattern.recentMatches.length, 1)) * 100;
    const drawPercentage = ((homeDraws + awayDraws) / Math.max(homePattern.recentMatches.length + awayPattern.recentMatches.length, 1)) * 100;
    
    // Corner advantage analysis
    const homeAdvantage = homePattern.averageCornersFor - homePattern.averageCornersAgainst;
    const awayAdvantage = awayPattern.averageCornersFor - awayPattern.averageCornersAgainst;
    
    // Determine best bet
    if (homeWinPercentage > 60 && homeAdvantage > 1) {
      insights.push({
        id: 'corner-handicap-home',
        title: 'Home Team Corner Advantage',
        description: `Strong home corner dominance: ${homeWinPercentage.toFixed(1)}% win rate. Average advantage: +${homeAdvantage.toFixed(1)} corners`,
        market: 'Corner Handicap - Home',
        confidence: homeWinPercentage > 75 ? 'high' : 'medium',
        supportingData: `Home wins corners in ${homeWins}/${homePattern.recentMatches.length} recent matches. Avg corners: ${homePattern.averageCornersFor} vs ${homePattern.averageCornersAgainst}`,
        aiEnhanced: true
      });
    } else if (awayWinPercentage > 60 && awayAdvantage > 1) {
      insights.push({
        id: 'corner-handicap-away',
        title: 'Away Team Corner Advantage',
        description: `Strong away corner dominance: ${awayWinPercentage.toFixed(1)}% win rate. Average advantage: +${awayAdvantage.toFixed(1)} corners`,
        market: 'Corner Handicap - Away',
        confidence: awayWinPercentage > 75 ? 'high' : 'medium',
        supportingData: `Away wins corners in ${awayWins}/${awayPattern.recentMatches.length} recent matches. Avg corners: ${awayPattern.averageCornersFor} vs ${awayPattern.averageCornersAgainst}`,
        aiEnhanced: true
      });
    } else if (drawPercentage > 40) {
      insights.push({
        id: 'corner-handicap-draw',
        title: 'Corner Count Draw',
        description: `Balanced corner patterns suggest equal corner counts: ${drawPercentage.toFixed(1)}% draw rate`,
        market: 'Corner Handicap - Draw',
        confidence: drawPercentage > 50 ? 'medium' : 'low',
        supportingData: `Even corner splits common. Home avg: ${homePattern.averageCornersFor}, Away avg: ${awayPattern.averageCornersFor}`,
        aiEnhanced: true
      });
    }
    
    return insights;
  }

  /**
   * Main method: Generate optimized corner-related betting insights
   */
  async generateCornerInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    try {
      console.log(`[CornersAI] Generating optimized corner insights for ${homeTeam} vs ${awayTeam}`);
      
      // 💡 FIX 3: Added 'this.' prefix to helper calls
      const homePattern = await this.analyzeTeamCornerPattern(homeTeam, 'home');
      const awayPattern = await this.analyzeTeamCornerPattern(awayTeam, 'away');

      // Fetch odds data (if available)
      const matchOdds = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam);
      
      const allInsights: AIInsight[] = [];
      
      // Generate different types of corner insights
      // 💡 FIX 3: Added 'this.' prefix to helper calls
      allInsights.push(...this.generateOptimalMatchCornerInsights(homePattern, awayPattern, matchOdds));
      allInsights.push(...this.generateOptimalTeamCornerInsights(homePattern, 'Home'));
      allInsights.push(...this.generateOptimalTeamCornerInsights(awayPattern, 'Away'));
      // 💡 FIX 7: Corrected method name typo
      allInsights.push(...this.generateCornerHandicapInsights(homePattern, awayPattern));
      
      // Filter and limit results
      console.log(`[CornersAI] Resolving potential conflicts among ${allInsights.length} generated insights...`);
      const resolutionResult = conflictResolverService.resolveConflicts(allInsights);
      
      const insightsToFilter = resolutionResult.resolvedInsights;
      
      const filteredInsights = insightsToFilter
        .filter(insight => insight.confidence !== 'low')
        .sort((a, b) => {
            const confidenceOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
            const confDiff = (confidenceOrder[b.confidence] || 1) - (confidenceOrder[a.confidence] || 1);
            if (confDiff !== 0) return confDiff;
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
