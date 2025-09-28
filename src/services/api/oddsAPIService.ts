// src/services/api/oddsAPIService.ts

// Define an interface for the odds data you care about (e.g., Total Goals, BTTS)
interface MatchOdds {
  matchId: string; // Used to link to your internal match data
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

const API_KEY = process.env.ODDS_API_KEY; // 🔑 Access the GitHub Secret via environment variable
const BASE_URL = 'YOUR_ODDS_API_BASE_URL'; // 🌐 Replace with your actual odds API endpoint
const CACHE_TIMEOUT = 10 * 60 * 1000; // ⏱️ Cache for 10 minutes (to avoid redundant calls)

export class OddsAPIService {
  private oddsCache: Map<string, MatchOdds> = new Map();

  constructor() {
    if (!API_KEY) {
      console.error("ODDS_API_KEY is not set. Odds functionality is disabled.");
    }
  }

  /**
   * 1. The Cache-First Strategy
   * @param matchId - A unique identifier for the match (e.g., combined team names)
   */
  public async getOddsForMatch(homeTeam: string, awayTeam: string): Promise<MatchOdds | null> {
    const matchId = this.generateMatchId(homeTeam, awayTeam);
    const cachedOdds = this.oddsCache.get(matchId);

    // 💰 EFFICIENT STEP 1: Check Cache
    if (cachedOdds && (Date.now() - cachedOdds.lastFetched < CACHE_TIMEOUT)) {
      console.log(`[OddsAPI] ✅ Cache hit for ${matchId}. Returning cached data.`);
      return cachedOdds;
    }

    // 🛑 Exit if API key is missing
    if (!API_KEY) {
      return null;
    }

    // 🌐 EFFICIENT STEP 2: Fetch and Update
    try {
      const odds = await this.fetchOddsFromAPI(homeTeam, awayTeam);
      if (odds) {
        this.oddsCache.set(matchId, odds);
        console.log(`[OddsAPI] 📈 Cache updated for ${matchId}.`);
        return odds;
      }
      return null;
    } catch (error) {
      console.error(`[OddsAPI] ❌ Failed to fetch odds for ${matchId}:`, error);
      // Even on failure, return stale cache if it exists to save a call
      if (cachedOdds) {
         console.log(`[OddsAPI] Returning STALE cache data to save API call.`);
      }
      return cachedOdds || null;
    }
  }

  /**
   * 2. Simulates the actual API call
   */
  private async fetchOddsFromAPI(home: string, away: string): Promise<MatchOdds | null> {
    const matchId = this.generateMatchId(home, away);
    
    // ⚠️ Replace this with your actual fetch logic
    const response = await fetch(`${BASE_URL}/matches/${matchId}?apiKey=${API_KEY}`);
    
    if (!response.ok) {
      throw new Error(`Odds API returned status ${response.status}`);
    }
    
    const data = await response.json();
    
    // 🧩 Map API response to your MatchOdds interface (example structure)
    const matchOdds: MatchOdds = {
      matchId,
      totalGoalsOdds: {
        market: 'Over/Under 2.5',
        overOdds: data.markets['Total Goals'].find(m => m.name === 'Over 2.5')?.odds || 2.05,
        underOdds: data.markets['Total Goals'].find(m => m.name === 'Under 2.5')?.odds || 1.85,
      },
      bttsOdds: {
        market: 'Both Teams To Score',
        yesOdds: data.markets['BTTS'].find(m => m.name === 'Yes')?.odds || 1.6,
        noOdds: data.markets['BTTS'].find(m => m.name === 'No')?.odds || 2.2,
      },
      lastFetched: Date.now()
    };

    return matchOdds;
  }

  private generateMatchId(home: string, away: string): string {
    return `${home.toLowerCase().replace(/\s+/g, '')}_${away.toLowerCase().replace(/\s+/g, '')}`;
  }
}

export const oddsAPIService = new OddsAPIService();
