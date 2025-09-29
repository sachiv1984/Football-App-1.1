// src/services/api/oddsAPIService.ts

import { normalizeTeamName } from '../../utils/teamUtils';

interface MatchOdds {
  matchId: string;
  // Goals markets
  totalGoalsOdds?: {
    market: string; // e.g., 'Over/Under 2.5'
    overOdds: number;
    underOdds: number;
  };
  bttsOdds?: {
    market: string; // e.g., 'Both Teams To Score'
    yesOdds: number;
    noOdds: number;
  };
  // 🆕 Cards markets
  totalCardsOdds?: {
    market: string; // e.g., 'Over/Under 4.5 Cards'
    overOdds: number;
    underOdds: number;
  };
  homeCardsOdds?: {
    market: string; // e.g., 'Home Team Over/Under 2.5 Cards'
    overOdds: number;
    underOdds: number;
  };
  awayCardsOdds?: {
    market: string; // e.g., 'Away Team Over/Under 2.5 Cards'
    overOdds: number;
    underOdds: number;
  };
  mostCardsOdds?: {
    market: string; // e.g., 'Most Cards'
    homeOdds: number;
    awayOdds: number;
    drawOdds: number;
  };
  lastFetched: number;
}

// --- KEEP EXISTING INTERFACES ---

interface OddsOutcome {
    name: string;
    price: number;
    point?: number; // For totals markets (e.g., 4.5 cards)
}

interface OddsMarket {
    key: string;
    outcomes: OddsOutcome[];
}

interface OddsBookmaker {
    key: string;
    markets: OddsMarket[];
}

interface APIMatchData {
    id: string;
    sport_key: string;
    home_team: string;
    away_team: string;
    bookmakers: OddsBookmaker[];
}

// -------------------------------------------

// 🔑 Access the GitHub Secret via environment variable
const API_KEY = process.env.ODDS_API_KEY; 
// 🌐 Replace with your actual odds API base URL
const BASE_URL = 'https://api.the-odds-api.com/v4'; 
// ⏱️ Cache for 10 minutes (600,000 ms) to avoid redundant calls
const CACHE_TIMEOUT = 10 * 60 * 1000; 
// 🎯 Specify the bookmaker key you want to use for consistency
const BOOKMAKER_KEY = 'draftkings'; 
// NOTE: Replace 'soccer_epl' with your specific sport key if needed
const SPORT_KEY = 'soccer_epl'; 

export class OddsAPIService {
  private oddsCache: Map<string, MatchOdds> = new Map();

  constructor() {
    if (!API_KEY) {
      console.warn("ODDS_API_KEY is not set. Odds functionality will be mocked or disabled.");
    }
  }

  // Use normalization for match ID consistency
  private generateMatchId(home: string, away: string): string {
    const normalizedHome = normalizeTeamName(home);
    const normalizedAway = normalizeTeamName(away);
    return `${normalizedHome.toLowerCase().replace(/\s+/g, '')}_vs_${normalizedAway.toLowerCase().replace(/\s+/g, '')}`;
  }

  /**
   * 1. The Cache-First Strategy (Efficiency Focus)
   */
  public async getOddsForMatch(homeTeam: string, awayTeam: string): Promise<MatchOdds | null> {
    const matchId = this.generateMatchId(homeTeam, awayTeam);
    const cachedOdds = this.oddsCache.get(matchId);

    // 💰 EFFICIENT STEP 1: Check Cache
    if (cachedOdds && (Date.now() - cachedOdds.lastFetched < CACHE_TIMEOUT)) {
      console.log(`[OddsAPI] ✅ Cache hit for ${matchId}. Returning cached data.`);
      return cachedOdds;
    }

    // 🛑 If API key is missing, return null or stale cache
    if (!API_KEY) {
      return cachedOdds || null;
    }

    // 🌐 EFFICIENT STEP 2: Fetch and Update
    try {
      const odds = await this.fetchOddsFromAPI(matchId);
      if (odds) {
        const newOdds: MatchOdds = { ...odds, matchId, lastFetched: Date.now() };
        this.oddsCache.set(matchId, newOdds);
        console.log(`[OddsAPI] 📈 Cache updated for ${matchId}. Call used.`);
        return newOdds;
      }
      return null;
    } catch (error) {
      console.error(`[OddsAPI] ❌ Failed to fetch odds for ${matchId}:`, error);
      if (cachedOdds) {
         console.log(`[OddsAPI] Returning STALE cache data due to error (API call saved).`);
      }
      return cachedOdds || null;
    }
  }
  
