// src/services/api/oddsAPIService.ts

import { normalizeTeamName } from '../../utils/teamUtils';

interface MatchOdds {
  matchId: string;
  totalGoalsOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  bttsOdds?: {
    market: string;
    yesOdds: number;
    noOdds: number;
  };
  totalCardsOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  homeCardsOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  awayCardsOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  mostCardsOdds?: {
    market: string;
    homeOdds: number;
    awayOdds: number;
    drawOdds: number;
  };
  totalCornersOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  homeCornersOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  awayCornersOdds?: {
    market: string;
    overOdds: number;
    underOdds: number;
  };
  mostCornersOdds?: {
    market: string;
    homeOdds: number;
    awayOdds: number;
    drawOdds: number;
  };
  lastFetched: number;
}

interface OddsOutcome {
  name: string;
  price: number;
  point?: number;
}

interface OddsMarket {
  key: string;
  outcomes: OddsOutcome[];
}

interface OddsBookmaker {
  key: string;
  title: string;
  markets: OddsMarket[];
}

interface APIMatchData {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

// 🔑 Try multiple environment variable sources
const API_KEY = 
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ODDS_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.ODDS_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_ODDS_API_KEY);

const BASE_URL = 'https://api.the-odds-api.com/v4';
const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const BOOKMAKER_KEY = 'draftkings';
const SPORT_KEY = 'soccer_epl';

// 🆕 Debug mode flag
const DEBUG_MODE = true;

export class OddsAPIService {
  private oddsCache: Map<string, MatchOdds> = new Map();
  private apiCallCount = 0;
  private cacheHitCount = 0;

  constructor() {
    if (!API_KEY) {
      console.warn(
        '[OddsAPI] ⚠️ ODDS_API_KEY not found. Set VITE_ODDS_API_KEY in .env file.\n' +
        'Example: VITE_ODDS_API_KEY=your_api_key_here'
      );
    } else {
      console.log('[OddsAPI] ✅ API key detected. Service initialized.');
    }
  }

  /**
   * Generate a normalized match ID for cache consistency
   */
  private generateMatchId(home: string, away: string): string {
    const normalizedHome = normalizeTeamName(home);
    const normalizedAway = normalizeTeamName(away);
    return `${normalizedHome.toLowerCase().replace(/\s+/g, '')}_vs_${normalizedAway.toLowerCase().replace(/\s+/g, '')}`;
  }

  /**
   * Main method: Get odds for a match (cache-first strategy)
   */
  public async getOddsForMatch(homeTeam: string, awayTeam: string): Promise<MatchOdds | null> {
    const matchId = this.generateMatchId(homeTeam, awayTeam);
    const cachedOdds = this.oddsCache.get(matchId);

    // Step 1: Check cache
    if (cachedOdds && (Date.now() - cachedOdds.lastFetched < CACHE_TIMEOUT)) {
      this.cacheHitCount++;
      if (DEBUG_MODE) {
        console.log(
          `[OddsAPI] ✅ Cache HIT for ${matchId}\n` +
          `  Age: ${Math.floor((Date.now() - cachedOdds.lastFetched) / 1000)}s\n` +
          `  Hit Rate: ${this.getCacheHitRate()}%`
        );
      }
      return cachedOdds;
    }

    // Step 2: Check if API key is available
    if (!API_KEY) {
      console.warn(`[OddsAPI] ⚠️ No API key - returning ${cachedOdds ? 'stale cache' : 'null'}`);
      return cachedOdds || null;
    }

    // Step 3: Fetch from API
    try {
      if (DEBUG_MODE) {
        console.log(`[OddsAPI] 🌐 Cache MISS for ${matchId}. Fetching from API...`);
      }

      const odds = await this.fetchOddsFromAPI(matchId);
      
      if (odds) {
        const newOdds: MatchOdds = { ...odds, matchId, lastFetched: Date.now() };
        this.oddsCache.set(matchId, newOdds);
        this.apiCallCount++;
        
        if (DEBUG_MODE) {
          this.logOddsSuccess(matchId, newOdds);
        }
        
        return newOdds;
      }

      console.warn(`[OddsAPI] ⚠️ No odds found for ${matchId}`);
      return cachedOdds || null;

    } catch (error) {
      console.error(`[OddsAPI] ❌ Error fetching odds for ${matchId}:`, error);
      
      if (error instanceof Error) {
        if (error.message.includes('401')) {
          console.error('[OddsAPI] 🔑 Authentication failed - check your API key');
        } else if (error.message.includes('429')) {
          console.error('[OddsAPI] ⏱️ Rate limit exceeded - using cached data if available');
        } else if (error.message.includes('404')) {
          console.error('[OddsAPI] 🔍 Match not found in API response');
        }
      }

      // Return stale cache if available
      if (cachedOdds) {
        console.log(`[OddsAPI] 📦 Returning stale cache (age: ${Math.floor((Date.now() - cachedOdds.lastFetched) / 1000)}s)`);
      }
      
      return cachedOdds || null;
    }
  }

