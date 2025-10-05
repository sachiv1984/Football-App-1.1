// src/services/ai/matchContextService.ts (FULL CODE)

// FIX: We now import the single source of truth for BettingInsight
import { 
  BettingInsight, // Now contains 'average' and 'confidence?'
  BettingMarket, 
  Comparison 
} from './bettingInsightsService';

import { supabaseCardsService } from '../stats/supabaseCardsService';
import { supabaseCornersService } from '../stats/supabaseCornersService';
import { supabaseFoulsService } from '../stats/supabaseFoulsService';
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { supabaseShootingService } from '../stats/supabaseShootingService';

// Defining the specific match context structure
interface MatchContext {
    oppositionAllows: number;
    oppositionMatches: number;
    isHome: boolean;
    strengthOfMatch: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    recommendation: string;
}

// Defining the enriched insight as an intersection type 
// NOTE: This is correct now that BettingInsight is fully defined in its source file.
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
          
          // Calculate average cards CONCEDED (cardsAgainst) - assuming data is available
          const totalCardsAgainst = oppStats.matchDetails.reduce(
            (sum, m) => sum + (m.cardsAgainst || 0), 0
          );
          return {
            average: totalCardsAgainst / oppStats.matches,
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
   * This logic applies to OVER/OR_MORE patterns (offensive strength vs defensive weakness).
   */
  private evaluateMatchStrength(
    patternAvg: number,
    threshold: number,
    oppAllowsAvg: number
  ): 'Poor' | 'Fair' | 'Good' | 'Excellent' {
    
    // We only evaluate strength for patterns that met or exceeded the threshold.
    if (patternAvg < threshold) return 'Poor'; 

    // Margin analysis (how much is the value above the threshold)
    const teamMargin = patternAvg - threshold;
    const oppMargin = oppAllowsAvg - threshold;

    // Use a ratio to normalize evaluation across different markets (e.g., 3+ shots vs 8+ fouls)
    const teamMarginRatio = teamMargin / threshold;
    const oppMarginRatio = oppMargin / threshold;


    // Excellent: Team significantly exceeds AND Opposition significantly allows more than threshold
    if (teamMarginRatio >= 0.15 && oppMarginRatio >= 0.15) {
      return 'Excellent';
    }
    
    // Good: Team comfortably exceeds AND Opposition allows above threshold
    if (teamMarginRatio >= 0.10 && oppMarginRatio >= 0.05) {
      return 'Good';
    }

    // Fair: Team meets or slightly exceeds, AND Opposition allows at least the threshold
    if (teamMargin > 0 && oppAllowsAvg >= threshold) {
      return 'Fair';
    }

    // Poor: Opposition allows less than the threshold (i.e., this is a tough matchup)
    if (oppAllowsAvg < threshold) {
      return 'Poor';
    }

    return 'Fair';
  }

  /**
   * Generates a text recommendation based on the context and match strength.
   */
  private generateRecommendation(
    teamName: string,
    outcome: string,
    strength: 'Poor' | 'Fair' | 'Good' | 'Excellent',
    patternAvg: number,
    oppAllowsAvg: number,
    threshold: number,
    isHome: boolean,
    confidenceScore: number
  ): string {
    const venue = isHome ? 'home' : 'away';
    let base = `${teamName}'s pattern: ${outcome} (${Math.round(patternAvg * 10) / 10} avg)`;
    const oppText = `vs opposition allowing ${Math.round(oppAllowsAvg * 10) / 10} (Threshold: ${threshold})`;
    const confidenceText = `Confidence Score: ${confidenceScore}/100.`;

    switch (strength) {
      case 'Excellent':
        return `✅ **STRONG SELECTION**: ${base}. An **Excellent Matchup** as the opposition concedes significantly more than the ${threshold} threshold. This is a high-confidence, high-value opportunity. ${confidenceText}`;
      case 'Good':
        return `🔵 **Recommended**: ${base}. A **Good Matchup** because the opposition allows above the threshold, suggesting their defense is vulnerable to this market. ${confidenceText}`;
      case 'Fair':
        return `🟡 **Fair Selection**: ${base}. The opposition's concession rate (${Math.round(oppAllowsAvg * 10) / 10}) is near the threshold. The success of this bet relies mainly on ${teamName}'s strong current form. ${confidenceText}`;
      case 'Poor':
        return `🛑 **CAUTION ADVISED**: ${base}. The opposition is defensively strong, allowing only ${Math.round(oppAllowsAvg * 10) / 10}, which is **below** the ${threshold} threshold. This is a difficult ${venue} matchup despite recent form. ${confidenceText}`;
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

      // Only apply match context to OVER/OR_MORE bets, as UNDER bets are about weakness, not strength
      // For simplicity, we skip BTTS for now as it needs complex defensive BTTS calculation
      const shouldApplyContext = 
        insight.market !== BettingMarket.BOTH_TEAMS_TO_SCORE &&
        (insight.comparison === Comparison.OVER || insight.comparison === Comparison.OR_MORE);

      let strengthOfMatch: MatchContext['strengthOfMatch'] = 'Fair';
      let recommendation: string = `No specific match context generated for ${insight.market} ${insight.comparison} pattern.`;
      let roundedOppositionAllows = 0;

      if (shouldApplyContext) {
        // 2. Evaluate Match Strength
        strengthOfMatch = this.evaluateMatchStrength(
          insight.averageValue,
          insight.threshold,
          oppositionAllows
        );

        // 3. Generate Recommendation
        const confidenceScore = insight.context?.confidence?.score ?? 0;

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
