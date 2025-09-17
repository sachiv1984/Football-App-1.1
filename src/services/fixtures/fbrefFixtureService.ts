// src/services/fixtures/fbrefFixtureService.ts
import type { FeaturedFixtureWithImportance } from '../../types';
import { fbrefScraper, type ScrapedData, type TableData } from '../scrape/Fbref';
import {
  normalizeTeamName,
  getDisplayTeamName,
  getTeamLogo,
  getCompetitionLogo,
} from '../../utils/teamUtils';

interface ParsedFixture {
  id: string;
  dateTime: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming';
  venue?: string;
  matchWeek?: number;
}

export class FBrefFixtureService {
  private fixturesCache: FeaturedFixtureWithImportance[] = [];
  private cacheTime = 0;
  private readonly cacheTimeout = 15 * 60 * 1000; // 15 minutes

  private readonly FBREF_URLS = {
    premierLeague: {
      fixtures: 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/9/Premier-League-Stats',
      stats: 'https://fbref.com/en/comps/9/stats/Premier-League-Stats',
    },
    laLiga: {
      fixtures: 'https://fbref.com/en/comps/12/schedule/La-Liga-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/12/La-Liga-Stats',
    },
    bundesliga: {
      fixtures: 'https://fbref.com/en/comps/20/schedule/Bundesliga-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/20/Bundesliga-Stats',
    },
    serieA: {
      fixtures: 'https://fbref.com/en/comps/11/schedule/Serie-A-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/11/Serie-A-Stats',
    },
    ligue1: {
      fixtures: 'https://fbref.com/en/comps/13/schedule/Ligue-1-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/13/Ligue-1-Stats',
    },
  };

  private currentLeague: keyof typeof this.FBREF_URLS = 'premierLeague';

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

  // Cache helpers
  private isCacheValid(): boolean {
    return this.fixturesCache.length > 0 && Date.now() - this.cacheTime < this.cacheTimeout;
  }

  public clearCache(): void {
    this.fixturesCache = [];
    this.cacheTime = 0;
    console.log('Cache cleared');
  }

  private async scrapeFixtures(customUrl?: string): Promise<ScrapedData> {
    const fixturesUrl = customUrl || this.FBREF_URLS[this.currentLeague].fixtures;
    return await fbrefScraper.scrapeUrl(fixturesUrl);
  }

  setLeague(league: keyof typeof this.FBREF_URLS): void {
    if (this.currentLeague !== league) {
      this.currentLeague = league;
      this.clearCache();
    }
  }

  async scrapeCustomUrl(url: string): Promise<ScrapedData> {
    if (!url.startsWith('https://fbref.com/')) {
      throw new Error('URL must be from fbref.com');
    }
    return await fbrefScraper.scrapeUrl(url);
  }

  getCurrentLeague() {
    return { name: this.currentLeague, urls: this.FBREF_URLS[this.currentLeague] };
  }

