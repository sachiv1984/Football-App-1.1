// api/oddsAPIService.js
const fetch = require('node-fetch');
const { normalizeTeamName } = require('../../utils/teamUtils'); // adjust path if needed

const API_KEY = process.env.ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';
const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 min
const BOOKMAKER_KEY = 'draftkings';
const SPORT_KEY = 'soccer_epl';
const DEBUG_MODE = true;

class OddsAPIService {
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

    if (!API_KEY) {
      console.warn('[OddsAPI] ⚠️ No API key, returning cached data or null');
      return cached || null;
    }

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
    // For simplicity, only returning empty structure placeholders
    // You can implement extraction logic here similar to TS version
    return {
      totalGoalsOdds: undefined,
      bttsOdds: undefined,
      totalCardsOdds: undefined,
      homeCardsOdds: undefined,
      awayCardsOdds: undefined,
      mostCardsOdds: undefined,
      totalCornersOdds: undefined,
      homeCornersOdds: undefined,
      awayCornersOdds: undefined,
      mostCornersOdds: undefined
    };
  }

  clearCache() { this.oddsCache.clear(); }
  getCacheStatus() {
    return {
      size: this.oddsCache.size,
      apiCalls: this.apiCallCount,
      cacheHits: this.cacheHitCount
    };
  }
}

module.exports = { oddsAPIService: new OddsAPIService() };
