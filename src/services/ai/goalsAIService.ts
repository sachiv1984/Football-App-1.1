// src/services/ai/goalsAIService.ts
import { supabaseGoalsService, DetailedGoalStats } from '../stats/supabaseGoalsService';
import { AIInsight } from '../../components/insights/AIInsightCard/AIInsightCard.types';

interface GoalThresholdAnalysis {
  threshold: number;
  percentage: number;
  consistency: number;
  confidence: 'high' | 'medium' | 'low';
  recentForm: boolean[]; // Last 5 matches - did they hit this threshold?
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
    over55?: GoalThresholdAnalysis; // Only for team goals
  };
  recentMatches: Array<{
    opponent: string;
    goalsFor: number;
    goalsAgainst: number;
    totalGoals: number;
    bothTeamsScored: boolean;
  }>;
}

interface MatchGoalAnalysis {
  homeTeam: TeamGoalPattern;
  awayTeam: TeamGoalPattern;
  combinedInsights: {
    expectedTotalGoals: number;
    bttsLikelihood: number;
    recommendedThresholds: {
      totalGoals: GoalThresholdAnalysis[];
      homeTeamGoals: GoalThresholdAnalysis[];
      awayTeamGoals: GoalThresholdAnalysis[];
    };
  };
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
   */
  private async analyzeTeamGoalPattern(teamName: string, venue: 'home' | 'away'): Promise<TeamGoalPattern> {
    const teamStats = await supabaseGoalsService.getTeamGoalStats(teamName);
    
    if (!teamStats) {
      throw new Error(`No goal data found for team: ${teamName}`);
    }

    // Filter matches by venue if needed (for future home/away analysis)
    const relevantMatches = teamStats.matchDetails; // For now, use all matches
    
    const averageGoalsFor = teamStats.goalsFor / teamStats.matches;
    const averageGoalsAgainst = teamStats.goalsAgainst / teamStats.matches;
    const averageTotalGoals = averageGoalsFor + averageGoalsAgainst;

    // Analyze each threshold
    const thresholdAnalysis = {
      over05: this.analyzeGoalThreshold(relevantMatches, 0.5, 'total'),
      over15: this.analyzeGoalThreshold(relevantMatches, 1.5, 'total'),
      over25: this.analyzeGoalThreshold(relevantMatches, 2.5, 'total'),
      over35: this.analyzeGoalThreshold(relevantMatches, 3.5, 'total'),
      over45: this.analyzeGoalThreshold(relevantMatches, 4.5, 'total'),
      over55: this.analyzeGoalThreshold(relevantMatches, 5.5, 'total')
    };

    // Calculate BTTS percentage
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
   * Analyze specific goal threshold (e.g., Over 2.5)
   */
  private analyzeGoalThreshold(
    matches: Array<{ totalGoals: number; goalsFor: number; goalsAgainst: number }>,
    threshold: number,
    type: 'total' | 'for' | 'against'
  ): GoalThresholdAnalysis {
    
    // Determine which goal count to use
    const getGoalCount = (match: any) => {
      switch (type) {
        case 'for': return match.goalsFor;
        case 'against': return match.goalsAgainst;
        default: return match.totalGoals;
      }
    };

    // Calculate overall percentage
    const matchesOver = matches.filter(match => getGoalCount(match) > threshold);
    const percentage = (matchesOver.length / matches.length) * 100;

    // Analyze recent form (last 5 matches)
    const recentMatches = matches.slice(0, 5);
    const recentForm = recentMatches.map(match => getGoalCount(match) > threshold);
    const recentHits = recentForm.filter(Boolean).length;
    const consistency = recentHits / Math.min(5, recentMatches.length);

    // Determine confidence level
    let confidence: 'high' | 'medium' | 'low' = 'low';
    
    if (percentage >= this.CONFIDENCE_THRESHOLDS.HIGH * 100 && consistency >= this.CONSISTENCY_THRESHOLDS.GOOD) {
      confidence = 'high';
    } else if (percentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM * 100 && consistency >= this.CONSISTENCY_THRESHOLDS.POOR) {
      confidence = 'medium';
    }

    return {
      threshold,
      percentage: Math.round(percentage * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      confidence,
      recentForm
    };
  }

  /**
   * Analyze goal patterns for team-specific goals (home/away team goals)
   */
private analyzeTeamSpecificGoals(
  matches: Array<{ goalsFor: number; goalsAgainst: number; totalGoals: number }>
): {
  over05: GoalThresholdAnalysis;
  over15: GoalThresholdAnalysis;
  over25: GoalThresholdAnalysis;
  over35: GoalThresholdAnalysis;
  over45: GoalThresholdAnalysis;
  over55: GoalThresholdAnalysis;
} {
  return {
    over05: this.analyzeGoalThreshold(matches, 0.5, 'for'),
    over15: this.analyzeGoalThreshold(matches, 1.5, 'for'),
    over25: this.analyzeGoalThreshold(matches, 2.5, 'for'),
    over35: this.analyzeGoalThreshold(matches, 3.5, 'for'),
    over45: this.analyzeGoalThreshold(matches, 4.5, 'for'),
    over55: this.analyzeGoalThreshold(matches, 5.5, 'for')
  };
}


  /**
   * Generate insights for total match goals
   */
  private generateTotalGoalsInsights(
    homePattern: TeamGoalPattern,
    awayPattern: TeamGoalPattern
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Test each threshold and find the best opportunities
    const thresholds = [
      { key: 'over05', value: 0.5, label: '0.5' },
      { key: 'over15', value: 1.5, label: '1.5' },
      { key: 'over25', value: 2.5, label: '2.5' },
      { key: 'over35', value: 3.5, label: '3.5' },
      { key: 'over45', value: 4.5, label: '4.5' }
    ] as const;

    for (const threshold of thresholds) {
      const homeAnalysis = homePattern.thresholdAnalysis[threshold.key];
      const awayAnalysis = awayPattern.thresholdAnalysis[threshold.key];
      
      // Combined confidence (weighted average)
      const combinedPercentage = (homeAnalysis.percentage + awayAnalysis.percentage) / 2;
      const combinedConsistency = (homeAnalysis.consistency + awayAnalysis.consistency) / 2;
      
      // Determine if this is a good betting opportunity
      if (combinedPercentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM * 100) {
        const confidence = this.determineOverallConfidence(combinedPercentage, combinedConsistency);
        
        const homeRecent = homeAnalysis.recentForm.filter(Boolean).length;
        const awayRecent = awayAnalysis.recentForm.filter(Boolean).length;
        
        insights.push({
          id: `total-goals-over-${threshold.label}`,
          title: `Over ${threshold.label} Total Goals`,
          description: `Strong pattern detected: ${combinedPercentage.toFixed(1)}% hit rate. Home team hit in ${homeRecent}/5 recent matches, away team ${awayRecent}/5.`,
          market: `Total Goals Over ${threshold.label}`,
          confidence,
          supportingData: `Home: ${homeAnalysis.percentage}% (${homePattern.averageTotalGoals} avg), Away: ${awayAnalysis.percentage}% (${awayPattern.averageTotalGoals} avg)`
        });
      }
      
      // Also check for Under opportunities (inverse logic)
      const underPercentage = 100 - combinedPercentage;
      if (underPercentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM * 100) {
        const confidence = this.determineOverallConfidence(underPercentage, 1 - combinedConsistency);
        
        insights.push({
          id: `total-goals-under-${threshold.label}`,
          title: `Under ${threshold.label} Total Goals`,
          description: `Low-scoring pattern: ${underPercentage.toFixed(1)}% of matches stay under ${threshold.label} goals. Both teams showing defensive solidity.`,
          market: `Total Goals Under ${threshold.label}`,
          confidence,
          supportingData: `Combined average: ${((homePattern.averageTotalGoals + awayPattern.averageTotalGoals) / 2).toFixed(1)} goals per game`
        });
      }
    }

    // Sort by confidence and percentage
return insights.sort((a, b) => {
  type ConfidenceLevel = 'high' | 'medium' | 'low';
  const confidenceOrder: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };
  return confidenceOrder[b.confidence] - confidenceOrder[a.confidence];
});
  }

  /**
   * Generate insights for team-specific goals
   */
  private generateTeamGoalsInsights(
    teamPattern: TeamGoalPattern,
    teamType: 'Home' | 'Away'
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Analyze team-specific goal thresholds
    const teamGoalAnalysis = this.analyzeTeamSpecificGoals(teamPattern.recentMatches);
    
    const thresholds = [
      { analysis: teamGoalAnalysis.over05, value: 0.5 },
      { analysis: teamGoalAnalysis.over15, value: 1.5 },
      { analysis: teamGoalAnalysis.over25, value: 2.5 },
      { analysis: teamGoalAnalysis.over35, value: 3.5 },
      { analysis: teamGoalAnalysis.over45, value: 4.5 },
      { analysis: teamGoalAnalysis.over55, value: 5.5 }
    ];

    for (const threshold of thresholds) {
      const analysis = threshold.analysis;
      
      if (analysis.percentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM * 100) {
        const recentHits = analysis.recentForm.filter(Boolean).length;
        
        insights.push({
          id: `${teamType.toLowerCase()}-goals-over-${threshold.value}`,
          title: `${teamType} Team Over ${threshold.value} Goals`,
          description: `${teamType} team strong attacking form: ${analysis.percentage}% hit rate (${recentHits}/5 recent matches). Average ${teamPattern.averageGoalsFor} goals per game.`,
          market: `${teamType} Team Goals Over ${threshold.value}`,
          confidence: analysis.confidence,
          supportingData: `Recent form: [${teamPattern.recentMatches.slice(0, 5).map(m => m.goalsFor).join(', ')}]`
        });
      }
    }

    return insights;
  }

  /**
   * Generate Both Teams to Score insights
   */
  private generateBTTSInsights(
    homePattern: TeamGoalPattern,
    awayPattern: TeamGoalPattern
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    
    // Combined BTTS percentage (weighted average)
    const combinedBTTSPercentage = (homePattern.bttsPercentage + awayPattern.bttsPercentage) / 2;
    
    // Analyze recent BTTS form
    const homeRecentBTTS = homePattern.recentMatches.filter(m => m.bothTeamsScored).length;
    const awayRecentBTTS = awayPattern.recentMatches.filter(m => m.bothTeamsScored).length;
    const avgRecentBTTS = (homeRecentBTTS + awayRecentBTTS) / 2;
    
    // BTTS - YES
    if (combinedBTTSPercentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM * 100) {
      const consistency = avgRecentBTTS / 5;
      const confidence = this.determineOverallConfidence(combinedBTTSPercentage, consistency);
      
      insights.push({
        id: 'btts-yes',
        title: 'Both Teams to Score - YES',
        description: `Both teams have strong scoring records: ${combinedBTTSPercentage.toFixed(1)}% BTTS rate. Home team: ${homeRecentBTTS}/5, Away team: ${awayRecentBTTS}/5 recent matches.`,
        market: 'Both Teams to Score - Yes',
        confidence,
        supportingData: `Home BTTS: ${homePattern.bttsPercentage}%, Away BTTS: ${awayPattern.bttsPercentage}%`
      });
    }
    
    // BTTS - NO
    const bttsNoPercentage = 100 - combinedBTTSPercentage;
    if (bttsNoPercentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM * 100) {
      const consistency = (10 - homeRecentBTTS - awayRecentBTTS) / 10;
      const confidence = this.determineOverallConfidence(bttsNoPercentage, consistency);
      
      insights.push({
        id: 'btts-no',
        title: 'Both Teams to Score - NO',
        description: `One or both teams struggle to score consistently: ${bttsNoPercentage.toFixed(1)}% of matches see at least one team fail to score.`,
        market: 'Both Teams to Score - No',
        confidence,
        supportingData: `Home avg: ${homePattern.averageGoalsFor}/game, Away avg: ${awayPattern.averageGoalsFor}/game`
      });
    }
    
    return insights;
  }

  /**
   * Determine overall confidence based on percentage and consistency
   */
  private determineOverallConfidence(percentage: number, consistency: number): 'high' | 'medium' | 'low' {
    if (percentage >= this.CONFIDENCE_THRESHOLDS.HIGH * 100 && consistency >= this.CONSISTENCY_THRESHOLDS.GOOD) {
      return 'high';
    } else if (percentage >= this.CONFIDENCE_THRESHOLDS.MEDIUM * 100 && consistency >= this.CONSISTENCY_THRESHOLDS.POOR) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Main method: Generate all goal-related betting insights for a match
   */
  async generateGoalInsights(homeTeam: string, awayTeam: string): Promise<AIInsight[]> {
    try {
      console.log(`[GoalsAI] Generating insights for ${homeTeam} vs ${awayTeam}`);
      
      // Analyze both teams
      const homePattern = await this.analyzeTeamGoalPattern(homeTeam, 'home');
      const awayPattern = await this.analyzeTeamGoalPattern(awayTeam, 'away');
      
      const allInsights: AIInsight[] = [];
      
      // Generate all types of insights
      allInsights.push(...this.generateTotalGoalsInsights(homePattern, awayPattern));
      allInsights.push(...this.generateTeamGoalsInsights(homePattern, 'Home'));
      allInsights.push(...this.generateTeamGoalsInsights(awayPattern, 'Away'));
      allInsights.push(...this.generateBTTSInsights(homePattern, awayPattern));
      
      // Filter out low-confidence insights and limit results
      const filteredInsights = allInsights
        .filter(insight => insight.confidence !== 'low')
        .slice(0, 8); // Maximum 8 insights per match
      
      console.log(`[GoalsAI] Generated ${filteredInsights.length} goal insights`);
      return filteredInsights;
      
    } catch (error) {
      console.error('[GoalsAI] Error generating goal insights:', error);
      return [];
    }
  }

  /**
   * Get detailed analysis for debugging/testing
   */
  async getMatchAnalysis(homeTeam: string, awayTeam: string): Promise<MatchGoalAnalysis> {
    const homePattern = await this.analyzeTeamGoalPattern(homeTeam, 'home');
    const awayPattern = await this.analyzeTeamGoalPattern(awayTeam, 'away');
    
    // Calculate expected total goals (simple average for now)
    const expectedTotalGoals = (homePattern.averageTotalGoals + awayPattern.averageTotalGoals) / 2;
    const bttsLikelihood = (homePattern.bttsPercentage + awayPattern.bttsPercentage) / 2;
    
    return {
      homeTeam: homePattern,
      awayTeam: awayPattern,
      combinedInsights: {
        expectedTotalGoals: Math.round(expectedTotalGoals * 100) / 100,
        bttsLikelihood: Math.round(bttsLikelihood * 100) / 100,
        recommendedThresholds: {
          totalGoals: [
            homePattern.thresholdAnalysis.over25,
            homePattern.thresholdAnalysis.over35
          ],
          homeTeamGoals: [
            this.analyzeGoalThreshold(homePattern.recentMatches, 1.5, 'for'),
            this.analyzeGoalThreshold(homePattern.recentMatches, 2.5, 'for')
          ],
          awayTeamGoals: [
            this.analyzeGoalThreshold(awayPattern.recentMatches, 1.5, 'for'),
            this.analyzeGoalThreshold(awayPattern.recentMatches, 2.5, 'for')
          ]
        }
      }
    };
  }
}

export const goalsAIService = new GoalsAIService();