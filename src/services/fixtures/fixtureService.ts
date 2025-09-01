// src/services/fixtures/fixtureService.ts
import type { FeaturedFixtureWithImportance } from '../../types';
import type { FootballDataStanding, FootballDataMatch } from '../api/footballDataApi';

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
  private standingsCache: FootballDataStanding[] = [];
  private standingsCacheTime: number = 0;
  private readonly standingsCacheTimeout = 10 * 60 * 1000; // 10 min

  // -------------------------
  // Standings
  // -------------------------
  private async getStandings(): Promise<FootballDataStanding[]> {
    const now = Date.now();
    if (this.standingsCache.length > 0 && now - this.standingsCacheTime < this.standingsCacheTimeout) {
      return this.standingsCache;
    }

    try {
      const res = await fetch('/api/standings');
      const standings: FootballDataStanding[] = await res.json();
      this.standingsCache = standings;
      this.standingsCacheTime = now;
      return standings;
    } catch (err) {
      console.error('Error fetching standings:', err);
      return [];
    }
  }

  // -------------------------
  // Team details
  // -------------------------
  private async getTeamDetails(team: FootballDataMatch['homeTeam'] | FootballDataMatch['awayTeam']): Promise<TeamWithForm> {
    try {
      const standings = await this.getStandings();
      const teamStanding = standings.find(s => s.team.id === team.id);
      let form: ('W'|'D'|'L')[] = [];
      if (teamStanding?.form) {
        form = FixtureService.parseForm(teamStanding.form);
      }

      return {
        id: team.id.toString(),
        name: team.name,
        shortName: team.shortName || team.tla || team.name,
        logo: team.crest,
        colors: this.getTeamColors(team.name),
        form
      };
    } catch (err) {
      console.error(`Error getting team details for ${team.name}:`, err);
      return {
        id: team.id.toString(),
        name: team.name,
        shortName: team.shortName || team.tla || team.name,
        logo: team.crest,
        colors: {},
        form: []
      };
    }
  }

  // -------------------------
  // Team colors
  // -------------------------
  private getTeamColors(teamName: string): { primary?: string; secondary?: string } {
    const colorMap: { [key: string]: { primary?: string; secondary?: string } } = {
      'Arsenal': { primary: '#EF0107', secondary: '#023474' },
      'Chelsea': { primary: '#034694', secondary: '#FFFFFF' },
      'Liverpool': { primary: '#C8102E', secondary: '#F6EB61' },
      'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
      'Manchester United': { primary: '#DA020E', secondary: '#FBE122' },
      'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF' },
    };
    return colorMap[teamName] || {};
  }

  // -------------------------
  // Importance
  // -------------------------
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

    const bigSix = ['Arsenal','Chelsea','Liverpool','Manchester City','Manchester United','Tottenham Hotspur'];
    const homeIsBig = bigSix.includes(match.homeTeam.name);
    const awayIsBig = bigSix.includes(match.awayTeam.name);

    if (homeIsBig && awayIsBig) importance += 2;
    else if (homeIsBig || awayIsBig) importance += 1;

    if (this.isDerbyMatch(match.homeTeam.name, match.awayTeam.name)) importance += 2;

    return Math.min(importance, 10);
  }

  private isDerbyMatch(home: string, away: string): boolean {
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
    else if (matchday >= 35) tags.push('title-race','relegation-battle');
    else if (matchday >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerbyMatch(match.homeTeam.name, match.awayTeam.name)) tags.push('derby');

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

  private async transformMatch(match: FootballDataMatch): Promise<FeaturedFixtureWithImportance> {
    const standings = await this.getStandings();
    const [homeTeam, awayTeam] = await Promise.all([
      this.getTeamDetails(match.homeTeam),
      this.getTeamDetails(match.awayTeam)
    ]);

    const importance = this.calculateImportance(match, standings);
    const tags = this.generateTags(match, importance);

    const mapStatus = (status: FootballDataMatch['status']): 'scheduled'|'live'|'finished'|'postponed'|'upcoming' => {
      switch(status){
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
      dateTime: match.utcDate,
      homeTeam,
      awayTeam,
      venue: match.venue || 'TBD',
      competition: {
        id: match.competition.code,
        name: match.competition.name,
        logo: match.competition.emblem
      } as Competition,
      matchWeek: match.matchday,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: mapStatus(match.status)
    };
  }

  // -------------------------
  // Public methods
  // -------------------------
  public async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    try {
      const res = await fetch('/api/matches');
      const matches: FootballDataMatch[] = await res.json();

      const transformed = await Promise.all(matches.map(m => this.transformMatch(m)));

      return transformed
        .sort((a,b) => b.importance - a.importance)
        .slice(0, limit);
    } catch (err) {
      console.error('Error fetching featured fixtures:', err);
      return [];
    }
  }

  public clearCache(): void {
    this.standingsCache = [];
    this.standingsCacheTime = 0;
  }

  // -------------------------
  // Helpers
  // -------------------------
  public static parseForm(formStr: string): ('W'|'D'|'L')[] {
    return formStr.split(',').map(s => {
      const v = s.trim();
      return v==='W'?'W':v==='D'?'D':'L';
    }) as ('W'|'D'|'L')[];
  }
}
