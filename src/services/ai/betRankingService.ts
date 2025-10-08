// src/services/ai/betRankingService.ts

import { MatchContextInsight } from './matchContextService';
import { BettingMarket } from './bettingInsightsService'; // 💡 Import BettingMarket enum for clarity and robust checks

export enum BetTier {
  EXCELLENT = 'Excellent',
  GOOD = 'Good',
  FAIR = 'Fair',
  POOR = 'Poor',
  AVOID = 'Avoid'
}

export interface RankedBet extends MatchContextInsight {
  betScore: number; // 0-100
  tier: BetTier;
  reasoning: string[];
  redFlags: string[];
  accumulatorSafe: boolean; // Safe for accas?
  stylizedAnalysis: string; // The fully formatted, bolded, and emoji-rich analysis string
}

export class BetRankingService {
  
  /**
   * Helper to check if a market is a Fixture-Level Bet (Match Result, BTTS, Clean Sheet).
   * These markets are evaluated based on the interaction of both teams, not just one team's venue stats.
   */
  private isFixtureLevelBet(market: BettingMarket): boolean {
    return (
      market === BettingMarket.MATCH_RESULT || 
      market === BettingMarket.BOTH_TEAMS_TO_SCORE ||
      market === BettingMarket.CLEAN_SHEET_MARKET // 🎯 FIX: Added CLEAN_SHEET_MARKET
    );
  }

