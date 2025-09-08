// src/services/fixtures/fixtureService.ts
import type { FeaturedFixtureWithImportance } from '../../types';

interface RawMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  homeTeam: { id: number; name: string; shortName?: string; tla?: string; crest?: string };
  awayTeam: { id: number; name: string; shortName?: string; tla?: string; crest?: string };
  venue?: string;
  competition: { id: string; code: string; name: string; emblem?: string };
}

interface RawStanding {
  team: { id: number };
  form?: string;
  position: number;
}

interface TeamWithForm {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  colors: { primary?: string; secondary?: string };
  form?: ('W' | 'D' | 'L')[];
}

export class FixtureService {
  private matchesCache: FeaturedFixtureWithImportance[] = [];
  private cacheTime = 0;
  private readonly cacheTimeout = 10 * 60 * 1000; // 10 min

  // -------------------------
  // Configurable lists
  // -------------------------
  private readonly SHORT_NAME_OVERRIDES: Record<string, string> = {
    "Manchester United FC": "Man Utd",
    "Brighton & Hove Albion FC": "Brighton",
    // add more as needed
  };

  private readonly BIG_SIX = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham Hotspur'];
  
  private readonly DERBIES: string[][] = [
    ['Arsenal', 'Tottenham Hotspur'],
    ['Liverpool', 'Everton'],
    ['Manchester United', 'Manchester City'],
    ['Chelsea', 'Arsenal'],
    ['Chelsea', 'Tottenham Hotspur'],
    ['Chelsea', 'Fulham'],
    ['Crystal Palace', 'Brighton & Hove Albion'],
  ];

