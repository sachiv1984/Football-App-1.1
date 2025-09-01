// src/services/fixtures/fixtureService.ts
import { FootballDataApi, FootballDataMatch, FootballDataStanding } from '../api/footballDataApi';
import type { FeaturedFixtureWithImportance } from '../../types';

interface TeamWithForm {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  colors: { primary?: string; secondary?: string };
  form?: ('W' | 'D' | 'L')[];
}

export class FixtureService {
  private footballDataApi: FootballDataApi;
  private standingsCache: FootballDataStanding[] = [];
  private matchesCache: FootballDataMatch[] = [];
  private standingsCacheTime: number = 0;
  private matchesCacheTime: number = 0;
  private readonly cacheTimeout = 10 * 60 * 1000; // 10 min

  constructor() {
    this.footballDataApi = FootballDataApi.getInstance();
  }

  private async getStandings(): Promise<FootballDataStanding[]> {
    const now = Date.now();
    if (this.standingsCache.length && now - this.standingsCacheTime < this.cacheTimeout) {
      return this.standingsCache;
    }
    this.standingsCache = await this.footballDataApi.getStandings();
    this.standingsCacheTime = now;
    return this.standingsCache;
  }

  private async getMatches(): Promise<FootballDataMatch[]> {
    const now = Date.now();
    if (this.matchesCache.length && now - this.matchesCacheTime < this.cacheTimeout) {
      return this.matchesCache;
    }
    this.matchesCache = await this.footballDataApi.getMatches();
    this.matchesCacheTime = now;
    return this.matchesCache;
  }

  private getTeamColors(teamName: string): { primary?: string; secondary?: string } {
    const colorMap: Record<string, { primary?: string; secondary?: string }> = {
      'Arsenal': { primary: '#EF0107', secondary: '#023474' },
      'Chelsea': { primary: '#034694', secondary: '#FFFFFF' },
      'Liverpool': { primary: '#C8102E', secondary: '#F6EB61' },
      'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
      'Manchester United': { primary: '#DA020E', secondary: '#FBE122' },
      'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF' },
    };
    return colorMap[teamName] || {};
  }

  private async getTeamDetails(team: FootballDataMatch['homeTeam'] | FootballDataMatch['awayTeam']): Promise<TeamWithForm> {
    try {
      const standings = await this.getStandings();
      const teamStanding = standings.find(s => s.team.id === team.id);

      let form: ('W' | 'D' | 'L')[] = [];
      if (teamStanding?.form) {
        // Safe parsing: only keep W/D/L
        form = teamStanding.form
          .split(',')
          .map(f => f.trim().toUpperCase())
          .filter(f => f === 'W' || f === 'D' || f === 'L') as ('W' | 'D' | 'L')[];
      }

      return {
        id: team.id.toString(),
        name: team.name,
        shortName: team.shortName || team.tla || team.name,
        logo: team.crest,
        colors: this.getTeamColors(team.name),
        form,
      };
    } catch {
      return {
        id: team.id.toString(),
        name: team.name,
        shortName: team.shortName || team.tla || team.name,
        logo: team.crest,
        colors: {},
        form: [],
      };
    }
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

  private calculateImportance(match: FootballDataMatch, standings?: FootballDataStanding[]): number {
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
    if (bigSix.includes(match.homeTeam.name) && bigSix.includes(match.awayTeam.name)) importance += 2;
    else if (bigSix.includes(match.homeTeam.name) || bigSix.includes(match.awayTeam.name)) importance += 1;

    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) importance += 2;

    return Math.min(importance, 10);
  }

  private generateTags(match: FootballDataMatch, importance: number): string[] {
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

    return tags;
  }

  private mapStatus(status: FootballDataMatch['status']): 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming' {
    switch (status) {
      case 'SCHEDULED': return 'upcoming';
      case 'LIVE': case 'IN_PLAY': case 'PAUSED': return 'live';
      case 'FINISHED': return 'finished';
      case 'POSTPONED': case 'SUSPENDED': case 'CANCELLED': return 'postponed';
      default: return 'scheduled';
    }
  }

  private async transformMatch(match: FootballDataMatch): Promise<FeaturedFixtureWithImportance> {
    const standings = await this.getStandings();
    const [homeTeam, awayTeam] = await Promise.all([
      this.getTeamDetails(match.homeTeam),
      this.getTeamDetails(match.awayTeam)
    ]);
    const importance = this.calculateImportance(match, standings);
    const tags = this.generateTags(match, importance);

    return {
      id: match.id.toString(),
      dateTime: FootballDataApi.formatDateTime(match.utcDate),
      homeTeam,
      awayTeam,
      venue: match.venue || 'TBD',
      competition: {
        id: match.competition.code,
        name: match.competition.name,
        logo: match.competition.emblem
      },
      matchWeek: match.matchday,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: this.mapStatus(match.status)
    };
  }

  // Public methods for components
  async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    const matches = await this.getMatches();
    const transformed = await Promise.all(matches.slice(0, 15).map(m => this.transformMatch(m)));
    return transformed.sort((a, b) => b.importance - a.importance).slice(0, limit);
  }

  async getAllFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    const matches = await this.getMatches();
    const transformed = await Promise.all(matches.map(m => this.transformMatch(m)));
    return transformed.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }

  clearCache() {
    this.standingsCache = [];
    this.matchesCache = [];
    this.standingsCacheTime = 0;
    this.matchesCacheTime = 0;
    this.footballDataApi.clearCache();
  }
}
