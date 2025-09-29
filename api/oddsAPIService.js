// api/oddsAPIService.js
import { normalizeTeamName } from '../utils/teamUtils.js'; // adjust path if needed

const API_KEY = process.env.ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';
const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const BOOKMAKER_KEY = 'draftkings';
const SPORT_KEY = 'soccer_epl';
const DEBUG_MODE = true;

export class OddsAPIService {
  constructor() {
    this.oddsCache = new Map();
    this.apiCallCount = 0;
    this.cacheHitCount = 0;

    if (!API_KEY) {
      console.warn('[OddsAPI] ⚠️ ODDS_API_KEY not set in environment variables');
    } else if (DEBUG_MODE) {
      console.log('[OddsAPI] ✅ Service initialized with API key');
    }
  }

  generateMatchId(home, away) {
    return `${normalizeTeamName(home).toLowerCase().replace(/\s+/g, '')}_vs_${normalizeTeamName(away).toLowerCase().replace(/\s+/g, '')}`;
  }

  async getOddsForMatch(homeTeam, awayTeam) {
    const matchId = this.generateMatchId(homeTeam, awayTeam);
    const cached = this.oddsCache.get(matchId);

    if (cached && Date.now() - cached.lastFetched < CACHE_TIMEOUT) {
      this.cacheHitCount++;
      if (DEBUG_MODE) console.log(`[OddsAPI] ✅ Cache HIT: ${matchId}`);
      return cached;
    }

    if (!API_KEY) return cached || null;

    try {
      if (DEBUG_MODE) console.log(`[OddsAPI] 🌐 Fetching odds for ${matchId} from API...`);
      const oddsData = await this.fetchOddsFromAPI(matchId);
      if (!oddsData) return cached || null;

      const newOdds = { ...oddsData, matchId, lastFetched: Date.now() };
      this.oddsCache.set(matchId, newOdds);
      this.apiCallCount++;
      return newOdds;
    } catch (error) {
      console.error(`[OddsAPI] ❌ Error fetching odds:`, error);
      return cached || null;
    }
  }

  async fetchOddsFromAPI(matchId) {
    const [homeTeam, awayTeam] = matchId.split('_vs_');
    const markets = [
      'totals', 'btts', 'player_cards', 'total_cards', 'booking_points',
      'home_team_cards', 'away_team_cards', 'most_cards',
      'corners_totals', 'most_corners', 'team_to_take_most_corners'
    ].join(',');

    const url = `${BASE_URL}/sports/${SPORT_KEY}/odds?apiKey=${API_KEY}&regions=uk&markets=${markets}&oddsFormat=decimal`;

    const response = await fetch(url);
    if (!response.ok) throw new Error(`API request failed: ${response.status} ${response.statusText}`);

    const data = await response.json();
    const match = data.find(m => {
      const apiHome = normalizeTeamName(m.home_team);
      const apiAway = normalizeTeamName(m.away_team);
      return (apiHome === homeTeam && apiAway === awayTeam) || (apiHome === awayTeam && apiAway === homeTeam);
    });

    if (!match) return null;
    let bookmaker = match.bookmakers.find(b => b.key === BOOKMAKER_KEY) || match.bookmakers[0];
    if (!bookmaker) return null;

    return this.extractOddsFromBookmaker(bookmaker);
  }

  extractOddsFromBookmaker(bookmaker) {
    return {
      totalGoalsOdds: this.extractTotalGoalsOdds(bookmaker),
      bttsOdds: this.extractBttsOdds(bookmaker),
      totalCardsOdds: this.extractTotalCardsOdds(bookmaker),
      homeCardsOdds: undefined,
      awayCardsOdds: undefined,
      mostCardsOdds: undefined,
      totalCornersOdds: undefined,
      homeCornersOdds: undefined,
      awayCornersOdds: undefined,
      mostCornersOdds: undefined,
    };
  }

  extractTotalGoalsOdds(bookmaker) {
    const market = bookmaker.markets.find(m => m.key === 'totals');
    if (!market) return undefined;
    const over = market.outcomes.find(o => o.name === 'Over' && o.point === 2.5);
    const under = market.outcomes.find(o => o.name === 'Under' && o.point === 2.5);
    if (!over || !under) return undefined;
    return { market: 'Over/Under 2.5 Goals', overOdds: over.price, underOdds: under.price };
  }

  extractBttsOdds(bookmaker) {
    const market = bookmaker.markets.find(m => m.key === 'btts');
    if (!market) return undefined;
    const yes = market.outcomes.find(o => o.name === 'Yes');
    const no = market.outcomes.find(o => o.name === 'No');
    if (!yes || !no) return undefined;
    return { market: 'Both Teams To Score', yesOdds: yes.price, noOdds: no.price };
  }

  extractTotalCardsOdds(bookmaker) {
    const market = bookmaker.markets.find(m => ['player_cards','total_cards','booking_points'].includes(m.key));
    if (!market) return undefined;
    const over = market.outcomes.find(o => o.name === 'Over' && [4.5,45].includes(o.point ?? 0));
    const under = market.outcomes.find(o => o.name === 'Under' && [4.5,45].includes(o.point ?? 0));
    if (!over || !under) return undefined;
    return { market: 'Over/Under 4.5 Cards', overOdds: over.price, underOdds: under.price };
  }

  clearCache() { this.oddsCache.clear(); }
  getCacheStatus() { return { size: this.oddsCache.size, apiCalls: this.apiCallCount, cacheHits: this.cacheHitCount }; }
}

// ✅ Export an instance for use
export const oddsAPIService = new OddsAPIService();

