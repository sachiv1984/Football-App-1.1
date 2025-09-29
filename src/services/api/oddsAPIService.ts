// src/services/api/oddsAPIService.ts (FIXED: Self-contained module)

// =========================================================
// 1. Team Normalization Utility (COPIED IN-LINE)
//    This block replaces the external 'import { normalizeTeamName } from "../../utils/teamUtils";'
//    and uses only the parts required for ID generation and API matching.
// =========================================================
const TEAM_NORMALIZATION_MAP: Record<string, string> = {
  // Manchester clubs
  'Man Utd': 'Manchester United',
  'Manchester United FC': 'Manchester United',
  'Man United': 'Manchester United',
  'Manchester Utd': 'Manchester United',
  'Man City': 'Manchester City',
  'Manchester City FC': 'Manchester City',
  // Tottenham
  'Spurs': 'Tottenham Hotspur',
  'Tottenham': 'Tottenham Hotspur',
  'Tottenham Hotspur FC': 'Tottenham Hotspur',
  // Brighton
  'Brighton': 'Brighton & Hove Albion',
  'Brighton Hove Albion': 'Brighton & Hove Albion',
  'Brighton and Hove Albion': 'Brighton & Hove Albion',
  'Brighton & Hove Albion FC': 'Brighton & Hove Albion',
  // Sheffield
  'Sheffield Utd': 'Sheffield United',
  'Sheffield United FC': 'Sheffield United',
  // Wolves
  'Wolves': 'Wolverhampton Wanderers',
  'Wolverhampton Wanderers FC': 'Wolverhampton Wanderers',
  // Leicester
  'Leicester': 'Leicester City',
  // Newcastle
  'Newcastle': 'Newcastle United',
  'Newcastle United FC': 'Newcastle United',
  'Newcastle United': 'Newcastle United',
  'Newcastle Utd': 'Newcastle United',
  // Sunderland
  'Sunderland': 'Sunderland AFC',
  'Sunderland AFC': 'Sunderland AFC',
  // West Ham
  'West Ham': 'West Ham United',
  'West Ham FC': 'West Ham United',
  // Palace
  'Crystal Palace FC': 'Crystal Palace',
  'Palace': 'Crystal Palace',
  // Forest
  'Forest': 'Nottingham Forest',
  "Nott'm Forest": 'Nottingham Forest',
  'Nottingham Forest FC': 'Nottingham Forest',
  "Nott'ham Forest": 'Nottingham Forest',
  'Nottingham Forest': 'Nottingham Forest',
  // Villa
  'Villa': 'Aston Villa',
  'Aston Villa FC': 'Aston Villa',
  // Fulham
  'Fulham FC': 'Fulham',
  // Brentford
  'Brentford FC': 'Brentford',
  // Everton
  'Everton FC': 'Everton',
  // Liverpool
  'Liverpool FC': 'Liverpool',
  // Arsenal
  'Arsenal FC': 'Arsenal',
  // Chelsea
  'Chelsea FC': 'Chelsea',
  // Bournemouth
  'Bournemouth': 'AFC Bournemouth',
  'AFC Bournemouth FC': 'AFC Bournemouth',
  'Bournemouth FC': 'AFC Bournemouth',
  'AFC Bournemouth': 'AFC Bournemouth',
  // Luton
  'Luton': 'Luton Town',
  'Luton Town FC': 'Luton Town',
  // Burnley
  'Burnley FC': 'Burnley',
  // Leeds
  'Leeds Utd': 'Leeds United',
  'Leeds United FC': 'Leeds United',
  // European competition variations (optional but harmless)
  'Atletico Madrid': 'Atletico Madrid',
  'Real Madrid': 'Real Madrid',
  'FC Barcelona': 'Barcelona',
  'Bayern Munich': 'Bayern Munich',
  'Paris Saint-Germain': 'Paris Saint-Germain',
  'PSG': 'Paris Saint-Germain',
};

// Normalize team name → always returns canonical version
const normalizeTeamName = (name: string): string => {
  const clean = name.trim();
  // Lookup canonical name, fall back to original clean name
  return TEAM_NORMALIZATION_MAP[clean] || clean;
};

// =========================================================
// 2. Original Service Interfaces and Exports
// =========================================================

export interface MatchOdds {
  matchId: string;
  totalGoalsOdds?: { market: string; overOdds: number; underOdds: number };
  bttsOdds?: { market: string; yesOdds: number; noOdds: number };
  totalCardsOdds?: { market: string; overOdds: number; underOdds: number };
  lastFetched: number;
}