  /**
   * Enhanced team matching with detailed logging
   */
  private findMatchData(data: APIMatchData[], homeTeam: string, awayTeam: string): APIMatchData | undefined {
    const normalizedHome = normalizeTeamName(homeTeam);
    const normalizedAway = normalizeTeamName(awayTeam);

    if (DEBUG_MODE) {
      console.log(`[OddsAPI] 🔍 Searching for: ${normalizedHome} vs ${normalizedAway}`);
      console.log(`[OddsAPI] 📋 Available matches (${data.length}):`);
      data.forEach((m, i) => {
        console.log(`  ${i + 1}. ${m.home_team} vs ${m.away_team}`);
      });
    }

    const match = data.find((match: APIMatchData) => {
      const apiHome = normalizeTeamName(match.home_team);
      const apiAway = normalizeTeamName(match.away_team);

      // Direct match
      const directMatch = (apiHome === normalizedHome && apiAway === normalizedAway) ||
                         (apiHome === normalizedAway && apiAway === normalizedHome);

      if (directMatch) {
        if (DEBUG_MODE) {
          console.log(`[OddsAPI] ✅ Direct match found: ${match.home_team} vs ${match.away_team}`);
        }
        return true;
      }

      // Partial match
      const homeMatches = this.isTeamNameMatch(apiHome, normalizedHome) || 
                         this.isTeamNameMatch(apiAway, normalizedHome);
      const awayMatches = this.isTeamNameMatch(apiHome, normalizedAway) || 
                         this.isTeamNameMatch(apiAway, normalizedAway);

      if (homeMatches && awayMatches) {
        if (DEBUG_MODE) {
          console.log(`[OddsAPI] ⚡ Partial match found: ${match.home_team} vs ${match.away_team}`);
        }
        return true;
      }

      return false;
    });

    if (!match && DEBUG_MODE) {
      console.warn(`[OddsAPI] ❌ No match found for ${normalizedHome} vs ${normalizedAway}`);
    }

    return match;
  }

  private isTeamNameMatch(apiName: string, targetName: string): boolean {
    const cleanApiName = this.cleanTeamName(apiName);
    const cleanTargetName = this.cleanTeamName(targetName);
    
    if (cleanApiName === cleanTargetName) return true;
    
    return cleanApiName.includes(cleanTargetName) || cleanTargetName.includes(cleanApiName);
  }

