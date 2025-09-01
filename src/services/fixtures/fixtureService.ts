// src/services/fixtures/fixtureService.ts
import { FootballDataApi, FootballDataMatch, FootballDataStanding } from '../api/footballDataApi';
import type { FeaturedFixtureWithImportance } from '../../types';

interface TeamWithForm {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  colors: { primary?: string; secondary?: string };
  form?: ('W'|'D'|'L')[];
}

interface Competition {
  id: string;
  name: string;
  logo?: string;
}

export class FixtureService {
  private footballDataApi = FootballDataApi.getInstance();

  private standingsCache: FootballDataStanding[] = [];
  private standingsCacheTime = 0;
  private readonly standingsCacheTTL = 10 * 60 * 1000; // 10 min

  private matchesCache: FootballDataMatch[] = [];
  private matchesCacheTime = 0;
  private readonly matchesCacheTTL = 1 * 60 * 1000; // 1 min

  constructor() {}

  // -----------------------
  // Cached data helpers
  // -----------------------
  private async getStandings(): Promise<FootballDataStanding[]> {
    const now = Date.now();
    if (this.standingsCache.length && now - this.standingsCacheTime < this.standingsCacheTTL) {
      return this.standingsCache;
    }
    this.standingsCache = await this.footballDataApi.getStandings();
    this.standingsCacheTime = now;
    return this.standingsCache;
  }

  private async getUpcomingMatches(limit: number = 20): Promise<FootballDataMatch[]> {
    const now = Date.now();
    if (this.matchesCache.length && now - this.matchesCacheTime < this.matchesCacheTTL) {
      return this.matchesCache.slice(0, limit);
    }
    this.matchesCache = await this.footballDataApi.getUpcomingMatches(limit);
    this.matchesCacheTime = now;
    return this.matchesCache.slice(0, limit);
  }

  private async fetchData(limit: number = 20) {
    const [standings, matches] = await Promise.all([
      this.getStandings(),
      this.getUpcomingMatches(limit),
    ]);
    return { standings, matches };
  }

  // -----------------------
  // Transform match
  // -----------------------
  private async transformMatch(
    match: FootballDataMatch,
    standings: FootballDataStanding[]
  ): Promise<FeaturedFixtureWithImportance> {

    const getForm = (teamId: number): ('W'|'D'|'L')[] => {
      const teamStanding = standings.find(s => s.team.id === teamId);
      return teamStanding?.form ? FootballDataApi.parseForm(teamStanding.form) : [];
    };

    const getTeamColors = (teamName: string) => {
      const map: Record<string, { primary?: string; secondary?: string }> = {
        Arsenal: { primary: '#EF0107', secondary: '#023474' },
        Chelsea: { primary: '#034694', secondary: '#FFFFFF' },
        Liverpool: { primary: '#C8102E', secondary: '#F6EB61' },
        'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
        'Manchester United': { primary: '#DA020E', secondary: '#FBE122' },
        'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF' },
      };
      return map[teamName] || {};
    };

    const homeTeam: TeamWithForm = {
      id: match.homeTeam.id.toString(),
      name: match.homeTeam.name,
      shortName: match.homeTeam.shortName || match.homeTeam.tla || match.homeTeam.name,
      logo: match.homeTeam.crest,
      colors: getTeamColors(match.homeTeam.name),
      form: getForm(match.homeTeam.id),
    };

    const awayTeam: TeamWithForm = {
      id: match.awayTeam.id.toString(),
      name: match.awayTeam.name,
      shortName: match.awayTeam.shortName || match.awayTeam.tla || match.awayTeam.name,
      logo: match.awayTeam.crest,
      colors: getTeamColors(match.awayTeam.name),
      form: getForm(match.awayTeam.id),
    };

    const importance = this.calculateImportance(match, standings);
    const tags = this.generateTags(match, importance);

