// src/services/odds/oddsIntegrationService.ts
import { supabase } from '@/lib/supabase';
import { bettingInsightsService, BettingInsight, BettingMarket, Comparison } from '../ai/bettingInsightsService';

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export interface OddsData {
  bookmaker: string;
  odds: number;
  line: number;
}

export interface ValueMetrics {
  yourProbability: number;
  impliedProbability: number;
  edge: number;
  expectedValue: number;
  kellyStake: number;
}

export interface ValueBet {
  insight: BettingInsight;
  matchInfo: {
    eventId: string;
    opponent: string;
    kickoffTime: string;
    isHome: boolean;
  };
  oddsData: OddsData;
  valueMetrics: ValueMetrics;
  recommendation: 'exceptional' | 'strong' | 'good' | 'marginal';
}

export interface PrematchOdds {
  event_id: string;
  home_team: string;
  away_team: string;
  kickoff_time: string;
  league: string;
  corners_odds: any;
  cards_odds: any;
  fouls_odds: any;
  btts_odds: any;
  match_odds: any;
  over_under_goals_odds: any;
}

// =====================================================
// ODDS INTEGRATION SERVICE
// =====================================================

export class OddsIntegrationService {
  
  /**
   * Get value bets for a specific team
   */
  async getValueBets(teamName: string): Promise<ValueBet[]> {
    console.log(`[OddsIntegration] Getting value bets for ${teamName}...`);
    
    // Get betting patterns/insights
    const insights = await bettingInsightsService.getTeamInsights(teamName);
    
    if (insights.length === 0) {
      console.log(`[OddsIntegration] No insights found for ${teamName}`);
      return [];
    }
    
    // Get upcoming matches with odds
    const { data: upcomingMatches, error } = await supabase
      .from('prematch_odds')
      .select('*')
      .or(`home_team.ilike.%${teamName}%,away_team.ilike.%${teamName}%`)
      .eq('odds_locked', false)
      .gte('kickoff_time', new Date().toISOString())
      .order('kickoff_time', { ascending: true });
    
    if (error) {
      console.error('[OddsIntegration] Error fetching matches:', error);
      return [];
    }
    
    if (!upcomingMatches || upcomingMatches.length === 0) {
      console.log(`[OddsIntegration] No upcoming matches for ${teamName}`);
      return [];
    }
    
    console.log(`[OddsIntegration] Found ${upcomingMatches.length} upcoming matches`);
    
    const valueBets: ValueBet[] = [];
    
    // Match patterns with odds
    for (const match of upcomingMatches) {
      const isHome = match.home_team.toLowerCase().includes(teamName.toLowerCase());
      const opponent = isHome ? match.away_team : match.home_team;
      
      for (const insight of insights) {
        const valueBet = this.calculateValue(insight, match, isHome, opponent);
        
        // Only include bets with positive expected value (5%+)
        if (valueBet && valueBet.valueMetrics.expectedValue > 5) {
          valueBets.push(valueBet);
        }
      }
    }
    
    // Sort by expected value (best opportunities first)
    valueBets.sort((a, b) => b.valueMetrics.expectedValue - a.valueMetrics.expectedValue);
    
    console.log(`[OddsIntegration] Found ${valueBets.length} value bets`);
    
    return valueBets;
  }
  
  /**
   * Get value bets for a specific match
   */
  async getMatchValueBets(homeTeam: string, awayTeam: string): Promise<{
    home: ValueBet[];
    away: ValueBet[];
  }> {
    const homeValueBets = await this.getValueBets(homeTeam);
    const awayValueBets = await this.getValueBets(awayTeam);
    
    return {
      home: homeValueBets,
      away: awayValueBets
    };
  }
  
