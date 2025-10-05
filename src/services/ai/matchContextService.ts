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

import { getDisplayTeamName, normalizeTeamName } from '../../utils/teamUtils';

// Defining the specific match context structure
interface MatchContext {
    oppositionAllows: number;
    oppositionMatches: number;
    isHome: boolean;
    strengthOfMatch: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    recommendation: string;
    venueSpecific: boolean;
    dataQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Insufficient';
    // NEW: BTTS-specific fields
    bttsContext?: {
      homeScoreProbability: number;
      awayScoreProbability: number;
      homeGoalsFor: number;
      awayGoalsAgainst: number;
      awayGoalsFor: number;
      homeGoalsAgainst: number;
    };
}

// Defining the enriched insight as an intersection type 
export type MatchContextInsight = BettingInsight & {
    matchContext: MatchContext;
};

/**
 * Service to enrich betting insights with match-specific context
 * Analyzes how the opposition performs defensively in the relevant market
 * NOW WITH VENUE-SPECIFIC ANALYSIS, BTTS SUPPORT, AND ROBUST ERROR HANDLING
 */
export class MatchContextService {
  
  // Minimum number of matches required for reliable analysis
  private readonly MIN_MATCHES_FOR_ANALYSIS = 3;
  private readonly MIN_VENUE_MATCHES = 3;

  /**
   * Verify that a team exists in the database
   */
  private async verifyTeamExists(teamName: string): Promise<boolean> {
    try {
      // Check if team exists in any of the services
      const [cardsStats, cornersStats, foulsStats, goalsStats, shootingStats] = await Promise.all([
        supabaseCardsService.getCardStatistics(),
        supabaseCornersService.getCornerStatistics(),
        supabaseFoulsService.getFoulStatistics(),
        supabaseGoalsService.getGoalStatistics(),
        supabaseShootingService.getShootingStatistics()
      ]);

      return cardsStats.has(teamName) || 
             cornersStats.has(teamName) || 
             foulsStats.has(teamName) || 
             goalsStats.has(teamName) || 
             shootingStats.has(teamName);
    } catch (error) {
      console.error(`[MatchContextService] Error verifying team existence for ${teamName}:`, error);
      return false;
    }
  }

  /**
   * Calculate data quality based on sample size and venue-specificity
   */
  private calculateDataQuality(
    matches: number, 
    venueSpecific: boolean
  ): 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Insufficient' {
    if (matches === 0) return 'Insufficient';
    if (matches < this.MIN_MATCHES_FOR_ANALYSIS) return 'Insufficient';
    
