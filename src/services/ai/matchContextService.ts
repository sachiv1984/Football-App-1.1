// src/services/ai/matchContextService.ts

import { 
  BettingInsight, 
  BettingMarket, 
  Comparison 
} from './bettingInsightsService';

// Import only the service objects (which are assumed to be exported)
import { supabaseCardsService } from '../stats/supabaseCardsService';
import { supabaseCornersService } from '../stats/supabaseCornersService';
import { supabaseFoulsService } from '../stats/supabaseFoulsService';
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { supabaseShootingService } from '../stats/supabaseShootingService';

import { getDisplayTeamName, normalizeTeamName } from '../../utils/teamUtils';

// --- LOCAL TYPE DEFINITIONS TO AVOID TS2305 ERRORS ---

// 1. INFERRED STATS MAP TYPES (The key is the team name string)
// Use Awaited<ReturnType<...>> to infer the Map<string, T> type returned by the async service functions.
type CardsStats = Awaited<ReturnType<typeof supabaseCardsService.getCardStatistics>>;
type CornersStats = Awaited<ReturnType<typeof supabaseCornersService.getCornerStatistics>>;
type FoulsStats = Awaited<ReturnType<typeof supabaseFoulsService.getFoulStatistics>>;
type GoalsStats = Awaited<ReturnType<typeof supabaseGoalsService.getGoalStatistics>>;
type ShootingStats = Awaited<ReturnType<typeof supabaseShootingService.getShootingStatistics>>;

// 2. LOCAL MATCH DETAIL TYPES (These replace the missing *MatchDetail imports)
// We define the structure based on the properties used in the reduction logic.

interface BaseMatchDetail {
    isHome?: boolean;
}

interface CardMatchDetail extends BaseMatchDetail {
    cardsFor?: number;
}
interface CornerMatchDetail extends BaseMatchDetail {
    cornersAgainst?: number;
}
interface FoulMatchDetail extends BaseMatchDetail {
    foulsCommittedAgainst?: number;
}
interface GoalMatchDetail extends BaseMatchDetail {
    goalsAgainst?: number;
    goalsFor?: number;
}
interface DetailedShootingMatchDetail extends BaseMatchDetail {
    shotsAgainst?: number;
    shotsOnTargetAgainst?: number;
}

// 3. COMPOSITE BASE TYPE (Constraint for getVenueSpecificMatches)
// This ensures that any array passed to the generic function has all properties that might be accessed.
type MatchDetailBase = CardMatchDetail & CornerMatchDetail & FoulMatchDetail & GoalMatchDetail & DetailedShootingMatchDetail;

// 4. ALL STATS INTERFACE
interface AllStats {
    goals: GoalsStats;
    cards: CardsStats;
    corners: CornersStats;
    fouls: FoulsStats;
    shooting: ShootingStats;
}

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
      homeExpectedGoals: number;
      awayExpectedGoals: number;
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

// Define the exact keys used for dynamic access in the Shooting market
type ShootingFieldKey = 'shotsAgainst' | 'shotsOnTargetAgainst';

/**
 * Service to enrich betting insights with match-specific context
 */
export class MatchContextService {
  
  // Minimum number of matches required for reliable analysis
  private readonly MIN_MATCHES_FOR_ANALYSIS = 3;
  private readonly MIN_VENUE_MATCHES = 3; // Threshold for venue-specific data validity

  // In-memory cache for team existence verification (Memoization)
  private teamExistsCache = new Map<string, boolean>(); 

  /**
   * Helper function to abstract the venue filtering and fallback logic.
   * @template T - The type of the match detail object, now constrained to MatchDetailBase.
   * @param allMatches - All available match details for the team.
   * @param opponentIsHome - The venue condition the opposition is playing at (true = home, false = away).
   * @returns An object containing the filtered array and a boolean indicating if it is venue-specific.
   */
  private getVenueSpecificMatches<T extends MatchDetailBase>(
    allMatches: T[],
    opponentIsHome: boolean
  ): { matches: T[]; venueSpecific: boolean } {
    
    // Filter for matches where the opposition played at the required venue
    const venueMatches = allMatches.filter(m => m.isHome === opponentIsHome);
    
    // Use venueMatches only if we meet the minimum threshold, otherwise use allMatches as fallback
    const useVenueSpecific = venueMatches.length >= this.MIN_VENUE_MATCHES;
    
    const matchesToUse = useVenueSpecific
      ? venueMatches 
      : allMatches;
    
    return {
      matches: matchesToUse,
      // The result is only considered 'venueSpecific' if we used the venueMatches data set
      venueSpecific: useVenueSpecific
    };
  }

