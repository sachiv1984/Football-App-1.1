// src/services/api/oddsAPIService.ts

import { normalizeTeamName } from '../../utils/teamUtils'; // 🎯 NEW IMPORT

interface MatchOdds {
  matchId: string;
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
  lastFetched: number;
}

// --- KEEP EXISTING INTERFACES ---

interface OddsOutcome {
    name: string;
    price: number;
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
    // Include any other top-level fields you might use
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

  // 🎯 UPDATED: Use normalization for match ID consistency
  private generateMatchId(home: string, away: string): string {
    // Use normalized names for consistent match IDs
    const normalizedHome = normalizeTeamName(home);
    const normalizedAway = normalizeTeamName(away);
    return `${normalizedHome.toLowerCase().replace(/\s+/g, '')}_vs_${normalizedAway.toLowerCase().replace(/\s+/g, '')}`;
  }

  /**
   * 1. The Cache-First Strategy (Efficiency Focus) - UNCHANGED
   */
  public async getOddsForMatch(homeTeam: string, awayTeam: string): Promise<MatchOdds | null> {
    const matchId = this.generateMatchId(homeTeam, awayTeam);
    const cachedOdds = this.oddsCache.get(matchId);

    // 💰 EFFICIENT STEP 1: Check Cache (prevents API call 99% of the time for the same match)
    if (cachedOdds && (Date.now() - cachedOdds.lastFetched < CACHE_TIMEOUT)) {
      console.log(`[OddsAPI] ✅ Cache hit for ${matchId}. Returning cached data.`);
      return cachedOdds;
    }

    // 🛑 If API key is missing, we can't fetch. Return null or stale cache if it exists.
    if (!API_KEY) {
      return cachedOdds || null;
    }

    // 🌐 EFFICIENT STEP 2: Fetch and Update
    try {
      const odds = await this.fetchOddsFromAPI(matchId);
      if (odds) {
        // Only cache successful fetch
        const newOdds: MatchOdds = { ...odds, matchId, lastFetched: Date.now() };
        this.oddsCache.set(matchId, newOdds);
        console.log(`[OddsAPI] 📈 Cache updated for ${matchId}. Call used.`);
        return newOdds;
      }
      return null;
    } catch (error) {
      console.error(`[OddsAPI] ❌ Failed to fetch odds for ${matchId}:`, error);
      // EFFICIENT STEP 3: Fallback to stale cache on fetch error to save the API call limit
      if (cachedOdds) {
         console.log(`[OddsAPI] Returning STALE cache data due to error (API call saved).`);
      }
      return cachedOdds || null;
    }
  }
  
  // --- NEW/UPDATED HELPER METHODS FOR TEAM MATCHING ---

  /**
   * 🎯 NEW: Enhanced team matching using normalization and partial checks.
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
      
      // 2. Partial matching for edge cases (less reliable, but a good fallback)
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
   * 🎯 NEW: Additional matching logic for edge cases not covered by normalization.
   */
  private isTeamNameMatch(apiName: string, targetName: string): boolean {
    // Remove common suffixes and prefixes
    const cleanApiName = this.cleanTeamName(apiName);
    const cleanTargetName = this.cleanTeamName(targetName);
    
    // Exact match after cleaning
    if (cleanApiName === cleanTargetName) return true;
    
    // Check if one name contains the other (for cases like "Brighton" vs "Brighton & Hove Albion")
    return cleanApiName.includes(cleanTargetName) || cleanTargetName.includes(cleanApiName);
  }

