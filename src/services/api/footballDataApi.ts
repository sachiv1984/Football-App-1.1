// src/services/api/footballDataApi.ts
const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
export const PREMIER_LEAGUE_ID = 'PL'; // Premier League code in Football-Data.org
// const currentSeason = '2024'; // Football-Data uses year format

// Add your API token here or use environment variable
const API_TOKEN = process.env.REACT_APP_FOOTBALL_DATA_TOKEN || 'YOUR_API_TOKEN_HERE';

export interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED';
  matchday: number;
  stage: string;
  homeTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string; // Three Letter Abbreviation
    crest: string; // Team logo URL
  };
  awayTeam: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT';
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
    regularTime: { home: number | null; away: number | null };
    extraTime: { home: number | null; away: number | null };
    penalties: { home: number | null; away: number | null };
  };
  venue?: string;
  competition: {
    id: number;
    name: string;
    code: string;
    type: string;
    emblem: string;
  };
  season: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
  };
  area: {
    id: number;
    name: string;
    code: string;
    flag: string;
  };
}

export interface FootballDataTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
  address: string;
  website: string;
  founded: number;
  clubColors: string;
  venue: string;
  lastUpdated: string;
  area: {
    id: number;
    name: string;
    code: string;
    flag: string;
  };
  coach?: {
    id: number;
    firstName: string;
    lastName: string;
    name: string;
    dateOfBirth: string;
    nationality: string;
  };
  squad?: Array<{
    id: number;
    name: string;
    position: string;
    dateOfBirth: string;
    nationality: string;
  }>;
}

export interface FootballDataStanding {
  position: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  playedGames: number;
  form: string; // Last 5 games: "W,L,W,D,W"
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface FootballDataCompetition {
  id: number;
  area: {
    id: number;
    name: string;
    code: string;
    flag: string;
  };
  name: string;
  code: string;
  type: string;
  emblem: string;
  currentSeason: {
    id: number;
    startDate: string;
    endDate: string;
    currentMatchday: number;
    winner: string;
  };
}

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export class FootballDataApi {
  private static instance: FootballDataApi;
  private cache: Map<string, CachedData<unknown>> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private readonly headers = {
    'X-Auth-Token': API_TOKEN,
    'Content-Type': 'application/json'
  };

  private constructor() {}

  public static getInstance(): FootballDataApi {
    if (!FootballDataApi.instance) {
      FootballDataApi.instance = new FootballDataApi();
    }
    return FootballDataApi.instance;
  }

  private async fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
    const cached = this.cache.get(cacheKey) as CachedData<T> | undefined;
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(url, { headers: this.headers });
      
      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please wait before making more requests.');
        }
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

  // Get Premier League matches for current season
  async getCurrentSeasonMatches(status?: 'SCHEDULED' | 'FINISHED'): Promise<FootballDataMatch[]> {
    let url = `${FOOTBALL_DATA_BASE_URL}/competitions/${PREMIER_LEAGUE_ID}/matches`;
    const params = new URLSearchParams();
    
    if (status) {
      params.append('status', status);
    }
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await this.fetchWithCache<{ matches: FootballDataMatch[] }>(
      url, 
      `matches-${PREMIER_LEAGUE_ID}-${status || 'all'}`
    );
    return response.matches || [];
  }

  // Get matches for a specific matchday
  async getMatchesByMatchday(matchday: number): Promise<FootballDataMatch[]> {
    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${PREMIER_LEAGUE_ID}/matches?matchday=${matchday}`;
    const response = await this.fetchWithCache<{ matches: FootballDataMatch[] }>(
      url, 
      `matches-${PREMIER_LEAGUE_ID}-md${matchday}`
    );
    return response.matches || [];
  }

  // Get upcoming matches (next few matchdays)
  async getUpcomingMatches(limit: number = 20): Promise<FootballDataMatch[]> {
    const matches = await this.getCurrentSeasonMatches('SCHEDULED');
    return matches.slice(0, limit);
  }

  // Get team details by ID
  async getTeamById(teamId: number): Promise<FootballDataTeam | undefined> {
    const url = `${FOOTBALL_DATA_BASE_URL}/teams/${teamId}`;
    const response = await this.fetchWithCache<FootballDataTeam>(url, `team-${teamId}`);
    return response;
  }

  // Get Premier League standings (includes form data!)
  async getStandings(): Promise<FootballDataStanding[]> {
    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${PREMIER_LEAGUE_ID}/standings`;
    const response = await this.fetchWithCache<{ 
      standings: Array<{ 
        stage: string;
        type: string;
        table: FootballDataStanding[] 
      }> 
    }>(url, `standings-${PREMIER_LEAGUE_ID}`);
    
    // Return the main league table
    return response.standings?.[0]?.table || [];
  }

  // Get team form from standings
  async getTeamForm(teamId: number): Promise<('W'|'D'|'L')[]> {
    try {
      const standings = await this.getStandings();
      const teamStanding = standings.find(standing => standing.team.id === teamId);
      
      if (!teamStanding?.form) {
        return [];
      }

      // Form comes as "W,L,W,D,W" - split and convert to our format
      return teamStanding.form.split(',').map(result => {
        switch(result.trim()) {
          case 'W': return 'W';
          case 'D': return 'D';
          case 'L': return 'L';
          default: return 'D'; // fallback
        }
      }) as ('W'|'D'|'L')[];
    } catch (error) {
      console.error(`Error fetching form for team ${teamId}:`, error);
      return [];
    }
  }

  // Get competition details
  async getCompetitionDetails(): Promise<FootballDataCompetition | undefined> {
    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${PREMIER_LEAGUE_ID}`;
    const response = await this.fetchWithCache<FootballDataCompetition>(url, `competition-${PREMIER_LEAGUE_ID}`);
    return response;
  }

  // Get current matchday
  async getCurrentMatchday(): Promise<number> {
    try {
      const competition = await this.getCompetitionDetails();
      return competition?.currentSeason?.currentMatchday || 1;
    } catch (error) {
      console.error('Error getting current matchday:', error);
      return 1;
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Helper method to convert form string to array
  static parseForm(formString: string): ('W'|'D'|'L')[] {
    if (!formString) return [];
    return formString.split(',').map(result => {
      switch(result.trim()) {
        case 'W': return 'W';
        case 'D': return 'D';
        case 'L': return 'L';
        default: return 'D';
      }
    }) as ('W'|'D'|'L')[];
  }

  // Helper method to format date properly (no UTC issues!)
  static formatDateTime(utcDate: string): string {
    return utcDate; // Football-Data already provides proper ISO timestamps
  }
}