  /**
   * Calculate a comprehensive bet score (0-100)
   */
  private calculateBetScore(insight: MatchContextInsight): number {
    let score = 0;
    const confidence = insight.context?.confidence?.score ?? 0;
    const matchStrength = insight.matchContext.strengthOfMatch;
    const dataQuality = insight.matchContext.dataQuality;
    const homeAwaySupport = insight.context?.homeAwaySupportForSample;
    const venueSpecific = insight.matchContext.venueSpecific;
    
    // Check if the bet is Fixture-Level
    const isFixtureLevelBet = this.isFixtureLevelBet(insight.market); // 🎯 FIX: Used helper method
    
    // 1. Base Confidence Score (40 points max)
    score += confidence * 0.4;
    
    // 2. Match Strength Bonus (30 points max)
    const strengthPoints = {
      'Excellent': 30,
      'Good': 20,
      'Fair': 10,
      'Poor': 0
    };
    score += strengthPoints[matchStrength] || 0;
    
    // 3. Data Quality Bonus (15 points max)
    const dataQualityPoints = {
      'Excellent': 15,
      'Good': 12,
      'Fair': 8,
      'Poor': 3,
      'Insufficient': 0
    };
    score += dataQualityPoints[dataQuality] || 0;
    
    // 4. Venue Consistency Bonus (10 points max) - APPLIES ONLY TO TEAM-LEVEL STATS (non-Fixture)
    if (!isFixtureLevelBet && homeAwaySupport) { 
      const upcomingVenue = insight.matchContext.isHome ? 'home' : 'away';
      const venueData = upcomingVenue === 'home' 
        ? homeAwaySupport.home 
        : homeAwaySupport.away;
      
      if (venueData && venueData.matches > 0) {
        if (venueData.hitRate === 100) {
          score += 10;
        } else if (venueData.hitRate >= 80) {
          score += 5;
        }
      }
    }
    
    // 5. Streak Bonus (5 points max)
    if (insight.isStreak && insight.streakLength) {
      if (insight.streakLength >= 10) {
        score += 5;
      } else if (insight.streakLength >= 7) {
        score += 3;
      }
    }
    
    // 6. PENALTIES for red flags
    
    // Penalty for venue inconsistency - APPLIES ONLY TO TEAM-LEVEL STATS (non-Fixture)
    if (!isFixtureLevelBet && homeAwaySupport && !venueSpecific) {
      const upcomingVenue = insight.matchContext.isHome ? 'home' : 'away';
      const venueData = upcomingVenue === 'home' 
        ? homeAwaySupport.home 
        : homeAwaySupport.away;
      
      if (venueData && venueData.hitRate < insight.hitRate) {
        const hitRateDrop = insight.hitRate - venueData.hitRate;
        score -= hitRateDrop * 0.3; // Significant penalty
      }
    }
    
    // Penalty for low sample size
    if (insight.matchesAnalyzed < 7) {
      score -= 10;
    }
    
    // Penalty for opponent mismatch
    const oppositionAllows = insight.matchContext.oppositionAllows;
    const threshold = insight.threshold;
    const comparison = insight.comparison;
    
    // Check that it is an Over/Under bet AND not a Fixture-Level bet
    const isOverUnder = comparison === 'Over' || comparison === 'Or More' || comparison === 'Under';
    
    if (isOverUnder && !isFixtureLevelBet) { // 🎯 FIX: Used helper method
      if (comparison === 'Over' || comparison === 'Or More') {
        if (oppositionAllows < threshold) {
          score -= 15; // Opposition is strong defensively
        }
      } else if (comparison === 'Under') {
        if (oppositionAllows > threshold) {
          score -= 15; // Opposition is weak defensively
        }
      }
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }
  
  // --- Rest of the class methods (determineTier, generateReasoning, identifyRedFlags, etc.) ---
  
  /**
   * Determine bet tier based on score
   */
  private determineTier(score: number): BetTier {
    if (score >= 80) return BetTier.EXCELLENT;
    if (score >= 65) return BetTier.GOOD;
    if (score >= 45) return BetTier.FAIR;
    if (score >= 30) return BetTier.POOR;
    return BetTier.AVOID;
  }
  
  /**
   * Generate reasoning for the bet quality
   */
  private generateReasoning(insight: MatchContextInsight, score: number): string[] {
    const reasons: string[] = [];
    const confidence = insight.context?.confidence;
    const matchStrength = insight.matchContext.strengthOfMatch;
    const homeAwaySupport = insight.context?.homeAwaySupportForSample;
    const isFixtureLevelBet = this.isFixtureLevelBet(insight.market); // 🎯 FIX: Used helper method
    
    // Positive factors
    if (confidence && confidence.score >= 80) {
      reasons.push(`Very High confidence score (${confidence.score}/100)`);
    }
    
    if (matchStrength === 'Excellent' || matchStrength === 'Good') {
      reasons.push(`${matchStrength} matchup strength`);
    }
    
    if (insight.isStreak && insight.streakLength && insight.streakLength >= 7) {
      reasons.push(`Strong ${insight.streakLength}-match streak`);
    }
    
    // Venue consistency - APPLIES ONLY TO TEAM-LEVEL STATS (non-Fixture)
    if (!isFixtureLevelBet && homeAwaySupport) { 
      const upcomingVenue = insight.matchContext.isHome ? 'home' : 'away';
      const venueData = upcomingVenue === 'home' 
        ? homeAwaySupport.home 
        : homeAwaySupport.away;
      
      if (venueData && venueData.hitRate === 100 && venueData.matches >= 3) {
        reasons.push(`Perfect venue consistency (${venueData.matches} matches)`);
      }
    }
    
    if (insight.matchContext.dataQuality === 'Excellent' || insight.matchContext.dataQuality === 'Good') {
      reasons.push(`${insight.matchContext.dataQuality} data quality`);
    }
    
    // Average proximity to threshold
    const marginRatio = Math.abs(insight.averageValue - insight.threshold) / insight.threshold;
    if (marginRatio > 0.15 && insight.comparison !== 'binary') {
      reasons.push(`Team average is ${Math.round(marginRatio * 100)}% ${insight.comparison === 'Under' ? 'below' : 'above'} threshold`);
    }
    
    return reasons;
  }
  
  /**
   * Identify red flags
   */
  private identifyRedFlags(insight: MatchContextInsight): string[] {
    const redFlags: string[] = [];
    const confidence = insight.context?.confidence;
    const matchStrength = insight.matchContext.strengthOfMatch;
    const dataQuality = insight.matchContext.dataQuality;
    const homeAwaySupport = insight.context?.homeAwaySupportForSample;
    const isFixtureLevelBet = this.isFixtureLevelBet(insight.market); // 🎯 FIX: Used helper method

    // Low confidence
    if (confidence && confidence.score < 60) {
      redFlags.push(`Low confidence score (${confidence.score}/100)`);
    }
    
    // Poor matchup
    if (matchStrength === 'Poor') {
      redFlags.push('Poor opposition matchup');
    }
    
    // Poor data quality
    if (dataQuality === 'Poor' || dataQuality === 'Insufficient') {
      redFlags.push(`${dataQuality} data quality (${insight.matchContext.oppositionMatches} matches)`);
    }
    
    // Venue inconsistency - APPLIES ONLY TO TEAM-LEVEL STATS (non-Fixture)
    if (!isFixtureLevelBet && homeAwaySupport) {
      const upcomingVenue = insight.matchContext.isHome ? 'home' : 'away';
      const venueData = upcomingVenue === 'home' 
        ? homeAwaySupport.home 
        : homeAwaySupport.away;
      
      if (venueData && venueData.hitRate < insight.hitRate) {
        redFlags.push(`Lower hit rate at this venue (${venueData.hitRate}% vs ${insight.hitRate}% overall)`);
      }
    }
    
    // Small sample size
    if (insight.matchesAnalyzed < 7) {
      redFlags.push(`Small sample size (only ${insight.matchesAnalyzed} matches)`);
    }
    
    // Close to threshold (fragile)
    const marginRatio = Math.abs(insight.averageValue - insight.threshold) / insight.threshold;
    if (marginRatio < 0.1 && insight.comparison !== 'binary') {
      redFlags.push('Average value very close to threshold (fragile bet)');
    }
    
    return redFlags;
  }

  /**
   * Generate the final, stylized single-line analysis string.
   * NOTE: This string uses Markdown bolding (**) and emojis.
   */
  private generateStylizedAnalysis(rankedBet: RankedBet): string {
    const { 
      team, outcome, threshold, comparison, 
      averageValue, betScore, 
      matchContext, context 
    } = rankedBet;
    
    // 1. Determine the core selection phrase
    let selectionPhrase = `${team}'s pattern: **${outcome}** (${Math.round(averageValue * 10) / 10} avg)`;
    
    // 2. Determine the matchup analysis
    const oppositionAllows = matchContext.oppositionAllows;
    let matchupAnalysis = `An **${matchContext.strengthOfMatch} Matchup**`;
    
    // 3. Comparison to the threshold (only for Over/Under)
    const isOverUnder = comparison === 'Over' || comparison === 'Or More' || comparison === 'Under';
    const isBinaryGoals = this.isFixtureLevelBet(rankedBet.market) && rankedBet.market !== BettingMarket.MATCH_RESULT;
    
    if (isOverUnder) {
        const comparisonWord = comparison === 'Under' ? 'below' : 'above';
        matchupAnalysis += ` as the opposition allows **${Math.round(oppositionAllows * 10) / 10} avg** which is ${oppositionAllows > threshold ? comparisonWord : comparisonWord} the **${threshold} threshold**.`;
        
    } else if (this.isFixtureLevelBet(rankedBet.market)) {
        // Use the MatchContextService's embedded recommendation for Match Result/Double Chance/BTTS/Clean Sheet
        // The embedded recommendation already contains the full analysis and context.
        matchupAnalysis = matchContext.recommendation
            .replace(/(\*\*)/g, '*') // Remove existing double bolding for cleaner integration
            .replace(/^(✅|🔵|🟡|🛑) /, ''); // Remove the initial emoji/prefix
    } else {
        matchupAnalysis += `.`;
    }
    
    // 4. Initial assessment & opportunity
    const assessment = this.determineTier(betScore);
    
    // 5. Build the final string (using the suggested order: Assessment -> Confidence -> Warning)
    
    // Emojis based on tier
    const tierEmoji = rankedBet.tier === BetTier.EXCELLENT ? '✅' : 
                      rankedBet.tier === BetTier.GOOD ? '📈' : '💡';
    
    // Construct the initial line
    const initialLine = `${tierEmoji} **${assessment.toUpperCase()} SELECTION** [Score: ${betScore}]: ${selectionPhrase}. Matchup Analysis: ${matchupAnalysis}`;
    
    // Confidence and Data Warning 
    const confidenceScore = context?.confidence?.score ?? 0;
    const dataQuality = matchContext.dataQuality;
    const opponentMatches = matchContext.oppositionMatches;
    
    let warningLine = ` 🔥 **Confidence: ${confidenceScore}/100**.`;
    
    if (dataQuality === 'Poor' || dataQuality === 'Insufficient') {
        warningLine += ` 📊 **Data Warning: ${dataQuality} Quality** (${opponentMatches} venue-specific matches).`;
    }
    
    return `${initialLine} ${warningLine}`;
  }

  /**
   * Determine if bet is safe for accumulators
   */
  private isAccumulatorSafe(insight: MatchContextInsight, score: number): boolean {
    const confidence = insight.context?.confidence?.score ?? 0;
    const matchStrength = insight.matchContext.strengthOfMatch;
    const dataQuality = insight.matchContext.dataQuality;
    const homeAwaySupport = insight.context?.homeAwaySupportForSample;
    const isFixtureLevelBet = this.isFixtureLevelBet(insight.market); // 🎯 FIX: Used helper method
    
    // Must meet ALL criteria
    const hasHighConfidence = confidence >= 70;
    const hasGoodMatchup = matchStrength === 'Excellent' || matchStrength === 'Good';
    const hasGoodData = dataQuality === 'Excellent' || dataQuality === 'Good';
    const hasSufficientSample = insight.matchesAnalyzed >= 7;
    const hasHighScore = score >= 70;
    
    // Check venue consistency - REQUIRED ONLY FOR TEAM-LEVEL STATS (non-Fixture)
    let hasVenueConsistency = true;
    if (!isFixtureLevelBet && homeAwaySupport) { 
      const upcomingVenue = insight.matchContext.isHome ? 'home' : 'away';
      const venueData = upcomingVenue === 'home' 
        ? homeAwaySupport.home 
        : homeAwaySupport.away;
      
      if (venueData) {
        hasVenueConsistency = venueData.hitRate >= 80;
      }
    }
    
    return hasHighConfidence && 
           hasGoodMatchup && 
           hasGoodData && 
           hasSufficientSample && 
           hasHighScore &&
           hasVenueConsistency;
  }
  
  /**
   * Rank all bets and return sorted by score
   */
  public rankBets(insights: MatchContextInsight[]): RankedBet[] {
    const rankedBets: RankedBet[] = insights.map(insight => {
      const betScore = this.calculateBetScore(insight);
      const tier = this.determineTier(betScore);
      const reasoning = this.generateReasoning(insight, betScore);
      const redFlags = this.identifyRedFlags(insight);
      const accumulatorSafe = this.isAccumulatorSafe(insight, betScore);
      
      const tempRankedBet: RankedBet = { // Temporarily create the object to pass to formatter
          ...insight,
          betScore,
          tier,
          reasoning,
          redFlags,
          accumulatorSafe,
          stylizedAnalysis: '' // Placeholder
      };

      // Calculate the final stylized analysis string
      const stylizedAnalysis = this.generateStylizedAnalysis(tempRankedBet);
      
      return {
        ...tempRankedBet, // Return the full object
        stylizedAnalysis // Use the newly generated string
      };
    });
    
    // Sort by score (highest first)
    return rankedBets.sort((a, b) => b.betScore - a.betScore);
  }
  
  /**
   * Get only top tier bets
   */
  public getTopBets(insights: MatchContextInsight[], minScore: number = 70): RankedBet[] {
    const ranked = this.rankBets(insights);
    return ranked.filter(bet => bet.betScore >= minScore);
  }
  
  /**
   * Get accumulator-safe bets
   */
  public getAccumulatorBets(insights: MatchContextInsight[]): RankedBet[] {
    const ranked = this.rankBets(insights);
    return ranked.filter(bet => bet.accumulatorSafe);
  }
  
  /**
   * Get best single bet
   */
  public getBestSingleBet(insights: MatchContextInsight[]): RankedBet | null {
    const ranked = this.rankBets(insights);
    return ranked.length > 0 ? ranked[0] : null;
  }
  
  /**
   * Filter by tier
   */
  public getBetsByTier(insights: MatchContextInsight[], tier: BetTier): RankedBet[] {
    const ranked = this.rankBets(insights);
    return ranked.filter(bet => bet.tier === tier);
  }
}

export const betRankingService = new BetRankingService();
