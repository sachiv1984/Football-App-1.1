// src/services/api/oddsAPIService.ts (FIXED: Enhanced error handling and logging)

// =========================================================
// 1. Team Normalization Utility (COPIED IN-LINE)
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
  'Leicester City FC': 'Leicester City',
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
  'West Ham United FC': 'West Ham United',
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
  // Southampton
  'Southampton FC': 'Southampton',
  // Ipswich
  'Ipswich': 'Ipswich Town',
  'Ipswich Town FC': 'Ipswich Town',
};

// Normalize team name → always returns canonical version
const normalizeTeamName = (name: string): string => {
  const clean = name.trim();
  // Lookup canonical name, fall back to original clean name
  return TEAM_NORMALIZATION_MAP[clean] || clean;
};

// =========================================================
// 2. Service Interfaces and Exports
// =========================================================

export interface MatchOdds {
  matchId: string;
  totalGoalsOdds?: { market: string; overOdds: number; underOdds: number };
  bttsOdds?: { market: string; yesOdds: number; noOdds: number };
  totalCardsOdds?: { market: string; overOdds: number; underOdds: number };
  totalCornersOdds?: { market: string; overOdds: number; underOdds: number };
  mostCardsOdds?: { market: string; homeOdds: number; awayOdds: number; drawOdds: number };
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
const API_KEY = process.env.ODDS_API_KEY || process.env.VITE_ODDS_API_KEY;
const BASE_URL = 'https://api.the-odds-api.com/v4';
const CACHE_TIMEOUT = 10 * 60 * 1000; // 10 min
const BOOKMAKER_KEY = 'draftkings';
const SPORT_KEY = 'soccer_epl';

export class OddsAPIService {
  private oddsCache: Map<string, MatchOdds> = new Map();

  constructor() {
    if (!API_KEY) {
      console.warn('[OddsAPI] ⚠️ ODDS_API_KEY not set in environment');
    } else {
      console.log('[OddsAPI] ✅ API key configured');
    }
  }

  // Uses the local normalizeTeamName function
  private generateMatchId(home: string, away: string) {
    const normalizedHome = normalizeTeamName(home).toLowerCase().replace(/\s+/g, '');
    const normalizedAway = normalizeTeamName(away).toLowerCase().replace(/\s+/g, '');
    return `${normalizedHome}_vs_${normalizedAway}`;
  }

  public async getOddsForMatch(homeTeam: string, awayTeam: string): Promise<MatchOdds | null> {
    const matchId = this.generateMatchId(homeTeam, awayTeam);
    console.log(`[OddsAPI] Requesting odds for match ID: ${matchId}`);
    
    const cached = this.oddsCache.get(matchId);

    if (cached && Date.now() - cached.lastFetched < CACHE_TIMEOUT) {
      console.log(`[OddsAPI] ✅ Returning cached odds (age: ${Math.floor((Date.now() - cached.lastFetched) / 1000)}s)`);
      return cached;
    }

    if (!API_KEY) {
      console.warn('[OddsAPI] No API key - returning cached data or null');
      return cached || null;
    }

    try {
      const oddsData = await this.fetchOddsFromAPI(homeTeam, awayTeam);
      if (!oddsData) {
        console.warn('[OddsAPI] No odds data returned from API');
        return cached || null;
      }

      const newOdds: MatchOdds = { ...oddsData, matchId, lastFetched: Date.now() };
      this.oddsCache.set(matchId, newOdds);
      console.log('[OddsAPI] ✅ Odds fetched and cached successfully');
      return newOdds;
    } catch (err) {
      console.error('[OddsAPI] Fetch failed:', err);
      return cached || null;
    }
  }