  /**
   * 🎯 NEW: Cleans the team name for partial matching checks.
   */
  private cleanTeamName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(fc|afc|united|city|town|rovers|wanderers|athletic|hotspur|albion)\b/g, '')
      .replace(/[&\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // --- EXISTING PARSING HELPER METHODS (MOVED FROM PREVIOUS MERGE) ---

  /**
   * Extracts Total Goals (Over/Under 2.5) odds from a bookmaker.
   */
  private extractTotalGoalsOdds(bookmaker: OddsBookmaker): MatchOdds['totalGoalsOdds'] | undefined {
    // Find the 'totals' market
    const totalsMarket = bookmaker.markets.find((m: OddsMarket) => m.key === 'totals');
    if (!totalsMarket) return undefined;

    // Find Over 2.5 and Under 2.5 prices
    const over25Price = totalsMarket.outcomes.find((o: OddsOutcome) => o.name === 'Over 2.5')?.price;
    const under25Price = totalsMarket.outcomes.find((o: OddsOutcome) => o.name === 'Under 2.5')?.price;

    if (over25Price && under25Price) {
        return {
            market: 'Over/Under 2.5',
            overOdds: over25Price,
            underOdds: under25Price,
        };
    }
    return undefined;
  }

  /**
   * Extracts Both Teams to Score (BTTS) odds from a bookmaker.
   */
  private extractBttsOdds(bookmaker: OddsBookmaker): MatchOdds['bttsOdds'] | undefined {
    // Find the 'btts' market
    const bttsMarket = bookmaker.markets.find((m: OddsMarket) => m.key === 'btts');
    if (!bttsMarket) return undefined;

    // Find Yes and No prices
    const bttsYesPrice = bttsMarket.outcomes.find((o: OddsOutcome) => o.name === 'Yes')?.price;
    const bttsNoPrice = bttsMarket.outcomes.find((o: OddsOutcome) => o.name === 'No')?.price;

    if (bttsYesPrice && bttsNoPrice) {
        return {
            market: 'Both Teams To Score',
            yesOdds: bttsYesPrice,
            noOdds: bttsNoPrice,
        };
    }
    return undefined;
  }
  
  /**
   * 🎯 NEW: Helper function to extract odds from a bookmaker (replaces the duplicated logic in fetchOddsFromAPI).
   */
  private extractOddsFromBookmaker(bookmaker: OddsBookmaker): Omit<MatchOdds, 'matchId' | 'lastFetched'> {
    // Re-use the existing extraction logic
    const totalGoalsOdds = this.extractTotalGoalsOdds(bookmaker);
    const bttsOdds = this.extractBttsOdds(bookmaker);

    return {
      totalGoalsOdds,
      bttsOdds,
    };
  }

  /**
   * 2. Actual API Call Logic - UPDATED with improved matching and fallback
   */
  private async fetchOddsFromAPI(matchId: string): Promise<Omit<MatchOdds, 'matchId' | 'lastFetched'> | null> {
    const parts = matchId.split('_vs_');
    if (parts.length !== 2) {
      console.error(`[OddsAPI] Invalid matchId format: ${matchId}`);
      return null;
    }

    // Reconstruct approximate team names from normalized match ID (for logging/matching)
    // NOTE: This camelCase reconstruction is an imperfect guess, the full team name is better for logging
    const homeTeam = parts[0]; 
    const awayTeam = parts[1];

    const url = `${BASE_URL}/odds?apiKey=${API_KEY}&sport=${SPORT_KEY}&regions=uk&markets=totals,btts&oddsFormat=decimal`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Odds API failed: ${response.status} - ${response.statusText}`);
    }
    
    const data: APIMatchData[] = await response.json();
    
    // 🎯 NEW STEP: Use improved matching logic
    const matchData = this.findMatchData(data, homeTeam, awayTeam);
    
    if (!matchData) {
        console.log(`[OddsAPI] Match data not found for ${homeTeam} vs ${awayTeam}`);
        // Log details for debugging
        console.log(`[OddsAPI] Available matches:`, data.map(m => `${m.home_team} vs ${m.away_team}`));
        return null;
    }

    // Extract odds from the specific bookmaker
    const bookmaker = matchData.bookmakers.find((b) => b.key === BOOKMAKER_KEY);
    
    if (!bookmaker) {
        console.warn(`[OddsAPI] Bookmaker '${BOOKMAKER_KEY}' not found for this match. Attempting fallback...`);
        // 🎯 NEW STEP: Try first available bookmaker as fallback
        const fallbackBookmaker = matchData.bookmakers[0];
        if (fallbackBookmaker) {
          console.log(`[OddsAPI] Using fallback bookmaker: ${fallbackBookmaker.key}`);
          return this.extractOddsFromBookmaker(fallbackBookmaker);
        }
        return null;
    }

    // Use the dedicated helper for extraction
    return this.extractOddsFromBookmaker(bookmaker);
  }
}

export const oddsAPIService = new OddsAPIService();
