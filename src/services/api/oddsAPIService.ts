// src/services/api/oddsAPIService.ts

import { normalizeTeamName } from '../../utils/teamUtils';

export interface MatchOdds {
  matchId: string;
  totalGoalsOdds?: { market: string; overOdds: number; underOdds: number };
  bttsOdds?: { market: string; yesOdds: number; noOdds: number };
  totalCardsOdds?: { market: string; overOdds: number; underOdds: number };
  homeCardsOdds?: { market: string; overOdds: number; underOdds: number };
  awayCardsOdds?: { market: string; overOdds: number; underOdds: number };
  mostCardsOdds?: { market: string; homeOdds: number; awayOdds: number; drawOdds: number };
  totalCornersOdds?: { market: string; overOdds: number; underOdds: number };
  homeCornersOdds?: { market: string; overOdds: number; underOdds: number };
  awayCornersOdds?: { market: string; overOdds: number; underOdds: number };
  mostCornersOdds?: { market: string; homeOdds: number; awayOdds: number; drawOdds: number };
  lastFetched: number;
}

interface OddsOutcome { name: string; price: number; point?: number }
interface OddsMarket { key: string; outcomes: OddsOutcome[] }
interface OddsBookmaker { key: string; title: string; markets: OddsMarket[] }
interface APIMatchData {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

// ✅ Backend-safe API key
const API_KEY = process.env.ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';
const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 min
const BOOKMAKER_KEY = 'draftkings';
const SPORT_KEY = 'soccer_epl';

// Enable debug logs
const DEBUG_MODE = true;

export class OddsAPIService {
  private oddsCache: Map<string, MatchOdds> = new Map();
  private apiCallCount = 0;
  private cacheHitCount = 0;

  constructor() {
    if (!API_KEY) {
      console.warn('[OddsAPI] ⚠️ ODDS_API_KEY not set in environment variables');
    } else if (DEBUG_MODE) {
      console.log('[OddsAPI] ✅ Service initialized with API key');
    }
  }

  /** Generate consistent match ID */
  private generateMatchId(home: string, away: string) {
    return `${normalizeTeamName(home).toLowerCase().replace(/\s+/g, '')}_vs_${normalizeTeamName(away).toLowerCase().replace(/\s+/g, '')}`;
  }

  /** Main: get odds with cache */
  public async getOddsForMatch(homeTeam: string, awayTeam: string): Promise<MatchOdds | null> {
    const matchId = this.generateMatchId(homeTeam, awayTeam);
    const cached = this.oddsCache.get(matchId);

    if (cached && Date.now() - cached.lastFetched < CACHE_TIMEOUT) {
      this.cacheHitCount++;
      if (DEBUG_MODE) console.log(`[OddsAPI] ✅ Cache HIT: ${matchId}`);
      return cached;
    }

    if (!API_KEY) {
      console.warn('[OddsAPI] ⚠️ No API key, returning cached data or null');
      return cached || null;
    }

    try {
      if (DEBUG_MODE) console.log(`[OddsAPI] 🌐 Fetching odds for ${matchId} from API...`);
      const oddsData = await this.fetchOddsFromAPI(matchId);
      if (!oddsData) return cached || null;

      const newOdds: MatchOdds = { ...oddsData, matchId, lastFetched: Date.now() };
      this.oddsCache.set(matchId, newOdds);
      this.apiCallCount++;
      return newOdds;
    } catch (error) {
      console.error(`[OddsAPI] ❌ Error fetching odds:`, error);
      return cached || null;
    }
  }

