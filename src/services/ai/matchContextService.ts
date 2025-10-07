// src/services/ai/matchContextService.ts

import { 
  BettingInsight, 
  BettingMarket, 
  Comparison 
} from './bettingInsightsService';

// --- START: UPDATED IMPORTS ---
// REMOVE: Direct imports of stats services for verification purposes
// import { supabaseCardsService } from '../stats/supabaseCardsService';
// import { supabaseCornersService } from '../stats/supabaseCornersService';
// import { supabaseFoulsService } from '../stats/supabaseFoulsService'; 
// import { supabaseGoalsService } from '../stats/supabaseGoalsService';
// import { supabaseShootingService } from '../stats/supabaseShootingService';

// PRESERVE: Direct imports of stats services for actual data compilation
import { supabaseCardsService } from '../stats/supabaseCardsService';
import { supabaseCornersService } from '../stats/supabaseCornersService';
import { supabaseFoulsService } from '../stats/supabaseFoulsService'; 
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { supabaseShootingService } from '../stats/supabaseShootingService';

import { fbrefFixtureService } from '../fixtures/fbrefFixtureService'; 
import { getDisplayTeamName, normalizeTeamName } from '../../utils/teamUtils';

// 🚀 NEW, EFFICIENT IMPORT
import { supabaseTeamService } from '../team/supabaseTeamService';
// --- END: UPDATED IMPORTS ---


// --- ROBUST DYNAMIC TYPE INFERENCE ---
// (All types preserved exactly as in the original file)

// 1. INFERRED STATS MAP TYPES (The key is the team name string)
type CardsStats = Awaited<ReturnType<typeof supabaseCardsService.getCardStatistics>>;
type CornersStats = Awaited<ReturnType<typeof supabaseCornersService.getCornerStatistics>>;
type FoulsStats = Awaited<ReturnType<typeof supabaseFoulsService.getFoulStatistics>>;
type GoalsStats = Awaited<ReturnType<typeof supabaseGoalsService.getGoalStatistics>>;
type ShootingStats = Awaited<ReturnType<typeof supabaseShootingService.getShootingStatistics>>;

// 2. DYNAMICALLY INFERRED MATCH DETAIL TYPES 
type ExtractMatchDetail<T> = T extends Map<string, infer V> 
  ? V extends { matchDetails: (infer D)[] }
    ? D 
    : never
  : never;

// Now, we define the individual match detail types based on the inferred map types
type CardsMatchDetail = ExtractMatchDetail<CardsStats>;
type CornersMatchDetail = ExtractMatchDetail<CornersStats>;
type FoulsMatchDetail = ExtractMatchDetail<FoulsStats>;
type GoalsMatchDetail = ExtractMatchDetail<GoalsStats>; 
type ShootingMatchDetail = ExtractMatchDetail<ShootingStats>;

