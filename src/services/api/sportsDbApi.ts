// src/services/api/sportsDbApi.ts
const SPORTS_DB_API_KEY = process.env.REACT_APP_SPORTSDB_API_KEY || '123'; // Fallback to free tier
const SPORTS_DB_BASE_URL = `https://www.thesportsdb.com/api/v1/json/${SPORTS_DB_API_KEY}`;
export const PREMIER_LEAGUE_ID = '4328';

export interface SportsDbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamShort?: string;
  strAwayTeamShort?: string;
  idHomeTeam: string;
  idAwayTeam: string;
  strVenue: string;
  strDate: string;
  strTime: string;
  intRound: string;
  strLeague: string;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
  strStatus?: string;
}

export interface SportsDbTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort?: string;
  strTeamBadge?: string;
  strStadium?: string;
  strLeague: string;
}

export interface SportsDbLeague {
  idLeague: string;
  strLeague: string;
  strSport: string;
  strLeagueBadge?: string;
  strLogo?: string;
  strCountry: string;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

interface Match {
  idHomeTeam: string;
  idAwayTeam: string;
  intHomeScore: string;
  intAwayScore: string;
}

export class SportsDbApi {
  private static instance: SportsDbApi;
  private cache: Map<string, CachedData<unknown>> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private constructor() {}

  public static getInstance(): SportsDbApi {
    if (!SportsDbApi.instance) {
      SportsDbApi.instance = new SportsDbApi();
    }
    return SportsDbApi.instance;
  }

  private async fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
    const cached = this.cache.get(cacheKey) as CachedData<T> | undefined;
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: T = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error(`Error fetching from ${url}:`, error);
      throw error;
    }
  }

  // Get upcoming Premier League fixtures
  async getUpcomingFixtures(): Promise<SportsDbEvent[]> {
    const url = `${SPORTS_DB_BASE_URL}/eventsnextleague.php?id=${PREMIER_LEAGUE_ID}`;
    console.log('Fetching upcoming fixtures from:', url);
    const response = await this.fetchWithCache<{ events: SportsDbEvent[] }>(url, 'upcoming-fixtures');
    console.log('Upcoming fixtures response:', response);
    return response.events || [];
  }

  // Get current season fixtures (2025-2026)
  async getCurrentSeasonFixtures(): Promise<SportsDbEvent[]> {
    const currentSeason = '2025-2026';
    const url = `${SPORTS_DB_BASE_URL}/eventsseason.php?id=${PREMIER_LEAGUE_ID}&s=${currentSeason}`;
    console.log('Fetching season fixtures from:', url);
    const response = await this.fetchWithCache<{ events: SportsDbEvent[] }>(url, `fixtures-${currentSeason}`);
    console.log('Season fixtures response:', response);
    return response.events || [];
  }

  // Get recent results from current season
  async getRecentResults(): Promise<SportsDbEvent[]> {
    const allFixtures = await this.getCurrentSeasonFixtures();
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return allFixtures.filter(fixture => {
      const fixtureDate = new Date(fixture.strDate);
      return fixtureDate < today && fixture.strStatus === 'Match Finished';
    }).sort((a, b) => new Date(b.strDate).getTime() - new Date(a.strDate).getTime());
  }

  // Get upcoming fixtures from current season
  async getUpcomingFixturesFromSeason(): Promise<SportsDbEvent[]> {
    const allFixtures = await this.getCurrentSeasonFixtures();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return allFixtures.filter(fixture => {
      const fixtureDate = new Date(fixture.strDate);
      return fixtureDate >= today && (!fixture.strStatus || fixture.strStatus === '' || fixture.strStatus === 'Not Started');
    }).sort((a, b) => new Date(a.strDate).getTime() - new Date(b.strDate).getTime());
  }

  // Get team details by ID
  async getTeamById(teamId: string): Promise<SportsDbTeam | null> {
    const url = `${SPORTS_DB_BASE_URL}/lookupteam.php?id=${teamId}`;
    const response = await this.fetchWithCache<{ teams: SportsDbTeam[] }>(url, `team-${teamId}`);
    return response.teams?.[0] || null;
  }

  // Get league details
  async getLeagueDetails(): Promise<SportsDbLeague | null> {
    const url = `${SPORTS_DB_BASE_URL}/lookupleague.php?id=${PREMIER_LEAGUE_ID}`;
    console.log('Fetching league details from:', url);
    const response = await this.fetchWithCache<{ leagues: SportsDbLeague[] }>(url, 'premier-league');
    console.log('League details response:', response);
    return response.leagues?.[0] || null;
  }

  // Get team's last 5 matches for form
  async getTeamForm(teamId: string): Promise<string[]> {
    const url = `${SPORTS_DB_BASE_URL}/eventslast.php?id=${teamId}`;
    try {
      const response = await this.fetchWithCache<{ results: Match[] }>(url, `form-${teamId}`);
      return (response.results || [])
        .slice(0, 5)
        .map((match: Match) => {
          const isHome = match.idHomeTeam === teamId;
          const teamScore = isHome ? parseInt(match.intHomeScore) : parseInt(match.intAwayScore);
          const opponentScore = isHome ? parseInt(match.intAwayScore) : parseInt(match.intHomeScore);

          if (teamScore > opponentScore) return 'W';
          if (teamScore < opponentScore) return 'L';
          return 'D';
        });
    } catch (error) {
      console.error(`Error fetching form for team ${teamId}:`, error);
      return [];
    }
  }

  // Clear cache (useful for testing or manual refresh)
  clearCache(): void {
    this.cache.clear();
  }
}
