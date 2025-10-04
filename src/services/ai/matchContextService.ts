// src/services/ai/matchContextService.ts

import { BettingInsight, BettingMarket } from './bettingInsightsService';
import { supabaseCardsService } from '../stats/supabaseCardsService';
import { supabaseCornersService } from '../stats/supabaseCornersService';
import { supabaseFoulsService } from '../stats/supabaseFoulsService';
import { supabaseGoalsService } from '../stats/supabaseGoalsService';
import { supabaseShootingService } from '../stats/supabaseShootingService';

export interface MatchContextInsight extends BettingInsight {
  matchContext: {
    oppositionAllows: number;
    oppositionMatches: number;
    isHome: boolean;
    strengthOfMatch: 'Poor' | 'Fair' | 'Good' | 'Excellent';
    recommendation: string;
  };
}

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
          
          // Calculate average cards CONCEDED (cardsAgainst)
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
          
          const totalAgainst = oppStats.matchDetails.reduce(
            (sum, m) => sum + (m[field] || 0), 0
          );
          return {
            average: totalAgainst / oppStats.matches,
            matches: oppStats.matches
          };
        }