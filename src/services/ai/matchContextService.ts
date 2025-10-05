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
    venueSpecific: boolean; // NEW: Indicates if venue-specific stats were used
}

// Defining the enriched insight as an intersection type 
export type MatchContextInsight = BettingInsight & {
    matchContext: MatchContext;
};

/**
 * Service to enrich betting insights with match-specific context
 * Analyzes how the opposition performs defensively in the relevant market
 * NOW WITH VENUE-SPECIFIC ANALYSIS
 */
export class MatchContextService {
  
  /**
   * Get opposition's defensive stats for a specific market
   * NOW VENUE-AWARE: Filters stats based on where the opposition will be playing
   * 
   * @param opponent - The opposing team name
   * @param market - The betting market
   * @param opponentIsHome - Whether the opponent is playing at home (they're home = we're away)
   */
  private async getOppositionDefensiveStats(
    opponent: string,
    market: BettingMarket,
    opponentIsHome: boolean
  ): Promise<{ average: number; matches: number; venueSpecific: boolean } | null> {
    
    try {
      switch (market) {
        case BettingMarket.CARDS: {
          const stats = await supabaseCardsService.getCardStatistics();
          const oppStats = stats.get(opponent);
          if (!oppStats) return null;
          
          // Filter matches based on opponent's venue
          const venueMatches = oppStats.matchDetails.filter(m => m.isHome === opponentIsHome);
          
          if (venueMatches.length === 0) {
            // Fallback to all matches if no venue-specific data
            const totalCardsAllowed = oppStats.matchDetails.reduce(
              (sum, m) => sum + (m.cardsFor || 0), 0
            );
            return {
              average: totalCardsAllowed / oppStats.matches,
              matches: oppStats.matches,
              venueSpecific: false
            };
          }
          
          const totalCardsAllowed = venueMatches.reduce(
            (sum, m) => sum + (m.cardsFor || 0), 0
          );
          return {
            average: totalCardsAllowed / venueMatches.length,
            matches: venueMatches.length,
            venueSpecific: true
          };
        }

        case BettingMarket.CORNERS: {
          const stats = await supabaseCornersService.getCornerStatistics();
          const oppStats = stats.get(opponent);
          if (!oppStats) return null;
          
          // Filter matches based on opponent's venue
          const venueMatches = oppStats.matchDetails.filter(m => m.isHome === opponentIsHome);
          
          if (venueMatches.length === 0) {
            // Fallback to all matches
            const totalCornersAgainst = oppStats.matchDetails.reduce(
              (sum, m) => sum + (m.cornersAgainst || 0), 0
            );
            return {
              average: totalCornersAgainst / oppStats.matches,
              matches: oppStats.matches,
              venueSpecific: false
            };
          }
          
          const totalCornersAgainst = venueMatches.reduce(
            (sum, m) => sum + (m.cornersAgainst || 0), 0
          );
          return {
            average: totalCornersAgainst / venueMatches.length,
            matches: venueMatches.length,
            venueSpecific: true
          };
        }

        case BettingMarket.FOULS: {
          const stats = await supabaseFoulsService.getFoulStatistics();
          const oppStats = stats.get(opponent);
          if (!oppStats) return null;
          
          // Filter matches based on opponent's venue
          const venueMatches = oppStats.matchDetails.filter(m => m.isHome === opponentIsHome);
          
          if (venueMatches.length === 0) {
            // Fallback to all matches
            const totalFoulsAgainst = oppStats.matchDetails.reduce(
              (sum, m) => sum + (m.foulsCommittedAgainst || 0), 0
            );
            return {
              average: totalFoulsAgainst / oppStats.matches,
              matches: oppStats.matches,
              venueSpecific: false
            };
          }
          
          const totalFoulsAgainst = venueMatches.reduce(
            (sum, m) => sum + (m.foulsCommittedAgainst || 0), 0
          );
          return {
            average: totalFoulsAgainst / venueMatches.length,
            matches: venueMatches.length,
            venueSpecific: true
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
          
          // Filter matches based on opponent's venue
          const venueMatches = oppStats.matchDetails.filter(m => m.isHome === opponentIsHome);
          
          if (venueMatches.length === 0) {
            // Fallback to all matches
            // @ts-ignore
            const totalAgainst = oppStats.matchDetails.reduce(
              (sum, m) => sum + (m[field] || 0), 0
            );
            return {
              average: totalAgainst / oppStats.matches,
              matches: oppStats.matches,
              venueSpecific: false
            };
          }
          
          // @ts-ignore
          const totalAgainst = venueMatches.reduce(
            (sum, m) => sum + (m[field] || 0), 0
          );
          return {
            average: totalAgainst / venueMatches.length,
            matches: venueMatches.length,
            venueSpecific: true
          };
        }

        case BettingMarket.GOALS: {
            const stats = await supabaseGoalsService.getGoalStatistics();
            const oppStats = stats.get(opponent);
            if (!oppStats) return null;
            
            // Filter matches based on opponent's venue
            const venueMatches = oppStats.matchDetails.filter(m => m.isHome === opponentIsHome);
            
            if (venueMatches.length === 0) {
              // Fallback to all matches
              const totalGoalsAgainst = oppStats.matchDetails.reduce(
                (sum, m) => sum + (m.goalsAgainst || 0), 0
              );
              return {
                average: totalGoalsAgainst / oppStats.matches,
                matches: oppStats.matches,
                venueSpecific: false
              };
            }
            
            // Calculate average goals CONCEDED (goalsAgainst) at this venue
            const totalGoalsAgainst = venueMatches.reduce(
              (sum, m) => sum + (m.goalsAgainst || 0), 0
            );
            return {
              average: totalGoalsAgainst / venueMatches.length,
              matches: venueMatches.length,
              venueSpecific: true
            };
        }

        case BettingMarket.BOTH_TEAMS_TO_SCORE: {
            // No direct opposition 'allows' metric for BTTS, so return default/zero.
            return { average: 0, matches: 0, venueSpecific: false };
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
   * 
   * NEW: Includes dominance override for OVER bets where team quality transcends tough matchups
   */
  private evaluateMatchStrength(
    patternAvg: number,
    threshold: number,
    oppAllowsAvg: number,
    confidenceScore: number,
    comparison: Comparison
  ): { 
    strength: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    dominanceOverride: boolean;
    dominanceRatio?: number;
  } {
    
    const isOverBet = comparison === Comparison.OVER || comparison === Comparison.OR_MORE;
    
    let strength: 'Poor' | 'Fair' | 'Good' | 'Excellent' = 'Poor';
    let dominanceOverride = false;
    let dominanceRatio: number | undefined;

    // --- Logic for OVER/OR_MORE Bets (Looking for high values) ---
    if (isOverBet) {
      // Must meet or exceed threshold
      if (patternAvg < threshold) return { strength: 'Poor', dominanceOverride: false }; 

      const teamMargin = patternAvg - threshold;
      const oppMargin = oppAllowsAvg - threshold;
      const teamMarginRatio = teamMargin / threshold;
      const oppMarginRatio = oppMargin / threshold;

      // Calculate dominance ratio for potential override
      dominanceRatio = patternAvg / threshold;

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
        
        // 🎯 DOMINANCE OVERRIDE: Elite team quality can transcend tough matchups
        if (dominanceRatio >= 1.8 && teamMarginRatio >= 0.25) {
          // Exceptional dominance: Team is 80%+ above threshold with 25%+ margin
          strength = 'Good';
          dominanceOverride = true;
          console.log(`[MatchContext] Dominance override: Poor → Good (ratio: ${dominanceRatio.toFixed(2)})`);
        } else if (dominanceRatio >= 1.5) {
          // Strong dominance: Team is 50%+ above threshold
          strength = 'Fair';
          dominanceOverride = true;
          console.log(`[MatchContext] Dominance override: Poor → Fair (ratio: ${dominanceRatio.toFixed(2)})`);
        }
      } else {
          strength = 'Fair';
      }
    } 
    
    // --- Logic for UNDER Bets (Looking for low values) ---
    else { // Comparison.UNDER
      // Must meet or come under the threshold.
      if (patternAvg > threshold) return { strength: 'Poor', dominanceOverride: false }; 

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
        // NOTE: No dominance override for UNDER bets - one bad performance breaks the bet
      } else {
          strength = 'Fair';
      }
    }

    // --- Logic Gate for Confidence Score ---
    // Override high match strength if the calculated Confidence Score is low
    if (confidenceScore < 60 && (strength === 'Good' || strength === 'Excellent')) {
        return { strength: 'Fair', dominanceOverride, dominanceRatio }; 
    }
    if (confidenceScore < 40 && strength !== 'Poor') {
        return { strength: 'Poor', dominanceOverride: false, dominanceRatio }; 
    }
    
    return { strength, dominanceOverride, dominanceRatio };
  }

  /**
   * Generates a text recommendation based on the context and match strength.
   * NOW INCLUDES VENUE-AWARE CONTEXT AND DOMINANCE OVERRIDE MESSAGING
   */
  private generateRecommendation(
    teamName: string,
    outcome: string,
    strength: 'Poor' | 'Fair' | 'Good' | 'Excellent',
    patternAvg: number,
    oppAllowsAvg: number,
    threshold: number,
    isHome: boolean,
    confidenceScore: number,
    venueSpecific: boolean,
    dominanceOverride: boolean,
    dominanceRatio?: number
  ): string {
    const displayTeamName = getDisplayTeamName(teamName);
    const isUnderBet = outcome.startsWith('Under');
    
    const venue = isHome ? 'home' : 'away';
    const oppVenue = isHome ? 'away' : 'home';
    const venueNote = venueSpecific 
      ? ` when playing ${oppVenue}` 
      : '';
    
    let base = `${displayTeamName}'s pattern: ${outcome} (${Math.round(patternAvg * 10) / 10} avg)`;
    const confidenceText = `Confidence Score: ${confidenceScore}/100.`;

    // 🎯 DOMINANCE OVERRIDE MESSAGING (OVER bets only)
    if (dominanceOverride && !isUnderBet && dominanceRatio) {
      const dominancePercent = Math.round((dominanceRatio - 1) * 100);
      
      if (strength === 'Good') {
        return `🔵 **Recommended**: ${base}. Despite facing a defensively strong opponent${venueNote} (${Math.round(oppAllowsAvg * 10) / 10} avg below threshold), ${displayTeamName}'s exceptional form is **${dominancePercent}% above the ${threshold} threshold**. Their elite quality in this market suggests they can transcend the matchup difficulty. ${confidenceText}`;
      }
      
      if (strength === 'Fair') {
        return `🟡 **Fair Selection**: ${base}. While the opposition is defensively solid${venueNote} (${Math.round(oppAllowsAvg * 10) / 10} avg), ${displayTeamName}'s strong form (${dominancePercent}% above the ${threshold} threshold) provides a cushion against the tough matchup. Proceed with measured confidence. ${confidenceText}`;
      }
    }

    if (isUnderBet) {
        // Text for UNDER Bets
        const oppWeaknessText = `as the opposition's low allowance rate${venueNote} (${Math.round(oppAllowsAvg * 10) / 10} avg) complements this under bet, with both teams showing restraint.`;
        const oppAboveThresholdText = `because the opposition also has a low concession rate${venueNote} (${Math.round(oppAllowsAvg * 10) / 10} avg), suggesting a low-action match in this market.`;
        const oppNearThresholdText = `The opposition's concession rate${venueNote} (${Math.round(oppAllowsAvg * 10) / 10} avg) is near the threshold. The success of this bet relies mainly on ${displayTeamName}'s strict current form.`;
        const oppStrengthText = `The opposition is **not a clean-sheet side**${venueNote}, allowing ${Math.round(oppAllowsAvg * 10) / 10} avg, which is **above** the ${threshold} threshold. This is a higher-risk ${venue} matchup despite recent form.`;
        
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
        // Text for OVER/OR_MORE Bets
        const oppWeaknessText = `as the opposition concedes significantly more than the ${threshold} threshold${venueNote} (${Math.round(oppAllowsAvg * 10) / 10} avg).`;
        const oppAboveThresholdText = `because the opposition allows above the threshold${venueNote} (${Math.round(oppAllowsAvg * 10) / 10} avg), suggesting their defense is vulnerable to this market.`;
        const oppNearThresholdText = `The opposition's concession rate${venueNote} (${Math.round(oppAllowsAvg * 10) / 10} avg) is near the threshold. The success of this bet relies mainly on ${displayTeamName}'s strong current form.`;
        const oppStrengthText = `The opposition is defensively strong${venueNote}, allowing only ${Math.round(oppAllowsAvg * 10) / 10} avg, which is **below** the ${threshold} threshold. This is a difficult ${venue} matchup despite recent form.`;

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
   * NOW WITH VENUE-SPECIFIC OPPOSITION ANALYSIS
   */
  public async enrichMatchInsights(
    homeTeam: string,
    awayTeam: string,
    homeInsights: BettingInsight[],
    awayInsights: BettingInsight[]
  ): Promise<MatchContextInsight[]> {
    const enrichedInsights: MatchContextInsight[] = [];

    const allInsights = [
      // Home team insights: opponent is AWAY, so check opponent's away defensive stats
      ...homeInsights.map(i => ({ 
        insight: i, 
        isHome: true, 
        opponent: awayTeam,
        opponentIsHome: false // Opponent is playing away
      })),
      // Away team insights: opponent is HOME, so check opponent's home defensive stats
      ...awayInsights.map(i => ({ 
        insight: i, 
        isHome: false, 
        opponent: homeTeam,
        opponentIsHome: true // Opponent is playing at home
      }))
    ];

    for (const { insight, isHome, opponent, opponentIsHome } of allInsights) {
      // 1. Get Opposition Stats (NOW VENUE-SPECIFIC)
      const oppStats = await this.getOppositionDefensiveStats(
        opponent, 
        insight.market, 
        opponentIsHome
      );
      const oppositionAllows = oppStats?.average ?? 0;
      const oppositionMatches = oppStats?.matches ?? 0;
      const venueSpecific = oppStats?.venueSpecific ?? false;

      // Filter out BTTS and any other market that might use the "binary" comparison type
      const shouldApplyContext = 
        insight.market !== BettingMarket.BOTH_TEAMS_TO_SCORE && 
        insight.comparison !== 'binary';

      let strengthOfMatch: MatchContext['strengthOfMatch'] = 'Fair';
      let recommendation: string = `No specific match context generated for ${insight.market} ${insight.comparison} pattern.`;
      let roundedOppositionAllows = 0;
      const confidenceScore = insight.context?.confidence?.score ?? 0;

      if (shouldApplyContext) {
        // 2. Evaluate Match Strength
        strengthOfMatch = this.evaluateMatchStrength(
          insight.averageValue,
          insight.threshold,
          oppositionAllows,
          confidenceScore,
          insight.comparison as Comparison
        );

        // 3. Generate Recommendation (NOW VENUE-AWARE)
        recommendation = this.generateRecommendation(
          insight.team,
          insight.outcome,
          strengthOfMatch,
          insight.averageValue,
          oppositionAllows,
          insight.threshold,
          isHome,
          confidenceScore,
          venueSpecific
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
          venueSpecific
        }
      });
    }

    console.log(`[MatchContextService] ✅ Enriched ${enrichedInsights.length} insights with venue-specific context`);
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
      const confidence = e.context?.confidence?.level;
      const strength = e.matchContext.strengthOfMatch;

      const isHighConfidence = confidence === 'High' || confidence === 'Very High';
      const isGoodMatchup = strength === 'Excellent' || strength === 'Good';

      return isHighConfidence && isGoodMatchup;
    });

    // Sort by confidence score (highest first)
    return bestBets.sort((a, b) => 
      (b.context?.confidence?.score ?? 0) - (a.context?.confidence?.score ?? 0)
    );
  }
}

export const matchContextService = new MatchContextService();
