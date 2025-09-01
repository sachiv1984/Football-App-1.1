// src/services/api/footballDataApi.ts
// 🔥 TEMPORARY CORS FIX - Use proxy for production
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const FOOTBALL_DATA_BASE_URL = isLocalhost 
  ? 'https://api.football-data.org/v4'  // Direct API for localhost
  : 'https://corsproxy.io/?https://api.football-data.org/v4'; // Proxy for production

export const PREMIER_LEAGUE_ID = 'PL';

const API_TOKEN = process.env.REACT_APP_FOOTBALL_DATA_TOKEN;

if (!API_TOKEN || API_TOKEN === 'YOUR_API_TOKEN_HERE') {
  console.warn('⚠️ Football Data API token not configured. Please set REACT_APP_FOOTBALL_DATA_TOKEN in your .env file');
}

// ... rest of your interfaces stay the same ...

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
    tla: string;
    crest: string;
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
  form: string;
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
    'X-Auth-Token': API_TOKEN || '',
    'Content-Type': 'application/json'
  };
  private requestQueue: Promise<unknown> = Promise.resolve();
  private lastRequestTime: number = 0;
  private readonly minRequestInterval = 6000; // 6 seconds between requests (10/min limit)

  private constructor() {
    console.log(`🌐 API Mode: ${isLocalhost ? 'Direct (localhost)' : 'Proxy (production)'}`);
    console.log(`🔗 Base URL: ${FOOTBALL_DATA_BASE_URL}`);
  }

  public static getInstance(): FootballDataApi {
    if (!FootballDataApi.instance) {
      FootballDataApi.instance = new FootballDataApi();
    }
    return FootballDataApi.instance;
  }

  // Add rate limiting
  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minRequestInterval) {
      const delay = this.minRequestInterval - timeSinceLastRequest;
      console.log(`⏳ Throttling request for ${delay}ms to respect rate limits`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Enhanced error handling and logging
  private async fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
    const cached = this.cache.get(cacheKey) as CachedData<T> | undefined;
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`📦 Using cached data for: ${cacheKey}`);
      return cached.data;
    }

    // Queue requests to avoid hitting rate limits
    return this.requestQueue = this.requestQueue.then(async () => {
      try {
        await this.throttleRequest();
        
        console.log(`🌐 Making API request to: ${url}`);
        
        const response = await fetch(url, { headers: this.headers });
        
        // Enhanced error handling
        if (!response.ok) {
          console.error(`❌ API Error: ${response.status} - ${response.statusText}`);
          
          let errorMessage: string;
          try {
            const errorBody = await response.text();
            console.error('Error body:', errorBody);
            errorMessage = errorBody || response.statusText;
          } catch {
            errorMessage = response.statusText;
          }

          switch (response.status) {
            case 403:
              throw new Error('Invalid API token or insufficient permissions. Please check your REACT_APP_FOOTBALL_DATA_TOKEN.');
            case 429:
              throw new Error('Rate limit exceeded. Please wait before making more requests.');
            case 404:
              throw new Error(`Resource not found: ${url}`);
            case 500:
              throw new Error('Football Data API server error. Please try again later.');
            default:
              throw new Error(`HTTP error! status: ${response.status} - ${errorMessage}`);
          }
        }
        
        const data: T = await response.json();
        
        // Log successful request
        console.log(`✅ Successfully fetched data for: ${cacheKey}`);
        
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (error) {
        console.error(`💥 Error fetching from ${url}:`, error);
        
        // If we have cached data, return it as fallback
        if (cached) {
          console.log(`🔄 Using stale cached data as fallback for: ${cacheKey}`);
          return cached.data;
        }
        
        throw error;
      }
    });
  }

  // Test API connection
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing API connection...');
      const response = await fetch(`${FOOTBALL_DATA_BASE_URL}/competitions`, {
        headers: this.headers
      });
      
      if (response.ok) {
        console.log('✅ API connection successful');
        return true;
      } else {
        console.error('❌ API connection failed:', response.status, response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      return false;
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

    try {
      const response = await this.fetchWithCache<{ matches: FootballDataMatch[] }>(
        url, 
        `matches-${PREMIER_LEAGUE_ID}-${status || 'all'}`
      );
      return response.matches || [];
    } catch (error) {
      console.error('Error fetching current season matches:', error);
      return [];
    }
  }

  // Get matches for a specific matchday
  async getMatchesByMatchday(matchday: number): Promise<FootballDataMatch[]> {
    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${PREMIER_LEAGUE_ID}/matches?matchday=${matchday}`;
    
    try {
      const response = await this.fetchWithCache<{ matches: FootballDataMatch[] }>(
        url, 
        `matches-${PREMIER_LEAGUE_ID}-md${matchday}`
      );
      return response.matches || [];
    } catch (error) {
      console.error(`Error fetching matches for matchday ${matchday}:`, error);
      return [];
    }
  }

  // Get upcoming matches (next few matchdays)
  async getUpcomingMatches(limit: number = 20): Promise<FootballDataMatch[]> {
    try {
      const matches = await this.getCurrentSeasonMatches('SCHEDULED');
      return matches.slice(0, limit);
    } catch (error) {
      console.error('Error fetching upcoming matches:', error);
      return [];
    }
  }

  // Get team details by ID
  async getTeamById(teamId: number): Promise<FootballDataTeam | undefined> {
    const url = `${FOOTBALL_DATA_BASE_URL}/teams/${teamId}`;
    
    try {
      const response = await this.fetchWithCache<FootballDataTeam>(url, `team-${teamId}`);
      return response;
    } catch (error) {
      console.error(`Error fetching team ${teamId}:`, error);
      return undefined;
    }
  }

  // Get Premier League standings (includes form data!)
  async getStandings(): Promise<FootballDataStanding[]> {
    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${PREMIER_LEAGUE_ID}/standings`;
    
    try {
      const response = await this.fetchWithCache<{ 
        standings: Array<{ 
          stage: string;
          type: string;
          table: FootballDataStanding[] 
        }> 
      }>(url, `standings-${PREMIER_LEAGUE_ID}`);
      
      // Return the main league table
      return response.standings?.[0]?.table || [];
    } catch (error) {
      console.error('Error fetching standings:', error);
      return [];
    }
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
    
    try {
      const response = await this.fetchWithCache<FootballDataCompetition>(url, `competition-${PREMIER_LEAGUE_ID}`);
      return response;
    } catch (error) {
      console.error('Error fetching competition details:', error);
      return undefined;
    }
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
    console.log('🗑️ Clearing API cache');
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
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

  // Helper method to format date properly
  static formatDateTime(utcDate: string): string {
    return utcDate; // Football-Data already provides proper ISO timestamps
  }
}
