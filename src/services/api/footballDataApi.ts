// src/services/api/footballDataApi.ts
const FOOTBALL_DATA_BASE_URL = 'https://api.football-data.org/v4';
export const PREMIER_LEAGUE_ID = 'PL';

const API_TOKEN = process.env.REACT_APP_FOOTBALL_DATA_TOKEN;

if (!API_TOKEN) {
  console.error('❌ REACT_APP_FOOTBALL_DATA_TOKEN is not set. Please check your environment variables.');
}

export interface FootballDataMatch {
  id: number;
  utcDate: string;
  status: 'SCHEDULED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'SUSPENDED' | 'CANCELLED';
  matchday: number;
  stage: string;
  homeTeam: { id: number; name: string; shortName: string; tla: string; crest: string; };
  awayTeam: { id: number; name: string; shortName: string; tla: string; crest: string; };
  score: { winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null; duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT'; fullTime: { home: number | null; away: number | null }; };
  venue?: string;
  competition: { id: number; name: string; code: string; type: string; emblem: string; };
}

export interface FootballDataStanding {
  position: number;
  team: { id: number; name: string; shortName: string; tla: string; crest: string; };
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

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export class FootballDataApi {
  private static instance: FootballDataApi;
  private cache: Map<string, CachedData<unknown>> = new Map();
  private readonly cacheTimeout = 5 * 60 * 1000;
  private readonly headers = {
    'X-Auth-Token': API_TOKEN || '',
    'Content-Type': 'application/json'
  };
  private requestQueue: Promise<void> = Promise.resolve();
  private lastRequestTime: number = 0;
  private readonly minRequestInterval = 6000;

  private constructor() {}

  public static getInstance(): FootballDataApi {
    if (!FootballDataApi.instance) {
      FootballDataApi.instance = new FootballDataApi();
    }
    return FootballDataApi.instance;
  }

  private async throttleRequest(): Promise<void> {
    const now = Date.now();
    const diff = now - this.lastRequestTime;
    if (diff < this.minRequestInterval) await new Promise(r => setTimeout(r, this.minRequestInterval - diff));
    this.lastRequestTime = Date.now();
  }

  private async fetchWithCache<T>(url: string, cacheKey: string): Promise<T> {
    const cached = this.cache.get(cacheKey) as CachedData<T> | undefined;
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) return cached.data;

    const result = await this.requestQueue.then(async (): Promise<T> => {
      try {
        await this.throttleRequest();
        const res = await fetch(url, { headers: this.headers });
        if (!res.ok) throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
        const data: T = await res.json();
        this.cache.set(cacheKey, { data, timestamp: Date.now() });
        return data;
      } catch (err) {
        if (cached) return cached.data;
        throw err;
      }
    });

    this.requestQueue = this.requestQueue.then(() => {}).catch(() => {});
    return result;
  }

  public async getCurrentSeasonMatches(status?: 'SCHEDULED' | 'FINISHED'): Promise<FootballDataMatch[]> {
    let url = `${FOOTBALL_DATA_BASE_URL}/competitions/${PREMIER_LEAGUE_ID}/matches`;
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (params.toString()) url += `?${params.toString()}`;
    const response = await this.fetchWithCache<{ matches: FootballDataMatch[] }>(url, `matches-${PREMIER_LEAGUE_ID}-${status || 'all'}`);
    return response.matches || [];
  }

  public async getMatchesByMatchday(matchday: number): Promise<FootballDataMatch[]> {
    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${PREMIER_LEAGUE_ID}/matches?matchday=${matchday}`;
    const response = await this.fetchWithCache<{ matches: FootballDataMatch[] }>(url, `matches-${PREMIER_LEAGUE_ID}-md${matchday}`);
    return response.matches || [];
  }

  public async getUpcomingMatches(limit: number = 20): Promise<FootballDataMatch[]> {
    const matches = await this.getCurrentSeasonMatches('SCHEDULED');
    return matches.slice(0, limit);
  }

  public async getStandings(): Promise<FootballDataStanding[]> {
    const url = `${FOOTBALL_DATA_BASE_URL}/competitions/${PREMIER_LEAGUE_ID}/standings`;
    const response = await this.fetchWithCache<{ standings: Array<{ table: FootballDataStanding[] }> }>(url, `standings-${PREMIER_LEAGUE_ID}`);
    return response.standings?.[0]?.table || [];
  }

  public clearCache(): void {
    this.cache.clear();
  }

  public static parseForm(formString: string): ('W'|'D'|'L')[] {
    if (!formString) return [];
    return formString.split(',').map(f => (['W','D','L'].includes(f.trim()) ? f.trim() as 'W'|'D'|'L' : 'D'));
  }

  public static formatDateTime(utcDate: string): string {
    return utcDate;
  }
}
