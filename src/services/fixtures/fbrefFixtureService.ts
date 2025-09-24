// src/services/fixtures/fbrefFixtureService.ts
import type { FeaturedFixtureWithImportance } from '../../types';
import { supabase } from '../supabaseClient'; // your Supabase client
import { normalizeTeamName, getDisplayTeamName, getTeamLogo, getCompetitionLogo } from '../../utils/teamUtils';

export interface TeamSeasonStats {
  team: string;
  recentForm: ('W' | 'D' | 'L')[];
  matchesPlayed: number;
  won: number;
  drawn: number;
  lost: number;
  //corners?: number; 
  //cornersAgainst?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  points?: number;
  // ... any other stats your fbrefStatsService expects
}

interface SupabaseFixture {
  id: string;
  datetime: string;        // Changed from dateTime to datetime
  hometeam: string;        // Likely lowercase based on the pattern
  awayteam: string;        // Likely lowercase based on the pattern
  homescore?: number;      // Likely lowercase based on the pattern
  awayscore?: number;      // Likely lowercase based on the pattern
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming';
  matchweek?: number;      // Likely lowercase based on the pattern
  venue?: string;
}

export class SupabaseFixtureService {
  private fixturesCache: FeaturedFixtureWithImportance[] = [];
  private teamStatsCache: Map<string, TeamSeasonStats> = new Map();
  private cacheTime = 0;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 min cache

  // ---------------- Cache helpers ----------------
  private isCacheValid(): boolean {
    return this.fixturesCache.length > 0 && Date.now() - this.cacheTime < this.cacheTimeout;
  }

  public clearCache(): void {
    this.fixturesCache = [];
    this.teamStatsCache.clear();
    this.cacheTime = 0;
    console.log('Supabase cache cleared');
  }

  // ---------------- Fetch fixtures ----------------
  private async fetchFixturesFromSupabase(): Promise<SupabaseFixture[]> {
  console.log('🔄 Fetching fixtures from Supabase...');
  
  try {
    const { data, error, status, statusText } = await supabase
      .from('fixtures')
      .select('*')
      .order('datetime', { ascending: true }); // Changed from dateTime to datetime

    // Log detailed error information
    if (error) {
      console.error('❌ Supabase fetch error details:', {
        error,
        status,
        statusText,
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      
      throw new Error(`Supabase Error (${error.code}): ${error.message}${error.hint ? ` - ${error.hint}` : ''}`);
    }

    console.log('✅ Supabase fetch successful:', {
      recordCount: data?.length || 0,
      status,
      statusText
    });

    if (!data || data.length === 0) {
      console.warn('⚠️ No fixtures found in database');
      return [];
    }

    // Log sample data structure
    console.log('📊 Sample fixture data:', data[0]);

    return (data || []).map(f => ({
      id: f.id,
      datetime: f.datetime,
      hometeam: normalizeTeamName(f.hometeam), // Updated field name
      awayteam: normalizeTeamName(f.awayteam), // Updated field name
      homescore: f.homescore,
      awayscore: f.awayscore,
      status: f.status || 'scheduled',
      matchweek: f.matchweek,
      venue: f.venue,
    }));

  } catch (err) {
    console.error('💥 Fetch fixtures error:', err);
    
    if (err instanceof Error) {
      throw err;
    }
    
    throw new Error('Unknown error occurred while fetching fixtures');
  }
}

  // ---------------- Calculate recent form ----------------
private calculateForm(fixtures: SupabaseFixture[]): Map<string, TeamSeasonStats> {
  const stats = new Map<string, TeamSeasonStats>();

  // Initialize stats for all teams
  fixtures.forEach(f => {
    if (!stats.has(f.hometeam)) {
      stats.set(f.hometeam, {
        team: f.hometeam,
        recentForm: [],
        matchesPlayed: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        // corners: 0,
        // cornersAgainst: 0
      });
    }
    if (!stats.has(f.awayteam)) {
      stats.set(f.awayteam, {
        team: f.awayteam,
        recentForm: [],
        matchesPlayed: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        // corners: 0,
        // cornersAgainst: 0
      });
    }
  });

  const finishedFixtures = fixtures.filter(f => f.status === 'finished');
  finishedFixtures.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

  finishedFixtures.forEach(f => {
    const homeStats = stats.get(f.hometeam)!;
    const awayStats = stats.get(f.awayteam)!;

    // Update matches played
    homeStats.matchesPlayed++;
    awayStats.matchesPlayed++;

    // Determine result
    const homeResult: 'W' | 'D' | 'L' = f.homescore! > f.awayscore! ? 'W'
      : f.homescore! < f.awayscore! ? 'L' : 'D';
    const awayResult: 'W' | 'D' | 'L' = f.awayscore! > f.homescore! ? 'W'
      : f.awayscore! < f.homescore! ? 'L' : 'D';

    // Update win/draw/loss counts
    if (homeResult === 'W') homeStats.won++;
    else if (homeResult === 'D') homeStats.drawn++;
    else homeStats.lost++;

    if (awayResult === 'W') awayStats.won++;
    else if (awayResult === 'D') awayStats.drawn++;
    else awayStats.lost++;

    // Update recent form (last 5 games)
    homeStats.recentForm.unshift(homeResult);
    if (homeStats.recentForm.length > 5) homeStats.recentForm.pop();

    awayStats.recentForm.unshift(awayResult);
    if (awayStats.recentForm.length > 5) awayStats.recentForm.pop();
  });

  return stats;
}

  // ---------------- Transform ----------------
private transformFixture(f: SupabaseFixture): FeaturedFixtureWithImportance {
  const homeForm = this.teamStatsCache.get(f.hometeam)?.recentForm || [];
  const awayForm = this.teamStatsCache.get(f.awayteam)?.recentForm || [];

  // Simple importance: live > scheduled > finished
  const importance = f.status === 'live' ? 10 : f.status === 'scheduled' ? 5 : 0;

  return {
    id: f.id,
    dateTime: f.datetime, // Convert to camelCase for your frontend
    homeTeam: {
      id: f.hometeam.replace(/\s+/g, '-').toLowerCase(),
      name: f.hometeam,
      shortName: getDisplayTeamName(f.hometeam),
      form: homeForm,
      logo: getTeamLogo({ name: f.hometeam }).logoPath,
      colors: {},
    },
    awayTeam: {
      id: f.awayteam.replace(/\s+/g, '-').toLowerCase(),
      name: f.awayteam,
      shortName: getDisplayTeamName(f.awayteam),
      form: awayForm,
      logo: getTeamLogo({ name: f.awayteam }).logoPath,
      colors: {},
    },
    venue: f.venue || 'TBD',
    competition: {
      id: 'premierLeague',
      name: 'Premier League',
      logo: getCompetitionLogo('Premier League') ?? undefined,
    },
    matchWeek: f.matchweek ?? 1,
    importance,
    importanceScore: importance,
    tags: [],
    isBigMatch: importance >= 8,
    status: f.status,
    homeScore: f.homescore ?? 0,
    awayScore: f.awayscore ?? 0,
  };
}

  // ---------------- Refresh Cache ----------------
private async refreshCache(): Promise<void> {
  const fixtures = await this.fetchFixturesFromSupabase();
  const teamStatsMap = this.calculateForm(fixtures);

  this.teamStatsCache.clear();
  teamStatsMap.forEach((stats, team) => {
    this.teamStatsCache.set(team, stats);
  });

  this.fixturesCache = fixtures.map(f => this.transformFixture(f));
  this.cacheTime = Date.now();
}

  // ---------------- Public Methods ----------------
  async getAllFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.fixturesCache;
  }

  // FIXED: Use matchweek-based logic instead of time-based
  async getCurrentGameWeekFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    
    // Find current gameweek: first gameweek with unfinished games
    const gameweekStats: Record<number, { total: number; finished: number }> = {};
    
    this.fixturesCache.forEach(fixture => {
      const gw = fixture.matchWeek;
      if (!gameweekStats[gw]) gameweekStats[gw] = { total: 0, finished: 0 };
      gameweekStats[gw].total++;
      if (fixture.status === 'finished') gameweekStats[gw].finished++;
    });

    // Find first gameweek with unfinished games
    let currentGameweek = 1;
    for (const [gw, stats] of Object.entries(gameweekStats)) {
      const gameweek = parseInt(gw);
      if (stats.finished < stats.total) {
        currentGameweek = gameweek;
        break;
      }
    }

    console.log(`Current gameweek: ${currentGameweek}`);
    
    return this.fixturesCache
      .filter(f => f.matchWeek === currentGameweek)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }

  // FIXED: Use current gameweek fixtures for accurate stats
  async getGameWeekInfo() {
    if (!this.isCacheValid()) await this.refreshCache();
    
    const currentWeekFixtures = await this.getCurrentGameWeekFixtures();
    
    if (currentWeekFixtures.length === 0) {
      return { 
        currentWeek: 1, 
        isComplete: false, 
        totalGames: 0, 
        finishedGames: 0, 
        upcomingGames: 0 
      };
    }

    const currentWeek = currentWeekFixtures[0].matchWeek;
    const totalGames = currentWeekFixtures.length;
    const finishedGames = currentWeekFixtures.filter(f => f.status === 'finished').length;
    const upcomingGames = totalGames - finishedGames;
    const isComplete = finishedGames === totalGames;

    return { 
      currentWeek, 
      isComplete, 
      totalGames, 
      finishedGames, 
      upcomingGames 
    };
  }

  async getTeamStats(teamName: string): Promise<TeamSeasonStats | null> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.teamStatsCache.get(normalizeTeamName(teamName)) || null;
  }

  async getAllTeamStats(): Promise<Map<string, TeamSeasonStats>> {
    if (!this.isCacheValid()) await this.refreshCache();
    return new Map(this.teamStatsCache);
  }

  setLeague(_league: string) {
    // noop: league is fixed in Supabase DB
  }

  getCurrentLeague() {
    return { name: 'premierLeague', urls: {} };
  }

  async getFeaturedFixtures(limit = 8): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    const now = Date.now();

    const upcoming = this.fixturesCache
      .filter(f => new Date(f.dateTime).getTime() >= now) // future fixtures
      .sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance; // highest importance first
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime(); // then earliest date
      });

    return upcoming.slice(0, limit);
  }
}

export const fbrefFixtureService = new SupabaseFixtureService();