interface OddsOutcome { name: string; price: number; point?: number }
interface OddsMarket { key: string; outcomes: OddsOutcome[] }
interface OddsBookmaker { key: string; title: string; markets: OddsMarket[] }
interface APIMatchData {
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

// Backend-safe API key
const API_KEY = process.env.ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';
const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 min
const BOOKMAKER_KEY = 'draftkings';
const SPORT_KEY = 'soccer_epl';

export class OddsAPIService {
  private oddsCache: Map<string, MatchOdds> = new Map();

  constructor() {
    if (!API_KEY) console.warn('[OddsAPI] ⚠️ ODDS_API_KEY not set in environment');
  }

  // Uses the local normalizeTeamName function
  private generateMatchId(home: string, away: string) {
    return `${normalizeTeamName(home).toLowerCase().replace(/\s+/g, '')}_vs_${normalizeTeamName(away).toLowerCase().replace(/\s+/g, '')}`;
  }

  public async getOddsForMatch(homeTeam: string, awayTeam: string): Promise<MatchOdds | null> {
    const matchId = this.generateMatchId(homeTeam, awayTeam);
    const cached = this.oddsCache.get(matchId);

    if (cached && Date.now() - cached.lastFetched < CACHE_TIMEOUT) {
      return cached;
    }

    if (!API_KEY) return cached || null;

    try {
      const oddsData = await this.fetchOddsFromAPI(homeTeam, awayTeam);
      if (!oddsData) return cached || null;

      const newOdds: MatchOdds = { ...oddsData, matchId, lastFetched: Date.now() };
      this.oddsCache.set(matchId, newOdds);
      return newOdds;
    } catch (err) {
      console.error('[OddsAPI] Fetch failed:', err);
      return cached || null;
    }
  }

  private async fetchOddsFromAPI(homeTeam: string, awayTeam: string) {
    const markets = ['totals','btts','total_cards'].join(',');
    const url = `${BASE_URL}/sports/${SPORT_KEY}/odds?apiKey=${API_KEY}&regions=uk&markets=${markets}&oddsFormat=decimal`;

    let data: APIMatchData[] = [];
    try {
      const res = await fetch(url);
      const text = await res.text();

      // Safely parse JSON
      try {
        data = JSON.parse(text);
      } catch {
        console.error('[OddsAPI] Invalid JSON response:', text.slice(0, 200));
        return null;
      }

      if (!Array.isArray(data)) return null;
    } catch (err) {
      console.error('[OddsAPI] Network error:', err);
      return null;
    }

    const match = data.find(m => {
      // Uses the local normalizeTeamName function
      const apiHome = normalizeTeamName(m.home_team);
      const apiAway = normalizeTeamName(m.away_team);
      // Logic for matching home/away or away/home
      return (apiHome === homeTeam && apiAway === awayTeam) || (apiHome === awayTeam && apiAway === homeTeam);
    });
    if (!match) return null;

    const bookmaker = match.bookmakers.find(b => b.key === BOOKMAKER_KEY) || match.bookmakers[0];
    if (!bookmaker) return null;

    return this.extractOdds(bookmaker);
  }

  private extractOdds(bookmaker: OddsBookmaker) {
    const totalGoals = bookmaker.markets.find(m => m.key === 'totals');
    const btts = bookmaker.markets.find(m => m.key === 'btts');
    const totalCards = bookmaker.markets.find(m => m.key === 'total_cards');

    return {
      totalGoalsOdds: totalGoals ? {
        market: 'Over/Under 2.5 Goals',
        overOdds: totalGoals.outcomes.find(o => o.name === 'Over' && o.point === 2.5)?.price || 0,
        underOdds: totalGoals.outcomes.find(o => o.name === 'Under' && o.point === 2.5)?.price || 0,
      } : undefined,

      bttsOdds: btts ? {
        market: 'Both Teams To Score',
        yesOdds: btts.outcomes.find(o => o.name === 'Yes')?.price || 0,
        noOdds: btts.outcomes.find(o => o.name === 'No')?.price || 0,
      } : undefined,

      totalCardsOdds: totalCards ? {
        market: 'Over/Under 4.5 Cards',
        overOdds: totalCards.outcomes.find(o => o.name === 'Over' && o.point === 4.5)?.price || 0,
        underOdds: totalCards.outcomes.find(o => o.name === 'Under' && o.point === 4.5)?.price || 0,
      } : undefined,
    };
  }

  public clearCache() { this.oddsCache.clear(); }
}

export const oddsAPIService = new OddsAPIService();
