// src/services/stats/supabaseCardsService.ts
import { supabase } from '../supabaseClient';
import { normalizeTeamName } from '../../utils/teamUtils';

export interface SupabaseCardData {
  id: string;
  team_name: string;
  opponent: string;
  team_yellow_cards: number;
  team_red_cards: number;
  team_second_yellow_cards: number;
  opp_yellow_cards: number;
  opp_red_cards: number;
  opp_second_yellow_cards: number;
  match_date?: string;
  matchweek?: number;
  venue?: 'home' | 'away' | 'Home' | 'Away'; // Updated type to reflect reality
}

export interface DetailedCardStats {
  cardsShown: number;        // Cards this team received
  cardsAgainst: number;      // Cards opponents received
  matches: number;
  matchDetails: Array<{
    opponent: string;
    totalCards: number;      // cardsShown + cardsAgainst for this match
    cardsFor: number;        // Cards this team received
    cardsAgainst: number;    // Cards opponent received
    date?: string;
    matchweek?: number;
    isHome?: boolean;        // NEW: Track if match was at home
  }>;
}

export class SupabaseCardsService {
  private cardsCache: Map<string, DetailedCardStats> = new Map();
  private cardsCacheTime = 0;
  private readonly cardsCacheTimeout = 30 * 60 * 1000; // 30 minutes cache

  private isCacheValid(): boolean {
    return this.cardsCache.size > 0 && Date.now() - this.cardsCacheTime < this.cardsCacheTimeout;
  }

  public clearCache(): void {
    this.cardsCache.clear();
    this.cardsCacheTime = 0;
    console.log('[SupabaseCards] Cache cleared');
  }

  /**
   * Calculate cards using your formula:
   * Cards = yellow_cards + red_cards - second_yellow_cards
   */
  private calculateCards(yellow: number, red: number, secondYellow: number): number {
    const total = (yellow || 0) + (red || 0) - (secondYellow || 0);
    return Math.max(0, total); // Ensure non-negative
  }

