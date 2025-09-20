// src/services/fixtures/fbrefFixtureService.ts
import type { FeaturedFixtureWithImportance } from '../../types';
import { supabase } from '../supabaseClient'; // your Supabase client
import { normalizeTeamName, getDisplayTeamName, getTeamLogo, getCompetitionLogo } from '../../utils/teamUtils';

export interface TeamSeasonStats {
  team: string;
  recentForm: ('W' | 'D' | 'L')[];
}

interface SupabaseFixture {
  id: string;
  dateTime: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming';
  matchWeek?: number;
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
    const { data, error } = await supabase
      .from('fixtures')
      .select('*')
      .order('dateTime', { ascending: true });

    if (error) {
      console.error('Supabase fetch error:', error);
      return [];
    }

    return (data || []).map(f => ({
      ...f,
      homeTeam: normalizeTeamName(f.homeTeam),
      awayTeam: normalizeTeamName(f.awayTeam),
      status: f.status || 'scheduled',
    }));
  }

  // ---------------- Calculate recent form ----------------
  private calculateForm(fixtures: SupabaseFixture[]): Map<string, ('W' | 'D' | 'L')[]> {
    const forms = new Map<string, ('W' | 'D' | 'L')[]>();

    const finishedFixtures = fixtures.filter(f => f.status === 'finished');
    finishedFixtures.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()); // recent first

    finishedFixtures.forEach(f => {
      const homeForm = forms.get(f.homeTeam) || [];
      const awayForm = forms.get(f.awayTeam) || [];

      const result: 'W' | 'D' | 'L' = f.homeScore! > f.awayScore! ? 'W'
        : f.homeScore! < f.awayScore! ? 'L' : 'D';

      homeForm.unshift(result);
      if (homeForm.length > 5) homeForm.pop();
      forms.set(f.homeTeam, homeForm);

      const awayResult: 'W' | 'D' | 'L' = f.awayScore! > f.homeScore! ? 'W'
        : f.awayScore! < f.homeScore! ? 'L' : 'D';

      awayForm.unshift(awayResult);
      if (awayForm.length > 5) awayForm.pop();
      forms.set(f.awayTeam, awayForm);
    });

    return forms;
  }

  // ---------------- Transform ----------------
  private transformFixture(f: SupabaseFixture): FeaturedFixtureWithImportance {
    const homeForm = this.teamStatsCache.get(f.homeTeam)?.recentForm || [];
    const awayForm = this.teamStatsCache.get(f.awayTeam)?.recentForm || [];

    // Simple importance: live > scheduled > finished
    const importance = f.status === 'live' ? 10 : f.status === 'scheduled' ? 5 : 0;

    return {
      id: f.id,
      dateTime: f.dateTime,
      homeTeam: {
        id: f.homeTeam.replace(/\s+/g, '-').toLowerCase(),
        name: f.homeTeam,
        shortName: getDisplayTeamName(f.homeTeam),
        form: homeForm,
        logo: getTeamLogo({ name: f.homeTeam }).logoPath,
        colors: {},
      },
      awayTeam: {
        id: f.awayTeam.replace(/\s+/g, '-').toLowerCase(),
        name: f.awayTeam,
        shortName: getDisplayTeamName(f.awayTeam),
        form: awayForm,
        logo: getTeamLogo({ name: f.awayTeam }).logoPath,
        colors: {},
      },
      venue: f.venue || 'TBD',
      competition: {
        id: 'premierLeague',
        name: 'Premier League',
        logo: getCompetitionLogo('Premier League') ?? undefined,
      },
      matchWeek: f.matchWeek,
      importance,
      importanceScore: importance,
      tags: [],
      isBigMatch: importance >= 8,
      status: f.status,
      homeScore: f.homeScore || 0,
      awayScore: f.awayScore || 0,
    };
  }

  // ---------------- Refresh Cache ----------------
  private async refreshCache(): Promise<void> {
    const fixtures = await this.fetchFixturesFromSupabase();
    const forms = this.calculateForm(fixtures);

    this.teamStatsCache.clear();
    forms.forEach((recentForm, team) => {
      this.teamStatsCache.set(team, { team, recentForm });
    });

    this.fixturesCache = fixtures.map(f => this.transformFixture(f));
    this.cacheTime = Date.now();
  }

  // ---------------- Public Methods ----------------
  async getAllFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.fixturesCache;
  }

  async getCurrentGameWeekFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    const now = Date.now();
    return this.fixturesCache.filter(f => {
      const t = new Date(f.dateTime).getTime();
      return t >= now && t <= now + 7 * 24 * 60 * 60 * 1000;
    });
  }

  async getGameWeekInfo() {
    if (!this.isCacheValid()) await this.refreshCache();
    const fixtures = await this.getCurrentGameWeekFixtures();
    const currentWeek = fixtures[0]?.matchWeek ?? 1;
    const finishedGames = fixtures.filter(f => f.status === 'finished').length;
    const upcomingGames = fixtures.filter(f => f.status !== 'finished').length;
    return { currentWeek, isComplete: finishedGames === fixtures.length, totalGames: fixtures.length, finishedGames, upcomingGames };
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
