// src/services/api/footballDataService.ts
export interface ApiFootballMatch {
  id: number;
  date: string;
  timestamp: number;
  status: {
    long: string;
    short: string;
    elapsed: number | null;
  };
  round: string;
  homeTeam: {
    id: number;
    name: string;
    logo: string;
  };
  awayTeam: {
    id: number;
    name: string;
    logo: string;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  venue: {
    name?: string;
    city?: string;
  };
  league: {
    id: number;
    name: string;
    logo: string;
  };
}

export interface ApiFootballStanding {
  position: number;
  team: {
    id: number;
    name: string;
    logo: string;
  };
  points: number;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string[];
}

export interface ApiFootballTeam {
  id: number;
  name: string;
  code: string;
  founded: number;
  logo: string;
  venue: {
    name?: string;
    address?: string;
    city?: string;
    capacity?: number;
    surface?: string;
    image?: string;
  };
}

interface DataFileResponse<T> {
  data: T;
  lastUpdated: string;
  source: string;
}

class FootballDataService {
  private static instance: FootballDataService;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly cacheTimeout = 2 * 60 * 1000; // 2 minutes for client cache

  public static getInstance(): FootballDataService {
    if (!FootballDataService.instance) {
      FootballDataService.instance = new FootballDataService();
    }
    return FootballDataService.instance;
  }

  private async fetchDataFile<T>(filename: string): Promise<DataFileResponse<T>> {
    const cached = this.cache.get(filename);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(`/data/${filename}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${filename}: ${response.status}`);
      }
      
      const data: DataFileResponse<T> = await response.json();
      
      // Cache the response
      this.cache.set(filename, {
        data,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      console.error(`Error fetching ${filename}:`, error);
      throw error;
    }
  }

  public async getFixtures(): Promise<ApiFootballMatch[]> {
    const response = await this.fetchDataFile<ApiFootballMatch[]>('fixtures.json');
    return response.data;
  }

  public async getStandings(): Promise<ApiFootballStanding[]> {
    const response = await this.fetchDataFile<ApiFootballStanding[]>('standings.json');
    return response.data;
  }

  public async getTeams(): Promise<ApiFootballTeam[]> {
    const response = await this.fetchDataFile<ApiFootballTeam[]>('teams.json');
    return response.data;
  }

  public async getUpcomingFixtures(limit?: number): Promise<ApiFootballMatch[]> {
    const fixtures = await this.getFixtures();
    const now = Date.now() / 1000; // Convert to seconds for comparison
    
    const upcoming = fixtures
      .filter(match => match.timestamp > now)
      .sort((a, b) => a.timestamp - b.timestamp);
    
    return limit ? upcoming.slice(0, limit) : upcoming;
  }

  public async getLiveMatches(): Promise<ApiFootballMatch[]> {
    const fixtures = await this.getFixtures();
    
    return fixtures.filter(match => 
      ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(match.status.short)
    );
  }

  public async getFinishedMatches(limit?: number): Promise<ApiFootballMatch[]> {
    const fixtures = await this.getFixtures();
    
    const finished = fixtures
      .filter(match => match.status.short === 'FT')
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
    
    return limit ? finished.slice(0, limit) : finished;
  }

  public async getTodayMatches(): Promise<ApiFootballMatch[]> {
    const fixtures = await this.getFixtures();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    return fixtures.filter(match => 
      match.date.startsWith(todayStr)
    );
  }

  public async getMatchesByRound(round: string): Promise<ApiFootballMatch[]> {
    const fixtures = await this.getFixtures();
    return fixtures.filter(match => match.round === round);
  }

  public async getTeamNextMatch(teamId: number): Promise<ApiFootballMatch | null> {
    const fixtures = await this.getUpcomingFixtures();
    
    return fixtures.find(match => 
      match.homeTeam.id === teamId || match.awayTeam.id === teamId
    ) || null;
  }

  public async getTeamLastMatch(teamId: number): Promise<ApiFootballMatch | null> {
    const fixtures = await this.getFinishedMatches();
    
    return fixtures.find(match => 
      match.homeTeam.id === teamId || match.awayTeam.id === teamId
    ) || null;
  }

  public async getTopSix(): Promise<ApiFootballStanding[]> {
    const standings = await this.getStandings();
    return standings.slice(0, 6);
  }

  public async getRelegationZone(): Promise<ApiFootballStanding[]> {
    const standings = await this.getStandings();
    return standings.slice(-3); // Last 3 teams
  }

  public async getDataFreshness(): Promise<{
    fixtures: string;
    standings: string;
    teams: string;
  }> {
    try {
      const [fixtures, standings, teams] = await Promise.all([
        this.fetchDataFile('fixtures.json'),
        this.fetchDataFile('standings.json'),
        this.fetchDataFile('teams.json')
      ]);

      return {
        fixtures: fixtures.lastUpdated,
        standings: standings.lastUpdated,
        teams: teams.lastUpdated
      };
    } catch (error) {
      console.error('Error getting data freshness:', error);
      return {
        fixtures: 'unknown',
        standings: 'unknown',
        teams: 'unknown'
      };
    }
  }

  public clearCache(): void {
    this.cache.clear();
  }

  // Helper methods for status checking
  public static isMatchLive(match: ApiFootballMatch): boolean {
    return ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(match.status.short);
  }

  public static isMatchFinished(match: ApiFootballMatch): boolean {
    return ['FT', 'AET', 'PEN'].includes(match.status.short);
  }

  public static isMatchUpcoming(match: ApiFootballMatch): boolean {
    return ['TBD', 'NS'].includes(match.status.short);
  }

  public static isMatchPostponed(match: ApiFootballMatch): boolean {
    return ['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(match.status.short);
  }

  public static formatMatchTime(match: ApiFootballMatch): string {
    if (this.isMatchLive(match)) {
      return `${match.status.elapsed || 0}'`;
    }
    
    if (this.isMatchFinished(match)) {
      return 'FT';
    }
    
    if (this.isMatchUpcoming(match)) {
      const date = new Date(match.date);
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
    
    return match.status.long;
  }
}

export default FootballDataService;
