// src/services/fixtures/fixtureService.ts
import type { FeaturedFixtureWithImportance } from '../../types';

interface TeamWithForm {
  id: string;
  name: string;
  shortName: string;
  logo?: string;
  colors: { primary?: string; secondary?: string };
  form?: ('W' | 'D' | 'L')[];
}

interface Competition {
  id: string;
  name: string;
  logo?: string;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
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
  competition: {
    code: string;
    name: string;
    emblem: string;
  };
  venue?: string;
}

interface ApiStanding {
  position: number;
  team: {
    id: number;
    name: string;
    shortName: string;
    tla: string;
    crest: string;
  };
  form: string;
}

export class FixtureService {
  private standingsCache: ApiStanding[] = [];
  private standingsCacheTime: number = 0;
  private readonly standingsCacheTTL = 10 * 60 * 1000; // 10 min

  private matchesCache: ApiMatch[] = [];
  private matchesCacheTime: number = 0;
  private readonly matchesCacheTTL = 60 * 1000; // 1 min

  // Fetch standings from /api/standings with caching
  private async getStandings(): Promise<ApiStanding[]> {
    const now = Date.now();
    if (this.standingsCache.length > 0 && now - this.standingsCacheTime < this.standingsCacheTTL) {
      return this.standingsCache;
    }

    const res = await fetch('/api/standings');
    const data = await res.json();
    this.standingsCache = data;
    this.standingsCacheTime = now;
    return this.standingsCache;
  }

  // Fetch matches from /api/matches with caching
  private async getMatches(): Promise<ApiMatch[]> {
    const now = Date.now();
    if (this.matchesCache.length > 0 && now - this.matchesCacheTime < this.matchesCacheTTL) {
      return this.matchesCache;
    }

    const res = await fetch('/api/matches');
    const data = await res.json();
    this.matchesCache = data;
    this.matchesCacheTime = now;
    return this.matchesCache;
  }

  // Convert API match to internal FeaturedFixtureWithImportance
  private async transformMatch(match: ApiMatch): Promise<FeaturedFixtureWithImportance> {
    const standings = await this.getStandings();

    const bigSixTeams = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham Hotspur'];

    const getTeamDetails = (team: ApiMatch['homeTeam'] | ApiMatch['awayTeam']): TeamWithForm => {
      const standing = standings.find(s => s.team.id === team.id);
      const form = standing?.form ? standing.form.split(',').map(f => f.trim() as 'W' | 'D' | 'L') : [];
      return {
        id: team.id.toString(),
        name: team.name,
        shortName: team.shortName || team.tla || team.name,
        logo: team.crest,
        colors: this.getTeamColors(team.name),
        form,
      };
    };

    const homeTeam = getTeamDetails(match.homeTeam);
    const awayTeam = getTeamDetails(match.awayTeam);

    const importance = this.calculateImportance(match, standings, bigSixTeams);

    return {
      id: match.id.toString(),
      dateTime: match.utcDate,
      homeTeam,
      awayTeam,
      venue: match.venue || 'TBD',
      competition: {
        id: match.competition.code,
        name: match.competition.name,
        logo: match.competition.emblem,
      } as Competition,
      matchWeek: match.matchday,
      importance,
      importanceScore: importance,
      tags: this.generateTags(match, importance),
      isBigMatch: importance >= 8,
      status: this.mapStatus(match.status),
    };
  }

  // Public: get featured fixtures (top N by importance)
  public async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    const matches = await this.getMatches();
    const transformed = await Promise.all(matches.map(m => this.transformMatch(m)));
    return transformed.sort((a, b) => b.importance - a.importance).slice(0, limit);
  }

  // Public: get all upcoming fixtures
  public async getAllUpcomingFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    const matches = await this.getMatches();
    const transformed = await Promise.all(matches.map(m => this.transformMatch(m)));
    return transformed.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }

  // Helper: Map API status to internal status
  private mapStatus(status: string): 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming' {
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
  }

  // Helper: Assign colors to Big 6 (can expand later)
  private getTeamColors(teamName: string): { primary?: string; secondary?: string } {
    const map: Record<string, { primary?: string; secondary?: string }> = {
      'Arsenal': { primary: '#EF0107', secondary: '#023474' },
      'Chelsea': { primary: '#034694', secondary: '#FFFFFF' },
      'Liverpool': { primary: '#C8102E', secondary: '#F6EB61' },
      'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
      'Manchester United': { primary: '#DA020E', secondary: '#FBE122' },
      'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF' },
    };
    return map[teamName] || {};
  }

  // Helper: Calculate importance score
  private calculateImportance(match: ApiMatch, standings: ApiStanding[], bigSixTeams: string[]): number {
    let importance = 3;

    if (match.matchday >= 35) importance += 3;
    else if (match.matchday >= 25) importance += 2;
    else if (match.matchday >= 15) importance += 1;

    const homePos = standings.find(s => s.team.id === match.homeTeam.id)?.position || 20;
    const awayPos = standings.find(s => s.team.id === match.awayTeam.id)?.position || 20;

    if (homePos <= 6 && awayPos <= 6) importance += 3;
    else if ((homePos <= 10 && awayPos > 10) || (homePos > 10 && awayPos <= 10)) importance += 1;
    else if (homePos >= 17 && awayPos >= 17) importance += 2;

    const homeIsBig = bigSixTeams.includes(match.homeTeam.name);
    const awayIsBig = bigSixTeams.includes(match.awayTeam.name);

    if (homeIsBig && awayIsBig) importance += 2;
    else if (homeIsBig || awayIsBig) importance += 1;

    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) importance += 2;

    return Math.min(importance, 10);
  }

  // Helper: Derby detection
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

  // Helper: Generate tags
  private generateTags(match: ApiMatch, importance: number): string[] {
    const tags: string[] = [];
    if (match.matchday <= 5) tags.push('early-season');
    else if (match.matchday >= 35) tags.push('title-race', 'relegation-battle');
    else if (match.matchday >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) tags.push('derby');

    const date = new Date(match.utcDate);
    if (!isNaN(date.getTime())) {
      const day = date.getDay();
      if (day === 0) tags.push('sunday-fixture');
      else if (day === 6) tags.push('saturday-fixture');
      else if (day === 1) tags.push('monday-night-football');
    }

    if (match.stage === 'REGULAR_SEASON') tags.push('league-match');
    return tags;
  }

  // Optional: Clear caches
  public clearCache() {
    this.standingsCache = [];
    this.standingsCacheTime = 0;
    this.matchesCache = [];
    this.matchesCacheTime = 0;
  }
}