  private cleanTeamName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\b(fc|afc|united|city|town|rovers|wanderers|athletic|hotspur|albion)\b/g, '')
      .replace(/[&\-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Extract odds methods with enhanced error handling
   */
  private extractTotalGoalsOdds(bookmaker: OddsBookmaker): MatchOdds['totalGoalsOdds'] | undefined {
    try {
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
    } catch (error) {
      console.error('[OddsAPI] Error extracting total goals odds:', error);
    }
    return undefined;
  }

  private extractBttsOdds(bookmaker: OddsBookmaker): MatchOdds['bttsOdds'] | undefined {
    try {
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
    } catch (error) {
      console.error('[OddsAPI] Error extracting BTTS odds:', error);
    }
    return undefined;
  }

  private extractTotalCardsOdds(bookmaker: OddsBookmaker): MatchOdds['totalCardsOdds'] | undefined {
    try {
      const cardsMarket = bookmaker.markets.find((m: OddsMarket) => 
        m.key === 'player_cards' || m.key === 'total_cards' || m.key === 'booking_points'
      );
      
      if (!cardsMarket) return undefined;

      const over45 = cardsMarket.outcomes.find((o: OddsOutcome) => 
        o.name === 'Over' && (o.point === 4.5 || o.point === 45)
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
    } catch (error) {
      console.error('[OddsAPI] Error extracting cards odds:', error);
    }
    return undefined;
  }

  private extractHomeCardsOdds(bookmaker: OddsBookmaker): MatchOdds['homeCardsOdds'] | undefined {
    try {
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
    } catch (error) {
      console.error('[OddsAPI] Error extracting home cards odds:', error);
    }
    return undefined;
  }

  private extractAwayCardsOdds(bookmaker: OddsBookmaker): MatchOdds['awayCardsOdds'] | undefined {
    try {
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
    } catch (error) {
      console.error('[OddsAPI] Error extracting away cards odds:', error);
    }
    return undefined;
  }

  private extractMostCardsOdds(bookmaker: OddsBookmaker): MatchOdds['mostCardsOdds'] | undefined {
    try {
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
    } catch (error) {
      console.error('[OddsAPI] Error extracting most cards odds:', error);
    }
    return undefined;
  }

  private extractTotalCornersOdds(bookmaker: OddsBookmaker): MatchOdds['totalCornersOdds'] | undefined {
    try {
      const cornerTotalsMarket = bookmaker.markets.find((m: OddsMarket) => 
        (m.key === 'totals' && m.outcomes.some(o => o.name === 'Over' && o.point === 9.5)) || 
        m.key === 'corners_totals'
      );
      
      if (!cornerTotalsMarket) return undefined;

      const over95 = cornerTotalsMarket.outcomes.find((o: OddsOutcome) => 
        o.name === 'Over' && o.point === 9.5
      );
      const under95 = cornerTotalsMarket.outcomes.find((o: OddsOutcome) => 
        o.name === 'Under' && o.point === 9.5
      );

      if (over95 && under95) {
        return {
          market: 'Over/Under 9.5 Corners',
          overOdds: over95.price,
          underOdds: under95.price,
        };
      }
    } catch (error) {
      console.error('[OddsAPI] Error extracting corners odds:', error);
    }
    return undefined;
  }

  private extractMostCornersOdds(bookmaker: OddsBookmaker): MatchOdds['mostCornersOdds'] | undefined {
    try {
      const mostCornersMarket = bookmaker.markets.find((m: OddsMarket) => 
        m.key === 'most_corners' || m.key === 'team_to_take_most_corners'
      );
      
      if (!mostCornersMarket) return undefined;

      const homeOdds = mostCornersMarket.outcomes.find((o: OddsOutcome) => 
        o.name === 'Home' || o.name.includes('Home')
      );
      const awayOdds = mostCornersMarket.outcomes.find((o: OddsOutcome) => 
        o.name === 'Away' || o.name.includes('Away')
      );
      const drawOdds = mostCornersMarket.outcomes.find((o: OddsOutcome) => 
        o.name === 'Draw' || o.name === 'Equal'
      );

      if (homeOdds && awayOdds && drawOdds) {
        return {
          market: 'Most Corners',
          homeOdds: homeOdds.price,
          awayOdds: awayOdds.price,
          drawOdds: drawOdds.price,
        };
      }
    } catch (error) {
      console.error('[OddsAPI] Error extracting most corners odds:', error);
    }
    return undefined;
  }

  /**
   * Extract all odds from a bookmaker
   */
  private extractOddsFromBookmaker(bookmaker: OddsBookmaker): Omit<MatchOdds, 'matchId' | 'lastFetched'> {
    const odds = {
      totalGoalsOdds: this.extractTotalGoalsOdds(bookmaker),
      bttsOdds: this.extractBttsOdds(bookmaker),
      totalCardsOdds: this.extractTotalCardsOdds(bookmaker),
      homeCardsOdds: this.extractHomeCardsOdds(bookmaker),
      awayCardsOdds: this.extractAwayCardsOdds(bookmaker),
      mostCardsOdds: this.extractMostCardsOdds(bookmaker),
      totalCornersOdds: this.extractTotalCornersOdds(bookmaker),
      homeCornersOdds: undefined,
      awayCornersOdds: undefined,
      mostCornersOdds: this.extractMostCornersOdds(bookmaker),
    };

    if (DEBUG_MODE) {
      const marketsFound = Object.entries(odds)
        .filter(([_, value]) => value !== undefined)
        .map(([key]) => key);
      
      console.log(`[OddsAPI] 📊 Markets extracted from ${bookmaker.title}:`, marketsFound);
    }

    return odds;
  }

  /**
   * Fetch odds from The Odds API
   */
  private async fetchOddsFromAPI(matchId: string): Promise<Omit<MatchOdds, 'matchId' | 'lastFetched'> | null> {
    const parts = matchId.split('_vs_');
    if (parts.length !== 2) {
      console.error(`[OddsAPI] ❌ Invalid matchId format: ${matchId}`);
      return null;
    }

    const homeTeam = parts[0];
    const awayTeam = parts[1];

    const marketsToRequest = [
      'totals',
      'btts',
      'player_cards',
      'total_cards',
      'booking_points',
      'home_team_cards',
      'away_team_cards',
      'most_cards',
      'corners_totals',
      'most_corners',
      'team_to_take_most_corners'
    ].join(',');

    const url = `${BASE_URL}/sports/${SPORT_KEY}/odds?apiKey=${API_KEY}&regions=uk&markets=${marketsToRequest}&oddsFormat=decimal`;

    if (DEBUG_MODE) {
      console.log(`[OddsAPI] 🌐 API Request URL: ${url.replace(API_KEY!, 'API_KEY_HIDDEN')}`);
    }

    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API request failed: ${response.status} ${response.statusText}\n` +
        `Response: ${errorText}`
      );
    }

    const data: APIMatchData[] = await response.json();

    if (DEBUG_MODE) {
      console.log(`[OddsAPI] 📥 Received ${data.length} matches from API`);
    }

    const matchData = this.findMatchData(data, homeTeam, awayTeam);

    if (!matchData) {
      console.warn(
        `[OddsAPI] ❌ Match not found: ${homeTeam} vs ${awayTeam}\n` +
        `Available matches:\n` +
        data.map(m => `  - ${m.home_team} vs ${m.away_team}`).join('\n')
      );
      return null;
    }

    // Try to find the preferred bookmaker
    let bookmaker = matchData.bookmakers.find((b) => b.key === BOOKMAKER_KEY);

    if (!bookmaker) {
      console.warn(
        `[OddsAPI] ⚠️ Preferred bookmaker '${BOOKMAKER_KEY}' not found.\n` +
        `Available bookmakers: ${matchData.bookmakers.map(b => b.key).join(', ')}`
      );

      // Use first available bookmaker as fallback
      bookmaker = matchData.bookmakers[0];

      if (!bookmaker) {
        console.error('[OddsAPI] ❌ No bookmakers available for this match');
        return null;
      }

      console.log(`[OddsAPI] 🔄 Using fallback bookmaker: ${bookmaker.title}`);
    }

    return this.extractOddsFromBookmaker(bookmaker);
  }

  /**
   * Log successful odds fetch (debug helper)
   */
  private logOddsSuccess(matchId: string, odds: MatchOdds): void {
    const markets = [];
    if (odds.totalGoalsOdds) markets.push('Goals');
    if (odds.bttsOdds) markets.push('BTTS');
    if (odds.totalCardsOdds) markets.push('Cards');
    if (odds.totalCornersOdds) markets.push('Corners');
    if (odds.mostCardsOdds) markets.push('Most Cards');
    if (odds.mostCornersOdds) markets.push('Most Corners');

    console.log(
      `[OddsAPI] ✅ Successfully fetched odds for ${matchId}\n` +
      `  Markets: ${markets.join(', ')}\n` +
      `  API calls: ${this.apiCallCount}\n` +
      `  Cache hits: ${this.cacheHitCount}\n` +
      `  Hit rate: ${this.getCacheHitRate()}%`
    );
  }

  /**
   * Calculate cache hit rate
   */
  private getCacheHitRate(): number {
    const total = this.apiCallCount + this.cacheHitCount;
    if (total === 0) return 0;
    return Math.round((this.cacheHitCount / total) * 100);
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    const size = this.oddsCache.size;
    this.oddsCache.clear();
    console.log(`[OddsAPI] 🗑️ Cache cleared (${size} entries removed)`);
  }

  /**
   * Get cache status for debugging
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
        hasCornersOdds: !!odds.totalCornersOdds || !!odds.mostCornersOdds,
        age: Date.now() - odds.lastFetched,
        cacheExpiry: CACHE_TIMEOUT - (Date.now() - odds.lastFetched),
      })),
      stats: {
        apiCalls: this.apiCallCount,
        cacheHits: this.cacheHitCount,
        hitRate: this.getCacheHitRate(),
      },
    };
  }

  /**
   * Reset statistics
   */
  public resetStats(): void {
    this.apiCallCount = 0;
    this.cacheHitCount = 0;
    console.log('[OddsAPI] 📊 Statistics reset');
  }

  /**
   * Test API connection
   */
  public async testConnection(): Promise<boolean> {
    if (!API_KEY) {
      console.error('[OddsAPI] ❌ Cannot test connection: No API key configured');
      return false;
    }

    try {
      const url = `${BASE_URL}/sports/${SPORT_KEY}/odds?apiKey=${API_KEY}&regions=uk&markets=h2h&oddsFormat=decimal`;
      const response = await fetch(url);

      if (response.ok) {
        const data = await response.json();
        console.log(
          `[OddsAPI] ✅ Connection test successful!\n` +
          `  Found ${data.length} matches available\n` +
          `  API Status: OK`
        );
        return true;
      } else {
        console.error(
          `[OddsAPI] ❌ Connection test failed: ${response.status} ${response.statusText}`
        );
        return false;
      }
    } catch (error) {
      console.error('[OddsAPI] ❌ Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available matches from API (for debugging)
   */
  public async getAvailableMatches(): Promise<string[]> {
    if (!API_KEY) {
      console.warn('[OddsAPI] ⚠️ No API key - cannot fetch available matches');
      return [];
    }

    try {
      const url = `${BASE_URL}/sports/${SPORT_KEY}/odds?apiKey=${API_KEY}&regions=uk&markets=h2h&oddsFormat=decimal`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data: APIMatchData[] = await response.json();
      return data.map(m => `${m.home_team} vs ${m.away_team}`);
    } catch (error) {
      console.error('[OddsAPI] Error fetching available matches:', error);
      return [];
    }
  }
}

export const oddsAPIService = new OddsAPIService();
