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

  // ---------------- Cache helpers ----------------
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
  const linkIndex = headers.findIndex(h => h.includes('match') || h.includes('url') || h.includes('boxscore'));

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

    // Extract match URL if available
    let matchUrl: string | undefined;
    if (linkIndex >= 0 && typeof row[linkIndex] === 'object' && row[linkIndex].link) {
      matchUrl = row[linkIndex].link.startsWith('https://fbref.com') ? row[linkIndex].link : `https://fbref.com${row[linkIndex].link}`;
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
      matchWeek: weekStr ? parseInt(weekStr) || undefined : undefined,
      matchUrl, // ✅ added
    });
  });

  return fixtures;
}



  // ---------------- Dynamic week assignment ----------------
// Updated assignDynamicMatchWeeks method for fbrefFixtureService.ts

private assignDynamicMatchWeeks(fixtures: ParsedFixture[]): ParsedFixture[] {
  const sorted = fixtures.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  if (sorted.length === 0) return sorted;

  let currentWeek = 1;
  let currentWeekFixtures: ParsedFixture[] = [];
  
  // Start with the first fixture
  const firstFixture = sorted[0];
  firstFixture.matchWeek = currentWeek;
  currentWeekFixtures.push(firstFixture);

  for (let i = 1; i < sorted.length; i++) {
    const currentFixture = sorted[i];
    const previousFixture = sorted[i - 1];
    
    const currentDate = new Date(currentFixture.dateTime);
    const previousDate = new Date(previousFixture.dateTime);
    
    // Calculate days between fixtures
    const daysDifference = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if we should start a new week
    const shouldStartNewWeek = this.shouldStartNewMatchWeek(
      currentDate,
      currentWeekFixtures.map(f => new Date(f.dateTime)),
      daysDifference
    );
    
    if (shouldStartNewWeek) {
      currentWeek++;
      currentWeekFixtures = [];
    }
    
    currentFixture.matchWeek = currentWeek;
    currentWeekFixtures.push(currentFixture);
  }

  return sorted;
}

