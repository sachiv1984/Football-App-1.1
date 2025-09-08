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
  competition: { id: number; code: string; name: string; emblem?: string };
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
  // Short name overrides
  // -------------------------
  private SHORT_NAME_OVERRIDES: Record<string, string> = {
    "Manchester United": "Man Utd",
    // add more as needed
  };

  // -------------------------
  // Helpers
  // -------------------------
  private getTeamColors(teamName: string): { primary?: string; secondary?: string } {
    const colorMap: Record<string, { primary?: string; secondary?: string }> = {
      Arsenal: { primary: '#EF0107', secondary: '#023474' },
      Chelsea: { primary: '#034694', secondary: '#FFFFFF' },
      Liverpool: { primary: '#C8102E', secondary: '#F6EB61' },
      'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
      'Manchester United': { primary: '#DA020E', secondary: '#FBE122' },
      'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF' },
    };
    return colorMap[teamName] || {};
  }

  private parseForm(formString?: string): ('W' | 'D' | 'L')[] {
    if (!formString) return [];
    return formString.split(',').map(f => (['W', 'D', 'L'].includes(f.trim()) ? f.trim() as 'W' | 'D' | 'L' : 'D'));
  }

  private isDerby(home: string, away: string): boolean {
    const derbies = [
      ['Arsenal', 'Tottenham Hotspur'],
      ['Liverpool', 'Everton'],
      ['Manchester United', 'Manchester City'],
      ['Chelsea', 'Arsenal'],
      ['Chelsea', 'Tottenham Hotspur'],
      ['Chelsea', 'Fulham'],
      ['Crystal Palace', 'Brighton & Hove Albion'],
    ];
    return derbies.some(d => d.includes(home) && d.includes(away));
  }

  private isMatchFinished(status: string): boolean {
    return ['FINISHED', 'POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(status);
  }

  private isMatchUpcoming(status: string): boolean {
    return ['SCHEDULED', 'TIMED'].includes(status);
  }

  private isMatchLive(status: string): boolean {
    return ['LIVE', 'IN_PLAY', 'PAUSED', 'HALF_TIME'].includes(status);
  }

  private calculateImportance(match: RawMatch, standings?: RawStanding[]): number {
    if (this.isMatchFinished(match.status)) return 0;

    let importance = 3;

    const matchday = match.matchday;
    if (matchday >= 35) importance += 3;
    else if (matchday >= 25) importance += 2;
    else if (matchday >= 15) importance += 1;

    if (standings) {
      const homePos = standings.find(s => s.team.id === match.homeTeam.id)?.position || 20;
      const awayPos = standings.find(s => s.team.id === match.awayTeam.id)?.position || 20;

      if (homePos <= 6 && awayPos <= 6) importance += 3;
      else if ((homePos <= 10 && awayPos > 10) || (homePos > 10 && awayPos <= 10)) importance += 1;
      else if (homePos >= 17 && awayPos >= 17) importance += 2;
    }

    const bigSix = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham Hotspur'];
    const homeBigSix = bigSix.includes(match.homeTeam.name);
    const awayBigSix = bigSix.includes(match.awayTeam.name);

    if (homeBigSix && awayBigSix) importance += 2;
    else if (homeBigSix || awayBigSix) importance += 1;

    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) importance += 2;
    if (this.isMatchLive(match.status)) importance += 1;

    return Math.min(importance, 10);
  }

  private generateTags(match: RawMatch, importance: number): string[] {
    const tags: string[] = [];
    const md = match.matchday;

    if (md <= 5) tags.push('early-season');
    else if (md >= 35) tags.push('title-race', 'relegation-battle');
    else if (md >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) tags.push('derby');

    const day = new Date(match.utcDate).getDay();
    if (day === 0) tags.push('sunday-fixture');
    else if (day === 6) tags.push('saturday-fixture');
    else if (day === 1) tags.push('monday-night-football');

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

  // -------------------------
  // Public Methods
  // -------------------------
  async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    const now = Date.now();
    if (this.matchesCache.length && now - this.cacheTime < this.cacheTimeout) {
      return this.getNext7DaysMatches().slice(0, limit);
    }

    await this.refreshCache();
    return this.getNext7DaysMatches().slice(0, limit);
  }

  async getAllFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    const now = Date.now();
    if (this.matchesCache.length && now - this.cacheTime < this.cacheTimeout) {
      return this.matchesCache;
    }

    await this.refreshCache();
    return this.matchesCache;
  }

  async getUpcomingImportantMatches(limit?: number): Promise<FeaturedFixtureWithImportance[]> {
    const allMatches = await this.getAllFixtures();
    const now = Date.now();

    const upcomingImportant = allMatches.filter(match => {
      const matchTime = new Date(match.dateTime).getTime();
      return match.importance > 0 && matchTime >= now;
    });

    return limit ? upcomingImportant.slice(0, limit) : upcomingImportant;
  }

  private getNext7DaysMatches(): FeaturedFixtureWithImportance[] {
    const now = Date.now();
    const next7Days = now + 7 * 24 * 60 * 60 * 1000;

    return this.matchesCache.filter(match => {
      const matchTime = new Date(match.dateTime).getTime();
      return match.importance > 0 && matchTime >= now && matchTime <= next7Days;
    });
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

  clearCache(): void {
    this.matchesCache = [];
    this.cacheTime = 0;
  }

  async getMatchesByImportance(minImportance: number): Promise<FeaturedFixtureWithImportance[]> {
    const allMatches = await this.getAllFixtures();
    return allMatches.filter(match => match.importance >= minImportance);
  }
}