    if (venueSpecific) {
      if (matches >= 10) return 'Excellent';
      if (matches >= 7) return 'Good';
      if (matches >= 5) return 'Fair';
      return 'Poor';
    } else {
      // Non-venue-specific (fallback to league-wide)
      if (matches >= 15) return 'Good';
      if (matches >= 10) return 'Fair';
      return 'Poor';
    }
  }
  
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
   * NOW WITH VENUE-SPECIFIC OPPOSITION ANALYSIS, BTTS SUPPORT, AND VALIDATION
   */
  public async enrichMatchInsights(
    homeTeam: string,
    awayTeam: string,
    homeInsights: BettingInsight[],
    awayInsights: BettingInsight[]
  ): Promise<MatchContextInsight[]> {
    const enrichedInsights: MatchContextInsight[] = [];

    // ===== INPUT VALIDATION =====
    
    // 1. Validate team names are non-empty
    if (!homeTeam?.trim()) {
      console.error('[MatchContextService] ❌ Invalid home team name: empty or undefined');
      return [];
    }
    
    if (!awayTeam?.trim()) {
      console.error('[MatchContextService] ❌ Invalid away team name: empty or undefined');
      return [];
    }

    // 2. Validate teams are different
    const normalizedHome = normalizeTeamName(homeTeam);
    const normalizedAway = normalizeTeamName(awayTeam);
    
    if (normalizedHome === normalizedAway) {
      console.error(`[MatchContextService] ❌ Home and away teams cannot be the same: "${homeTeam}"`);
      return [];
    }

    // 3. Verify teams exist in database
    console.log(`[MatchContextService] 🔍 Verifying teams: ${homeTeam} vs ${awayTeam}`);
    const [homeExists, awayExists] = await Promise.all([
      this.verifyTeamExists(normalizedHome),
      this.verifyTeamExists(normalizedAway)
    ]);

    if (!homeExists) {
      console.warn(`[MatchContextService] ⚠️ Home team "${homeTeam}" not found in database`);
    }
    if (!awayExists) {
      console.warn(`[MatchContextService] ⚠️ Away team "${awayTeam}" not found in database`);
    }

    // 4. Validate insights arrays
    if (!homeInsights?.length && !awayInsights?.length) {
      console.warn('[MatchContextService] ⚠️ No insights provided for enrichment');
      return [];
    }

    // ===== PROCESS INSIGHTS =====

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
      try {
        // 1. Get Opposition Stats (NOW VENUE-SPECIFIC)
        const oppStats = await this.getOppositionDefensiveStats(
          opponent, 
          insight.market, 
          opponentIsHome
        );
        
        // ===== HANDLE MISSING OR INSUFFICIENT DATA =====
        if (!oppStats || oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
          const matchCount = oppStats?.matches ?? 0;
          const oppDisplayName = getDisplayTeamName(opponent);
          
          console.warn(
            `[MatchContextService] ⚠️ Insufficient data for ${oppDisplayName} in ${insight.market}: ${matchCount} matches`
          );
          
          enrichedInsights.push({
            ...insight,
            matchContext: {
              oppositionAllows: 0,
              oppositionMatches: matchCount,
              isHome,
              strengthOfMatch: 'Poor',
              recommendation: `⚠️ **DATA WARNING**: Insufficient opposition data for ${oppDisplayName} in ${insight.market} market (only ${matchCount} matches available). Minimum ${this.MIN_MATCHES_FOR_ANALYSIS} matches required for reliable analysis. **Proceed with extreme caution** - this recommendation is based on incomplete information.`,
              venueSpecific: false,
              dataQuality: 'Insufficient'
            }
          });
          
          continue; // Skip to next insight
        }
        
        const oppositionAllows = oppStats.average;
        const oppositionMatches = oppStats.matches;
        const venueSpecific = oppStats.venueSpecific;
        
        // Calculate data quality
        const dataQuality = this.calculateDataQuality(oppositionMatches, venueSpecific);

        // Filter out markets that don't use standard opposition analysis
        const isBTTS = insight.market === BettingMarket.BOTH_TEAMS_TO_SCORE;
        const shouldApplyContext = 
          insight.comparison !== 'binary' && !isBTTS;

        let strengthOfMatch: MatchContext['strengthOfMatch'] = 'Fair';
        let recommendation: string = `No specific match context generated for ${insight.market} ${insight.comparison} pattern.`;
        let roundedOppositionAllows = 0;
        let bttsContext: MatchContext['bttsContext'];
        const confidenceScore = insight.context?.confidence?.score ?? 0;

        // Handle BTTS separately
        if (isBTTS) {
          const bttsExpectation = insight.outcome.includes('Yes') ? 'Yes' : 'No';
          const bttsEval = await this.evaluateBTTSMatchup(homeTeam, awayTeam, bttsExpectation);
          
          if (bttsEval) {
            strengthOfMatch = bttsEval.strength;
            bttsContext = {
              homeScoreProbability: bttsEval.homeScoreProbability,
              awayScoreProbability: bttsEval.awayScoreProbability,
              homeGoalsFor: bttsEval.homeGoalsFor,
              awayGoalsAgainst: bttsEval.awayGoalsAgainst,
              awayGoalsFor: bttsEval.awayGoalsFor,
              homeGoalsAgainst: bttsEval.homeGoalsAgainst
            };
            
            recommendation = this.generateBTTSRecommendation(
              insight.team,
              insight.outcome,
              strengthOfMatch,
              isHome,
              confidenceScore,
              bttsContext,
              bttsEval.venueSpecific
            );
          } else {
            // BTTS evaluation failed - insufficient data
            recommendation = `⚠️ **DATA WARNING**: Unable to evaluate BTTS matchup due to insufficient goal data for one or both teams. Cannot reliably assess this market.`;
            strengthOfMatch = 'Poor';
          }
        }
        else if (shouldApplyContext) {
          // 2. Evaluate Match Strength (NOW RETURNS DOMINANCE INFO)
          const matchEvaluation = this.evaluateMatchStrength(
            insight.averageValue,
            insight.threshold,
            oppositionAllows,
            confidenceScore,
            insight.comparison as Comparison
          );
          
          strengthOfMatch = matchEvaluation.strength;
          const dominanceOverride = matchEvaluation.dominanceOverride;
          const dominanceRatio = matchEvaluation.dominanceRatio;

          // 3. Generate Recommendation (NOW INCLUDES DOMINANCE OVERRIDE MESSAGING)
          recommendation = this.generateRecommendation(
            insight.team,
            insight.outcome,
            strengthOfMatch,
            insight.averageValue,
            oppositionAllows,
            insight.threshold,
            isHome,
            confidenceScore,
            venueSpecific,
            dominanceOverride,
            dominanceRatio
          );
          
          // Append data quality warning if needed
          if (dataQuality === 'Poor' || dataQuality === 'Fair') {
            recommendation += ` 📊 **Data Quality: ${dataQuality}** (${oppositionMatches} ${venueSpecific ? 'venue-specific' : 'total'} matches).`;
          }
          
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
            venueSpecific,
            dataQuality,
            bttsContext
          }
        });
        
      } catch (error) {
        // Catch any errors during processing of individual insights
        console.error(`[MatchContextService] 💥 Error processing insight for ${insight.team} - ${insight.market}:`, error);
        
        // Add insight with error state
        enrichedInsights.push({
          ...insight,
          matchContext: {
            oppositionAllows: 0,
            oppositionMatches: 0,
            isHome,
            strengthOfMatch: 'Poor',
            recommendation: `❌ **ERROR**: Unable to process match context due to system error. This bet cannot be reliably evaluated.`,
            venueSpecific: false,
            dataQuality: 'Insufficient'
          }
        });
      }
    }

    console.log(`[MatchContextService] ✅ Enriched ${enrichedInsights.length} insights with venue-specific context`);
    return enrichedInsights;
  }

  /**
   * NEW: Evaluate BTTS (Both Teams To Score) matchup
   * Requires bilateral analysis: both teams must have scoring capability
   */
  private async evaluateBTTSMatchup(
    homeTeam: string,
    awayTeam: string,
    bttsExpectation: 'Yes' | 'No'
  ): Promise<{
    strength: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    homeScoreProbability: number;
    awayScoreProbability: number;
    homeGoalsFor: number;
    awayGoalsAgainst: number;
    awayGoalsFor: number;
    homeGoalsAgainst: number;
    venueSpecific: boolean;
  } | null> {
    
    try {
      const stats = await supabaseGoalsService.getGoalStatistics();
      const homeStats = stats.get(homeTeam);
      const awayStats = stats.get(awayTeam);
      
      if (!homeStats || !awayStats) return null;

      // Get venue-specific stats
      const homeHomeMatches = homeStats.matchDetails.filter(m => m.isHome === true);
      const awayAwayMatches = awayStats.matchDetails.filter(m => m.isHome === false);
      
      const venueSpecific = homeHomeMatches.length >= this.MIN_VENUE_MATCHES && 
                           awayAwayMatches.length >= this.MIN_VENUE_MATCHES;
      
      // Calculate home team's home offensive output
      let homeGoalsFor: number;
      if (venueSpecific) {
        const totalHomeGoalsFor = homeHomeMatches.reduce((sum, m) => sum + m.goalsFor, 0);
        homeGoalsFor = totalHomeGoalsFor / homeHomeMatches.length;
      } else {
        homeGoalsFor = homeStats.goalsFor / homeStats.matches;
      }
      
      // Calculate away team's away defensive weakness
      let awayGoalsAgainst: number;
      if (venueSpecific) {
        const totalAwayGoalsAgainst = awayAwayMatches.reduce((sum, m) => sum + m.goalsAgainst, 0);
        awayGoalsAgainst = totalAwayGoalsAgainst / awayAwayMatches.length;
      } else {
        awayGoalsAgainst = awayStats.goalsAgainst / awayStats.matches;
      }
      
      // Calculate away team's away offensive output
      let awayGoalsFor: number;
      if (venueSpecific) {
        const totalAwayGoalsFor = awayAwayMatches.reduce((sum, m) => sum + m.goalsFor, 0);
        awayGoalsFor = totalAwayGoalsFor / awayAwayMatches.length;
      } else {
        awayGoalsFor = awayStats.goalsFor / awayStats.matches;
      }
      
      // Calculate home team's home defensive weakness
      let homeGoalsAgainst: number;
      if (venueSpecific) {
        const totalHomeGoalsAgainst = homeHomeMatches.reduce((sum, m) => sum + m.goalsAgainst, 0);
        homeGoalsAgainst = totalHomeGoalsAgainst / homeHomeMatches.length;
      } else {
        homeGoalsAgainst = homeStats.goalsAgainst / homeStats.matches;
      }
      
      // Calculate scoring probabilities (average of offensive output and defensive weakness)
      const homeScoreProbability = (homeGoalsFor + awayGoalsAgainst) / 2;
      const awayScoreProbability = (awayGoalsFor + homeGoalsAgainst) / 2;
      
      const bttsThreshold = 0.5; // Both teams need >0.5 goals average to be "likely to score"
      const homeLikelyToScore = homeScoreProbability > bttsThreshold;
      const awayLikelyToScore = awayScoreProbability > bttsThreshold;
      
      let strength: 'Poor' | 'Fair' | 'Good' | 'Excellent' = 'Poor';
      
      if (bttsExpectation === 'Yes') {
        // BTTS YES: Both teams need to score
        if (homeLikelyToScore && awayLikelyToScore) {
          const minProb = Math.min(homeScoreProbability, awayScoreProbability);
          const avgProb = (homeScoreProbability + awayScoreProbability) / 2;
          
          // Excellent: Both teams very likely to score (strong offense + weak defense)
          if (minProb >= 1.5 && avgProb >= 2.0) {
            strength = 'Excellent';
          }
          // Good: Both teams likely to score with comfortable margins
          else if (minProb >= 1.2 && avgProb >= 1.5) {
            strength = 'Good';
          }
          // Fair: Both teams moderately likely to score
          else if (minProb >= 0.8) {
            strength = 'Fair';
          }
          // Poor: One team barely meets threshold
          else {
            strength = 'Poor';
          }
        } else {
          // One or both teams unlikely to score
          strength = 'Poor';
        }
      } else {
        // BTTS NO: At least one team needs to NOT score
        const homeUnlikelyToScore = homeScoreProbability <= 0.8;
        const awayUnlikelyToScore = awayScoreProbability <= 0.8;
        
        if (homeUnlikelyToScore || awayUnlikelyToScore) {
          const minProb = Math.min(homeScoreProbability, awayScoreProbability);
          
          // Excellent: One team very unlikely to score
          if (minProb <= 0.5) {
            strength = 'Excellent';
          }
          // Good: One team unlikely to score
          else if (minProb <= 0.7) {
            strength = 'Good';
          }
          // Fair: One team moderately unlikely to score
          else {
            strength = 'Fair';
          }
        } else {
          // Both teams likely to score - bad for BTTS No
          strength = 'Poor';
        }
      }
      
      return {
        strength,
        homeScoreProbability,
        awayScoreProbability,
        homeGoalsFor,
        awayGoalsAgainst,
        awayGoalsFor,
        homeGoalsAgainst,
        venueSpecific
      };
      
    } catch (error) {
      console.error(`[MatchContextService] Error evaluating BTTS matchup:`, error);
      return null;
    }
  }

  /**
   * NEW: Generate BTTS-specific recommendation text
   */
  private generateBTTSRecommendation(
    teamName: string,
    outcome: string, // "BTTS Yes" or "BTTS No"
    strength: 'Poor' | 'Fair' | 'Good' | 'Excellent',
    isHome: boolean,
    confidenceScore: number,
    bttsContext: {
      homeScoreProbability: number;
      awayScoreProbability: number;
      homeGoalsFor: number;
      awayGoalsAgainst: number;
      awayGoalsFor: number;
      homeGoalsAgainst: number;
    },
    venueSpecific: boolean
  ): string {
    const displayTeamName = getDisplayTeamName(teamName);
    const isBTTSYes = outcome.includes('Yes');
    const venue = isHome ? 'home' : 'away';
    const venueNote = venueSpecific ? ' (venue-specific analysis)' : '';
    
    const homeProb = Math.round(bttsContext.homeScoreProbability * 10) / 10;
    const awayProb = Math.round(bttsContext.awayScoreProbability * 10) / 10;
    const confidenceText = `Confidence Score: ${confidenceScore}/100.`;
    
    if (isBTTSYes) {
      // BTTS YES recommendations
      let base = `${displayTeamName}'s pattern: ${outcome}${venueNote}. Home scoring probability: ${homeProb}, Away scoring probability: ${awayProb}.`;
      
      switch (strength) {
        case 'Excellent':
          return `✅ **STRONG SELECTION**: ${base} An **Excellent Matchup** - both teams demonstrate strong offensive output combined with defensive vulnerability. Both sides are highly likely to find the net. This is a high-confidence BTTS Yes opportunity. ${confidenceText}`;
        case 'Good':
          return `🔵 **Recommended**: ${base} A **Good Matchup** - both teams show good scoring capability and their opponents have defensive weaknesses. Strong indicators for both teams to score. ${confidenceText}`;
        case 'Fair':
          return `🟡 **Fair Selection**: ${base} Both teams have moderate scoring probabilities. While the indicators lean toward BTTS Yes, there's less margin for error. ${confidenceText}`;
        case 'Poor':
          return `🛑 **CAUTION ADVISED**: ${base} At least one team shows weak scoring probability or faces a strong defense. BTTS Yes carries significant risk in this matchup. ${confidenceText}`;
      }
    } else {
      // BTTS NO recommendations
      let base = `${displayTeamName}'s pattern: ${outcome}${venueNote}. Home scoring probability: ${homeProb}, Away scoring probability: ${awayProb}.`;
      
      switch (strength) {
        case 'Excellent':
          return `✅ **STRONG SELECTION**: ${base} An **Excellent Matchup** - at least one team shows very low scoring probability. Strong indicators for a clean sheet scenario. ${confidenceText}`;
        case 'Good':
          return `🔵 **Recommended**: ${base} A **Good Matchup** - one team has weak offensive output or faces a strong defense. Good probability of at least one team failing to score. ${confidenceText}`;
        case 'Fair':
          return `🟡 **Fair Selection**: ${base} One team has moderate scoring difficulty, suggesting a possible clean sheet. However, the margin is narrow. ${confidenceText}`;
        case 'Poor':
          return `🛑 **CAUTION ADVISED**: ${base} Both teams demonstrate strong scoring capability. BTTS No is high-risk as both sides are likely to find the net. ${confidenceText}`;
      }
    }
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