  private parseDate(dateStr: string, timeStr?: string): string {
    try {
      let date: Date;

      if (dateStr.includes('-')) {
        date = new Date(dateStr);
      } else {
        date = new Date(dateStr + ', 2024'); // assume season year
      }

      if (timeStr && timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        date.setHours(hours, minutes);
      }

      return date.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  private parseStatus(statusStr: string): ParsedFixture['status'] {
    if (!statusStr) return 'upcoming';
    const status = statusStr.toLowerCase().trim();

    if (status.includes('postponed') || status.includes('cancelled')) return 'postponed';
    if (status.includes('ft') || status.includes('full-time') || /^\d+-\d+$/.test(status))
      return 'finished';
    if (status.includes("'") || status.includes('ht') || status.includes('live')) return 'live';
    if (status.includes('tbd') || status.includes('to be determined')) return 'upcoming';
    return 'scheduled';
  }

  private parseFixturesFromTable(table: TableData): ParsedFixture[] {
    const fixtures: ParsedFixture[] = [];

    const headers = table.headers.map(h => h.toLowerCase());
    const dateIndex = headers.findIndex(h => h.includes('date'));
    const timeIndex = headers.findIndex(h => h.includes('time'));
    const homeIndex = headers.findIndex(h => h.includes('home'));
    const awayIndex = headers.findIndex(h => h.includes('away'));
    const scoreIndex = headers.findIndex(h => h.includes('score') || h.includes('result'));
    const venueIndex = headers.findIndex(h => h.includes('venue') || h.includes('stadium'));
    const weekIndex = headers.findIndex(h => h.includes('wk') || h.includes('week'));

    table.rows.forEach((row, index) => {
      if (row.length < 4) return;

      const rawHome = typeof row[homeIndex] === 'object' ? row[homeIndex].text : row[homeIndex];
      const rawAway = typeof row[awayIndex] === 'object' ? row[awayIndex].text : row[awayIndex];
      if (!rawHome || !rawAway) return;

      const homeTeam = normalizeTeamName(rawHome);
      const awayTeam = normalizeTeamName(rawAway);

      const dateStr = dateIndex >= 0 ? (typeof row[dateIndex] === 'object' ? row[dateIndex].text : row[dateIndex]) : '';
      const timeStr = timeIndex >= 0 ? (typeof row[timeIndex] === 'object' ? row[timeIndex].text : row[timeIndex]) : '';
      const scoreStr = scoreIndex >= 0 ? (typeof row[scoreIndex] === 'object' ? row[scoreIndex].text : row[scoreIndex]) : '';
      const venueStr = venueIndex >= 0 ? (typeof row[venueIndex] === 'object' ? row[venueIndex].text : row[venueIndex]) : '';
      const weekStr = weekIndex >= 0 ? (typeof row[weekIndex] === 'object' ? row[weekIndex].text : row[weekIndex]) : '';

      let homeScore: number | undefined;
      let awayScore: number | undefined;

      if (scoreStr && scoreStr.includes('–')) {
        const [h, a] = scoreStr.split('–').map(s => parseInt(s.trim(), 10));
        if (!isNaN(h) && !isNaN(a)) {
          homeScore = h;
          awayScore = a;
        }
      }

      fixtures.push({
        id: `fbref-${index}-${homeTeam}-${awayTeam}`.replace(/\s+/g, '-'),
        dateTime: this.parseDate(dateStr, timeStr),
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        status: this.parseStatus(scoreStr),
        venue: venueStr || 'TBD',
        matchWeek: weekStr ? parseInt(weekStr) || 1 : 1,
      });
    });

    return fixtures;
  }

  private transformFixture(parsed: ParsedFixture): FeaturedFixtureWithImportance {
    const importance = this.calculateImportance(parsed);
    const tags = this.generateTags(parsed, importance);

    const homeTeamLogo = getTeamLogo({ name: parsed.homeTeam });
    const awayTeamLogo = getTeamLogo({ name: parsed.awayTeam });

    return {
      id: parsed.id,
      dateTime: parsed.dateTime,
      homeTeam: {
        id: parsed.homeTeam.replace(/\s+/g, '-').toLowerCase(),
        name: parsed.homeTeam,
        shortName: getDisplayTeamName(parsed.homeTeam),
        logo: homeTeamLogo.logoPath,
        form: [],
      },
      awayTeam: {
        id: parsed.awayTeam.replace(/\s+/g, '-').toLowerCase(),
        name: parsed.awayTeam,
        shortName: getDisplayTeamName(parsed.awayTeam),
        logo: awayTeamLogo.logoPath,
        form: [],
      },
      venue: parsed.venue || 'TBD',
      competition: {
        id: this.currentLeague,
        name: 'Premier League',
        logo: getCompetitionLogo('Premier League'),
      },
      matchWeek: parsed.matchWeek || 1,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: parsed.status,
      homeScore: parsed.homeScore || 0,
      awayScore: parsed.awayScore || 0,
    };
  }

  private calculateImportance(fixture: ParsedFixture): number {
    if (fixture.status === 'finished') return 0;

    let importance = 3;
    const matchday = fixture.matchWeek || 1;

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

  private getDayTag(dateStr: string): string | null {
    const day = new Date(dateStr).getDay();
    if (day === 0) return 'sunday-fixture';
    if (day === 6) return 'saturday-fixture';
    if (day === 1) return 'monday-night-football';
    return null;
  }

  private generateTags(fixture: ParsedFixture, importance: number): string[] {
    const tags: string[] = [];
    const matchday = fixture.matchWeek || 1;

    if (matchday <= 5) tags.push('early-season');
    else if (matchday >= 35) tags.push('title-race', 'relegation-battle');
    else if (matchday >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerby(fixture.homeTeam, fixture.awayTeam)) tags.push('derby');

    const dayTag = this.getDayTag(fixture.dateTime);
    if (dayTag) tags.push(dayTag);

    tags.push('league-match');
    if (fixture.status === 'live') tags.push('live');

    return tags;
  }

  private async refreshCache(customUrl?: string): Promise<void> {
    const scrapedData = await this.scrapeFixtures(customUrl);

    const fixturesTable = scrapedData.tables.find(
      table =>
        table.caption.toLowerCase().includes('fixtures') ||
        table.caption.toLowerCase().includes('schedule') ||
        table.caption.toLowerCase().includes('scores')
    );

    if (!fixturesTable) {
      throw new Error('No fixtures table found in scraped data');
    }

    const parsedFixtures = this.parseFixturesFromTable(fixturesTable);

    this.fixturesCache = parsedFixtures
      .map(f => this.transformFixture(f))
      .sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance;
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      });

    this.cacheTime = Date.now();
  }

  async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();

    const now = Date.now();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;

    return this.fixturesCache
      .filter(f => {
        const time = new Date(f.dateTime).getTime();
        return f.importance > 0 && time >= now && time <= nextWeek;
      })
      .slice(0, limit);
  }

