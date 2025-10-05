// src/services/ai/matchContextService.ts

import { 
  BettingInsight, 
  BettingMarket, 
  Comparison 
} from './bettingInsightsService';

import { supabaseCardsService } from '../stats/supabaseCardsService';
import { supabaseCornersService } from '../stats/supabaseCornersService';
import { supabaseFoulsService } from '../stats/supabaseFoulsService';
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { supabaseShootingService } from '../stats/supabaseShootingService';

import { getDisplayTeamName } from '../../utils/teamUtils';


// Defining the specific match context structure
interface MatchContext {
    oppositionAllows: number;
    oppositionMatches: number;
    isHome: boolean;
    strengthOfMatch: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    recommendation: string;
}

// Defining the enriched insight as an intersection type 
export type MatchContextInsight = BettingInsight & {
    matchContext: MatchContext;
};

/**
 * Service to enrich betting insights with match-specific context
 * Analyzes how the opposition performs defensively in the relevant market
 */
export class MatchContextService {
  
  /**
   * Get opposition's defensive stats for a specific market
   * (How much they typically ALLOW/CONCEDE in this market)
   */
  private async getOppositionDefensiveStats(
    opponent: string,
    market: BettingMarket
  ): Promise<{ average: number; matches: number } | null> {
    
    try {
      switch (market) {
        case BettingMarket.CARDS: {
          const stats = await supabaseCardsService.getCardStatistics();
          const oppStats = stats.get(opponent);
          if (!oppStats) return null;
          
          // FIX APPLIED: Use m.cardsFor to calculate how many cards the opposition team received (allowed)
          const totalCardsAllowed = oppStats.matchDetails.reduce(
            (sum, m) => sum + (m.cardsFor || 0), 0
          );
          return {
            average: totalCardsAllowed / oppStats.matches,
            matches: oppStats.matches
          };
        }

        case BettingMarket.CORNERS: {
          const stats = await supabaseCornersService.getCornerStatistics();
          const oppStats = stats.get(opponent);
          if (!oppStats) return null;
          
          const totalCornersAgainst = oppStats.matchDetails.reduce(
            (sum, m) => sum + (m.cornersAgainst || 0), 0
          );
          return {
            average: totalCornersAgainst / oppStats.matches,
            matches: oppStats.matches
          };
        }

        case BettingMarket.FOULS: {
          const stats = await supabaseFoulsService.getFoulStatistics();
          const oppStats = stats.get(opponent);
          if (!oppStats) return null;
          
          const totalFoulsAgainst = oppStats.matchDetails.reduce(
            (sum, m) => sum + (m.foulsCommittedAgainst || 0), 0
          );
          return {
            average: totalFoulsAgainst / oppStats.matches,
            matches: oppStats.matches
          };
        }

        case BettingMarket.SHOTS_ON_TARGET:
        case BettingMarket.TOTAL_SHOTS: {
          const stats = await supabaseShootingService.getShootingStatistics();
          const oppStats = stats.get(opponent);
          if (!oppStats) return null;
          
          const field = market === BettingMarket.SHOTS_ON_TARGET 
            ? 'shotsOnTargetAgainst' 
            : 'shotsAgainst';
          
          // @ts-ignore - Assuming the underlying match detail structure contains these fields
          const totalAgainst = oppStats.matchDetails.reduce(
            (sum, m) => sum + (m[field] || 0), 0
          );
          return {
            average: totalAgainst / oppStats.matches,
            matches: oppStats.matches
          };
        }

        case BettingMarket.GOALS: {
            const stats = await supabaseGoalsService.getGoalStatistics();
            const oppStats = stats.get(opponent);
            if (!oppStats) return null;
            
            // Calculate average goals CONCEDED (goalsAgainst)
            const totalGoalsAgainst = oppStats.matchDetails.reduce(
              (sum, m) => sum + (m.goalsAgainst || 0), 0
            );
            return {
              average: totalGoalsAgainst / oppStats.matches,
              matches: oppStats.matches
            };
        }

        case BettingMarket.BOTH_TEAMS_TO_SCORE: {
            // No direct opposition 'allows' metric for BTTS, so return default/zero.
            return { average: 0, matches: 0 };
        }

        default:
          return null;
      }
    } catch (error) {
      console.error(`[MatchContextService] Error fetching defensive stats for ${opponent} on ${market}:`, error);
      return null;
    }
  }

