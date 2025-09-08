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

  private calculateImportance(match: RawMatch, standings?: RawStanding[]): number {
    // Finished, cancelled, postponed, or suspended → zero importance
    if (!['SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED'].includes(match.status)) return 0;

    let importance = 3;

    // Matchday weighting
    const matchday = match.matchday;
    if (matchday >= 35) importance += 3;
    else if (matchday >= 25) importance += 2;
    else if (matchday >= 15) importance += 1;

    // Standings weighting
    if (standings) {
      const homePos = standings.find(s => s.team.id === match.homeTeam.id)?.position || 20;
      const awayPos = standings.find(s => s.team.id === match.awayTeam.id)?.position || 20;
      if (homePos <= 6 && awayPos <= 6) importance += 3;
      else if ((homePos <= 10 && awayPos > 10) || (homePos > 10 && awayPos <= 10)) importance += 1;
      else if (homePos >= 17 && awayPos >= 17) importance += 2;
    }

    // Big six weighting
    const bigSix = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham Hotspur'];
    if (bigSix.includes(match.homeTeam.name) && bigSix.includes(match.awayTeam.name)) importance += 2;
    else if (bigSix.includes(match.homeTeam.name) || bigSix.includes(match.awayTeam.name)) importance += 1;

    // Derby weighting
    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) importance += 2;

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

    return tags;
  }

  private mapStatus(status: RawMatch['status']): 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming' {
    switch (status) {
      case 'SCHEDULED': return 'upcoming';
      case 'LIVE':
      case 'IN_PLAY':
      case 'PAUSED':
        return 'live';
      case 'FINISHED': return 'finished';
      case 'POSTPONED':
      case 'SUSPENDED':
      case 'CANCELLED':
        return 'postponed';
      default: return 'scheduled';
    }
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
    return {
      id: team.id.toString(),
      name: team.name,
      shortName: team.shortName || team.tla || team.name,
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

    // calculate importance once; zero for finished/postponed/cancelled/suspended
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
      importanceScore: importance, // matches importance exactly
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
      return this.matchesCache.slice(0, limit);
    }

    const [matches, standings] = await Promise.all([this.fetchMatches(), this.fetchStandings()]);
    const transformed = await Promise.all(matches.slice(0, 15).map(m => this.transformMatch(m, standings)));

    this.matchesCache = transformed.sort((a, b) => b.importance - a.importance);
    this.cacheTime = now;
    return this.matchesCache.slice(0, limit);
  }
async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
  const now = Date.now();
  if (this.matchesCache.length && now - this.cacheTime < this.cacheTimeout) {
    return this.matchesCache.slice(0, limit);
  }

  const [matches, standings] = await Promise.all([this.fetchMatches(), this.fetchStandings()]);
  const transformed = await Promise.all(matches.map(m => this.transformMatch(m, standings)));

  // Only keep matches within the next 7 days AND with importance > 0
  const next7Days = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const filtered = transformed.filter(m => {
    const matchTime = new Date(m.dateTime).getTime();
    return m.importance > 0 && matchTime >= now && matchTime <= next7Days;
  });

  // Sort by importance (highest first)
  this.matchesCache = filtered.sort((a, b) => b.importance - a.importance);
  this.cacheTime = now;
  return this.matchesCache.slice(0, limit);
}

 
  clearCache() {
    this.matchesCache = [];
    this.cacheTime = 0;
  }
}