  /**
   * Calculate value for a specific insight against match odds
   */
  private calculateValue(
    insight: BettingInsight,
    match: PrematchOdds,
    isHome: boolean,
    opponent: string
  ): ValueBet | null {
    
    let oddsData: OddsData | null = null;
    
    // Route to appropriate market handler
    switch (insight.market) {
      case BettingMarket.CORNERS:
        oddsData = this.extractCornersOdds(match, insight, isHome);
        break;
      case BettingMarket.CARDS:
        oddsData = this.extractCardsOdds(match, insight, isHome);
        break;
      case BettingMarket.BOTH_TEAMS_TO_SCORE:
        oddsData = this.extractBttsOdds(match, insight);
        break;
      case BettingMarket.GOALS:
        oddsData = this.extractGoalsOdds(match, insight);
        break;
      default:
        return null;
    }
    
    if (!oddsData || !oddsData.odds) {
      return null;
    }
    
    // Calculate value metrics
    const valueMetrics = this.calculateValueMetrics(
      insight.hitRate / 100,
      oddsData.odds
    );
    
    return {
      insight,
      matchInfo: {
        eventId: match.event_id,
        opponent,
        kickoffTime: match.kickoff_time,
        isHome
      },
      oddsData,
      valueMetrics,
      recommendation: this.getRecommendation(valueMetrics.expectedValue)
    };
  }
  
  /**
   * Extract corners odds for a specific insight
   */
  private extractCornersOdds(
    match: PrematchOdds,
    insight: BettingInsight,
    isHome: boolean
  ): OddsData | null {
    if (!match.corners_odds) return null;
    
    const threshold = insight.threshold;
    const comparison = insight.comparison;
    const teamPrefix = isHome ? 'home' : 'away';
    
    // Build the key based on threshold and comparison
    // e.g., "homeOver45" for Over 4.5 home corners
    const lineKey = threshold.toString().replace('.', '');
    const oddsKey = comparison === Comparison.OVER 
      ? `${teamPrefix}Over${lineKey}` 
      : `${teamPrefix}Under${lineKey}`;
    
    // Find best odds across all bookmakers
    const bestOdds = match.corners_odds.bestOdds?.[oddsKey];
    
    if (!bestOdds) {
      // Fallback: check individual bookmakers
      const bookmakers = ['bet365', 'pinnacle', 'williamhill'];
      let highestOdds = 0;
      let bestBookmaker = '';
      
      for (const bookmaker of bookmakers) {
        const bookOdds = match.corners_odds[bookmaker]?.[oddsKey];
        if (bookOdds && bookOdds > highestOdds) {
          highestOdds = bookOdds;
          bestBookmaker = bookmaker;
        }
      }
      
      if (highestOdds > 0) {
        return {
          bookmaker: bestBookmaker,
          odds: highestOdds,
          line: threshold
        };
      }
      
      return null;
    }
    
    return {
      bookmaker: bestOdds.bookmaker,
      odds: bestOdds.odds,
      line: threshold
    };
  }
  
  /**
   * Extract cards odds for a specific insight
   */
  private extractCardsOdds(
    match: PrematchOdds,
    insight: BettingInsight,
    isHome: boolean
  ): OddsData | null {
    if (!match.cards_odds) return null;
    
    const threshold = insight.threshold;
    const comparison = insight.comparison;
    const teamPrefix = isHome ? 'home' : 'away';
    
    const lineKey = threshold.toString().replace('.', '');
    const oddsKey = comparison === Comparison.OVER 
      ? `${teamPrefix}Over${lineKey}` 
      : `${teamPrefix}Under${lineKey}`;
    
    // Find best odds
    const bestOdds = match.cards_odds.bestOdds?.[oddsKey];
    
    if (!bestOdds) {
      const bookmakers = ['bet365', 'pinnacle', 'williamhill'];
      let highestOdds = 0;
      let bestBookmaker = '';
      
      for (const bookmaker of bookmakers) {
        const bookOdds = match.cards_odds[bookmaker]?.[oddsKey];
        if (bookOdds && bookOdds > highestOdds) {
          highestOdds = bookOdds;
          bestBookmaker = bookmaker;
        }
      }
      
      if (highestOdds > 0) {
        return {
          bookmaker: bestBookmaker,
          odds: highestOdds,
          line: threshold
        };
      }
      
      return null;
    }
    
    return {
      bookmaker: bestOdds.bookmaker,
      odds: bestOdds.odds,
      line: threshold
    };
  }
  
