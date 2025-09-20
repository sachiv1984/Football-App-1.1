// src/services/fixtures/supabaseFixtureService.ts
import { createClient } from '@supabase/supabase-js';
import type { FeaturedFixtureWithImportance } from '../../types';
import {
  normalizeTeamName,
  getDisplayTeamName,
  getTeamLogo,
  getCompetitionLogo,
} from '../../utils/teamUtils';

export interface TeamFormMap {
  [team: string]: ('W' | 'D' | 'L')[];
}

export class SupabaseFixtureService {
  private fixturesCache: FeaturedFixtureWithImportance[] = [];
  private teamFormCache: TeamFormMap = {};
  private cacheTime = 0;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes

  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  private readonly BIG_SIX = [
    'Arsenal',
    'Chelsea',
    'Liverpool',
    'Manchester City',
    'Manchester United',
    'Tottenham Hotspur',
  ];

  private readonly DERBIES: string[][] = [
    ['Arsenal', 'Tottenham Hotspur'],
    ['Liverpool', 'Everton'],
    ['Manchester United', 'Manchester City'],
    ['Chelsea', 'Arsenal'],
    ['Chelsea', 'Tottenham Hotspur'],
    ['Chelsea', 'Fulham'],
    ['Crystal Palace', 'Brighton & Hove Albion'],
    ['West Ham United', 'Tottenham Hotspur'],
    ['Arsenal', 'Chelsea'],
  ];