  /** Fetch odds from The Odds API */
  private async fetchOddsFromAPI(matchId: string) {
  const [homeTeam, awayTeam] = matchId.split('_vs_');
  const markets = [
    'totals', 'btts', 'player_cards', 'total_cards', 'booking_points',
    'home_team_cards', 'away_team_cards', 'most_cards',
    'corners_totals', 'most_corners', 'team_to_take_most_corners'
  ].join(',');

  const url = `${BASE_URL}/sports/${SPORT_KEY}/odds?apiKey=${API_KEY}&regions=uk&markets=${markets}&oddsFormat=decimal`;

  const response = await fetch(url);
  
  const text = await response.text(); // always read as text first
  if (!response.ok) {
    throw new Error(`[OddsAPI] Request failed: ${response.status} ${response.statusText} — Response: ${text}`);
  }

  let data: APIMatchData[];
  try {
    data = JSON.parse(text);
  } catch (err) {
    throw new Error(`[OddsAPI] Failed to parse JSON response: ${text}`);
  }

  const match = data.find(m => {
    const apiHome = normalizeTeamName(m.home_team);
    const apiAway = normalizeTeamName(m.away_team);
    return (apiHome === homeTeam && apiAway === awayTeam) || (apiHome === awayTeam && apiAway === homeTeam);
  });

  if (!match) return null;
  const bookmaker = match.bookmakers.find(b => b.key === BOOKMAKER_KEY) || match.bookmakers[0];
  if (!bookmaker) return null;

  return this.extractOddsFromBookmaker(bookmaker);
}

  /** Extract odds from bookmaker */
  private extractOddsFromBookmaker(bookmaker: OddsBookmaker): Omit<MatchOdds, 'matchId' | 'lastFetched'> {
    const odds: Omit<MatchOdds, 'matchId' | 'lastFetched'> = {
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

    if (DEBUG_MODE) console.log(`[OddsAPI] 📊 Markets extracted:`, Object.keys(odds).filter(k => odds[k as keyof typeof odds] != null));
    return odds;
  }

  /** --- Simplified extract methods (examples) --- */
  private extractTotalGoalsOdds(bookmaker: OddsBookmaker) {
    const market = bookmaker.markets.find(m => m.key === 'totals');
    if (!market) return undefined;
    const over = market.outcomes.find(o => o.name === 'Over' && o.point === 2.5);
    const under = market.outcomes.find(o => o.name === 'Under' && o.point === 2.5);
    if (!over || !under) return undefined;
    return { market: 'Over/Under 2.5 Goals', overOdds: over.price, underOdds: under.price };
  }

  private extractBttsOdds(bookmaker: OddsBookmaker) {
    const market = bookmaker.markets.find(m => m.key === 'btts');
    if (!market) return undefined;
    const yes = market.outcomes.find(o => o.name === 'Yes');
    const no = market.outcomes.find(o => o.name === 'No');
    if (!yes || !no) return undefined;
    return { market: 'Both Teams To Score', yesOdds: yes.price, noOdds: no.price };
  }

  private extractTotalCardsOdds(bookmaker: OddsBookmaker) {
    const market = bookmaker.markets.find(m => ['player_cards','total_cards','booking_points'].includes(m.key));
    if (!market) return undefined;
    const over = market.outcomes.find(o => o.name === 'Over' && [4.5,45].includes(o.point ?? 0));
    const under = market.outcomes.find(o => o.name === 'Under' && [4.5,45].includes(o.point ?? 0));
    if (!over || !under) return undefined;
    return { market: 'Over/Under 4.5 Cards', overOdds: over.price, underOdds: under.price };
  }

  private extractHomeCardsOdds(bookmaker: OddsBookmaker) { /* similar logic */ return undefined }
  private extractAwayCardsOdds(bookmaker: OddsBookmaker) { /* similar logic */ return undefined }
  private extractMostCardsOdds(bookmaker: OddsBookmaker) { /* similar logic */ return undefined }
  private extractTotalCornersOdds(bookmaker: OddsBookmaker) { /* similar logic */ return undefined }
  private extractMostCornersOdds(bookmaker: OddsBookmaker) { /* similar logic */ return undefined }

  /** --- Cache & debug helpers --- */
  public clearCache() { this.oddsCache.clear(); }
  public getCacheStatus() { return { size: this.oddsCache.size, apiCalls: this.apiCallCount, cacheHits: this.cacheHitCount }; }
}

export const oddsAPIService = new OddsAPIService();