  /**
   * Extract BTTS odds
   */
  private extractBttsOdds(
    match: PrematchOdds,
    insight: BettingInsight
  ): OddsData | null {
    if (!match.btts_odds) return null;
    
    const isYes = insight.outcome.toLowerCase().includes('yes');
    const oddsKey = isYes ? 'yes' : 'no';
    
    // Find best odds
    const bestOdds = match.btts_odds.bestOdds?.[oddsKey];
    
    if (!bestOdds) {
      const bookmakers = ['bet365', 'pinnacle', 'williamhill'];
      let highestOdds = 0;
      let bestBookmaker = '';
      
      for (const bookmaker of bookmakers) {
        const bookOdds = match.btts_odds[bookmaker]?.[oddsKey];
        if (bookOdds && bookOdds > highestOdds) {
          highestOdds = bookOdds;
          bestBookmaker = bookmaker;
        }
      }
      
      if (highestOdds > 0) {
        return {
          bookmaker: bestBookmaker,
          odds: highestOdds,
          line: 0.5 // Binary market
        };
      }
      
      return null;
    }
    
    return {
      bookmaker: bestOdds.bookmaker,
      odds: bestOdds.odds,
      line: 0.5
    };
  }
  
  /**
   * Extract goals odds
   */
  private extractGoalsOdds(
    match: PrematchOdds,
    insight: BettingInsight
  ): OddsData | null {
    if (!match.over_under_goals_odds) return null;
    
    const threshold = insight.threshold;
    const comparison = insight.comparison;
    const lineKey = threshold.toString().replace('.', '');
    
    const oddsKey = comparison === Comparison.OVER 
      ? `over${lineKey}` 
      : `under${lineKey}`;
    
    // Find best odds
    const bestOdds = match.over_under_goals_odds.bestOdds?.[oddsKey];
    
    if (!bestOdds) {
      const bookmakers = ['bet365', 'pinnacle', 'williamhill'];
      let highestOdds = 0;
      let bestBookmaker = '';
      
      for (const bookmaker of bookmakers) {
        const bookOdds = match.over_under_goals_odds[bookmaker]?.[oddsKey];
        if (bookOdds && bookOdds > highestOdds) {
          highestOdds = bookOdds;
          bestBookmaker = bookmaker;
        }
      }
      
      if (highestOdds > 0) {
        return {
          bookmaker: bestBookmaker,
          odds: highestOdds,
          line: threshold
        };
      }
      
      return null;
    }
    
    return {
      bookmaker: bestOdds.bookmaker,
      odds: bestOdds.odds,
      line: threshold
    };
  }
  
  /**
   * Calculate value metrics (EV, edge, Kelly stake)
   */
  private calculateValueMetrics(
    yourProbability: number,
    odds: number
  ): ValueMetrics {
    const impliedProb = 1 / odds;
    const edge = (yourProbability - impliedProb) * 100;
    
    // Expected Value: (Probability of winning × Profit) - (Probability of losing × Stake)
    const ev = ((yourProbability * (odds - 1)) - ((1 - yourProbability) * 1)) * 100;
    
    // Kelly Criterion: (bp - q) / b, where b = odds - 1, p = probability, q = 1 - p
    // Use fractional Kelly (25%) for safety
    const b = odds - 1;
    const q = 1 - yourProbability;
    const kellyFull = (b * yourProbability - q) / b;
    const kelly = Math.max(0, kellyFull * 0.25) * 100; // 25% Kelly, as percentage
    
    return {
      yourProbability: yourProbability * 100,
      impliedProbability: impliedProb * 100,
      edge: Number(edge.toFixed(2)),
      expectedValue: Number(ev.toFixed(2)),
      kellyStake: Number(kelly.toFixed(2))
    };
  }
  
  /**
   * Get recommendation based on expected value
   */
  private getRecommendation(ev: number): ValueBet['recommendation'] {
    if (ev >= 30) return 'exceptional'; // 30%+ EV
    if (ev >= 15) return 'strong';      // 15-30% EV
    if (ev >= 8) return 'good';         // 8-15% EV
    return 'marginal';                  // 5-8% EV
  }
  