  private async fetchOddsFromAPI(homeTeam: string, awayTeam: string) {
    const markets = ['totals', 'btts', 'total_cards', 'total_corners', 'most_cards'].join(',');
    const url = `${BASE_URL}/sports/${SPORT_KEY}/odds?apiKey=${API_KEY}&regions=uk&markets=${markets}&oddsFormat=decimal`;

    console.log(`[OddsAPI] Fetching from API for ${homeTeam} vs ${awayTeam}...`);

    let data: APIMatchData[] = [];
    try {
      const res = await fetch(url);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[OddsAPI] HTTP ${res.status}:`, errorText.slice(0, 200));
        return null;
      }

      const text = await res.text();
      console.log('[OddsAPI] Response received, length:', text.length);
      console.log('[OddsAPI] Response preview:', text.slice(0, 300));

      // Safely parse JSON
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('[OddsAPI] JSON parse error:', parseErr);
        console.error('[OddsAPI] Invalid JSON response:', text.slice(0, 500));
        return null;
      }

      if (!Array.isArray(data)) {
        console.error('[OddsAPI] Response is not an array:', typeof data);
        return null;
      }
      
      console.log(`[OddsAPI] Found ${data.length} matches in response`);
    } catch (err) {
      console.error('[OddsAPI] Network error:', err);
      return null;
    }

    // Normalize input teams for comparison
    const inputHome = normalizeTeamName(homeTeam);
    const inputAway = normalizeTeamName(awayTeam);
    console.log(`[OddsAPI] Looking for: ${inputHome} vs ${inputAway}`);

    const match = data.find(m => {
      // Normalize both API teams
      const apiHome = normalizeTeamName(m.home_team);
      const apiAway = normalizeTeamName(m.away_team);
      
      console.log(`[OddsAPI] Checking: API(${apiHome} vs ${apiAway}) with Input(${inputHome} vs ${inputAway})`);
      
      // Logic for matching home/away or away/home
      return (apiHome === inputHome && apiAway === inputAway) || 
             (apiHome === inputAway && apiAway === inputHome);
    });
    
    if (!match) {
      console.error(`[OddsAPI] ❌ No match found for ${inputHome} vs ${inputAway}`);
      console.error('[OddsAPI] Available matches:', data.slice(0, 5).map(m => 
        `${m.home_team} vs ${m.away_team}`
      ).join(', '));
      return null;
    }

    console.log(`[OddsAPI] ✅ Match found: ${match.home_team} vs ${match.away_team}`);
    console.log(`[OddsAPI] Bookmakers available: ${match.bookmakers.length}`);

    const bookmaker = match.bookmakers.find(b => b.key === BOOKMAKER_KEY) || match.bookmakers[0];
    if (!bookmaker) {
      console.error('[OddsAPI] No bookmaker data found');
      return null;
    }

    console.log(`[OddsAPI] Using bookmaker: ${bookmaker.title}`);
    console.log(`[OddsAPI] Markets available: ${bookmaker.markets.map(m => m.key).join(', ')}`);

    return this.extractOdds(bookmaker);
  }

  private extractOdds(bookmaker: OddsBookmaker) {
    const totalGoals = bookmaker.markets.find(m => m.key === 'totals');
    const btts = bookmaker.markets.find(m => m.key === 'btts');
    const totalCards = bookmaker.markets.find(m => m.key === 'total_cards');
    const totalCorners = bookmaker.markets.find(m => m.key === 'total_corners');
    const mostCards = bookmaker.markets.find(m => m.key === 'most_cards');

    const result = {
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

      totalCornersOdds: totalCorners ? {
        market: 'Over/Under 9.5 Corners',
        overOdds: totalCorners.outcomes.find(o => o.name === 'Over' && o.point === 9.5)?.price || 0,
        underOdds: totalCorners.outcomes.find(o => o.name === 'Under' && o.point === 9.5)?.price || 0,
      } : undefined,

      mostCardsOdds: mostCards ? {
        market: 'Most Cards',
        homeOdds: mostCards.outcomes.find(o => o.name === 'Home')?.price || 0,
        awayOdds: mostCards.outcomes.find(o => o.name === 'Away')?.price || 0,
        drawOdds: mostCards.outcomes.find(o => o.name === 'Draw')?.price || 0,
      } : undefined,
    };

    console.log('[OddsAPI] Extracted odds:', {
      goals: !!result.totalGoalsOdds,
      btts: !!result.bttsOdds,
      cards: !!result.totalCardsOdds,
      corners: !!result.totalCornersOdds,
      mostCards: !!result.mostCardsOdds,
    });

    return result;
  }

  public clearCache() { 
    this.oddsCache.clear();
    console.log('[OddsAPI] Cache cleared');
  }
}

export const oddsAPIService = new OddsAPIService();