    const mapStatus = (status: FootballDataMatch['status']): 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming' => {
      switch (status) {
        case 'SCHEDULED': return 'upcoming';
        case 'LIVE':
        case 'IN_PLAY':
        case 'PAUSED': return 'live';
        case 'FINISHED': return 'finished';
        case 'POSTPONED':
        case 'SUSPENDED':
        case 'CANCELLED': return 'postponed';
        default: return 'scheduled';
      }
    };

    return {
      id: match.id.toString(),
      dateTime: FootballDataApi.formatDateTime(match.utcDate),
      homeTeam,
      awayTeam,
      venue: match.venue || 'TBD',
      competition: {
        id: match.competition.code,
        name: match.competition.name,
        logo: match.competition.emblem,
      },
      matchWeek: match.matchday,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: mapStatus(match.status),
    };
  }

  // -----------------------
  // Public API
  // -----------------------
  async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    try {
      const { standings, matches } = await this.fetchData(20);
      const transformed = await Promise.all(matches.map(m => this.transformMatch(m, standings)));
      return transformed.sort((a, b) => b.importance - a.importance).slice(0, limit);
    } catch (err) {
      console.error('Error fetching featured fixtures:', err);
      return [];
    }
  }

  async getAllUpcomingFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    try {
      const { standings, matches } = await this.fetchData(50);
      const transformed = await Promise.all(matches.map(m => this.transformMatch(m, standings)));
      return transformed.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    } catch (err) {
      console.error('Error fetching all fixtures:', err);
      return [];
    }
  }

  async getFixturesByMatchday(matchday: number): Promise<FeaturedFixtureWithImportance[]> {
    try {
      const { standings, matches } = await this.fetchData(50);
      const filtered = matches.filter(m => m.matchday === matchday);
      const transformed = await Promise.all(filtered.map(m => this.transformMatch(m, standings)));
      return transformed.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    } catch (err) {
      console.error('Error fetching matchday fixtures:', err);
      return [];
    }
  }

  clearCache(): void {
    this.standingsCache = [];
    this.standingsCacheTime = 0;
    this.matchesCache = [];
    this.matchesCacheTime = 0;
  }

  // -----------------------
  // Importance & tags helpers (reuse your existing logic)
  // -----------------------
  private calculateImportance(match: FootballDataMatch, standings: FootballDataStanding[]): number {
    let importance = 3;
    const matchday = match.matchday;
    if (matchday >= 35) importance += 3;
    else if (matchday >= 25) importance += 2;
    else if (matchday >= 15) importance += 1;

    const homePos = standings.find(s => s.team.id === match.homeTeam.id)?.position || 20;
    const awayPos = standings.find(s => s.team.id === match.awayTeam.id)?.position || 20;

    if (homePos <= 6 && awayPos <= 6) importance += 3;
    else if ((homePos <= 10 && awayPos > 10) || (homePos > 10 && awayPos <= 10)) importance += 1;
    else if (homePos >= 17 && awayPos >= 17) importance += 2;

    const bigSix = ['Arsenal','Chelsea','Liverpool','Manchester City','Manchester United','Tottenham Hotspur'];
    const homeBig = bigSix.includes(match.homeTeam.name);
    const awayBig = bigSix.includes(match.awayTeam.name);
    if (homeBig && awayBig) importance += 2;
    else if (homeBig || awayBig) importance += 1;

    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) importance += 2;

    return Math.min(importance, 10);
  }

  private isDerby(home: string, away: string): boolean {
    const derbies = [
      ['Arsenal','Tottenham Hotspur'],
      ['Liverpool','Everton'],
      ['Manchester United','Manchester City'],
      ['Chelsea','Arsenal'],
      ['Chelsea','Tottenham Hotspur'],
      ['Chelsea','Fulham'],
      ['Crystal Palace','Brighton & Hove Albion'],
    ];
    return derbies.some(d => d.includes(home) && d.includes(away));
  }

  private generateTags(match: FootballDataMatch, importance: number): string[] {
    const tags: string[] = [];
    const matchday = match.matchday;
    if (matchday <= 5) tags.push('early-season');
    else if (matchday >= 35) tags.push('title-race', 'relegation-battle');
    else if (matchday >= 25) tags.push('business-end');
    if (importance >= 8) tags.push('big-match');
    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) tags.push('derby');

    const day = new Date(match.utcDate).getDay();
    if (day === 0) tags.push('sunday-fixture');
    else if (day === 6) tags.push('saturday-fixture');
    else if (day === 1) tags.push('monday-night-football');

    if (match.stage === 'REGULAR_SEASON') tags.push('league-match');

    return tags;
  }
}