  private readonly TEAM_COLORS: Record<string, { primary?: string; secondary?: string }> = {
    Arsenal: { primary: '#EF0107', secondary: '#023474' },
    Chelsea: { primary: '#034694', secondary: '#FFFFFF' },
    Liverpool: { primary: '#C8102E', secondary: '#F6EB61' },
    'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
    'Manchester United': { primary: '#DA020E', secondary: '#FBE122' },
    'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF' },
    'Newcastle United': { primary: '#241F20', secondary: '#FFFFFF' },
    'West Ham United': { primary: '#7A263A', secondary: '#1BB1E7' },
    'Brighton & Hove Albion': { primary: '#0057B8', secondary: '#FFCD00' },
    Fulham: { primary: '#CC0000', secondary: '#FFFFFF' },
  };

  private isCacheValid(): boolean {
    return this.fixturesCache.length > 0 && Date.now() - this.cacheTime < this.cacheTimeout;
  }

  public clearCache(): void {
    this.fixturesCache = [];
    this.teamFormCache = {};
    this.cacheTime = 0;
    console.log('Supabase fixture cache cleared');
  }

  // -------------------- Fetch fixtures from Supabase --------------------
  private async fetchFixtures(): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('fixtures')
      .select('*')
      .order('dateTime', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // -------------------- Calculate recent form --------------------
  private calculateRecentForm(fixtures: any[]): TeamFormMap {
    const formMap: TeamFormMap = {};

    // Only consider finished matches
    const finishedMatches = fixtures.filter(f => f.status === 'finished');

    finishedMatches.forEach(f => {
      const home = normalizeTeamName(f.homeTeam);
      const away = normalizeTeamName(f.awayTeam);

      if (!formMap[home]) formMap[home] = [];
      if (!formMap[away]) formMap[away] = [];

      // Home result
      formMap[home].push(f.homeScore > f.awayScore ? 'W' : f.homeScore < f.awayScore ? 'L' : 'D');
      // Away result
      formMap[away].push(f.awayScore > f.homeScore ? 'W' : f.awayScore < f.homeScore ? 'L' : 'D');
    });

    // Keep only last 5 results
    Object.keys(formMap).forEach(team => {
      formMap[team] = formMap[team].slice(-5);
    });

    return formMap;
  }

  // -------------------- Transform fixture --------------------
  private transformFixture(fixture: any): FeaturedFixtureWithImportance {
    const homeTeam = normalizeTeamName(fixture.homeTeam);
    const awayTeam = normalizeTeamName(fixture.awayTeam);

    const homeForm = this.teamFormCache[homeTeam] || [];
    const awayForm = this.teamFormCache[awayTeam] || [];

    const importance = this.calculateImportance(fixture);
    const tags = this.generateTags(fixture, importance);

    return {
      id: fixture.id,
      dateTime: fixture.dateTime,
      matchWeek: fixture.matchWeek,
      status: fixture.status,
      homeTeam: {
        id: homeTeam.replace(/\s+/g, '-').toLowerCase(),
        name: homeTeam,
        shortName: getDisplayTeamName(homeTeam),
        colors: this.TEAM_COLORS[homeTeam] ?? {},
        form: homeForm,
        logo: getTeamLogo({ name: homeTeam }).logoPath,
      },
      awayTeam: {
        id: awayTeam.replace(/\s+/g, '-').toLowerCase(),
        name: awayTeam,
        shortName: getDisplayTeamName(awayTeam),
        colors: this.TEAM_COLORS[awayTeam] ?? {},
        form: awayForm,
        logo: getTeamLogo({ name: awayTeam }).logoPath,
      },
      venue: fixture.venue || 'TBD',
      competition: {
        id: fixture.competition || 'premierLeague',
        name: fixture.competition || 'Premier League',
        logo: getCompetitionLogo('Premier League'),
      },
      homeScore: fixture.homeScore ?? 0,
      awayScore: fixture.awayScore ?? 0,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
    };
  }

  private calculateImportance(fixture: any): number {
    if (fixture.status === 'finished') return 0;

    let importance = 3;
    const matchday = fixture.matchWeek ?? 1;

    if (matchday >= 35) importance += 3;
    else if (matchday >= 25) importance += 2;
    else if (matchday >= 15) importance += 1;

    const homeBigSix = this.BIG_SIX.includes(fixture.homeTeam);
    const awayBigSix = this.BIG_SIX.includes(fixture.awayTeam);
    if (homeBigSix && awayBigSix) importance += 2;
    else if (homeBigSix || awayBigSix) importance += 1;

    if (this.isDerby(fixture.homeTeam, fixture.awayTeam)) importance += 2;
    if (fixture.status === 'live') importance += 1;

    return Math.min(importance, 10);
  }

  private isDerby(home: string, away: string): boolean {
    return this.DERBIES.some(d => d.includes(home) && d.includes(away));
  }

  private generateTags(fixture: any, importance: number): string[] {
    const tags: string[] = [];
    const matchday = fixture.matchWeek ?? 1;

    if (matchday <= 5) tags.push('early-season');
    else if (matchday >= 35) tags.push('title-race', 'relegation-battle');
    else if (matchday >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerby(fixture.homeTeam, fixture.awayTeam)) tags.push('derby');

    const day = new Date(fixture.dateTime).getDay();
    if (day === 0) tags.push('sunday-fixture');
    if (day === 6) tags.push('saturday-fixture');
    if (day === 1) tags.push('monday-night-football');

    tags.push('league-match');
    if (fixture.status === 'live') tags.push('live');

    return tags;
  }

  // -------------------- Public methods --------------------
  private async refreshCache(): Promise<void> {
    const fixtures = await this.fetchFixtures();
    this.teamFormCache = this.calculateRecentForm(fixtures);
    this.fixturesCache = fixtures.map(f => this.transformFixture(f));
    this.cacheTime = Date.now();
  }

  async getAllFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.fixturesCache;
  }

  async getFeaturedFixtures(limit = 8): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    const now = Date.now();
    return this.fixturesCache
      .filter(f => f.importance > 0 && new Date(f.dateTime).getTime() >= now)
      .slice(0, limit);
  }

  async getUpcomingImportantMatches(limit?: number): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    const now = Date.now();
    const upcoming = this.fixturesCache.filter(f => f.importance > 0 && new Date(f.dateTime).getTime() >= now);
    return limit ? upcoming.slice(0, limit) : upcoming;
  }
}

export constexport const fbrefFixtureService = new SupabaseFixtureService();