  // --- TEAM MATCHING HELPER METHODS ---

  /**
   * Enhanced team matching using normalization and partial checks.
   */
  private findMatchData(data: APIMatchData[], homeTeam: string, awayTeam: string): APIMatchData | undefined {
    const normalizedHome = normalizeTeamName(homeTeam);
    const normalizedAway = normalizeTeamName(awayTeam);

    console.log(`[OddsAPI] Looking for match: ${normalizedHome} vs ${normalizedAway}`);
    
    return data.find((match: APIMatchData) => {
      const apiHome = normalizeTeamName(match.home_team);
      const apiAway = normalizeTeamName(match.away_team);
      
      // 1. Direct match (most reliable)
      const directMatch = (apiHome === normalizedHome && apiAway === normalizedAway) ||
                         (apiHome === normalizedAway && apiAway === normalizedHome);
      
      if (directMatch) {
        console.log(`[OddsAPI] ✅ Direct match found: ${match.home_team} vs ${match.away_team}`);
        return true;
      }
      
      // 2. Partial matching for edge cases
      const homeMatches = this.isTeamNameMatch(apiHome, normalizedHome) || 
                         this.isTeamNameMatch(apiAway, normalizedHome);
      const awayMatches = this.isTeamNameMatch(apiHome, normalizedAway) || 
                         this.isTeamNameMatch(apiAway, normalizedAway);
      
      if (homeMatches && awayMatches) {
        console.log(`[OddsAPI] ✅ Partial match found: ${match.home_team} vs ${match.away_team}`);
        return true;
      }
      
      return false;
    });
  }

  /**
   * Additional matching logic for edge cases.
   */
  private isTeamNameMatch(apiName: string, targetName: string): boolean {
    const cleanApiName = this.cleanTeamName(apiName);
    const cleanTargetName = this.cleanTeamName(targetName);
    
    if (cleanApiName === cleanTargetName) return true;
    
    return cleanApiName.includes(cleanTargetName) || cleanTargetName.includes(cleanApiName);
  }