  private readonly TEAM_COLORS: Record<string, { primary?: string; secondary?: string }> = {
    Arsenal: { primary: '#EF0107', secondary: '#023474' },
    Chelsea: { primary: '#034694', secondary: '#FFFFFF' },
    Liverpool: { primary: '#C8102E', secondary: '#F6EB61' },
    'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
    'Manchester United': { primary: '#DA020E', secondary: '#FBE122' },
    'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF' },
  };

  // -------------------------
  // Cache helpers
  // -------------------------
  private isCacheValid(): boolean {
    return this.matchesCache.length > 0 && (Date.now() - this.cacheTime < this.cacheTimeout);
  }

  private clearCache(): void {
    this.matchesCache = [];
    this.cacheTime = 0;
  }

  // -------------------------
  // Data fetching
  // -------------------------
  private async fetchMatches(): Promise<RawMatch[]> {
    const res = await fetch('/api/matches');
    if (!res.ok) throw new Error('Failed to fetch matches');
    return res.json();
  }

  private async fetchStandings(): Promise<RawStanding[]> {
    const res = await fetch('/api/standings');
    if (!res.ok) throw new Error('Failed to fetch standings');
    return res.json();
  }

  // -------------------------
  // Team helpers
  // -------------------------
  private getTeamColors(teamName: string): { primary?: string; secondary?: string } {
    return this.TEAM_COLORS[teamName] || {};
  }

  private parseForm(formString?: string): ('W' | 'D' | 'L')[] {
    if (!formString) return [];
    return formString
      .split(',')
      .map(f => (['W', 'D', 'L'].includes(f.trim()) ? f.trim() as 'W' | 'D' | 'L' : 'D'));
  }

  private async getTeamDetails(team: RawMatch['homeTeam'] | RawMatch['awayTeam'], standings: RawStanding[]): Promise<TeamWithForm> {
    const teamStanding = standings.find(s => s.team.id === team.id);
    const shortName = this.SHORT_NAME_OVERRIDES[team.name] || team.shortName || team.tla || team.name;

    return {
      id: team.id.toString(),
      name: team.name,
      shortName,
      logo: team.crest || '',
      colors: this.getTeamColors(team.name),
      form: this.parseForm(teamStanding?.form),
    };
  }

  // -------------------------
  // Match helpers
  // -------------------------
  private isDerby(home: string, away: string): boolean {
    return this.DERBIES.some(d => d.includes(home) && d.includes(away));
  }

  private isMatchFinished(status: string) {
    return ['FINISHED', 'POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(status);
  }

  private isMatchUpcoming(status: string) {
    return ['SCHEDULED', 'TIMED'].includes(status);
  }

  private isMatchLive(status: string) {
    return ['LIVE', 'IN_PLAY', 'PAUSED', 'HALF_TIME'].includes(status);
  }

  private calculateImportance(match: RawMatch, standings?: RawStanding[]): number {
    if (this.isMatchFinished(match.status)) return 0;

    let importance = 3;

    // Matchday weight
    if (match.matchday >= 35) importance += 3;
    else if (match.matchday >= 25) importance += 2;
    else if (match.matchday >= 15) importance += 1;

    // Standings weight
    if (standings) {
      const homePos = standings.find(s => s.team.id === match.homeTeam.id)?.position || 20;
      const awayPos = standings.find(s => s.team.id === match.awayTeam.id)?.position || 20;

      if (homePos <= 6 && awayPos <= 6) importance += 3;
      else if ((homePos <= 10 && awayPos > 10) || (homePos > 10 && awayPos <= 10)) importance += 1;
      else if (homePos >= 17 && awayPos >= 17) importance += 2;
    }

    // Big six
    const homeBigSix = this.BIG_SIX.includes(match.homeTeam.name);
    const awayBigSix = this.BIG_SIX.includes(match.awayTeam.name);
    if (homeBigSix && awayBigSix) importance += 2;
    else if (homeBigSix || awayBigSix) importance += 1;

    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) importance += 2;
    if (this.isMatchLive(match.status)) importance += 1;

    return Math.min(importance, 10);
  }

  private getDayTag(dateStr: string): string | null {
    const day = new Date(dateStr).getDay();
    if (day === 0) return 'sunday-fixture';
    if (day === 6) return 'saturday-fixture';
    if (day === 1) return 'monday-night-football';
    return null;
  }

  private generateTags(match: RawMatch, importance: number): string[] {
    const tags: string[] = [];

    if (match.matchday <= 5) tags.push('early-season');
    else if (match.matchday >= 35) tags.push('title-race', 'relegation-battle');
    else if (match.matchday >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) tags.push('derby');

    const dayTag = this.getDayTag(match.utcDate);
    if (dayTag) tags.push(dayTag);

    if (match.stage === 'REGULAR_SEASON') tags.push('league-match');
    if (this.isMatchLive(match.status)) tags.push('live');

    return tags;
  }

  private mapStatus(status: RawMatch['status']): 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming' {
    if (this.isMatchLive(status)) return 'live';
    if (this.isMatchUpcoming(status)) return 'upcoming';
    if (status === 'FINISHED') return 'finished';
    if (['POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(status)) return 'postponed';
    return 'scheduled';
  }

  private async transformMatch(match: RawMatch, standings: RawStanding[]): Promise<FeaturedFixtureWithImportance> {
    const [homeTeam, awayTeam] = await Promise.all([
      this.getTeamDetails(match.homeTeam, standings),
      this.getTeamDetails(match.awayTeam, standings),
    ]);

    const importance = this.calculateImportance(match, standings);
    const tags = this.generateTags(match, importance);

    return {
      id: match.id.toString(),
      dateTime: match.utcDate,
      homeTeam,
      awayTeam,
      venue: match.venue || 'TBD',
      competition: {
        id: match.competition.code,
        name: match.competition.name,
        logo: match.competition.emblem || '',
      },
      matchWeek: match.matchday,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: this.mapStatus(match.status),
    };
  }

  private async refreshCache(): Promise<void> {
    const [matches, standings] = await Promise.all([this.fetchMatches(), this.fetchStandings()]);
    const transformed = await Promise.all(matches.map(m => this.transformMatch(m, standings)));

    this.matchesCache = transformed.sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
    });

    this.cacheTime = Date.now();
  }

  private getNextNDaysMatches(days: number): FeaturedFixtureWithImportance[] {
    const now = Date.now();
    const future = now + days * 24 * 60 * 60 * 1000;
    return this.matchesCache.filter(match => {
      const time = new Date(match.dateTime).getTime();
      return match.importance > 0 && time >= now && time <= future;
    });
  }

  // -------------------------
  // Public methods
  // -------------------------
  async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.getNextNDaysMatches(7).slice(0, limit);
  }

  async getAllFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.matchesCache;
  }

  async getUpcomingImportantMatches(limit?: number): Promise<FeaturedFixtureWithImportance[]> {
    const allMatches = await this.getAllFixtures();
    const now = Date.now();
    const upcomingImportant = allMatches.filter(m => m.importance > 0 && new Date(m.dateTime).getTime() >= now);
    return limit ? upcomingImportant.slice(0, limit) : upcomingImportant;
  }

  async getMatchesByImportance(minImportance: number): Promise<FeaturedFixtureWithImportance[]> {
    const allMatches = await this.getAllFixtures();
    return allMatches.filter(m => m.importance >= minImportance);
  }
}