  async getAllFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.fixturesCache;
  }

  async getCurrentGameWeekFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();

    const weekGroups = this.fixturesCache.reduce((acc, fixture) => {
      const week = fixture.matchWeek;
      if (!acc[week]) acc[week] = [];
      acc[week].push(fixture);
      return acc;
    }, {} as Record<number, FeaturedFixtureWithImportance[]>);

    const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);

    for (const week of sortedWeeks) {
      const weekFixtures = weekGroups[week];
      const hasUnfinishedGames = weekFixtures.some(
        f => f.status === 'scheduled' || f.status === 'upcoming' || f.status === 'live'
      );
      if (hasUnfinishedGames) {
        return weekFixtures.sort(
          (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        );
      }
    }

    return [];
  }

  async getUpcomingImportantMatches(limit?: number): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    const now = Date.now();
    const upcoming = this.fixturesCache.filter(
      f => f.importance > 0 && new Date(f.dateTime).getTime() >= now
    );
    return limit ? upcoming.slice(0, limit) : upcoming;
  }

  async getMatchesByImportance(minImportance: number): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.fixturesCache.filter(f => f.importance >= minImportance);
  }

  async getGameWeekInfo() {
    if (!this.isCacheValid()) await this.refreshCache();

    const fixtures = await this.getCurrentGameWeekFixtures();

    if (fixtures.length === 0) {
      return { currentWeek: 1, isComplete: true, totalGames: 0, finishedGames: 0, upcomingGames: 0 };
    }

    const currentWeek = fixtures[0].matchWeek;
    const finishedGames = fixtures.filter(f => f.status === 'finished' || f.status === 'postponed').length;
    const upcomingGames = fixtures.filter(f => f.status !== 'finished' && f.status !== 'postponed').length;

    return {
      currentWeek,
      isComplete: upcomingGames === 0,
      totalGames: fixtures.length,
      finishedGames,
      upcomingGames,
    };
  }
}

export const fbrefFixtureService = new FBrefFixtureService();