  /**
   * Verify that a team exists in the database (Memoized)
   */
  private async verifyTeamExists(teamName: string): Promise<boolean> {
    const normalizedTeamName = normalizeTeamName(teamName); 

    // 1. Check Cache
    if (this.teamExistsCache.has(normalizedTeamName)) {
      return this.teamExistsCache.get(normalizedTeamName)!;
    }

    // 2. Perform expensive operation (parallel fetching only here)
    try {
      // Check if team exists in any of the services
      const [cardsStats, cornersStats, foulsStats, goalsStats, shootingStats] = await Promise.all([
        supabaseCardsService.getCardStatistics(),
        supabaseCornersService.getCornerStatistics(),
        supabaseFoulsService.getFoulStatistics(),
        supabaseGoalsService.getGoalStatistics(),
        supabaseShootingService.getShootingStatistics()
      ]);

      const exists = cardsStats.has(normalizedTeamName) || 
                     cornersStats.has(normalizedTeamName) || 
                     foulsStats.has(normalizedTeamName) || 
                     goalsStats.has(normalizedTeamName) || 
                     shootingStats.has(normalizedTeamName);
      
      // 3. Store result in cache
      this.teamExistsCache.set(normalizedTeamName, exists);
      
      return exists;
    } catch (error) {
      console.error(`[MatchContextService] Error verifying team existence for ${normalizedTeamName}:`, error);
      // Store 'false' in cache on error to prevent repeated lookups
      this.teamExistsCache.set(normalizedTeamName, false);
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
   * NEW: Helper to generate confidence text with emoji.
   */
  private getConfidenceContext(confidenceScore: number): string {
      const confidenceEmoji = confidenceScore >= 80 ? '🔥' : 
                              confidenceScore >= 60 ? '✅' : 
                              confidenceScore >= 40 ? '⚠️' : '🚨';

      return `${confidenceEmoji} Confidence: **${confidenceScore}/100**`;
  }
  
  /**
   * Get opposition's defensive stats for a specific market
   * OPTIMIZED: Now accepts the pre-fetched statistics map.
   */
  private async getOppositionDefensiveStats(
    opponent: string,
    market: BettingMarket,
    opponentIsHome: boolean,
    stats: AllStats
  ): Promise<{ average: number; matches: number; venueSpecific: boolean } | null> {
    
    try {
      switch (market) {
        case BettingMarket.CARDS: {
          const oppStats = stats.cards.get(opponent);
          if (!oppStats) return null;
          
          // 🛑 ADDED EARLY SAMPLE SIZE WARNING 🛑
          if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
            console.warn(`[Data Warning] ⚠️ Team ${opponent} (Cards) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
          }
          // 🛑 END WARNING 🛑

          // FIX: Cast to the specific detail type
          const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
            // @ts-ignore: We rely on the implicit definition of the generic T extending MatchDetailBase
            oppStats.matchDetails as CardMatchDetail[], 
            opponentIsHome
          );
          
          const totalCardsAllowed = matchesToUse.reduce(
            (sum, m) => sum + (m.cardsFor || 0), 0 
          );
          
          const matchCount = matchesToUse.length;
          
          return {
            average: matchCount > 0 ? totalCardsAllowed / matchCount : 0,
            matches: matchCount,
            venueSpecific
          };
        }

        case BettingMarket.CORNERS: {
          const oppStats = stats.corners.get(opponent);
          if (!oppStats) return null;
          
          // 🛑 ADDED EARLY SAMPLE SIZE WARNING 🛑
          if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
            console.warn(`[Data Warning] ⚠️ Team ${opponent} (Corners) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
          }
          // 🛑 END WARNING 🛑

          // FIX: Cast to the specific detail type
          const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
            // @ts-ignore
            oppStats.matchDetails as CornerMatchDetail[], 
            opponentIsHome
          );
          
          const totalCornersAgainst = matchesToUse.reduce(
            (sum, m) => sum + (m.cornersAgainst || 0), 0
          );

          const matchCount = matchesToUse.length;
          
          return {
            average: matchCount > 0 ? totalCornersAgainst / matchCount : 0,
            matches: matchCount,
            venueSpecific
          };
        }

        case BettingMarket.FOULS: {
          const oppStats = stats.fouls.get(opponent);
          if (!oppStats) return null;
          
          // 🛑 ADDED EARLY SAMPLE SIZE WARNING 🛑
          if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
            console.warn(`[Data Warning] ⚠️ Team ${opponent} (Fouls) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
          }
          // 🛑 END WARNING 🛑

          // FIX: Cast to the specific detail type
          const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
            // @ts-ignore
            oppStats.matchDetails as FoulMatchDetail[], 
            opponentIsHome
          );
          
          const totalFoulsAgainst = matchesToUse.reduce(
            (sum, m) => sum + (m.foulsCommittedAgainst || 0), 0
          );

          const matchCount = matchesToUse.length;
          
          return {
            average: matchCount > 0 ? totalFoulsAgainst / matchCount : 0,
            matches: matchCount,
            venueSpecific
          };
        }

        case BettingMarket.SHOTS_ON_TARGET:
        case BettingMarket.TOTAL_SHOTS: {
          const oppStats = stats.shooting.get(opponent);
          if (!oppStats) return null;
          
          // 🛑 ADDED EARLY SAMPLE SIZE WARNING 🛑
          if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
            console.warn(`[Data Warning] ⚠️ Team ${opponent} (Shots) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
          }
          // 🛑 END WARNING 🛑

          // Define and cast the field name to the narrow, type-safe key
          const field = (market === BettingMarket.SHOTS_ON_TARGET 
            ? 'shotsOnTargetAgainst' 
            : 'shotsAgainst') as ShootingFieldKey;
          
          // FIX: Cast to the specific detail type
          const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
            // @ts-ignore
            oppStats.matchDetails as DetailedShootingMatchDetail[], 
            opponentIsHome
          );
          
          // Accessing 'm[field]' is now type-safe because T extends MatchDetailBase
          const totalAgainst = matchesToUse.reduce(
            (sum, m) => sum + (m[field] || 0), 0 
          );
          
          const matchCount = matchesToUse.length;

          return {
            average: matchCount > 0 ? totalAgainst / matchCount : 0,
            matches: matchCount,
            venueSpecific
          };
        }

        case BettingMarket.GOALS: {
            const oppStats = stats.goals.get(opponent);
            if (!oppStats) return null;
            
            // 🛑 ADDED EARLY SAMPLE SIZE WARNING 🛑
            if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
              console.warn(`[Data Warning] ⚠️ Team ${opponent} (Goals) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
            }
            // 🛑 END WARNING 🛑
            
            // FIX: Cast to the specific detail type
            const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
              // @ts-ignore
              oppStats.matchDetails as GoalMatchDetail[], 
              opponentIsHome
            );
            
            // Calculate average goals CONCEDED (goalsAgainst) at this venue
            const totalGoalsAgainst = matchesToUse.reduce(
              (sum, m) => sum + (m.goalsAgainst || 0), 0 
            );
            
            const matchCount = matchesToUse.length;

            return {
              average: matchCount > 0 ? totalGoalsAgainst / matchCount : 0,
              matches: matchCount,
              venueSpecific
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
      const teamMarginRatio = threshold > 0 ? teamMargin / threshold : (teamMargin > 0 ? 1 : 0);
      const oppMarginRatio = threshold > 0 ? oppMargin / threshold : (oppMargin > 0 ? 1 : 0);

      // Calculate dominance ratio for potential override
      dominanceRatio = threshold > 0 ? patternAvg / threshold : undefined;

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
        if (dominanceRatio !== undefined && dominanceRatio >= 1.8 && teamMarginRatio >= 0.25) {
          // Exceptional dominance: Team is 80%+ above threshold with 25%+ margin
          strength = 'Good';
          dominanceOverride = true;
          console.log(`[MatchContext] Dominance override: Poor → Good (ratio: ${dominanceRatio.toFixed(2)})`);
        } else if (dominanceRatio !== undefined && dominanceRatio >= 1.5) {
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
      const teamMarginRatio = threshold > 0 ? teamMargin / threshold : (teamMargin > 0 ? 1 : 0);
      const oppMarginRatio = threshold > 0 ? oppMargin / threshold : (oppMargin > 0 ? 1 : 0);
      
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
    // 🚩 UPDATED: Use the new helper for confidence context
    const confidenceText = this.getConfidenceContext(confidenceScore);

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
   * NEW: Evaluate BTTS (Both Teams To Score) matchup
   * OPTIMIZED: Now accepts the pre-fetched goals statistics map.
   */
  private async evaluateBTTSMatchup(
    homeTeam: string,
    awayTeam: string,
    bttsExpectation: 'Yes' | 'No',
    goalsStats: GoalsStats // Accept goalsStats
  ): Promise<{
    strength: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    homeExpectedGoals: number;
    awayExpectedGoals: number;
    homeGoalsFor: number;
    awayGoalsAgainst: number;
    awayGoalsFor: number;
    homeGoalsAgainst: number;
    venueSpecific: boolean;
  } | null> {
    
    try {
      const homeStats = goalsStats.get(homeTeam);
      const awayStats = goalsStats.get(awayTeam);
      
      if (!homeStats || !awayStats) return null;

      // Determine venue-specific matches for both home team (at home) and away team (away)
      const { matches: homeHomeMatches, venueSpecific: homeVenueSpecific } = this.getVenueSpecificMatches(
          // FIX: Cast to the specific detail type
          // @ts-ignore
          homeStats.matchDetails as GoalMatchDetail[], 
          true // Home team's perspective
      );
      const { matches: awayAwayMatches, venueSpecific: awayVenueSpecific } = this.getVenueSpecificMatches(
          // FIX: Cast to the specific detail type
          // @ts-ignore
          awayStats.matchDetails as GoalMatchDetail[], 
          false // Away team's perspective
      );
      
      // Overall venue-specific flag for BTTS requires both to have sufficient venue data
      const venueSpecific = homeVenueSpecific && awayVenueSpecific; 
      
      const homeHomeMatchCount = homeHomeMatches.length;
      const awayAwayMatchCount = awayAwayMatches.length;
      
      // Calculate home team's home offensive output (Goals For at Home)
      let homeGoalsFor: number = homeHomeMatchCount > 0 
        ? homeHomeMatches.reduce((sum, m) => sum + (m.goalsFor || 0), 0) / homeHomeMatchCount
        : 0;
      
      // Calculate away team's away defensive weakness (Goals Against Away)
      let awayGoalsAgainst: number = awayAwayMatchCount > 0 
        ? awayAwayMatches.reduce((sum, m) => sum + (m.goalsAgainst || 0), 0) / awayAwayMatchCount
        : 0;
      
      // Calculate away team's away offensive output (Goals For Away)
      let awayGoalsFor: number = awayAwayMatchCount > 0 
        ? awayAwayMatches.reduce((sum, m) => sum + (m.goalsFor || 0), 0) / awayAwayMatchCount
        : 0;
      
      // Calculate home team's home defensive weakness (Goals Against Home)
      let homeGoalsAgainst: number = homeHomeMatchCount > 0 
        ? homeHomeMatches.reduce((sum, m) => sum + (m.goalsAgainst || 0), 0) / homeHomeMatchCount
        : 0;
      
      // Calculate expected goals (average of offensive output and defensive weakness)
      const homeExpectedGoals = (homeGoalsFor + awayGoalsAgainst) / 2;
      const awayExpectedGoals = (awayGoalsFor + homeGoalsAgainst) / 2;
      
      // Threshold: 0.8 expected goals ≈ 55% probability of scoring (Poisson approximation)
      const expectedGoalsThreshold = 0.8;
      const homeLikelyToScore = homeExpectedGoals > expectedGoalsThreshold;
      const awayLikelyToScore = awayExpectedGoals > expectedGoalsThreshold;
      
      let strength: 'Poor' | 'Fair' | 'Good' | 'Excellent' = 'Poor';
      
      if (bttsExpectation === 'Yes') {
        // BTTS YES: Both teams need to score
        if (homeLikelyToScore && awayLikelyToScore) {
          const minExpectedGoals = Math.min(homeExpectedGoals, awayExpectedGoals);
          const avgExpectedGoals = (homeExpectedGoals + awayExpectedGoals) / 2;
          
          // Excellent: Both teams expected to score 1.5+ goals (≈78% probability each)
          if (minExpectedGoals >= 1.5 && avgExpectedGoals >= 2.0) {
            strength = 'Excellent';
          }
          // Good: Both teams expected to score 1.2+ goals (≈70% probability each)
          else if (minExpectedGoals >= 1.2 && avgExpectedGoals >= 1.5) {
            strength = 'Good';
          }
          // Fair: Both teams expected to score 0.8+ goals (≈55% probability each)
          else if (minExpectedGoals >= 0.8) {
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
        const homeUnlikelyToScore = homeExpectedGoals <= 0.8;
        const awayUnlikelyToScore = awayExpectedGoals <= 0.8;
        
        if (homeUnlikelyToScore || awayUnlikelyToScore) {
          const minExpectedGoals = Math.min(homeExpectedGoals, awayExpectedGoals);
          
          // Excellent: One team expected to score ≤0.5 goals (≈40% probability)
          if (minExpectedGoals <= 0.5) {
            strength = 'Excellent';
          }
          // Good: One team expected to score ≤0.7 goals (≈50% probability)
          else if (minExpectedGoals <= 0.7) {
            strength = 'Good';
          }
          // Fair: One team expected to score ≤0.8 goals (≈55% probability)
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
        homeExpectedGoals,
        awayExpectedGoals,
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
      homeExpectedGoals: number;
      awayExpectedGoals: number;
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
    
    const homeExpected = Math.round(bttsContext.homeExpectedGoals * 10) / 10;
    const awayExpected = Math.round(bttsContext.awayExpectedGoals * 10) / 10;
    // 🚩 UPDATED: Use the new helper for confidence context
    const confidenceText = this.getConfidenceContext(confidenceScore);
    
    if (isBTTSYes) {
      // BTTS YES recommendations
      let base = `${displayTeamName}'s pattern: ${outcome}${venueNote}. Home expected goals: ${homeExpected}, Away expected goals: ${awayExpected}.`;
      
      switch (strength) {
        case 'Excellent':
          return `✅ **STRONG SELECTION**: ${base} An **Excellent Matchup** - both teams demonstrate strong offensive output combined with defensive vulnerability. Both sides are highly likely to find the net. This is a high-confidence BTTS Yes opportunity. ${confidenceText}`;
        case 'Good':
          return `🔵 **Recommended**: ${base} A **Good Matchup** - both teams show good scoring capability and their opponents have defensive weaknesses. Strong indicators for both teams to score. ${confidenceText}`;
        case 'Fair':
          return `🟡 **Fair Selection**: ${base} Both teams have moderate expected goal outputs. While the indicators lean toward BTTS Yes, there's less margin for error. ${confidenceText}`;
        case 'Poor':
          return `🛑 **CAUTION ADVISED**: ${base} At least one team shows weak expected goal output or faces a strong defense. BTTS Yes carries significant risk in this matchup. ${confidenceText}`;
      }
    } else {
      // BTTS NO recommendations
      let base = `${displayTeamName}'s pattern: ${outcome}${venueNote}. Home expected goals: ${homeExpected}, Away expected goals: ${awayExpected}.`;
      
      switch (strength) {
        case 'Excellent':
          return `✅ **STRONG SELECTION**: ${base} An **Excellent Matchup** - at least one team shows very low expected goal output. Strong indicators for a clean sheet scenario. ${confidenceText}`;
        case 'Good':
          return `🔵 **Recommended**: ${base} A **Good Matchup** - one team has weak offensive output or faces a strong defense. Good probability of at least one team failing to score. ${confidenceText}`;
        case 'Fair':
          return `🟡 **Fair Selection**: ${base} One team has moderate scoring difficulty, suggesting a possible clean sheet. However, the margin is narrow. ${confidenceText}`;
        case 'Poor':
          return `🛑 **CAUTION ADVISED**: ${base} Both teams demonstrate strong expected goal outputs. BTTS No is high-risk as both sides are likely to find the net. ${confidenceText}`;
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
    
    const startTime = performance.now(); // ⏱️ Start timer
    const enrichedInsights: MatchContextInsight[] = [];

    // ===== 1. PARALLEL DATA FETCHING (OPTIMIZATION) =====
    // Fetch all necessary stats concurrently to minimize network latency.
    const [goalsStats, cardsStats, cornersStats, foulsStats, shootingStats] = 
        await Promise.all([
          supabaseGoalsService.getGoalStatistics(),
          supabaseCardsService.getCardStatistics(),
          supabaseCornersService.getCornerStatistics(),
          supabaseFoulsService.getFoulStatistics(),
          supabaseShootingService.getShootingStatistics()
        ]);

    const allStats: AllStats = { 
        goals: goalsStats, 
        cards: cardsStats, 
        corners: cornersStats, 
        fouls: foulsStats, 
        shooting: shootingStats 
    };

    // ===== INPUT VALIDATION & TEAM NORMALIZATION =====
    if (!homeTeam?.trim() || !awayTeam?.trim()) {
      console.error('[MatchContextService] ❌ Invalid team name: empty or undefined');
      return [];
    }
    
    const normalizedHome = normalizeTeamName(homeTeam);
    const normalizedAway = normalizeTeamName(awayTeam);
    
    console.log(`[MatchContextService] 📝 Normalized teams: "${homeTeam}" → "${normalizedHome}", "${awayTeam}" → "${normalizedAway}"`);
    
    if (normalizedHome === normalizedAway) {
      console.error(`[MatchContextService] ❌ Home and away teams cannot be the same: "${homeTeam}"`);
      return [];
    }
    
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
        opponent: normalizedAway,
        opponentIsHome: false
      })),
      // Away team insights: opponent is HOME, so check opponent's home defensive stats
      ...awayInsights.map(i => ({ 
        insight: i, 
        isHome: false, 
        opponent: normalizedHome,
        opponentIsHome: true
      }))
    ];

    for (const { insight, isHome, opponent, opponentIsHome } of allInsights) {
      try {
        const insightTeamName = isHome ? normalizedHome : normalizedAway;
        
        // 1. Get Opposition Stats - PASS THE PRE-FETCHED DATA
        const oppStats = await this.getOppositionDefensiveStats(
          opponent, 
          insight.market, 
          opponentIsHome,
          allStats // Pass the combined stats object
        );
        
        // ===== HANDLE MISSING OR INSUFFICIENT DATA (Final check before proceeding) =====
        if (!oppStats || oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
          const matchCount = oppStats?.matches ?? 0;
          const oppDisplayName = getDisplayTeamName(opponent);
          
          if (oppStats && matchCount > 0) { 
              // The early console.warn already handled the low count; this handles the final 'Insufficient' flag
          }
          
          const confidenceText = this.getConfidenceContext(insight.context?.confidence?.score ?? 0);
          
          enrichedInsights.push({
            ...insight,
            matchContext: {
              oppositionAllows: 0,
              oppositionMatches: matchCount,
              isHome,
              strengthOfMatch: 'Poor',
              recommendation: `⚠️ **DATA WARNING**: Insufficient opposition data for ${oppDisplayName} in ${insight.market} market (only ${matchCount} matches available). Minimum ${this.MIN_MATCHES_FOR_ANALYSIS} matches required for reliable analysis. **Proceed with extreme caution** - this recommendation is based on incomplete information. ${confidenceText}`,
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
          const bttsEval = await this.evaluateBTTSMatchup(
            normalizedHome,
            normalizedAway,
            bttsExpectation,
            goalsStats // Pass goalsStats
          );
          
          if (bttsEval) {
            strengthOfMatch = bttsEval.strength;
            bttsContext = {
              homeExpectedGoals: bttsEval.homeExpectedGoals,
              awayExpectedGoals: bttsEval.awayExpectedGoals,
              homeGoalsFor: bttsEval.homeGoalsFor,
              awayGoalsAgainst: bttsEval.awayGoalsAgainst,
              awayGoalsFor: bttsEval.awayGoalsFor,
              homeGoalsAgainst: bttsEval.homeGoalsAgainst
            };
            
            recommendation = this.generateBTTSRecommendation(
              insightTeamName,
              insight.outcome,
              strengthOfMatch,
              isHome,
              confidenceScore,
              bttsContext,
              bttsEval.venueSpecific
            );
          } else {
            const confidenceText = this.getConfidenceContext(confidenceScore);
            recommendation = `⚠️ **DATA WARNING**: Unable to evaluate BTTS matchup due to insufficient goal data for one or both teams. Cannot reliably assess this market. ${confidenceText}`;
            strengthOfMatch = 'Poor';
          }
        }
        else if (shouldApplyContext) {
          // 2. Evaluate Match Strength
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

          // 3. Generate Recommendation
          recommendation = this.generateRecommendation(
            insightTeamName,
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
        const confidenceText = this.getConfidenceContext(insight.context?.confidence?.score ?? 0);
        
        enrichedInsights.push({
          ...insight,
          matchContext: {
            oppositionAllows: 0,
            oppositionMatches: 0,
            isHome,
            strengthOfMatch: 'Poor',
            recommendation: `❌ **ERROR**: Unable to process match context due to system error. This bet cannot be reliably evaluated. ${confidenceText}`,
            venueSpecific: false,
            dataQuality: 'Insufficient'
          }
        });
      }
    }

    const duration = Math.round(performance.now() - startTime); // ⏱️ Calculate duration
    console.log(`[MatchContextService] ✅ Enriched ${enrichedInsights.length} insights in ${duration}ms`); // 📝 Log duration
    
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