  /**
   * Get historical ROI for a specific pattern
   */
  async getPatternROI(
    teamName: string,
    market: BettingMarket,
    threshold: number,
    comparison: Comparison | 'binary'
  ): Promise<{
    totalBets: number;
    wins: number;
    losses: number;
    winRate: number;
    averageOdds: number;
    totalProfit: number;
    roi: number;
  } | null> {
    
    // Get historical matches with outcomes
    const { data: outcomes, error } = await supabase
      .from('match_outcomes')
      .select(`
        *,
        prematch_odds!inner(*)
      `)
      .or(`prematch_odds.home_team.ilike.%${teamName}%,prematch_odds.away_team.ilike.%${teamName}%`)
      .order('match_date', { ascending: false })
      .limit(50);
    
    if (error || !outcomes || outcomes.length === 0) {
      return null;
    }
    
    let wins = 0;
    let losses = 0;
    let totalOdds = 0;
    let totalProfit = 0;
    
    for (const outcome of outcomes) {
      const match = (outcome as any).prematch_odds;
      const isHome = match.home_team.toLowerCase().includes(teamName.toLowerCase());
      
      // Check if bet would have won
      let betWon = false;
      let oddsValue = 0;
      
      if (market === BettingMarket.CORNERS) {
        const actualCorners = isHome ? outcome.home_corners : outcome.away_corners;
        if (actualCorners === null) continue;
        
        if (comparison === Comparison.OVER) {
          betWon = actualCorners > threshold;
        } else {
          betWon = actualCorners < threshold;
        }
        
        // Extract odds that were available
        const lineKey = threshold.toString().replace('.', '');
        const teamPrefix = isHome ? 'home' : 'away';
        const oddsKey = comparison === Comparison.OVER 
          ? `${teamPrefix}Over${lineKey}` 
          : `${teamPrefix}Under${lineKey}`;
        
        oddsValue = match.corners_odds?.bestOdds?.[oddsKey]?.odds || 0;
        
      } else if (market === BettingMarket.CARDS) {
        const actualCards = isHome ? outcome.home_cards : outcome.away_cards;
        if (actualCards === null) continue;
        
        if (comparison === Comparison.OVER) {
          betWon = actualCards > threshold;
        } else {
          betWon = actualCards < threshold;
        }
        
        const lineKey = threshold.toString().replace('.', '');
        const teamPrefix = isHome ? 'home' : 'away';
        const oddsKey = comparison === Comparison.OVER 
          ? `${teamPrefix}Over${lineKey}` 
          : `${teamPrefix}Under${lineKey}`;
        
        oddsValue = match.cards_odds?.bestOdds?.[oddsKey]?.odds || 0;
        
      } else if (market === BettingMarket.BOTH_TEAMS_TO_SCORE) {
        betWon = outcome.btts === (comparison === 'binary' && threshold === 0.5);
        oddsValue = match.btts_odds?.bestOdds?.yes?.odds || 0;
      }
      
      if (oddsValue === 0) continue; // Skip if no odds available
      
      totalOdds += oddsValue;
      
      if (betWon) {
        wins++;
        totalProfit += (oddsValue - 1); // Profit on £1 stake
      } else {
        losses++;
        totalProfit -= 1; // Lost £1 stake
      }
    }
    
    const totalBets = wins + losses;
    
    if (totalBets === 0) return null;
    
    const winRate = (wins / totalBets) * 100;
    const averageOdds = totalOdds / totalBets;
    const roi = (totalProfit / totalBets) * 100;
    
    return {
      totalBets,
      wins,
      losses,
      winRate: Number(winRate.toFixed(2)),
      averageOdds: Number(averageOdds.toFixed(2)),
      totalProfit: Number(totalProfit.toFixed(2)),
      roi: Number(roi.toFixed(2))
    };
  }
  
  /**
   * Get API usage stats
   */
  async getUsageStats(): Promise<{
    today: number;
    thisWeek: number;
    thisMonth: number;
    limit: number;
  }> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    
    const { data: todayData } = await supabase
      .from('api_usage_log')
      .select('*', { count: 'exact' })
      .gte('timestamp', today)
      .eq('cached', false);
    
    const { data: weekData } = await supabase
      .from('api_usage_log')
      .select('*', { count: 'exact' })
      .gte('timestamp', weekAgo)
      .eq('cached', false);
    
    const { data: monthData } = await supabase
      .from('api_usage_log')
      .select('*', { count: 'exact' })
      .gte('timestamp', monthStart)
      .eq('cached', false);
    
    return {
      today: todayData?.length || 0,
      thisWeek: weekData?.length || 0,
      thisMonth: monthData?.length || 0,
      limit: 2500
    };
  }
}

export const oddsIntegrationService = new OddsIntegrationService();