  /**
   * Cleans the team name for partial matching checks.
   */
  private cleanTeamName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(fc|afc|united|city|town|rovers|wanderers|athletic|hotspur|albion)\b/g, '')
      .replace(/[&\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // --- ODDS EXTRACTION METHODS ---

  /**
   * Extracts Total Goals (Over/Under 2.5) odds from a bookmaker.
   */
  private extractTotalGoalsOdds(bookmaker: OddsBookmaker): MatchOdds['totalGoalsOdds'] | undefined {
    const totalsMarket = bookmaker.markets.find((m: OddsMarket) => m.key === 'totals');
    if (!totalsMarket) return undefined;

    const over25 = totalsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Over' && o.point === 2.5
    );
    const under25 = totalsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Under' && o.point === 2.5
    );

    if (over25 && under25) {
        return {
            market: 'Over/Under 2.5 Goals',
            overOdds: over25.price,
            underOdds: under25.price,
        };
    }
    return undefined;
  }

  /**
   * Extracts Both Teams to Score (BTTS) odds from a bookmaker.
   */
  private extractBttsOdds(bookmaker: OddsBookmaker): MatchOdds['bttsOdds'] | undefined {
    const bttsMarket = bookmaker.markets.find((m: OddsMarket) => m.key === 'btts');
    if (!bttsMarket) return undefined;

    const bttsYes = bttsMarket.outcomes.find((o: OddsOutcome) => o.name === 'Yes');
    const bttsNo = bttsMarket.outcomes.find((o: OddsOutcome) => o.name === 'No');

    if (bttsYes && bttsNo) {
        return {
            market: 'Both Teams To Score',
            yesOdds: bttsYes.price,
            noOdds: bttsNo.price,
        };
    }
    return undefined;
  }

  /**
   * 🆕 Extracts Total Cards (Over/Under 4.5) odds from a bookmaker.
   */
  private extractTotalCardsOdds(bookmaker: OddsBookmaker): MatchOdds['totalCardsOdds'] | undefined {
    // Look for the player props market that typically contains cards
    const cardsMarket = bookmaker.markets.find((m: OddsMarket) => 
      m.key === 'player_cards' || m.key === 'total_cards' || m.key === 'booking_points'
    );
    
    if (!cardsMarket) return undefined;

    // Try to find Over/Under 4.5 cards (most common threshold)
    const over45 = cardsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Over' && (o.point === 4.5 || o.point === 45) // Some APIs use booking points (10 per yellow)
    );
    const under45 = cardsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Under' && (o.point === 4.5 || o.point === 45)
    );

    if (over45 && under45) {
        return {
            market: 'Over/Under 4.5 Cards',
            overOdds: over45.price,
            underOdds: under45.price,
        };
    }
    return undefined;
  }

  /**
   * 🆕 Extracts Home Team Cards odds from a bookmaker.
   */
  private extractHomeCardsOdds(bookmaker: OddsBookmaker): MatchOdds['homeCardsOdds'] | undefined {
    const homeCardsMarket = bookmaker.markets.find((m: OddsMarket) => 
      m.key === 'home_team_cards' || m.key === 'home_booking_points'
    );
    
    if (!homeCardsMarket) return undefined;

    const over25 = homeCardsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Over' && (o.point === 2.5 || o.point === 25)
    );
    const under25 = homeCardsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Under' && (o.point === 2.5 || o.point === 25)
    );

    if (over25 && under25) {
        return {
            market: 'Home Team Over/Under 2.5 Cards',
            overOdds: over25.price,
            underOdds: under25.price,
        };
    }
    return undefined;
  }

  /**
   * 🆕 Extracts Away Team Cards odds from a bookmaker.
   */
  private extractAwayCardsOdds(bookmaker: OddsBookmaker): MatchOdds['awayCardsOdds'] | undefined {
    const awayCardsMarket = bookmaker.markets.find((m: OddsMarket) => 
      m.key === 'away_team_cards' || m.key === 'away_booking_points'
    );
    
    if (!awayCardsMarket) return undefined;

    const over25 = awayCardsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Over' && (o.point === 2.5 || o.point === 25)
    );
    const under25 = awayCardsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Under' && (o.point === 2.5 || o.point === 25)
    );

    if (over25 && under25) {
        return {
            market: 'Away Team Over/Under 2.5 Cards',
            overOdds: over25.price,
            underOdds: under25.price,
        };
    }
    return undefined;
  }

  /**
   * 🆕 Extracts Most Cards (Home/Away/Draw) odds from a bookmaker.
   */
  private extractMostCardsOdds(bookmaker: OddsBookmaker): MatchOdds['mostCardsOdds'] | undefined {
    const mostCardsMarket = bookmaker.markets.find((m: OddsMarket) => 
      m.key === 'most_cards' || m.key === 'team_to_receive_most_cards'
    );
    
    if (!mostCardsMarket) return undefined;

    const homeOdds = mostCardsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Home' || o.name.includes('Home')
    );
    const awayOdds = mostCardsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Away' || o.name.includes('Away')
    );
    const drawOdds = mostCardsMarket.outcomes.find((o: OddsOutcome) => 
      o.name === 'Draw' || o.name === 'Neither' || o.name === 'Equal'
    );

    if (homeOdds && awayOdds && drawOdds) {
        return {
            market: 'Most Cards',
            homeOdds: homeOdds.price,
            awayOdds: awayOdds.price,
            drawOdds: drawOdds.price,
        };
    }
    return undefined;
  }
  
  /**
   * Helper function to extract all odds from a bookmaker.
   */
  private extractOddsFromBookmaker(bookmaker: OddsBookmaker): Omit<MatchOdds, 'matchId' | 'lastFetched'> {
    return {
      // Goals markets
      totalGoalsOdds: this.extractTotalGoalsOdds(bookmaker),
      bttsOdds: this.extractBttsOdds(bookmaker),
      // 🆕 Cards markets
      totalCardsOdds: this.extractTotalCardsOdds(bookmaker),
      homeCardsOdds: this.extractHomeCardsOdds(bookmaker),
      awayCardsOdds: this.extractAwayCardsOdds(bookmaker),
      mostCardsOdds: this.extractMostCardsOdds(bookmaker),
    };
  }

  /**
   * 2. Actual API Call Logic - UPDATED with cards markets
   */
  private async fetchOddsFromAPI(matchId: string): Promise<Omit<MatchOdds, 'matchId' | 'lastFetched'> | null> {
    const parts = matchId.split('_vs_');
    if (parts.length !== 2) {
      console.error(`[OddsAPI] Invalid matchId format: ${matchId}`);
      return null;
    }

    const homeTeam = parts[0]; 
    const awayTeam = parts[1];

    // 🆕 Request both goals and cards markets
    const url = `${BASE_URL}/odds?apiKey=${API_KEY}&sport=${SPORT_KEY}&regions=uk&markets=totals,btts,player_cards,total_cards,booking_points,home_team_cards,away_team_cards,most_cards&oddsFormat=decimal`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Odds API failed: ${response.status} - ${response.statusText}`);
    }
    
    const data: APIMatchData[] = await response.json();
    
    const matchData = this.findMatchData(data, homeTeam, awayTeam);
    
    if (!matchData) {
        console.log(`[OddsAPI] Match data not found for ${homeTeam} vs ${awayTeam}`);
        console.log(`[OddsAPI] Available matches:`, data.map(m => `${m.home_team} vs ${m.away_team}`));
        return null;
    }

    // Extract odds from the specific bookmaker
    const bookmaker = matchData.bookmakers.find((b) => b.key === BOOKMAKER_KEY);
    
    if (!bookmaker) {
        console.warn(`[OddsAPI] Bookmaker '${BOOKMAKER_KEY}' not found for this match. Attempting fallback...`);
        const fallbackBookmaker = matchData.bookmakers[0];
        if (fallbackBookmaker) {
          console.log(`[OddsAPI] Using fallback bookmaker: ${fallbackBookmaker.key}`);
          return this.extractOddsFromBookmaker(fallbackBookmaker);
        }
        return null;
    }

    return this.extractOddsFromBookmaker(bookmaker);
  }

  /**
   * 🆕 Public method to clear cache (useful for testing)
   */
  public clearCache(): void {
    this.oddsCache.clear();
    console.log('[OddsAPI] Cache cleared');
  }

  /**
   * 🆕 Public method to get cache status (useful for debugging)
   */
  public getCacheStatus() {
    return {
      size: this.oddsCache.size,
      matches: Array.from(this.oddsCache.keys()),
      entries: Array.from(this.oddsCache.entries()).map(([id, odds]) => ({
        matchId: id,
        hasGoalsOdds: !!odds.totalGoalsOdds,
        hasBttsOdds: !!odds.bttsOdds,
        hasCardsOdds: !!odds.totalCardsOdds,
        hasMostCardsOdds: !!odds.mostCardsOdds,
        age: Date.now() - odds.lastFetched
      }))
    };
  }
}

export const oddsAPIService = new OddsAPIService();