private shouldStartNewMatchWeek(
  currentFixtureDate: Date,
  currentWeekDates: Date[],
  daysSincePrevious: number
): boolean {
  // If there are no fixtures in current week yet, don't start new week
  if (currentWeekDates.length === 0) return false;
  
  // Get the earliest and latest dates in the current week
  const weekStart = new Date(Math.min(...currentWeekDates.map(d => d.getTime())));
  const weekEnd = new Date(Math.max(...currentWeekDates.map(d => d.getTime())));
  
  // Calculate span of current week
  const currentWeekSpan = Math.floor((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  
  // Rule 1: If gap is more than 4 days from the last fixture, start new week
  if (daysSincePrevious > 4) return true;
  
  // Rule 2: If current week already spans 4+ days and this fixture is 2+ days later, start new week
  if (currentWeekSpan >= 4 && daysSincePrevious >= 2) return true;
  
  // Rule 3: If we'd span more than 6 days total, start new week
  const potentialSpan = Math.floor((currentFixtureDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
  if (potentialSpan > 6) return true;
  
  // Rule 4: Monday fixtures usually start a new week if previous week had weekend games
  const currentDay = currentFixtureDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  if (currentDay === 1) { // Monday
    const hasWeekendGames = currentWeekDates.some(d => {
      const day = d.getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    });
    if (hasWeekendGames && daysSincePrevious >= 1) return true;
  }
  
  return false;
}

  private transformFixture(parsed: ParsedFixture): FeaturedFixtureWithImportance {
    const homeTeamLogo = getTeamLogo({ name: parsed.homeTeam });
    const awayTeamLogo = getTeamLogo({ name: parsed.awayTeam });

    const importance = this.calculateImportance(parsed);
    const tags = this.generateTags(parsed, importance);

    return {
      id: parsed.id,
      dateTime: parsed.dateTime,
      homeTeam: {
        id: parsed.homeTeam.replace(/\s+/g, '-').toLowerCase(),
        name: parsed.homeTeam,
        shortName: getDisplayTeamName(parsed.homeTeam),
        colors: this.TEAM_COLORS?.[parsed.homeTeam] ?? {},
        form: [],
        logo: homeTeamLogo.logoPath ?? undefined,
      },
      awayTeam: {
        id: parsed.awayTeam.replace(/\s+/g, '-').toLowerCase(),
        name: parsed.awayTeam,
        shortName: getDisplayTeamName(parsed.awayTeam),
        colors: this.TEAM_COLORS?.[parsed.awayTeam] ?? {},
        form: [],
        logo: awayTeamLogo.logoPath ?? undefined,
      },
      venue: parsed.venue || 'TBD',
      competition: {
        id: this.currentLeague,
        name: 'Premier League',
        logo: getCompetitionLogo('Premier League') ?? undefined,
      },
      matchWeek: parsed.matchWeek ?? 1,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: parsed.status,
      homeScore: parsed.homeScore ?? 0,
      awayScore: parsed.awayScore ?? 0,
    };
  }

  private calculateImportance(fixture: ParsedFixture): number {
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

  private getDayTag(dateStr: string): string | null {
    const day = new Date(dateStr).getDay();
    if (day === 0) return 'sunday-fixture';
    if (day === 6) return 'saturday-fixture';
    if (day === 1) return 'monday-night-football';
    return null;
  }

  private generateTags(fixture: ParsedFixture, importance: number): string[] {
    const tags: string[] = [];
    const matchday = fixture.matchWeek ?? 1;

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
    try {
      console.log('Refreshing FBref fixtures cache...');
      const scrapedData = await this.scrapeFixtures(customUrl);

      const fixturesTables = scrapedData.tables.filter(table =>
        table.caption.toLowerCase().includes('fixtures') ||
        table.caption.toLowerCase().includes('schedule') ||
        table.caption.toLowerCase().includes('scores') ||
        table.id.toLowerCase().includes('schedule') ||
        table.id.toLowerCase().includes('fixture')
      );

      if (!fixturesTables.length) {
        console.log('Available tables:', scrapedData.tables.map(t => ({ id: t.id, caption: t.caption })));
        throw new Error('No fixtures table found in scraped data');
      }

      console.log(`Found ${fixturesTables.length} fixtures tables`);

      const parsedFixtures = fixturesTables.flatMap(table => this.parseFixturesFromTable(table));
      console.log(`Parsed ${parsedFixtures.length} fixtures from all tables`);

      // Assign dynamic weeks
      const fixturesWithWeeks = this.assignDynamicMatchWeeks(parsedFixtures);

      // Transform and sort
      this.fixturesCache = fixturesWithWeeks
        .map(f => this.transformFixture(f))
        .sort((a, b) => {
          if (b.importance !== a.importance) return b.importance - a.importance;
          return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
        });

      this.cacheTime = Date.now();
      console.log(`Cache refreshed with ${this.fixturesCache.length} fixtures`);
    } catch (error) {
      console.error('Error refreshing FBref fixtures cache:', error);
      throw error;
    }
  }

  // ---------------- Getters ----------------
  async getFeaturedFixtures(limit = 8): Promise<FeaturedFixtureWithImportance[]> {
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

  const now = Date.now();
  
  // Group fixtures by week
  const weekGroups = this.fixturesCache.reduce((acc, fixture) => {
    const week = fixture.matchWeek ?? 1;
    if (!acc[week]) acc[week] = [];
    acc[week].push(fixture);
    return acc;
  }, {} as Record<number, FeaturedFixtureWithImportance[]>);

  const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);

  // Find the current active week
  for (const week of sortedWeeks) {
    const weekFixtures = weekGroups[week];
    
    // Calculate week status
    const finishedGames = weekFixtures.filter(f => 
      f.status === 'finished' || f.status === 'postponed'
    ).length;
    
    const liveGames = weekFixtures.filter(f => f.status === 'live').length;
    
    const upcomingGames = weekFixtures.filter(f => 
      f.status === 'scheduled' || f.status === 'upcoming'
    ).length;
    
    const futureGames = weekFixtures.filter(f => 
      new Date(f.dateTime).getTime() > now
    ).length;
    
    // Week is "current" if:
    // 1. Has live games, OR
    // 2. Has unfinished games and at least one game has started or is today, OR  
    // 3. Has upcoming games within the next 7 days, OR
    // 4. Week is not completely finished and no future weeks have started
    
    const hasActiveContent = liveGames > 0 || 
                           (upcomingGames > 0 && finishedGames > 0) ||
                           futureGames > 0;
    
    const weekComplete = finishedGames === weekFixtures.length && liveGames === 0;
    
    if (hasActiveContent || !weekComplete) {
      // Additional check: ensure upcoming games are within reasonable timeframe (next 7 days)
      const upcomingInWindow = weekFixtures.filter(f => {
        const fixtureTime = new Date(f.dateTime).getTime();
        const sevenDaysFromNow = now + (7 * 24 * 60 * 60 * 1000);
        return fixtureTime >= now && fixtureTime <= sevenDaysFromNow;
      });
      
      if (liveGames > 0 || finishedGames > 0 || upcomingInWindow.length > 0) {
        return weekFixtures.sort(
          (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        );
      }
    }
  }

  // Fallback: return the next upcoming week if no "current" week found
  for (const week of sortedWeeks) {
    const weekFixtures = weekGroups[week];
    const hasUpcomingGames = weekFixtures.some(f => 
      new Date(f.dateTime).getTime() > now
    );
    
    if (hasUpcomingGames) {
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
    const upcoming = this.fixturesCache.filter(f => f.importance > 0 && new Date(f.dateTime).getTime() >= now);
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
    return { 
      currentWeek: 1, 
      isComplete: true, 
      totalGames: 0, 
      finishedGames: 0, 
      upcomingGames: 0 
    };
  }

  const currentWeek = fixtures[0].matchWeek ?? 1;
  const finishedGames = fixtures.filter(f => 
    f.status === 'finished' || f.status === 'postponed'
  ).length;
  
  const liveGames = fixtures.filter(f => f.status === 'live').length;
  
  const upcomingGames = fixtures.filter(f => 
    f.status === 'scheduled' || f.status === 'upcoming'
  ).length;

  // Week is complete only if all games are finished/postponed AND no live games
  const isComplete = (finishedGames === fixtures.length) && (liveGames === 0);

  return {
    currentWeek,
    isComplete,
    totalGames: fixtures.length,
    finishedGames,
    upcomingGames: upcomingGames + liveGames, // Include live games as "upcoming"
  };
}
}

export const fbrefFixtureService = new FBrefFixtureService();
