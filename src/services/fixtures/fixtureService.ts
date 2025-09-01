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

export class FixtureService {
  private footballDataApi: FootballDataApi;
  private standingsCache: FootballDataStanding[] = [];
  private standingsCacheTime: number = 0;
  private readonly standingsCacheTimeout = 10 * 60 * 1000; // 10 minutes

  constructor() {
    this.footballDataApi = FootballDataApi.getInstance();
  }

  private async getStandings(): Promise<FootballDataStanding[]> {
    const now = Date.now();
    if (this.standingsCache.length > 0 && now - this.standingsCacheTime < this.standingsCacheTimeout) {
      return this.standingsCache;
    }

    this.standingsCache = await this.footballDataApi.getStandings();
    this.standingsCacheTime = now;
    return this.standingsCache;
  }

  private async getTeamDetails(footballDataTeam: FootballDataMatch['homeTeam'] | FootballDataMatch['awayTeam']): Promise<TeamWithForm> {
    try {
      const standings = await this.getStandings();
      const teamStanding = standings.find(s => s.team.id === footballDataTeam.id);
      
      let form: ('W'|'D'|'L')[] = [];
      if (teamStanding?.form) {
        form = FootballDataApi.parseForm(teamStanding.form);
      }

      return {
        id: footballDataTeam.id.toString(),
        name: footballDataTeam.name,
        shortName: footballDataTeam.shortName || footballDataTeam.tla || footballDataTeam.name,
        logo: footballDataTeam.crest,
        colors: this.getTeamColors(footballDataTeam.name),
        form
      };
    } catch (error) {
      console.error(`Error getting team details for ${footballDataTeam.name}:`, error);
      return {
        id: footballDataTeam.id.toString(),
        name: footballDataTeam.name,
        shortName: footballDataTeam.shortName || footballDataTeam.tla || footballDataTeam.name,
        logo: footballDataTeam.crest,
        colors: {},
        form: []
      };
    }
  }

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

    const bigSixTeams = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham Hotspur'];
    const homeIsBigSix = bigSixTeams.includes(match.homeTeam.name);
    const awayIsBigSix = bigSixTeams.includes(match.awayTeam.name);

    if (homeIsBigSix && awayIsBigSix) importance += 2;
    else if (homeIsBigSix || awayIsBigSix) importance += 1;

    if (this.isDerbyMatch(match.homeTeam.name, match.awayTeam.name)) importance += 2;

    return Math.min(importance, 10);
  }

  private isDerbyMatch(homeTeam: string, awayTeam: string): boolean {
    const derbies = [
      ['Arsenal', 'Tottenham Hotspur'],
      ['Liverpool', 'Everton'],
      ['Manchester United', 'Manchester City'],
      ['Chelsea', 'Arsenal'],
      ['Chelsea', 'Tottenham Hotspur'],
      ['Chelsea', 'Fulham'],
      ['Crystal Palace', 'Brighton & Hove Albion'],
    ];
    return derbies.some(d => d.includes(homeTeam) && d.includes(awayTeam));
  }

  private generateTags(match: FootballDataMatch, importance: number): string[] {
    const tags: string[] = [];
    const matchday = match.matchday;

    if (matchday <= 5) tags.push('early-season');
    else if (matchday >= 35) tags.push('title-race', 'relegation-battle');
    else if (matchday >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerbyMatch(match.homeTeam.name, match.awayTeam.name)) tags.push('derby');

    const matchDate = new Date(match.utcDate);
    if (!isNaN(matchDate.getTime())) {
      const dayOfWeek = matchDate.getDay();
      if (dayOfWeek === 0) tags.push('sunday-fixture');
      else if (dayOfWeek === 6) tags.push('saturday-fixture');
      else if (dayOfWeek === 1) tags.push('monday-night-football');
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
        logo: match.competition.emblem
      },
      matchWeek: match.matchday,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: mapStatus(match.status)
    };
  }

  public async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    try {
      const matches = await this.footballDataApi.getUpcomingMatches(20);
      if (!matches || matches.length === 0) return [];
      const transformedFixtures = await Promise.all(matches.slice(0, 15).map(m => this.transformMatch(m)));
      return transformedFixtures.sort((a, b) => b.importance - a.importance).slice(0, limit);
    } catch (error) {
      console.error('Error fetching featured fixtures:', error);
      return [];
    }
  }

  public async getAllUpcomingFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    try {
      const matches = await this.footballDataApi.getUpcomingMatches(50);
      if (!matches || matches.length === 0) return [];
      const transformedFixtures = await Promise.all(matches.map(m => this.transformMatch(m)));
      return transformedFixtures.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    } catch (error) {
      console.error('Error fetching all upcoming fixtures:', error);
      return [];
    }
  }

  public async getFixturesByMatchday(matchday: number): Promise<FeaturedFixtureWithImportance[]> {
    try {
      const matches = await this.footballDataApi.getMatchesByMatchday(matchday);
      if (!matches || matches.length === 0) return [];
      const transformedFixtures = await Promise.all(matches.map(m => this.transformMatch(m)));
      return transformedFixtures.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
    } catch (error) {
      console.error('Error fetching matchday fixtures:', error);
      return [];
    }
  }

  public clearCache(): void {
    this.standingsCache = [];
    this.standingsCacheTime = 0;
    this.footballDataApi.clearCache();
  }
}
