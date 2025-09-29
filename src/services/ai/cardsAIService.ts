// src/services/ai/cardsAIService.ts
import { supabaseCardsService } from '../stats/supabaseCardsService';
import { conflictResolverService } from './conflictResolverService';
import { oddsAPIService } from '../api/oddsAPIService';
import { statisticalAIGenerator } from '../../utils/StatisticalAIGenerator'; 

import { 
  AIInsight, 
  MatchOdds, 
  ThresholdAnalysis, 
  OptimalThreshold, 
  CardThresholdAnalysis 
} from '../../types/BettingAITypes'; 

interface OptimalThresholdType extends OptimalThreshold<CardThresholdAnalysis> {}

// CRITICAL FIX: Explicitly define the match detail structure 
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
  
  private patternCache: Map<string, { pattern: TeamCardPattern; timestamp: number }> = new Map();
  private readonly PATTERN_CACHE_TTL = 30 * 60 * 1000; 
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
   * Helper to create an empty analysis object
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
    } as CardThresholdAnalysis;
  }
  
  /**
   * Helper to determine the relevant card thresholds.
   * 🛠️ FIX: This missing method is now included.
   */
  private getRelevantThresholds(matches: CardPatternMatchDetail[]): number[] {
      const maxCards = Math.max(...matches.map(m => m.totalCards), 0);
      const minCards = Math.min(...matches.map(m => m.totalCards), 0);

      const relevant = this.CARD_THRESHOLDS.filter(t => 
          t > minCards - 2 && t < maxCards + 2
      );

      if (!relevant.includes(4.5)) relevant.push(4.5);
      
      return Array.from(new Set(relevant)).sort((a, b) => a - b);
  }


  /**
   * Analyze card threshold for an 'Over' bet type.
   */
  private analyzeCardThresholdOver(
    matches: Array<{ totalCards: number; cardsFor: number; cardsAgainst: number }>,
    threshold: number,
    type: CardType,
    odds?: number
  ): CardThresholdAnalysis {
    
    if (matches.length === 0) return this.createEmptyAnalysis(threshold, 'over', odds);
    
    const getCount = (match: { totalCards: number; cardsFor: number; cardsAgainst: number }) => this.getCardCount(match, type);

    const matchesOver = matches.filter(match => getCount(match) > threshold);
    const overPercentage = (matchesOver.length / matches.length) * 100;

    const recentMatches = matches.slice(0, 5);
    const recentOverForm = recentMatches.map(match => getCount(match) > threshold);
    const overHits = recentOverForm.filter(Boolean).length;
    
    const sampleSize = Math.min(5, recentMatches.length || 1); 

    const overConsistency = statisticalAIGenerator.calculateConsistency(overHits, sampleSize);
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
   */
  private analyzeCardThresholdUnder(
    matches: Array<{ totalCards: number; cardsFor: number; cardsAgainst: number }>,
    threshold: number,
    type: CardType,
    odds?: number
  ): CardThresholdAnalysis {

    if (matches.length === 0) return this.createEmptyAnalysis(threshold, 'under', odds);
    
    const getCount = (match: { totalCards: number; cardsFor: number; cardsAgainst: number }) => this.getCardCount(match, type);

    const matchesUnder = matches.filter(match => getCount(match) < threshold);
    const underPercentage = (matchesUnder.length / matches.length) * 100;

    const recentMatches = matches.slice(0, 5);
    const recentUnderForm = recentMatches.map(match => getCount(match) < threshold);
    const underHits = recentUnderForm.filter(Boolean).length;
    
    const sampleSize = Math.min(5, recentMatches.length || 1); 

    const underConsistency = statisticalAIGenerator.calculateConsistency(underHits, sampleSize);
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
    
    if (matches.length === 0) return this.createEmptyAnalysis(threshold, 'over', undefined); 

    let overOdds: number | undefined;
    let underOdds: number | undefined;
    
    // NOTE: This logic relies on specific threshold alignment for odds
    if (type === 'total' && threshold === 4.5 && matchOdds?.totalCardsOdds) {
      overOdds = matchOdds.totalCardsOdds.overOdds;
      underOdds = matchOdds.totalCardsOdds.underOdds;
    } 
    else if (type === 'for' && threshold === 2.5 && matchOdds?.homeCardsOdds) { // Assuming 2.5 is the main line for team cards
      overOdds = matchOdds.homeCardsOdds.overOdds;
      underOdds = matchOdds.homeCardsOdds.underOdds;
    } 
    // NOTE: The 'against' line for the home team is the 'for' line for the away team, but we'll stick to 'for' for simplicity
    
    const overAnalysis = this.analyzeCardThresholdOver(matches, threshold, type, overOdds);
    const underAnalysis = this.analyzeCardThresholdUnder(matches, threshold, type, underOdds);

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

  /**
   * Analyze card patterns for a specific team (Home or Away).
   * 🛠️ FIX: This missing method is now included.
   */
  private async analyzeTeamCardPattern(
      teamName: string, 
      venue: 'home' | 'away',
      matchOdds: MatchOdds | null
  ): Promise<TeamCardPattern> {
      
      const cached = this.patternCache.get(teamName);
      if (cached && Date.now() - cached.timestamp < this.PATTERN_CACHE_TTL) {
          return cached.pattern;
      }

      const teamStats: any = await supabaseCardsService.getTeamCardStats(teamName);
      
      if (!teamStats) {
        throw new Error(`No card data found for team: ${teamName}`);
      }

      const relevantMatches: CardPatternMatchDetail[] = teamStats.matchDetails.map((match: any) => ({
          opponent: match.opponent,
          cardsFor: match.cardsFor,
          cardsAgainst: match.cardsAgainst,
          totalCards: match.totalCards,
          venue: match.venue, 
          date: match.date,
          matchweek: match.matchweek,
      }));
      
      const averageCardsShown = teamStats.cards / teamStats.matches;
      const averageCardsAgainst = teamStats.cardsAgainst / teamStats.matches;
      const averageTotalCards = averageCardsShown + averageCardsAgainst;

      const thresholdAnalysis: { [key: string]: CardThresholdAnalysis } = {};
      const relevantThresholds = this.getRelevantThresholds(relevantMatches);

      relevantThresholds.forEach((threshold: number) => {
          if (threshold === 1.5 || threshold === 2.5 || threshold === 3.5) {
              thresholdAnalysis[`for_${threshold}`] = this.analyzeCardThreshold(relevantMatches, threshold, 'for', matchOdds);
              thresholdAnalysis[`against_${threshold}`] = this.analyzeCardThreshold(relevantMatches, threshold, 'against', matchOdds);
          }
      });

      const pattern: TeamCardPattern = {
          team: teamName,
          venue,
          averageCardsShown: Math.round(averageCardsShown * 100) / 100,
          averageCardsAgainst: Math.round(averageCardsAgainst * 100) / 100,
          averageTotalCards: Math.round(averageTotalCards * 100) / 100,
          thresholdAnalysis,
          recentMatches: relevantMatches.slice(0, 5) 
      };
      
      this.patternCache.set(teamName, { pattern, timestamp: Date.now() });
      return pattern;
  }

  /**
   * Use utility's downgrade confidence
   */
  private downgradeConfidence(confidence: 'high' | 'medium' | 'low'): 'high' | 'medium' | 'low' {
      return statisticalAIGenerator.downgradeConfidence(confidence);
  }

  /**
   * Find optimal threshold from multiple options
   */
  private findOptimalThreshold(analyses: CardThresholdAnalysis[], betType?: 'over' | 'under'): OptimalThresholdType | null {
    const result = statisticalAIGenerator.findOptimal(analyses, betType);
    
    if (!result) return null;
    return result as OptimalThresholdType; 
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
    
    const combinedMatchDetails = [
      ...homePattern.recentMatches, 
      ...awayPattern.recentMatches
    ];
    
    const uniqueMatchesMap = new Map<string, CardPatternMatchDetail>();
    combinedMatchDetails.forEach(match => {
        const key = `${match.date || 'unknown'}-${match.matchweek || 'unknown'}-${match.totalCards}`; 
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

    relevantThresholds.forEach((threshold: number) => { // 🛠️ FIX: Added type 'number' for threshold
      
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
   * Generate optimized insights for team-specific cards (e.g., Home Over 2.5 Cards)
   * 🛠️ FIX: This missing method is now included.
   */
  private generateOptimalTeamCardsInsights(
    teamPattern: TeamCardPattern,
    teamType: 'Home' | 'Away',
    matchOdds: MatchOdds | null
  ): AIInsight[] {
    const insights: AIInsight[] = [];
    const analyses: CardThresholdAnalysis[] = [];
    
    const relevantThresholds = this.getRelevantThresholds(teamPattern.recentMatches);

    relevantThresholds.filter(t => t === 1.5 || t === 2.5 || t === 3.5).forEach((threshold: number) => {
        const analysis = teamPattern.thresholdAnalysis[`for_${threshold}`];
        if (analysis) {
            analyses.push(analysis);
        }
    });
    
    const optimal = this.findOptimalThreshold(analyses);
    
    if (optimal) {
        const analysis = optimal.analysis;
        const recentHits = analysis.recentForm.filter(Boolean).length;
        const isValueBet = analysis.value > 0.0001;
        
        insights.push({
            id: `optimal-${teamType.toLowerCase()}-cards-${analysis.betType}-${analysis.threshold}`,
            title: `${teamType} Team ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold} Cards`,
            description: `Optimal ${teamType.toLowerCase()} card bet: **${analysis.percentage.toFixed(1)}%** hit rate (${recentHits}/5 recent). ${isValueBet ? 'Value edge detected.' : 'Strong confidence selection.'}`,
            market: `${teamType} Team Cards ${analysis.betType === 'over' ? 'Over' : 'Under'} ${analysis.threshold}`,
            confidence: analysis.confidence,
            odds: analysis.odds ? analysis.odds.toFixed(2) : undefined,
            supportingData: `EV: ${analysis.value.toFixed(4)} | Reasoning: ${optimal.reasoning}`,
            aiEnhanced: true,
            valueScore: analysis.value,
        });
    }
    
    return insights;
  }

  /**
   * Generate insights for which team will receive the most cards (handicap/most cards market).
   * 🛠️ FIX: This missing method is now included.
   */
  private generateMostCardsInsights(
      homePattern: TeamCardPattern,
      awayPattern: TeamCardPattern,
      matchOdds: MatchOdds | null
  ): AIInsight[] {
      const insights: AIInsight[] = [];
      
      if (!matchOdds?.mostCardsOdds) return [];
      
      const { homeOdds, awayOdds, drawOdds } = matchOdds.mostCardsOdds;

      const homeAvg = homePattern.averageCardsShown;
      const awayAvg = awayPattern.averageCardsShown;
      
      const totalAvg = homeAvg + awayAvg;
      const homeProb = totalAvg > 0 ? (homeAvg / totalAvg) : 0.5;
      const awayProb = totalAvg > 0 ? (awayAvg / totalAvg) : 0.5;
      
      if (homeProb > 0.55 && homeAvg > awayAvg + 0.5) {
          const ev = statisticalAIGenerator.calculateExpectedValue(homeProb * 100, 1.0, homeOdds);
          insights.push({
              id: 'most-cards-home',
              title: 'Home Team Most Cards',
              description: `Home team's high average cards (${homeAvg.toFixed(2)}) suggests they are likely to receive the most bookings.`,
              market: 'Most Cards - Home',
              confidence: homeProb > 0.65 ? 'high' : 'medium',
              odds: homeOdds.toFixed(2),
              supportingData: `Probability: ${(homeProb * 100).toFixed(1)}% | EV: ${ev.toFixed(4)}`,
              aiEnhanced: true,
              valueScore: ev
          });
      } else if (awayProb > 0.55 && awayAvg > homeAvg + 0.5) {
          const ev = statisticalAIGenerator.calculateExpectedValue(awayProb * 100, 1.0, awayOdds);
          insights.push({
              id: 'most-cards-away',
              title: 'Away Team Most Cards',
              description: `Away team's high average cards (${awayAvg.toFixed(2)}) suggests they are likely to receive the most bookings.`,
              market: 'Most Cards - Away',
              confidence: awayProb > 0.65 ? 'high' : 'medium',
              odds: awayOdds.toFixed(2),
              supportingData: `Probability: ${(awayProb * 100).toFixed(1)}% | EV: ${ev.toFixed(4)}`,
              aiEnhanced: true,
              valueScore: ev
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
      return filteredInsights;
      
    } catch (error) {
      console.error('[CardsAI] Error generating card insights:', error);
      return [];
    }
  }
}

export const cardsAIService = new CardsAIService();