// 3. UNION TYPE for getVenueSpecificMatches
type MatchDetailType = 
  | CardsMatchDetail
  | CornersMatchDetail
  | FoulsMatchDetail
  | GoalsMatchDetail
  | ShootingMatchDetail;

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
    // BTTS-specific fields
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
  private readonly MIN_VENUE_MATCHES = 3; 

  // In-memory cache for team existence verification (Memoization)
  private teamExistsCache = new Map<string, boolean>(); 

  /**
   * Clears the in-memory cache used for verifying team existence.
   */
  public clearTeamExistsCache(): void {
    const sizeBefore = this.teamExistsCache.size;
    this.teamExistsCache.clear();
    console.log(`[MatchContextService] 🧹 Team exists cache cleared. Entries removed: ${sizeBefore}`);
  }

  /**
   * Helper function to abstract the venue filtering and fallback logic.
   */
  private getVenueSpecificMatches<T extends MatchDetailType>(
    allMatches: T[],
    opponentIsHome: boolean
  ): { matches: T[]; venueSpecific: boolean } {
    
    // 1. Filter for matches where the opposition played at the required venue
    const venueMatches = allMatches.filter(m => m.isHome === opponentIsHome);
    
    // 2. Determine if the filtered data set is sufficient
    const useVenueSpecific = venueMatches.length >= this.MIN_VENUE_MATCHES;
    
    // 3. Select the data set: filtered if sufficient, otherwise allMatches as fallback
    const matchesToUse = useVenueSpecific
      ? venueMatches 
      : allMatches;
    
    // 4. Set the flag: Only true if we successfully met the venue threshold AND have data.
    const venueSpecificFlag = useVenueSpecific && matchesToUse.length > 0;
    
    return {
      matches: matchesToUse,
      venueSpecific: venueSpecificFlag
    };
  }

  /**
   * 🚀 REWRITTEN FOR EFFICIENCY
   * Verify that a team exists using the new lightweight service (Memoized).
   */
  private async verifyTeamExists(teamName: string): Promise<boolean> {
    const normalizedTeamName = normalizeTeamName(teamName); 

    // 1. Check local memoization cache first
    if (this.teamExistsCache.has(normalizedTeamName)) {
        console.log(`[MatchContextService] Team existence cache hit for: ${normalizedTeamName}`);
        return this.teamExistsCache.get(normalizedTeamName)!;
    }

    // 2. Use the dedicated, efficient service call
    console.log(`[MatchContextService] Checking team existence for: ${normalizedTeamName} via SupabaseTeamService`);
    try {
        // 🚀 This single, lightweight call replaces the five heavy Promise.all checks.
        const exists = await supabaseTeamService.teamExists(normalizedTeamName);
        
        // 3. Update local memoization cache
        this.teamExistsCache.set(normalizedTeamName, exists);
        
        return exists;
    } catch (error) {
        console.error(`[MatchContextService] Error verifying team existence for ${normalizedTeamName}:`, error);
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
   * Helper to generate confidence text with emoji.
   */
  private getConfidenceContext(confidenceScore: number): string {
      const confidenceEmoji = confidenceScore >= 80 ? '🔥' : 
                              confidenceScore >= 60 ? '✅' : 
                              confidenceScore >= 40 ? '⚠️' : '🚨';

      return `${confidenceEmoji} Confidence: ${confidenceScore}/100`;
  }
  
  /**
   * Get opposition's defensive stats for a specific market
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
          
          if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
            console.warn(`[Data Warning] ⚠️ Team ${opponent} (Cards) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
          }

          const matchDetails = oppStats.matchDetails as CardsMatchDetail[];
          
          const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
            matchDetails, 
            opponentIsHome
          );
          
          // 🎯 FIX: Changed m.cardsFor to m.cardsAgainst to track opponent's concessions (defensive stat)
          const totalCardsAllowed = matchesToUse.reduce(
            (sum, m) => sum + (m.cardsAgainst || 0), 0 
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
          
          if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
            console.warn(`[Data Warning] ⚠️ Team ${opponent} (Corners) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
          }

          const matchDetails = oppStats.matchDetails as CornersMatchDetail[];

          const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
            matchDetails, 
            opponentIsHome
          );
          
          // Opposition's goals/corners/shots allowed is the 'Against' stat in the opponent's perspective
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
          
          if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
            console.warn(`[Data Warning] ⚠️ Team ${opponent} (Fouls) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
          }

          const matchDetails = oppStats.matchDetails as FoulsMatchDetail[];

          const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
            matchDetails, 
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
          
          if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
            console.warn(`[Data Warning] ⚠️ Team ${opponent} (Shots) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
          }

          // Define and assert the field name
          const field = (market === BettingMarket.SHOTS_ON_TARGET 
            ? 'shotsOnTargetAgainst' 
            : 'shotsAgainst') as ShootingFieldKey;
          
          const matchDetails = oppStats.matchDetails as ShootingMatchDetail[];

          const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
            matchDetails, 
            opponentIsHome
          );
          
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

        case BettingMarket.TEAM_GOALS: {
            const oppStats = stats.goals.get(opponent);
            if (!oppStats) return null;
            
            if (oppStats.matches < this.MIN_MATCHES_FOR_ANALYSIS) {
              console.warn(`[Data Warning] ⚠️ Team ${opponent} (Goals) has only ${oppStats.matches} total matches. Proceeding with low sample size.`);
            }
            
            const matchDetails = oppStats.matchDetails as GoalsMatchDetail[];

            const { matches: matchesToUse, venueSpecific } = this.getVenueSpecificMatches(
              matchDetails, 
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

        // 🏆 ADDITION: Handle Match Result market gracefully
        case BettingMarket.MATCH_RESULT: {
            // Match Result analysis is self-contained in bettingInsightsService 
            // and does not rely on opposition defensive averages here.
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
   * Evaluate Match Result context based on opposition's form
   */
  private async evaluateMatchResultContext(
    insight: BettingInsight,
    homeTeam: string,
    awayTeam: string,
    isHome: boolean
  ): Promise<{
    strength: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    recommendation: string;
    venueSpecific: boolean; // Added venueSpecific flag to return type
  }> {
    
    const opponent = isHome ? awayTeam : homeTeam;
    const opponentIsHome = !isHome;
    const targetOutcome = insight.outcome.split(' - ')[1]; // "Win", "Draw", or "Loss"
    
    try {
      // Get opposition's results
      // NOTE: fbrefFixtureService is imported globally now
      const oppResults = await fbrefFixtureService.getTeamMatchResultsByVenue(opponent);
      
      const venue = isHome ? 'home' : 'away';
      const oppVenue = opponentIsHome ? 'home' : 'away';
      const confidenceScore = insight.context?.confidence?.score ?? 0;
      const confidenceText = this.getConfidenceContext(confidenceScore);

      if (oppResults.length < this.MIN_MATCHES_FOR_ANALYSIS) {
        return {
          strength: 'Fair',
          recommendation: `🟡 **Fair Selection**: ${insight.team} has a ${insight.hitRate}% ${targetOutcome} rate. Insufficient opposition data (${oppResults.length} total matches) for deeper analysis. ${confidenceText}`,
          venueSpecific: false
        };
      }
      
      // Filter for relevant venue
      const oppVenueResults = oppResults.filter(r => r.isHome === opponentIsHome);
      
      const venueSpecific = oppVenueResults.length >= this.MIN_VENUE_MATCHES;
      const resultsToUse = venueSpecific ? oppVenueResults : oppResults;
      
      if (resultsToUse.length < this.MIN_MATCHES_FOR_ANALYSIS) {
          return {
              strength: 'Fair',
              recommendation: `🟡 **Fair Selection**: ${insight.team} has a ${insight.hitRate}% ${targetOutcome} rate. Insufficient opposition data (${resultsToUse.length} total matches) for reliable analysis. ${confidenceText}`,
              venueSpecific: false
          };
      }

      // Calculate opposition's defensive strength at this venue
      const matchCount = resultsToUse.length;
      const oppLosses = resultsToUse.filter(r => r.outcome === 'Loss').length;
      const oppWins = resultsToUse.filter(r => r.outcome === 'Win').length;
      const oppLossRate = (oppLosses / matchCount) * 100;
      const oppWinRate = (oppWins / matchCount) * 100;
      
      let strength: 'Poor' | 'Fair' | 'Good' | 'Excellent' = 'Fair';
      let recommendation = '';
      
      // Analyze based on target outcome
      if (targetOutcome === 'Win') {
        // Team is winning, check if opposition is weak
        if (oppLossRate >= 60) {
          strength = 'Excellent';
          recommendation = `✅ **STRONG SELECTION**: ${insight.team} has a **${insight.hitRate}% Win rate** ${venue}, and ${opponent} loses **${Math.round(oppLossRate)}% of their ${oppVenue} matches**. This is an excellent matchup. ${confidenceText}`;
        } else if (oppLossRate >= 40) {
          strength = 'Good';
          recommendation = `🔵 **Recommended**: ${insight.team} has a **${insight.hitRate}% Win rate** ${venue}. ${opponent} loses **${Math.round(oppLossRate)}%** ${oppVenue}, suggesting a vulnerable side. Good betting opportunity. ${confidenceText}`;
        } else if (oppWinRate >= 60) {
          strength = 'Poor';
          recommendation = `🛑 **CAUTION ADVISED**: ${insight.team}'s ${insight.hitRate}% Win pattern meets a strong ${opponent} who wins **${Math.round(oppWinRate)}% ${oppVenue}**. This is a tough matchup despite recent form. ${confidenceText}`;
        } else {
          strength = 'Fair';
          recommendation = `🟡 **Fair Selection**: ${insight.team} has ${insight.hitRate}% Win rate ${venue}. ${opponent}'s ${oppVenue} form is moderate (${Math.round(oppWinRate)}% wins, ${Math.round(oppLossRate)}% losses). Bet relies on ${insight.team}'s form continuing. ${confidenceText}`;
        }
      } else if (targetOutcome === 'Draw') {
        // Draw patterns are tricky
        const oppDrawRate = 100 - oppWinRate - oppLossRate;
        if (oppDrawRate >= 30) {
          strength = 'Good';
          recommendation = `🔵 **Recommended**: ${insight.team} has ${insight.hitRate}% Draw rate ${venue}. ${opponent} draws **${Math.round(oppDrawRate)}%** ${oppVenue}, increasing likelihood. ${confidenceText}`;
        } else {
          strength = 'Fair';
          recommendation = `🟡 **Fair Selection**: ${insight.team} shows ${insight.hitRate}% Draw pattern ${venue}. ${opponent}'s ${oppVenue} form doesn't strongly favor draws. Moderate confidence. ${confidenceText}`;
        }
      } else if (targetOutcome === 'Loss') {
        // Loss patterns (rare, usually underdog bets)
        if (oppWinRate >= 70) {
          strength = 'Good';
          recommendation = `🔵 **Value Bet**: ${insight.team} has ${insight.hitRate}% Loss pattern ${venue} (underdog). ${opponent} is dominant ${oppVenue} (**${Math.round(oppWinRate)}% wins**), confirming this as a realistic outcome. ${confidenceText}`;
        } else {
          strength = 'Fair';
          recommendation = `🟡 **Speculative**: ${insight.team}'s ${insight.hitRate}% Loss pattern ${venue}. ${opponent} wins ${Math.round(oppWinRate)}% ${oppVenue}. Moderate matchup. ${confidenceText}`;
        }
      }
      
      return { strength, recommendation, venueSpecific };
      
    } catch (error) {
      console.error('[MatchContextService] Error evaluating match result context:', error);
      return {
        strength: 'Poor', // Changed to Poor on error for safety
        recommendation: `❌ **ERROR**: Unable to process Match Result context due to system error. ${this.getConfidenceContext(insight.context?.confidence?.score ?? 0)}`,
        venueSpecific: false
      };
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
      if (patternAvg < threshold) return { strength: 'Poor', dominanceOverride: false }; 

      const teamMargin = patternAvg - threshold;
      const oppMargin = oppAllowsAvg - threshold;
      const teamMarginRatio = threshold > 0 ? teamMargin / threshold : (teamMargin > 0 ? 1 : 0);
      const oppMarginRatio = threshold > 0 ? oppMargin / threshold : (oppMargin > 0 ? 1 : 0);

      dominanceRatio = threshold > 0 ? patternAvg / threshold : undefined;

      if (teamMarginRatio >= 0.15 && oppMarginRatio >= 0.15) {
        strength = 'Excellent';
      }
      else if (teamMarginRatio >= 0.10 && oppMarginRatio >= 0.05) {
        strength = 'Good';
      }
      else if (teamMargin > 0 && oppAllowsAvg >= threshold) {
        strength = 'Fair';
      }
      else if (oppAllowsAvg < threshold) {
        strength = 'Poor';
        
        // 🎯 DOMINANCE OVERRIDE
        if (dominanceRatio !== undefined && dominanceRatio >= 1.8 && teamMarginRatio >= 0.25) {
          strength = 'Good';
          dominanceOverride = true;
          console.log(`[MatchContext] Dominance override: Poor → Good (ratio: ${dominanceRatio.toFixed(2)})`);
        } else if (dominanceRatio !== undefined && dominanceRatio >= 1.5) {
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
      if (patternAvg > threshold) return { strength: 'Poor', dominanceOverride: false }; 

      const teamMargin = threshold - patternAvg; 
      const oppMargin = threshold - oppAllowsAvg; 
      const teamMarginRatio = threshold > 0 ? teamMargin / threshold : (teamMargin > 0 ? 1 : 0);
      const oppMarginRatio = threshold > 0 ? oppMargin / threshold : (oppMargin > 0 ? 1 : 0);
      
      if (teamMarginRatio >= 0.15 && oppMarginRatio >= 0.15) {
        strength = 'Excellent';
      }
      else if (teamMarginRatio >= 0.10 && oppMarginRatio >= 0.05) {
        strength = 'Good';
      }
      else if (teamMargin > 0 && oppAllowsAvg <= threshold) {
        strength = 'Fair';
      }
      else if (oppAllowsAvg > threshold) {
        strength = 'Poor';
        // No dominance override for UNDER bets
      } else {
          strength = 'Fair';
      }
    }

    // --- Logic Gate for Confidence Score ---
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
    dominanceRatio?: number,
    dataQuality?: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Insufficient', 
    oppositionMatches?: number 
  ): string {
    const displayTeamName = getDisplayTeamName(teamName);
    const isUnderBet = outcome.startsWith('Under');
    
    const venue = isHome ? 'home' : 'away';
    const oppVenue = isHome ? 'away' : 'home';
    const venueNote = venueSpecific 
      ? ` when playing ${oppVenue}` 
      : '';
    
    const confidenceText = this.getConfidenceContext(confidenceScore);
    const roundedPatternAvg = Math.round(patternAvg * 10) / 10;
    const roundedOppAllowsAvg = Math.round(oppAllowsAvg * 10) / 10;
    
    let baseRecommendation = `${displayTeamName}'s pattern: **${outcome} (${roundedPatternAvg} avg)**.`;
    let mainContext = '';
    let ratingPrefix = '';
    
    // --- Determine Rating Prefix and Main Context ---
    
    if (dominanceOverride && !isUnderBet && dominanceRatio) {
      const dominancePercent = Math.round((dominanceRatio - 1) * 100);
      ratingPrefix = strength === 'Good' ? '🔵 **Recommended (Dominance)**' : '🟡 **Fair Selection (Dominance)**';
      
      mainContext = `Despite facing a defensively strong opponent${venueNote} (${roundedOppAllowsAvg} avg, **below the ${threshold} threshold**), ${displayTeamName}'s exceptional form is **${dominancePercent}% above the threshold**. Their elite quality in this market suggests they can transcend the matchup difficulty.`;
      
    } else if (isUnderBet) {
        // Text for UNDER Bets
        const oppStrength = roundedOppAllowsAvg <= threshold ? 'complements' : 'hinders';
        
        switch (strength) {
            case 'Excellent':
              ratingPrefix = '✅ **STRONG SELECTION**';
              mainContext = `An **Excellent Matchup** as the opposition's low allowance rate${venueNote} (${roundedOppAllowsAvg} avg, **below the ${threshold} threshold**) ${oppStrength} this under bet. Both teams show restraint, making this a high-confidence opportunity.`;
              break;
            case 'Good':
              ratingPrefix = '🔵 **Recommended**';
              mainContext = `A **Good Matchup** because the opposition allows under the threshold${venueNote} (${roundedOppAllowsAvg} avg). This is a solid pick, backed by both team form and opposition weakness in this market.`;
              break;
            case 'Fair':
              ratingPrefix = '🟡 **Fair Selection**';
              mainContext = `The opposition's concession rate${venueNote} (${roundedOppAllowsAvg} avg) is near or at the ${threshold} threshold. The success of this bet relies mainly on **${displayTeamName}'s ability to maintain their discipline**.`;
              break;
            case 'Poor':
              ratingPrefix = '🛑 **CAUTION ADVISED**';
              mainContext = `The opposition is **not a clean-sheet side**${venueNote}, allowing **${roundedOppAllowsAvg} avg** which is **above** the ${threshold} threshold. This is a difficult ${venue} matchup despite recent form.`;
              break;
        }
    } else {
        // Text for OVER/OR_MORE Bets
        const oppWeakness = roundedOppAllowsAvg > threshold ? 'vulnerable' : 'strong';
        
        switch (strength) {
          case 'Excellent':
            ratingPrefix = '✅ **STRONG SELECTION**';
            mainContext = `An **Excellent Matchup** as the opposition allows **${roundedOppAllowsAvg} avg**, which is significantly **above the ${threshold} threshold**${venueNote}. This is a high-confidence, high-value opportunity.`;
            break;
          case 'Good':
            ratingPrefix = '🔵 **Recommended**';
            mainContext = `A **Good Matchup** because the opposition allows above the threshold${venueNote} (${roundedOppAllowsAvg} avg), suggesting their defense is ${oppWeakness} to this market.`;
            break;
          case 'Fair':
            ratingPrefix = '🟡 **Fair Selection**';
            mainContext = `The opposition's concession rate${venueNote} (${roundedOppAllowsAvg} avg) is near the ${threshold} threshold. The success of this bet relies mainly on **${displayTeamName}'s strong current form**.`;
            break;
          case 'Poor':
            ratingPrefix = '🛑 **CAUTION ADVISED**';
            mainContext = `The opposition is defensively ${oppWeakness} when playing ${oppVenue}, allowing only ${roundedOppAllowsAvg} avg, which is **below** the ${threshold} threshold. This is a difficult ${venue} matchup despite recent form.`;
            break;
        }
    }
    
    // --- CONSOLIDATE FINAL OUTPUT ---
    
    let finalRecommendation = `${ratingPrefix}: ${baseRecommendation} ${mainContext}`;
    
    // Append Data Quality Warning (Consolidated into one line)
    if (dataQuality === 'Poor' || dataQuality === 'Fair' || dataQuality === 'Insufficient') {
        const matchesNote = `(${(oppositionMatches ?? 0)} ${venueSpecific ? 'venue-specific' : 'total'} matches).`; 
        finalRecommendation += ` 📊 **Data Warning: ${dataQuality} Quality** ${matchesNote}`;
    }
    
    // Append Confidence Score (Always last for visual closure)
    finalRecommendation += ` ${confidenceText}`;
    
    return finalRecommendation;
  }

  /**
   * Evaluate BTTS (Both Teams To Score) matchup
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

      const homeMatchDetails = homeStats.matchDetails as GoalsMatchDetail[];
      const awayMatchDetails = awayStats.matchDetails as GoalsMatchDetail[];

      // Determine venue-specific matches for both home team (at home) and away team (away)
      const { matches: homeHomeMatches, venueSpecific: homeVenueSpecific } = this.getVenueSpecificMatches(
          homeMatchDetails, 
          true // Home team's perspective
      );
      const { matches: awayAwayMatches, venueSpecific: awayVenueSpecific } = this.getVenueSpecificMatches(
          awayMatchDetails, 
          false // Away team's perspective
      );
      
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
          
          if (minExpectedGoals >= 1.5 && avgExpectedGoals >= 2.0) {
            strength = 'Excellent';
          }
          else if (minExpectedGoals >= 1.2 && avgExpectedGoals >= 1.5) {
            strength = 'Good';
          }
          else if (minExpectedGoals >= 0.8) {
            strength = 'Fair';
          }
          else {
            strength = 'Poor';
          }
        } else {
          strength = 'Poor';
        }
      } else {
        // BTTS NO: At least one team needs to NOT score
        const homeUnlikelyToScore = homeExpectedGoals <= 0.8;
        const awayUnlikelyToScore = awayExpectedGoals <= 0.8;
        
        if (homeUnlikelyToScore || awayUnlikelyToScore) {
          const minExpectedGoals = Math.min(homeExpectedGoals, awayExpectedGoals);
          
          if (minExpectedGoals <= 0.5) {
            strength = 'Excellent';
          }
          else if (minExpectedGoals <= 0.7) {
            strength = 'Good';
          }
          else {
            strength = 'Fair';
          }
        } else {
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
   * Generate BTTS-specific recommendation text
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
    venueSpecific: boolean,
    dataQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Insufficient', 
    oppositionMatches: number 
  ): string {
    const displayTeamName = getDisplayTeamName(teamName);
    const isBTTSYes = outcome.includes('Yes');
    const venueNote = venueSpecific ? ' (venue-specific analysis)' : '';
    
    const homeExpected = Math.round(bttsContext.homeExpectedGoals * 10) / 10;
    const awayExpected = Math.round(bttsContext.awayExpectedGoals * 10) / 10;
    const confidenceText = this.getConfidenceContext(confidenceScore);
    
    let ratingPrefix = '';
    let mainContext = '';

    if (isBTTSYes) {
      // BTTS YES recommendations
      let base = `${displayTeamName}'s pattern: **${outcome}${venueNote}**. Home expected goals: ${homeExpected}, Away expected goals: ${awayExpected}.`;
      
      switch (strength) {
        case 'Excellent':
          ratingPrefix = '✅ **STRONG SELECTION**';
          mainContext = `An **Excellent Matchup** - both teams demonstrate strong offensive output combined with defensive vulnerability. Both sides are highly likely to find the net. This is a high-confidence BTTS Yes opportunity.`;
          break;
        case 'Good':
          ratingPrefix = '🔵 **Recommended**';
          mainContext = `A **Good Matchup** - both teams show good scoring capability and their opponents have defensive weaknesses. Strong indicators for both teams to score.`;
          break;
        case 'Fair':
          ratingPrefix = '🟡 **Fair Selection**';
          mainContext = `Both teams have moderate expected goal outputs. While the indicators lean toward BTTS Yes, there's less margin for error.`;
          break;
        case 'Poor':
          ratingPrefix = '🛑 **CAUTION ADVISED**';
          mainContext = `At least one team shows weak expected goal output or faces a strong defense. BTTS Yes carries significant risk in this matchup.`;
          break;
      }
      
      let finalRecommendation = `${ratingPrefix}: ${base} ${mainContext}`;
      
      if (dataQuality === 'Poor' || dataQuality === 'Fair' || dataQuality === 'Insufficient') {
          const matchesNote = `(${(oppositionMatches)} ${venueSpecific ? 'venue-specific' : 'total'} matches).`; 
          finalRecommendation += ` 📊 **Data Warning: ${dataQuality} Quality** ${matchesNote}`;
      }
      
      return finalRecommendation + ` ${confidenceText}`;

    } else {
      // BTTS NO recommendations
      let base = `${displayTeamName}'s pattern: **${outcome}${venueNote}**. Home expected goals: ${homeExpected}, Away expected goals: ${awayExpected}.`;
      
      switch (strength) {
        case 'Excellent':
          ratingPrefix = '✅ **STRONG SELECTION**';
          mainContext = `An **Excellent Matchup** - at least one team shows very low expected goal output. Strong indicators for a clean sheet scenario.`;
          break;
        case 'Good':
          ratingPrefix = '🔵 **Recommended**';
          mainContext = `A **Good Matchup** - one team has weak offensive output or faces a strong defense. Good probability of at least one team failing to score.`;
          break;
        case 'Fair':
          ratingPrefix = '🟡 **Fair Selection**';
          mainContext = `One team has moderate scoring difficulty, suggesting a possible clean sheet. However, the margin is narrow.`;
          break;
        case 'Poor':
          ratingPrefix = '🛑 **CAUTION ADVISED**';
          mainContext = `Both teams demonstrate strong expected goal outputs. BTTS No is high-risk as both sides are likely to find the net.`;
          break;
      }
      
      let finalRecommendation = `${ratingPrefix}: ${base} ${mainContext}`;
      
      if (dataQuality === 'Poor' || dataQuality === 'Fair' || dataQuality === 'Insufficient') {
          const matchesNote = `(${(oppositionMatches)} ${venueSpecific ? 'venue-specific' : 'total'} matches).`; 
          finalRecommendation += ` 📊 **Data Warning: ${dataQuality} Quality** ${matchesNote}`;
      }
      
      return finalRecommendation + ` ${confidenceText}`;
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
    
    const startTime = performance.now(); 
    const enrichedInsights: MatchContextInsight[] = [];

    // ===== 1. PARALLEL DATA FETCHING (OPTIMIZATION) =====
    // NOTE: This initial fetch of all stats maps is still necessary for context calculation,
    // but the expensive *verification* step has been removed.
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
    
    if (normalizedHome === normalizedAway) {
      console.error(`[MatchContextService] ❌ Home and away teams cannot be the same: "${homeTeam}"`);
      return [];
    }
    
    // --- TEAM EXISTENCE CHECK (Now much faster) ---
    const [homeExists, awayExists] = await Promise.all([
        this.verifyTeamExists(normalizedHome),
        this.verifyTeamExists(normalizedAway),
    ]);

    if (!homeExists || !awayExists) {
        console.error(`[MatchContextService] ❌ One or both teams not found in data: Home: ${homeExists}, Away: ${awayExists}`);
        return [];
    }
    // --- END TEAM EXISTENCE CHECK ---

    if (!homeInsights?.length && !awayInsights?.length) {
      console.warn('[MatchContextService] ⚠️ No insights provided for enrichment');
      return [];
    }

    // ===== PROCESS INSIGHTS =====
    const allInsights = [
      ...homeInsights.map(i => ({ 
        insight: i, 
        isHome: true, 
        opponent: normalizedAway,
        opponentIsHome: false
      })),
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
        
        // 1. Get Opposition Stats (used for non-BTTS/non-Match Result)
        const oppStats = await this.getOppositionDefensiveStats(
          opponent, 
          insight.market, 
          opponentIsHome,
          allStats 
        );
        
        // ===== INITIAL DATA & FLAG SETUP =====
        const isMatchResult = insight.market === BettingMarket.MATCH_RESULT;
        const isBTTS = insight.market === BettingMarket.BOTH_TEAMS_TO_SCORE;

        const oppositionAllows = oppStats?.average ?? 0;
        const oppositionMatches = oppStats?.matches ?? 0;
        const venueSpecific = oppStats?.venueSpecific ?? false;
        const confidenceScore = insight.context?.confidence?.score ?? 0;

        // Use insight's sample size for Match Result quality, otherwise use opposition's sample size
        const dataQualitySourceMatches = isMatchResult ? insight.matchesAnalyzed : oppositionMatches;
        const dataQuality = this.calculateDataQuality(dataQualitySourceMatches, venueSpecific);

        let strengthOfMatch: MatchContext['strengthOfMatch'] = 'Fair';
        let recommendation: string = `No specific match context generated for ${insight.market} ${insight.comparison} pattern.`;
        let roundedOppositionAllows = 0;
        let bttsContext: MatchContext['bttsContext'];

        // ===== HANDLE MISSING/INSUFFICIENT DATA (Only for non-Match Result/non-BTTS markets) =====
        if (!isMatchResult && !isBTTS && (!oppStats || oppositionMatches < this.MIN_MATCHES_FOR_ANALYSIS)) {
          const matchCount = oppositionMatches;
          const oppDisplayName = getDisplayTeamName(opponent);
          const confidenceText = this.getConfidenceContext(confidenceScore);
          
          enrichedInsights.push({
            ...insight,
            matchContext: {
              oppositionAllows: 0,
              oppositionMatches: matchCount,
              isHome,
              strengthOfMatch: 'Poor',
              recommendation: `🛑 **DATA WARNING**: Insufficient opposition data for ${oppDisplayName} in ${insight.market} market (only ${matchCount} matches available). Minimum ${this.MIN_MATCHES_FOR_ANALYSIS} matches required. **Proceed with extreme caution**. ${confidenceText}`,
              venueSpecific: false,
              dataQuality: 'Insufficient'
            }
          });
          
          continue; 
        }

        // --- CORE MARKET EVALUATION ---
        
        // 🎯 NEW: Handle Match Result using dedicated context function
        if (isMatchResult) {
            const matchResultContext = await this.evaluateMatchResultContext(
              insight,
              normalizedHome,
              normalizedAway,
              isHome
            );
            
            strengthOfMatch = matchResultContext.strength;
            recommendation = matchResultContext.recommendation;
            // Overriding venueSpecific and dataQuality based on MatchResult evaluation
            // NOTE: DataQuality calculation for MatchResult is based on insight.matchesAnalyzed (the team's form)
            // The recommendation text itself handles the opposition data quality warning.
            roundedOppositionAllows = 0;
        }
        // Handle BTTS separately
        else if (isBTTS) {
          const bttsExpectation = insight.outcome.includes('Yes') ? 'Yes' : 'No';
          const bttsEval = await this.evaluateBTTSMatchup(
            normalizedHome,
            normalizedAway,
            bttsExpectation,
            allStats.goals 
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
              bttsEval.venueSpecific,
              dataQuality,
              oppositionMatches 
            );
          } else {
            const confidenceText = this.getConfidenceContext(confidenceScore);
            recommendation = `⚠️ **DATA WARNING**: Unable to evaluate BTTS matchup due to insufficient goal data for one or both teams. Cannot reliably assess this market. ${confidenceText}`;
            strengthOfMatch = 'Poor';
          }
        }
        // Handle standard markets (Goals, Cards, Corners, Shots)
        else if (insight.comparison !== 'binary') {
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

          // 3. Generate Recommendation (Using enhanced text generator)
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
            dominanceRatio,
            dataQuality, 
            oppositionMatches
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
            venueSpecific,
            dataQuality,
            bttsContext
          }
        });
        
      } catch (error) {
        // Catch any errors during processing of individual insights
        console.error(`[MatchContextService] 💥 Error processing insight for ${insight.team} - ${insight.market}:`, error);
        
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

    const duration = Math.round(performance.now() - startTime); 
    console.log(`[MatchContextService] ✅ Enrichment complete in ${duration}ms. ${enrichedInsights.length} insights processed.`);
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
    
    const homeInsights = allInsights.filter(i => i.team.toLowerCase() === homeTeam.toLowerCase());
    const awayInsights = allInsights.filter(i => i.team.toLowerCase() === awayTeam.toLowerCase());

    const enriched = await this.enrichMatchInsights(homeTeam, awayTeam, homeInsights, awayInsights);

    const bestBets = enriched.filter(e => {
      const confidence = e.context?.confidence?.level;
      const strength = e.matchContext.strengthOfMatch;

      const isHighConfidence = confidence === 'High' || confidence === 'Very High';
      const isGoodMatchup = strength === 'Excellent' || strength === 'Good';

      return isHighConfidence && isGoodMatchup;
    });

    return bestBets.sort((a, b) => 
      (b.context?.confidence?.score ?? 0) - (a.context?.confidence?.score ?? 0)
    );
  }

  /**
   * Returns the current status of in-memory caches.
   */
  public getCacheStatus() {
    return {
      teamExistsCacheSize: this.teamExistsCache.size,
    };
  }
}

export const matchContextService = new MatchContextService();