  /**
   * Fetch card data for all teams from Supabase
   */
  private async fetchCardDataFromSupabase(): Promise<SupabaseCardData[]> {
    console.log('[SupabaseCards] 🔄 Fetching card data from Supabase...');
    
    try {
      const { data, error } = await supabase
        .from('team_misc_stats')
        .select(`
          id,
          team_name,
          opponent,
          team_yellow_cards,
          team_red_cards,
          team_second_yellow_cards,
          opp_yellow_cards,
          opp_red_cards,
          opp_second_yellow_cards,
          match_date,
          matchweek,
          venue
        `)
        .order('team_name')
        .order('match_date');

      if (error) {
        console.error('[SupabaseCards] ❌ Supabase fetch error:', {
          error,
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Supabase Error (${error.code}): ${error.message}`);
      }

      if (!data || data.length === 0) {
        console.warn('[SupabaseCards] ⚠️ No card data found in database');
        return [];
      }

      console.log('[SupabaseCards] ✅ Fetched card data:', {
        totalRecords: data.length,
        uniqueTeams: new Set(data.map(d => d.team_name)).size
      });

      // Log sample data for debugging
      console.log('[SupabaseCards] 📊 Sample card data:', data.slice(0, 2));

      return data.map(row => ({
        id: row.id,
        team_name: normalizeTeamName(row.team_name),
        opponent: normalizeTeamName(row.opponent),
        team_yellow_cards: row.team_yellow_cards || 0,
        team_red_cards: row.team_red_cards || 0,
        team_second_yellow_cards: row.team_second_yellow_cards || 0,
        opp_yellow_cards: row.opp_yellow_cards || 0,
        opp_red_cards: row.opp_red_cards || 0,
        opp_second_yellow_cards: row.opp_second_yellow_cards || 0,
        match_date: row.match_date,
        matchweek: row.matchweek,
        venue: row.venue
      }));

    } catch (err) {
      console.error('[SupabaseCards] 💥 Error fetching card data:', err);
      throw err;
    }
  }

  /**
   * Process raw card data into structured team stats
   */
  private processCardData(rawData: SupabaseCardData[]): Map<string, DetailedCardStats> {
    const teamStats = new Map<string, DetailedCardStats>();

    // Group data by team
    const teamGroups = new Map<string, SupabaseCardData[]>();
    rawData.forEach(row => {
      const teamName = row.team_name;
      if (!teamGroups.has(teamName)) {
        teamGroups.set(teamName, []);
      }
      teamGroups.get(teamName)!.push(row);
    });

    // Process each team's data
    teamGroups.forEach((matches, teamName) => {
      // Sort matches by date (most recent first for consistency)
      matches.sort((a, b) => {
        if (!a.match_date || !b.match_date) return 0;
        return new Date(b.match_date).getTime() - new Date(a.match_date).getTime();
      });

      // Calculate totals using your formula
      const totalCardsShown = matches.reduce((sum, match) => {
        const matchCards = this.calculateCards(
          match.team_yellow_cards,
          match.team_red_cards,
          match.team_second_yellow_cards
        );
        return sum + matchCards;
      }, 0);

      const totalCardsAgainst = matches.reduce((sum, match) => {
        const matchCards = this.calculateCards(
          match.opp_yellow_cards,
          match.opp_red_cards,
          match.opp_second_yellow_cards
        );
        return sum + matchCards;
      }, 0);

      // Create detailed match data with isHome field
      const matchDetails = matches.map(match => {
        const teamCards = this.calculateCards(
          match.team_yellow_cards,
          match.team_red_cards,
          match.team_second_yellow_cards
        );
        const oppCards = this.calculateCards(
          match.opp_yellow_cards,
          match.opp_red_cards,
          match.opp_second_yellow_cards
        );

        // FIX: Convert raw venue to lowercase for reliable comparison
        const venueLower = match.venue?.toLowerCase();

        return {
          opponent: match.opponent,
          totalCards: teamCards + oppCards,
          cardsFor: teamCards,
          cardsAgainst: oppCards,
          date: match.match_date,
          matchweek: match.matchweek,
          isHome: venueLower === 'home' // ✅ FIXED: Case-insensitive check
        };
      });

      teamStats.set(teamName, {
        cardsShown: totalCardsShown,
        cardsAgainst: totalCardsAgainst,
        matches: matches.length,
        matchDetails
      });

      console.log(`[SupabaseCards] ${teamName}: ${totalCardsShown} cards shown, ${totalCardsAgainst} against (${matches.length} matches)`);
      
      // Debug: show card calculation for first match
      if (matches.length > 0) {
        const firstMatch = matches[0];
        const teamCards = this.calculateCards(
          firstMatch.team_yellow_cards,
          firstMatch.team_red_cards,
          firstMatch.team_second_yellow_cards
        );
        console.log(`[SupabaseCards] ${teamName} vs ${firstMatch.opponent} (${firstMatch.venue}): Y:${firstMatch.team_yellow_cards} R:${firstMatch.team_red_cards} 2Y:${firstMatch.team_second_yellow_cards} = ${teamCards} cards`);
      }
    });

    return teamStats;
  }

  /**
   * Get card statistics for all teams (main method)
   */
  async getCardStatistics(): Promise<Map<string, DetailedCardStats>> {
    if (this.isCacheValid()) {
      console.log('[SupabaseCards] Using cached card statistics');
      return this.cardsCache;
    }

    try {
      console.log('[SupabaseCards] Refreshing card statistics from Supabase...');
      
      const rawData = await this.fetchCardDataFromSupabase();
      const processedStats = this.processCardData(rawData);

      // Update cache
      this.cardsCache = processedStats;
      this.cardsCacheTime = Date.now();

      console.log(`[SupabaseCards] Card statistics cached for ${this.cardsCache.size} teams`);
      return this.cardsCache;

    } catch (error) {
      console.error('[SupabaseCards] Error fetching card statistics:', error);
      
      // Return existing cache if available, even if stale
      if (this.cardsCache.size > 0) {
        console.warn('[SupabaseCards] Returning stale cache data due to error');
        return this.cardsCache;
      }
      
      throw error;
    }
  }

  /**
   * Get card statistics for a specific team
   */
  async getTeamCardStats(teamName: string): Promise<DetailedCardStats | null> {
    const allStats = await this.getCardStatistics();
    return allStats.get(normalizeTeamName(teamName)) || null;
  }

  /**
   * Get card data for two specific teams (for match stats)
   */
  async getMatchCardStats(homeTeam: string, awayTeam: string): Promise<{
    homeStats: DetailedCardStats | null;
    awayStats: DetailedCardStats | null;
  }> {
    const allStats = await this.getCardStatistics();
    
    return {
      homeStats: allStats.get(normalizeTeamName(homeTeam)) || null,
      awayStats: allStats.get(normalizeTeamName(awayTeam)) || null
    };
  }

  /**
   * Calculate percentage of matches over a certain card threshold
   */
  calculateOverPercentage(matchDetails: Array<{cardsFor: number}>, threshold: number): number {
    if (matchDetails.length === 0) return 0;
    
    const gamesOver = matchDetails.filter(match => match.cardsFor > threshold).length;
    const percentage = (gamesOver / matchDetails.length) * 100;
    
    return Math.round(percentage * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate average cards per game
   */
  calculateAverage(total: number, matches: number): number {
    if (matches === 0) return 0;
    return Math.round((total / matches) * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get comprehensive team card breakdown
   */
  async getTeamCardBreakdown(teamName: string): Promise<{
    averages: {
      cardsShown: number;
      cardsAgainst: number;
      totalCards: number;
    };
    percentages: {
      over05TeamCards: number;   // Over 0.5 team cards
      over15TeamCards: number;   // Over 1.5 team cards  
      over25TeamCards: number;   // Over 2.5 team cards
      over35TeamCards: number;   // Over 3.5 team cards
    };
    matchCount: number;
    recentMatches: Array<{
      opponent: string;
      totalCards: number;
      cardsFor: number;
      cardsAgainst: number;
      date?: string;
      isHome?: boolean;
    }>;
  } | null> {
    const cardData = await this.getTeamCardStats(teamName);
    
    if (!cardData) return null;

    return {
      averages: {
        cardsShown: this.calculateAverage(cardData.cardsShown, cardData.matches),
        cardsAgainst: this.calculateAverage(cardData.cardsAgainst, cardData.matches),
        totalCards: this.calculateAverage(cardData.cardsShown + cardData.cardsAgainst, cardData.matches)
      },
      percentages: {
        over05TeamCards: this.calculateOverPercentage(cardData.matchDetails, 0.5),
        over15TeamCards: this.calculateOverPercentage(cardData.matchDetails, 1.5),
        over25TeamCards: this.calculateOverPercentage(cardData.matchDetails, 2.5),
        over35TeamCards: this.calculateOverPercentage(cardData.matchDetails, 3.5),
      },
      matchCount: cardData.matches,
      recentMatches: cardData.matchDetails.slice(0, 5) // Last 5 matches
    };
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus() {
    const sampleTeams = Array.from(this.cardsCache.entries()).slice(0, 3);
    
    return {
      size: this.cardsCache.size,
      isValid: this.isCacheValid(),
      cacheTime: this.cardsCacheTime,
      lastUpdate: this.cardsCacheTime ? new Date(this.cardsCacheTime).toISOString() : null,
      teams: Array.from(this.cardsCache.keys()),
      sampleData: sampleTeams.map(([team, data]) => ({
        team,
        matches: data.matches,
        avgCardsShown: this.calculateAverage(data.cardsShown, data.matches),
        avgCardsAgainst: this.calculateAverage(data.cardsAgainst, data.matches),
        over05Percentage: this.calculateOverPercentage(data.matchDetails, 0.5)
      }))
    };
  }

  /**
   * Manual refresh for debugging/testing
   */
  async refresh(): Promise<void> {
    this.clearCache();
    await this.getCardStatistics();
  }
}

export const supabaseCardsService = new SupabaseCardsService();
