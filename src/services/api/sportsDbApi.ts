// src/services/api/sportsDbApi.ts
const SPORTS_DB_BASE_URL = `https://www.thesportsdb.com/api/v1/json/123`;
export const PREMIER_LEAGUE_ID = '4328';
const currentSeason = '2025-2026';

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
  dateEvent: string; // FIXED: Use correct field names from API
  strTime: string;   // FIXED: Use correct field names from API
  strTimestamp?: string; // FIXED: Add timestamp field
  dateEventLocal?: string;
  strTimeLocal?: string;
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
  strForm?: string;
}

// FIXED: Add interface for league table
export interface SportsDbTableEntry {
  idTeam: string;
  strTeam: string;
  strForm?: string;
  intRank?: string;
  intPlayed?: string;
  intWin?: string;
  intLoss?: string;
  intDraw?: string;
}

interface CachedData<T> {
  data: T;
  timestamp: number;
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
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
    const response = await this.fetchWithCache<{ events: SportsDbEvent[] }>(url, 'upcoming-fixtures');
    return response.events || [];
  }

  // Get current season fixtures
  async getCurrentSeasonFixtures(): Promise<SportsDbEvent[]> {
    const url = `${SPORTS_DB_BASE_URL}/eventsseason.php?id=${PREMIER_LEAGUE_ID}&s=${currentSeason}`;
    const response = await this.fetchWithCache<{ events: SportsDbEvent[] }>(url, `fixtures-${currentSeason}`);
    return response.events || [];
  }

  // Get team details by ID
  async getTeamById(teamId: string): Promise<SportsDbTeam | null> {
    const url = `${SPORTS_DB_BASE_URL}/lookupteam.php?id=${teamId}`;
    const response = await this.fetchWithCache<{ teams: SportsDbTeam[] }>(url, `team-${teamId}`);
    return response.teams?.[0] || null;
  }

  // FIXED: Get all Premier League teams (for getting short names)
  async getAllPremierLeagueTeams(): Promise<SportsDbTeam[]> {
    const url = `${SPORTS_DB_BASE_URL}/lookup_all_teams.php?id=${PREMIER_LEAGUE_ID}`;
    try {
      const response = await this.fetchWithCache<{ teams: SportsDbTeam[] }>(url, 'all-pl-teams');
      return response.teams || [];
    } catch (error) {
      console.error('Error fetching all teams:', error);
      return [];
    }
  }

  // Get league details
  async getLeagueDetails(): Promise<SportsDbLeague | null> {
    const url = `${SPORTS_DB_BASE_URL}/lookupleague.php?id=${PREMIER_LEAGUE_ID}&s=${currentSeason}`;
    const response = await this.fetchWithCache<{ leagues: SportsDbLeague[] }>(url, 'premier-league');
    return response.leagues?.[0] || null;
  }

  // FIXED: Get team's last 5 matches for form using league table
  async getTeamForm(teamId: string): Promise<('W'|'D'|'L')[]> {
    const url = `${SPORTS_DB_BASE_URL}/lookuptable.php?l=${PREMIER_LEAGUE_ID}&s=${currentSeason}`;
    try {
      const response = await this.fetchWithCache<{ table: SportsDbTableEntry[] }>(url, `table-${currentSeason}`);
      const teamRow = response.table?.find(row => row.idTeam === teamId);
      
      if (!teamRow?.strForm) {
        console.log(`No form data found for team ${teamId}`);
        return [];
      }

      // strForm is most recent first; reverse for oldest → newest, take last 5
      const formArray = teamRow.strForm.split('').slice(0, 5).reverse() as ('W'|'D'|'L')[];
      console.log(`Form for team ${teamId}:`, formArray);
      return formArray;
    } catch (error) {
      console.error(`Error fetching form for team ${teamId}:`, error);
      return [];
    }
  }

  // FIXED: Get the full league table for better team data
  async getLeagueTable(): Promise<SportsDbTableEntry[]> {
    const url = `${SPORTS_DB_BASE_URL}/lookuptable.php?l=${PREMIER_LEAGUE_ID}&s=${currentSeason}`;
    try {
      const response = await this.fetchWithCache<{ table: SportsDbTableEntry[] }>(url, `table-${currentSeason}`);
      return response.table || [];
    } catch (error) {
      console.error('Error fetching league table:', error);
      return [];
    }
  }

  // FIXED: Combine date and time from API response
  static combineDateTime(dateEvent: string, strTime: string, strTimestamp?: string): string {
    // If we have a timestamp, use that (it's in ISO format)
    if (strTimestamp) {
      return strTimestamp;
    }
    
    // Otherwise combine date and time
    if (dateEvent && strTime) {
      return `${dateEvent}T${strTime}`;
    }
    
    // Fallback
    return dateEvent || 'TBD';
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }
}