  /**
   * Evaluates the strength of the matchup based on the pattern and opposition stats.
   * Handles both OVER/OR_MORE (offensive strength vs defensive weakness) and UNDER (defensive strength).
   */
  private evaluateMatchStrength(
    patternAvg: number,
    threshold: number,
    oppAllowsAvg: number,
    confidenceScore: number,
    comparison: Comparison // ADDED: Comparison type to determine logic
  ): 'Poor' | 'Fair' | 'Good' | 'Excellent' {
    
    const isOverBet = comparison === Comparison.OVER || comparison === Comparison.OR_MORE;
    
    let strength: 'Poor' | 'Fair' | 'Good' | 'Excellent' = 'Poor';

    // --- Logic for OVER/OR_MORE Bets (Looking for high values) ---
    if (isOverBet) {
      // Must meet or exceed threshold
      if (patternAvg < threshold) return 'Poor'; 

      const teamMargin = patternAvg - threshold;
      const oppMargin = oppAllowsAvg - threshold;
      const teamMarginRatio = teamMargin / threshold;
      const oppMarginRatio = oppMargin / threshold;

      // Excellent: Team significantly exceeds AND Opposition significantly allows more than threshold
      if (teamMarginRatio >= 0.15 && oppMarginRatio >= 0.15) {
        strength = 'Excellent';
      }
      // Good: Team comfortably exceeds AND Opposition allows above threshold
      else if (teamMarginRatio >= 0.10 && oppMarginRatio >= 0.05) {
        strength = 'Good';
      }
      // Fair: Team meets or slightly exceeds, AND Opposition allows at least the threshold
      else if (teamMargin > 0 && oppAllowsAvg >= threshold) {
        strength = 'Fair';
      }
      // Poor: Opposition allows less than the threshold (i.e., this is a tough matchup)
      else if (oppAllowsAvg < threshold) {
        strength = 'Poor';
      } else {
          strength = 'Fair';
      }
    } 
    
    // --- Logic for UNDER Bets (Looking for low values) ---
    else { // Comparison.UNDER
      // Must meet or come under the threshold.
      if (patternAvg > threshold) return 'Poor'; 

      const teamMargin = threshold - patternAvg; // Distance BELOW the threshold
      const oppMargin = threshold - oppAllowsAvg; // Distance BELOW the threshold
      const teamMarginRatio = teamMargin / threshold;
      const oppMarginRatio = oppMargin / threshold;
      
      // Excellent: Team significantly under AND Opposition significantly allows under threshold
      if (teamMarginRatio >= 0.15 && oppMarginRatio >= 0.15) {
        strength = 'Excellent';
      }
      // Good: Team comfortably under AND Opposition allows under threshold
      else if (teamMarginRatio >= 0.10 && oppMarginRatio >= 0.05) {
        strength = 'Good';
      }
      // Fair: Team meets or slightly under, AND Opposition allows at most the threshold
      else if (teamMargin > 0 && oppAllowsAvg <= threshold) {
        strength = 'Fair';
      }
      // Poor: Opposition allows MORE than the threshold (i.e., this is a difficult matchup)
      else if (oppAllowsAvg > threshold) {
        strength = 'Poor';
      } else {
          strength = 'Fair';
      }
    }

    // --- Logic Gate for Confidence Score ---
    // Override high match strength if the calculated Confidence Score is low
    if (confidenceScore < 60 && (strength === 'Good' || strength === 'Excellent')) {
        return 'Fair'; 
    }
    if (confidenceScore < 40 && strength !== 'Poor') {
        return 'Poor'; 
    }
    return strength;
  }

