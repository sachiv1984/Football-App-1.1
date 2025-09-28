// src/services/api/oddsAPIService.ts

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

// --- NEW INTERFACES TO FIX TS7006 ERRORS ---

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

export class OddsAPIService {
  private oddsCache: Map<string, MatchOdds> = new Map();

  constructor() {
    if (!API_KEY) {
      console.warn("ODDS_API_KEY is not set. Odds functionality will be mocked or disabled.");
    }
  }

  private generateMatchId(home: string, away: string): string {
    // Generate a sanitized match ID
    return `${home.toLowerCase().replace(/\s+/g, '')}_vs_${away.toLowerCase().replace(/\s+/g, '')}`;
  }

  /**
   * 1. The Cache-First Strategy (Efficiency Focus)
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

  /**
   * 2. Actual API Call Logic
   */
  private async fetchOddsFromAPI(matchId: string): Promise<Omit<MatchOdds, 'matchId' | 'lastFetched'> | null> {
    const parts = matchId.split('_vs_');
    const home = parts[0];
    const away = parts[1];

    // NOTE: Replace 'soccer_epl' with your specific sport key if needed
    const sportKey = 'soccer_epl'; 
    const url = `${BASE_URL}/odds?apiKey=${API_KEY}&sport=${sportKey}&regions=uk&markets=totals,btts&oddsFormat=decimal`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Odds API failed: ${response.status} - ${response.statusText}`);
    }
    
    const data: APIMatchData[] = await response.json();
    
    // Find the relevant match data by comparing team names
    // 🚨 FIX: Applied type APIMatchData to the lambda parameter
    const matchData = data.find((m: APIMatchData) => 
        m.home_team.toLowerCase().replace(/\s+/g, '') === home || 
        m.away_team.toLowerCase().replace(/\s+/g, '') === away
    );
    
    if (!matchData) {
        console.log(`[OddsAPI] Match data not found in API response for ${matchId}.`);
        return null;
    }

    // Extract odds from the specific bookmaker
    // 🚨 FIX: Applied type OddsBookmaker to the lambda parameter
    const bookmaker = matchData.bookmakers.find((b: OddsBookmaker) => b.key === BOOKMAKER_KEY);
    
    if (!bookmaker) {
        console.warn(`[OddsAPI] Bookmaker '${BOOKMAKER_KEY}' not found for this match.`);
        return null;
    }

    // --- Parsing Total Goals (Assuming Over/Under 2.5 is available) ---
    // 🚨 FIX: Applied type OddsMarket to the lambda parameter
    const totalsMarket = bookmaker.markets.find((m: OddsMarket) => m.key === 'totals');
    
    // 🚨 FIX: Applied type OddsOutcome to the lambda parameter
    const over25Price = totalsMarket?.outcomes.find((o: OddsOutcome) => o.name === 'Over 2.5')?.price;
    // 🚨 FIX: Applied type OddsOutcome to the lambda parameter
    const under25Price = totalsMarket?.outcomes.find((o: OddsOutcome) => o.name === 'Under 2.5')?.price;

    // --- Parsing BTTS ---
    // 🚨 FIX: Applied type OddsMarket to the lambda parameter
    const bttsMarket = bookmaker.markets.find((m: OddsMarket) => m.key === 'btts');
    
    // 🚨 FIX: Applied type OddsOutcome to the lambda parameter
    const bttsYesPrice = bttsMarket?.outcomes.find((o: OddsOutcome) => o.name === 'Yes')?.price;
    // 🚨 FIX: Applied type OddsOutcome to the lambda parameter
    const bttsNoPrice = bttsMarket?.outcomes.find((o: OddsOutcome) => o.name === 'No')?.price;

    return {
      totalGoalsOdds: (over25Price && under25Price) ? {
        market: 'Over/Under 2.5',
        overOdds: over25Price,
        underOdds: under25Price,
      } : undefined,
      bttsOdds: (bttsYesPrice && bttsNoPrice) ? {
        market: 'Both Teams To Score',
        yesOdds: bttsYesPrice,
        noOdds: bttsNoPrice,
      } : undefined,
    };
  }
}

export const oddsAPIService = new OddsAPIService();
