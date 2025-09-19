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
  matchUrl?: string;
}

// NEW: Interface for team season stats that stats service needs
export interface TeamSeasonStats {
  team: string;
  matchesPlayed: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  corners?: number;
  cornersAgainst?: number;
  recentForm: ('W' | 'D' | 'L')[];
  position?: number;
}

export class FBrefFixtureService {
  private fixturesCache: FeaturedFixtureWithImportance[] = [];
  private teamStatsCache: Map<string, TeamSeasonStats> = new Map(); // NEW: Store team stats
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
    this.teamStatsCache.clear(); // NEW: Clear team stats too
    this.cacheTime = 0;
    console.log('Cache cleared');
  }

  // NEW: Scrape league table/standings for team stats
  private async scrapeStandings(): Promise<ScrapedData> {
    const standingsUrl = this.FBREF_URLS[this.currentLeague].standings;
    return await fbrefScraper.scrapeUrl(standingsUrl);
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

  // NEW: Parse team stats from league table
  private parseTeamStats(standingsData: ScrapedData): Map<string, Partial<TeamSeasonStats>> {
    const teamStats = new Map<string, Partial<TeamSeasonStats>>();
    
    const leagueTable = standingsData.tables.find(table => 
      table.headers.includes('W') && table.headers.includes('D') && table.headers.includes('L')
    );
    
    if (!leagueTable) return teamStats;

    const headers = leagueTable.headers.map(h => h.toLowerCase().trim());
    const teamIndex = headers.findIndex(h => h === 'squad');
    const mpIndex = headers.findIndex(h => h === 'mp');
    const wIndex = headers.findIndex(h => h === 'w');
    const dIndex = headers.findIndex(h => h === 'd');
    const lIndex = headers.findIndex(h => h === 'l');
    const gfIndex = headers.findIndex(h => h === 'gf');
    const gaIndex = headers.findIndex(h => h === 'ga');
    const ptsIndex = headers.findIndex(h => h === 'pts');

    leagueTable.rows.forEach((row, index) => {
      const teamCell = row[teamIndex];
      const teamName = typeof teamCell === 'object' ? teamCell.text : teamCell;
      if (!teamName || teamName.toLowerCase().includes('total')) return;

      const normalizedTeam = normalizeTeamName(teamName);
      const getValue = (index: number) => {
        const cell = row[index];
        const val = typeof cell === 'object' ? cell.text : cell;
        return parseInt(String(val || '').replace(/[^\d-]/g, '')) || 0;
      };

      teamStats.set(normalizedTeam, {
        team: normalizedTeam,
        matchesPlayed: getValue(mpIndex),
        won: getValue(wIndex),
        drawn: getValue(dIndex),
        lost: getValue(lIndex),
        goalsFor: getValue(gfIndex),
        goalsAgainst: getValue(gaIndex),
        points: getValue(ptsIndex),
        position: index + 1,
        recentForm: [], // Will be filled from fixtures
      });
    });

    return teamStats;
  }

  // NEW: Extract recent form from fixtures
  private extractRecentForm(fixturesData: ScrapedData): Map<string, ('W' | 'D' | 'L')[]> {
    const teamForms = new Map<string, ('W' | 'D' | 'L')[]>();
    
    const fixturesTable = fixturesData.tables.find(
      table =>
        table.caption.toLowerCase().includes('fixtures') ||
        table.caption.toLowerCase().includes('schedule') ||
        table.id.toLowerCase().includes('schedule') ||
        table.id.toLowerCase().includes('fixtures')
    );
    
    if (!fixturesTable) return teamForms;

    const headers = fixturesTable.headers.map(h => h.toLowerCase());
    const homeIndex = headers.findIndex(h => h.includes('home'));
    const awayIndex = headers.findIndex(h => h.includes('away'));
    const scoreIndex = headers.findIndex(h => h.includes('score') || h.includes('result'));

    // Process finished matches to build recent form
    const finishedMatches: Array<{
      homeTeam: string;
      awayTeam: string;
      homeScore: number;
      awayScore: number;
      date: string;
    }> = [];

    fixturesTable.rows.forEach(row => {
      if (row.length < 4) return;

      const homeTeam = normalizeTeamName(typeof row[homeIndex] === 'object' ? row[homeIndex].text : row[homeIndex]);
      const awayTeam = normalizeTeamName(typeof row[awayIndex] === 'object' ? row[awayIndex].text : row[awayIndex]);
      const scoreStr = typeof row[scoreIndex] === 'object' ? row[scoreIndex].text : row[scoreIndex];
      
      if (!scoreStr || !scoreStr.includes('–')) return;

      const [homeScoreStr, awayScoreStr] = scoreStr.split('–');
      const homeScore = parseInt(homeScoreStr.trim());
      const awayScore = parseInt(awayScoreStr.trim());
      if (isNaN(homeScore) || isNaN(awayScore)) return;

      // Get date for sorting (simplified)
      const dateStr = typeof row[0] === 'object' ? row[0].text : row[0];
      
      finishedMatches.push({
        homeTeam,
        awayTeam,
        homeScore,
        awayScore,
        date: dateStr || ''
      });
    });

    // Sort by date (most recent first) and take last 5 for each team
    finishedMatches.reverse(); // Assume they're in chronological order, so reverse for recent first

    finishedMatches.forEach(match => {
      // Initialize form arrays if needed
      if (!teamForms.has(match.homeTeam)) teamForms.set(match.homeTeam, []);
      if (!teamForms.has(match.awayTeam)) teamForms.set(match.awayTeam, []);

      const homeForm = teamForms.get(match.homeTeam)!;
      const awayForm = teamForms.get(match.awayTeam)!;

      // Add result to form (keep only last 5)
      if (homeForm.length < 5) {
        homeForm.push(match.homeScore > match.awayScore ? 'W' : match.homeScore < match.awayScore ? 'L' : 'D');
      }
      
      if (awayForm.length < 5) {
        awayForm.push(match.awayScore > match.homeScore ? 'W' : match.awayScore < match.homeScore ? 'L' : 'D');
      }
    });

    return teamForms;
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

      // Extract match URL
      let matchUrl: string | undefined;
      if (linkIndex >= 0 && typeof row[linkIndex] === 'object' && row[linkIndex].link) {
        matchUrl = row[linkIndex].link.startsWith('https://fbref.com')
          ? row[linkIndex].link
          : `https://fbref.com${row[linkIndex].link}`;
      }

      if (!matchUrl) {
        const rowText = row.map(cell => (typeof cell === 'object' ? cell.text : cell)).join(' ');
        const urlMatch = rowText.match(/\/en\/matches\/\d+\/[a-zA-Z0-9\-]+/);
        if (urlMatch) matchUrl = `https://fbref.com${urlMatch[0]}`;
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
        matchUrl,
      });
    });

    return fixtures;
  }

  // Dynamic week assignment methods (unchanged)
  private assignDynamicMatchWeeks(fixtures: ParsedFixture[]): ParsedFixture[] {
    const sorted = fixtures.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    if (sorted.length === 0) return sorted;

    let currentWeek = 1;
    let currentWeekFixtures: ParsedFixture[] = [];
    
    const firstFixture = sorted[0];
    firstFixture.matchWeek = currentWeek;
    currentWeekFixtures.push(firstFixture);

    for (let i = 1; i < sorted.length; i++) {
      const currentFixture = sorted[i];
      const previousFixture = sorted[i - 1];
      
      const currentDate = new Date(currentFixture.dateTime);
      const previousDate = new Date(previousFixture.dateTime);
      
      const daysDifference = Math.floor((currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24));
      
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
    if (currentWeekDates.length === 0) return false;
    
    const weekStart = new Date(Math.min(...currentWeekDates.map(d => d.getTime())));
    const weekEnd = new Date(Math.max(...currentWeekDates.map(d => d.getTime())));
    
    const currentWeekSpan = Math.floor((weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSincePrevious > 4) return true;
    if (currentWeekSpan >= 4 && daysSincePrevious >= 2) return true;
    
    const potentialSpan = Math.floor((currentFixtureDate.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));
    if (potentialSpan > 6) return true;
    
    const currentDay = currentFixtureDate.getDay();
    if (currentDay === 1) {
      const hasWeekendGames = currentWeekDates.some(d => {
        const day = d.getDay();
        return day === 0 || day === 6;
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

    // Get team form from cache
    const homeTeamStats = this.teamStatsCache.get(parsed.homeTeam);
    const awayTeamStats = this.teamStatsCache.get(parsed.awayTeam);

    return {
      id: parsed.id,
      dateTime: parsed.dateTime,
      homeTeam: {
        id: parsed.homeTeam.replace(/\s+/g, '-').toLowerCase(),
        name: parsed.homeTeam,
        shortName: getDisplayTeamName(parsed.homeTeam),
        colors: this.TEAM_COLORS?.[parsed.homeTeam] ?? {},
        form: homeTeamStats?.recentForm || [],
        logo: homeTeamLogo.logoPath ?? undefined,
      },
      awayTeam: {
        id: parsed.awayTeam.replace(/\s+/g, '-').toLowerCase(),
        name: parsed.awayTeam,
        shortName: getDisplayTeamName(parsed.awayTeam),
        colors: this.TEAM_COLORS?.[parsed.awayTeam] ?? {},
        form: awayTeamStats?.recentForm || [],
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

  // UPDATED: Main refresh method now scrapes both fixtures AND team stats
  private async refreshCache(customUrl?: string): Promise<void> {
    try {
      console.log('Refreshing FBref fixtures and team stats cache...');
      
      // Scrape both fixtures and standings in parallel
      const [fixturesData, standingsData] = await Promise.all([
        this.scrapeFixtures(customUrl),
        this.scrapeStandings()
      ]);

      // Parse team stats first
      const basicStats = this.parseTeamStats(standingsData);
      const teamForms = this.extractRecentForm(fixturesData);

      // Combine team stats with form data
      this.teamStatsCache.clear();
      basicStats.forEach((stats, teamName) => {
        const form = teamForms.get(teamName) || [];
        this.teamStatsCache.set(teamName, {
          ...stats,
          recentForm: form,
        } as TeamSeasonStats);
      });

      // Parse fixtures
      const fixturesTables = fixturesData.tables.filter(table =>
        table.caption.toLowerCase().includes('fixtures') ||
        table.caption.toLowerCase().includes('schedule') ||
        table.caption.toLowerCase().includes('scores') ||
        table.id.toLowerCase().includes('schedule') ||
        table.id.toLowerCase().includes('fixture')
      );

      if (!fixturesTables.length) {
        console.log('Available tables:', fixturesData.tables.map(t => ({ id: t.id, caption: t.caption })));
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
      console.log(`Cache refreshed with ${this.fixturesCache.length} fixtures and ${this.teamStatsCache.size} team stats`);
    } catch (error) {
      console.error('Error refreshing FBref fixtures cache:', error);
      throw error;
    }
  }

  // NEW: Expose team stats for other services
  async getTeamStats(teamName: string): Promise<TeamSeasonStats | null> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.teamStatsCache.get(normalizeTeamName(teamName)) || null;
  }

  // NEW: Get all team stats
  async getAllTeamStats(): Promise<Map<string, TeamSeasonStats>> {
    if (!this.isCacheValid()) await this.refreshCache();
    return new Map(this.teamStatsCache);
  }

  // Existing methods remain the same...
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
    
    const weekGroups = this.fixturesCache.reduce((acc, fixture) => {
      const week = fixture.matchWeek ?? 1;
      if (!acc[week]) acc[week] = [];
      acc[week].push(fixture);
      return acc;
    }, {} as Record<number, FeaturedFixtureWithImportance[]>);

    const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);

    for (const week of sortedWeeks) {
      const weekFixtures = weekGroups[week];
      
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
      
      const hasActiveContent = liveGames > 0 || 
                           (upcomingGames > 0 && finishedGames > 0) ||
                           futureGames > 0;
      
      const weekComplete = finishedGames === weekFixtures.length && liveGames === 0;
      
      if (hasActiveContent || !weekComplete) {
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

    const isComplete = (finishedGames === fixtures.length) && (liveGames === 0);

    return {
      currentWeek,
      isComplete,
      totalGames: fixtures.length,
      finishedGames,
      upcomingGames: upcomingGames + liveGames,
    };
  }
}

export const fbrefFixtureService = new FBrefFixtureService();