  /**
   * Generates a text recommendation based on the context and match strength.
   */
  private generateRecommendation(
    teamName: string, // Canonical Team Name
    outcome: string,
    strength: 'Poor' | 'Fair' | 'Good' | 'Excellent',
    patternAvg: number,
    oppAllowsAvg: number,
    threshold: number,
    isHome: boolean,
    confidenceScore: number
  ): string {
    const displayTeamName = getDisplayTeamName(teamName);
    const isUnderBet = outcome.startsWith('Under');
    
    const venue = isHome ? 'home' : 'away';
    let base = `${displayTeamName}'s pattern: ${outcome} (${Math.round(patternAvg * 10) / 10} avg)`;
    const confidenceText = `Confidence Score: ${confidenceScore}/100.`;

    if (isUnderBet) {
        // Text for UNDER Bets (Focus on defensive strength and low concession rate)
        const oppWeaknessText = `as the opposition's low allowance rate (${Math.round(oppAllowsAvg * 10) / 10}) complements this under bet, with both teams showing restraint.`;
        const oppAboveThresholdText = `because the opposition also has a low concession rate (${Math.round(oppAllowsAvg * 10) / 10}), suggesting a low-action match in this market.`;
        const oppNearThresholdText = `The opposition's concession rate (${Math.round(oppAllowsAvg * 10) / 10}) is near the threshold. The success of this bet relies mainly on ${displayTeamName}'s strict current form.`;
        const oppStrengthText = `The opposition is **not a clean-sheet side**, allowing ${Math.round(oppAllowsAvg * 10) / 10}, which is **above** the ${threshold} threshold. This is a higher-risk ${venue} matchup despite recent form.`;
        
        switch (strength) {
            case 'Excellent':
              return `✅ **STRONG SELECTION**: ${base}. An **Excellent Matchup** ${oppWeaknessText} This is a high-confidence, high-value opportunity. ${confidenceText}`;
            case 'Good':
              return `🔵 **Recommended**: ${base}. A **Good Matchup** ${oppAboveThresholdText} ${confidenceText}`;
            case 'Fair':
              return `🟡 **Fair Selection**: ${base}. ${oppNearThresholdText} ${confidenceText}`;
            case 'Poor':
              return `🛑 **CAUTION ADVISED**: ${base}. ${oppStrengthText} ${confidenceText}`;
        }
    } else {
        // Text for OVER/OR_MORE Bets (Focus on offensive strength and opposition weakness)
        const oppWeaknessText = `as the opposition concedes significantly more than the ${threshold} threshold.`;
        const oppAboveThresholdText = `because the opposition allows above the threshold, suggesting their defense is vulnerable to this market.`;
        const oppNearThresholdText = `The opposition's concession rate (${Math.round(oppAllowsAvg * 10) / 10}) is near the threshold. The success of this bet relies mainly on ${displayTeamName}'s strong current form.`;
        const oppStrengthText = `The opposition is defensively strong, allowing only ${Math.round(oppAllowsAvg * 10) / 10}, which is **below** the ${threshold} threshold. This is a difficult ${venue} matchup despite recent form.`;

        switch (strength) {
          case 'Excellent':
            return `✅ **STRONG SELECTION**: ${base}. An **Excellent Matchup** ${oppWeaknessText} This is a high-confidence, high-value opportunity. ${confidenceText}`;
          case 'Good':
            return `🔵 **Recommended**: ${base}. A **Good Matchup** ${oppAboveThresholdText} ${confidenceText}`;
          case 'Fair':
            return `🟡 **Fair Selection**: ${base}. ${oppNearThresholdText} ${confidenceText}`;
          case 'Poor':
            return `🛑 **CAUTION ADVISED**: ${base}. ${oppStrengthText} ${confidenceText}`;
        }
    }
  }

  /**
   * Main function to enrich all insights with match-specific context (Step 2).
   */
  public async enrichMatchInsights(
    homeTeam: string,
    awayTeam: string,
    homeInsights: BettingInsight[],
    awayInsights: BettingInsight[]
  ): Promise<MatchContextInsight[]> {
    const enrichedInsights: MatchContextInsight[] = [];

    const allInsights = [
      // Home team insights are matched against the Away team's defensive stats
      ...homeInsights.map(i => ({ insight: i, isHome: true, opponent: awayTeam })),
      // Away team insights are matched against the Home team's defensive stats
      ...awayInsights.map(i => ({ insight: i, isHome: false, opponent: homeTeam }))
    ];

    for (const { insight, isHome, opponent } of allInsights) {
      // 1. Get Opposition Stats
      const oppStats = await this.getOppositionDefensiveStats(opponent, insight.market);
      const oppositionAllows = oppStats?.average ?? 0;
      const oppositionMatches = oppStats?.matches ?? 0;

      // CORRECTED: Allow all main comparison types (OVER, OR_MORE, UNDER) to generate context
      const shouldApplyContext = 
        insight.market !== BettingMarket.BOTH_TEAMS_TO_SCORE; 

      let strengthOfMatch: MatchContext['strengthOfMatch'] = 'Fair';
      // The default message is retained, but will rarely be used now
      let recommendation: string = `No specific match context generated for ${insight.market} ${insight.comparison} pattern.`;
      let roundedOppositionAllows = 0;
      const confidenceScore = insight.context?.confidence?.score ?? 0;

      if (shouldApplyContext) {
        // 2. Evaluate Match Strength (Pass comparison type)
        strengthOfMatch = this.evaluateMatchStrength(
          insight.averageValue,
          insight.threshold,
          oppositionAllows,
          confidenceScore,
          insight.comparison // PASSING COMPARISON TYPE
        );

        // 3. Generate Recommendation
        recommendation = this.generateRecommendation(
          insight.team,
          insight.outcome,
          strengthOfMatch,
          insight.averageValue,
          oppositionAllows,
          insight.threshold,
          isHome,
          confidenceScore
        );
        roundedOppositionAllows = Math.round(oppositionAllows * 10) / 10;
      }

      // 4. Build Enriched Insight
      enrichedInsights.push({
        ...insight,
        matchContext: {
          oppositionAllows: roundedOppositionAllows,
          oppositionMatches,
          isHome,
          strengthOfMatch,
          recommendation,
        }
      });
    }

    return enrichedInsights;
  }

  /**
   * Optional: Returns the top opportunities (e.g., for an accumulator builder).
   */
  public async getBestMatchBets(
    homeTeam: string,
    awayTeam: string,
    allInsights: BettingInsight[]
  ): Promise<MatchContextInsight[]> {
    
    // Split into home and away insights
    const homeInsights = allInsights.filter(i => i.team.toLowerCase() === homeTeam.toLowerCase());
    const awayInsights = allInsights.filter(i => i.team.toLowerCase() === awayTeam.toLowerCase());

    const enriched = await this.enrichMatchInsights(homeTeam, awayTeam, homeInsights, awayInsights);

    // Filter for High/Very High confidence and Excellent/Good match strength
    const bestBets = enriched.filter(e => {
      // Accessing confidence safely
      const confidence = e.context?.confidence?.level;
      const strength = e.matchContext.strengthOfMatch;

      const isHighConfidence = confidence === 'High' || confidence === 'Very High';
      const isGoodMatchup = strength === 'Excellent' || strength === 'Good';

      return isHighConfidence && isGoodMatchup;
    });

    // Sort by confidence score (highest first)
    return bestBets.sort((a, b) => 
      // Accessing confidence safely
      (b.context?.confidence?.score ?? 0) - (a.context?.confidence?.score ?? 0)
    );
  }
}

export const matchContextService = new MatchContextService();
