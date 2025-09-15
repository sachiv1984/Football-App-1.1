// src/services/fixtures/fixtureService.ts
import type { FeaturedFixtureWithImportance } from '../../types';
import FootballDataService, { ApiFootballMatch, ApiFootballStanding } from '../api/footballDataService';

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
  private footballDataService = FootballDataService.getInstance();

  // -------------------------
  // Configurable lists
  // -------------------------
  private readonly SHORT_NAME_OVERRIDES: Record<string, string> = {
    "Manchester United": "Man Utd",
    "Brighton & Hove Albion": "Brighton",
    "Tottenham Hotspur": "Spurs",
    "Leicester City": "Leicester",
    "Wolverhampton Wanderers": "Wolves",
    "Sheffield United": "Sheff Utd",
    "Newcastle United": "Newcastle",
    "West Ham United": "West Ham",
    "Crystal Palace": "Palace",
    "Nottingham Forest": "Forest",
  };

  private readonly BIG_SIX = [
    'Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham Hotspur'
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

  // -------------------------
  // Cache helpers
  // -------------------------
  private isCacheValid(): boolean {
    return this.matchesCache.length > 0 && (Date.now() - this.cacheTime < this.cacheTimeout);
  }

  private clearCache(): void {
    this.matchesCache = [];
    this.cacheTime = 0;
  }

  // -------------------------
  // Data fetching (Updated to use new JSON files)
  // -------------------------
  private async fetchMatches(): Promise<ApiFootballMatch[]> {
    return await this.footballDataService.getFixtures();
  }

  private async fetchStandings(): Promise<ApiFootballStanding[]> {
    return await this.footballDataService.getStandings();
  }

  // -------------------------
  // Team helpers
  // -------------------------
  private getTeamColors(teamName: string): { primary?: string; secondary?: string } {
    return this.TEAM_COLORS[teamName] || {};
  }

  private parseForm(formArray?: string[]): ('W' | 'D' | 'L')[] {
    if (!formArray) return [];
    return formArray
      .slice(-5) // Get last 5 games
      .map(f => (['W', 'D', 'L'].includes(f) ? f as 'W' | 'D' | 'L' : 'D'));
  }

  private async getTeamDetails(team: ApiFootballMatch['homeTeam'] | ApiFootballMatch['awayTeam'], standings: ApiFootballStanding[]): Promise<TeamWithForm> {
    const teamStanding = standings.find(s => s.team.id === team.id);
    const shortName = this.SHORT_NAME_OVERRIDES[team.name] || team.name;

    return {
      id: team.id.toString(),
      name: team.name,
      shortName,
      logo: team.logo || '',
      colors: this.getTeamColors(team.name),
      form: this.parseForm(teamStanding?.form),
    };
  }

  // -------------------------
  // Match helpers
  // -------------------------
  private isDerby(home: string, away: string): boolean {
    return this.DERBIES.some(d => d.includes(home) && d.includes(away));
  }

  private isMatchFinished(status: string) {
    return ['FT', 'AET', 'PEN'].includes(status);
  }

  private isMatchUpcoming(status: string) {
    return ['TBD', 'NS'].includes(status);
  }

  private isMatchLive(status: string) {
    return ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].includes(status);
  }

  private calculateImportance(match: ApiFootballMatch, standings?: ApiFootballStanding[]): number {
    if (this.isMatchFinished(match.status.short)) return 0;

    let importance = 3;

    // Extract matchday from round (e.g., "Regular Season - 15" -> 15)
    const matchdayMatch = match.round.match(/(\d+)$/);
    const matchday = matchdayMatch ? parseInt(matchdayMatch[1]) : 1;

    // Matchday weight
    if (matchday >= 35) importance += 3;
    else if (matchday >= 25) importance += 2;
    else if (matchday >= 15) importance += 1;

    // Standings weight
    if (standings) {
      const homePos = standings.find(s => s.team.id === match.homeTeam.id)?.position || 20;
      const awayPos = standings.find(s => s.team.id === match.awayTeam.id)?.position || 20;

      if (homePos <= 6 && awayPos <= 6) importance += 3;
      else if ((homePos <= 10 && awayPos > 10) || (homePos > 10 && awayPos <= 10)) importance += 1;
      else if (homePos >= 17 && awayPos >= 17) importance += 2;
    }

    // Big six
    const homeBigSix = this.BIG_SIX.includes(match.homeTeam.name);
    const awayBigSix = this.BIG_SIX.includes(match.awayTeam.name);
    if (homeBigSix && awayBigSix) importance += 2;
    else if (homeBigSix || awayBigSix) importance += 1;

    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) importance += 2;
    if (this.isMatchLive(match.status.short)) importance += 1;

    return Math.min(importance, 10);
  }

  private getDayTag(dateStr: string): string | null {
    const day = new Date(dateStr).getDay();
    if (day === 0) return 'sunday-fixture';
    if (day === 6) return 'saturday-fixture';
    if (day === 1) return 'monday-night-football';
    return null;
  }

  private generateTags(match: ApiFootballMatch, importance: number): string[] {
    const tags: string[] = [];
    
    // Extract matchday from round
    const matchdayMatch = match.round.match(/(\d+)$/);
    const matchday = matchdayMatch ? parseInt(matchdayMatch[1]) : 1;

    if (matchday <= 5) tags.push('early-season');
    else if (matchday >= 35) tags.push('title-race', 'relegation-battle');
    else if (matchday >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) tags.push('derby');

    const dayTag = this.getDayTag(match.date);
    if (dayTag) tags.push(dayTag);

    tags.push('league-match');
    if (this.isMatchLive(match.status.short)) tags.push('live');

    return tags;
  }

  private mapStatus(status: ApiFootballMatch['status']): 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming' {
    if (this.isMatchLive(status.short)) return 'live';
    if (this.isMatchUpcoming(status.short)) return 'upcoming';
    if (this.isMatchFinished(status.short)) return 'finished';
    if (['PST', 'CANC', 'ABD', 'AWD', 'WO'].includes(status.short)) return 'postponed';
    return 'scheduled';
  }

  private async transformMatch(match: ApiFootballMatch, standings: ApiFootballStanding[]): Promise<FeaturedFixtureWithImportance> {
    const [homeTeam, awayTeam] = await Promise.all([
      this.getTeamDetails(match.homeTeam, standings),
      this.getTeamDetails(match.awayTeam, standings),
    ]);

    const importance = this.calculateImportance(match, standings);
    const tags = this.generateTags(match, importance);

    // Extract matchday from round
    const matchdayMatch = match.round.match(/(\d+)$/);
    const matchWeek = matchdayMatch ? parseInt(matchdayMatch[1]) : 1;

    // Ensure scores are numeric, default to 0 if missing
    const homeScore = match.goals.home ?? 0;
    const awayScore = match.goals.away ?? 0;

    return {
      id: match.id.toString(),
      dateTime: match.date,
      homeTeam,
      awayTeam,
      venue: match.venue.name || 'TBD',
      competition: {
        id: match.league.id.toString(),
        name: match.league.name,
        logo: match.league.logo || '',
      },
      matchWeek,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: this.mapStatus(match.status),
      homeScore,
      awayScore,
    };
  }

  private async refreshCache(): Promise<void> {
    try {
      const [matches, standings] = await Promise.all([
        this.fetchMatches(), 
        this.fetchStandings()
      ]);
      
      const transformed = await Promise.all(
        matches.map(m => this.transformMatch(m, standings))
      );

      this.matchesCache = transformed.sort((a, b) => {
        if (b.importance !== a.importance) return b.importance - a.importance;
        return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
      });

      this.cacheTime = Date.now();
    } catch (error) {
      console.error('Error refreshing fixture cache:', error);
      throw error;
    }
  }

  private getNextNDaysMatches(days: number): FeaturedFixtureWithImportance[] {
    const now = Date.now();
    const future = now + days * 24 * 60 * 60 * 1000;
    return this.matchesCache.filter(match => {
      const time = new Date(match.dateTime).getTime();
      return match.importance > 0 && time >= now && time <= future;
    });
  }

  // -------------------------
  // Game Week Logic
  // -------------------------
  
  private getCurrentGameWeek(fixtures: FeaturedFixtureWithImportance[]): number {
    // Group fixtures by matchWeek
    const weekGroups = fixtures.reduce((acc, fixture) => {
      const week = fixture.matchWeek;
      if (!acc[week]) acc[week] = [];
      acc[week].push(fixture);
      return acc;
    }, {} as Record<number, FeaturedFixtureWithImportance[]>);

    // Find the earliest week that has unfinished games
    const sortedWeeks = Object.keys(weekGroups)
      .map(Number)
      .sort((a, b) => a - b);

    for (const week of sortedWeeks) {
      const weekFixtures = weekGroups[week];
      const hasUnfinishedGames = weekFixtures.some(fixture => 
        fixture.status === 'scheduled' || 
        fixture.status === 'upcoming' || 
        fixture.status === 'live'
      );

      if (hasUnfinishedGames) {
        return week;
      }
    }

    // If no unfinished games found, return the next week
    const lastWeek = Math.max(...sortedWeeks);
    return lastWeek + 1;
  }

  private isGameWeekComplete(fixtures: FeaturedFixtureWithImportance[], gameWeek: number): boolean {
    const weekFixtures = fixtures.filter(f => f.matchWeek === gameWeek);
    
    if (weekFixtures.length === 0) return true; // No games = complete
    
    return weekFixtures.every(fixture => 
      fixture.status === 'finished' || 
      fixture.status === 'postponed'
    );
  }

  async getCurrentGameWeekFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    
    const allFixtures = this.matchesCache;
    const currentGameWeek = this.getCurrentGameWeek(allFixtures);
    
    // Get all fixtures for the current game week
    const currentWeekFixtures = allFixtures.filter(
      fixture => fixture.matchWeek === currentGameWeek
    );

    // Sort by date/time, keeping finished games in chronological order
    return currentWeekFixtures.sort((a, b) => {
      const dateA = new Date(a.dateTime).getTime();
      const dateB = new Date(b.dateTime).getTime();
      return dateA - dateB;
    });
  }

  async getGameWeekInfo(): Promise<{
    currentWeek: number;
    isComplete: boolean;
    totalGames: number;
    finishedGames: number;
    upcomingGames: number;
  }> {
    if (!this.isCacheValid()) await this.refreshCache();
    
    const allFixtures = this.matchesCache;
    const currentGameWeek = this.getCurrentGameWeek(allFixtures);
    const weekFixtures = allFixtures.filter(f => f.matchWeek === currentGameWeek);
    
    const finishedGames = weekFixtures.filter(f => 
      f.status === 'finished' || f.status === 'postponed'
    ).length;
    
    const upcomingGames = weekFixtures.filter(f => 
      f.status === 'scheduled' || f.status === 'upcoming' || f.status === 'live'
    ).length;
    
    return {
      currentWeek: currentGameWeek,
      isComplete: this.isGameWeekComplete(allFixtures, currentGameWeek),
      totalGames: weekFixtures.length,
      finishedGames,
      upcomingGames
    };
  }
 
  // -------------------------
  // Public methods
  // -------------------------
  async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.getNextNDaysMatches(7).slice(0, limit);
  }

  async getAllFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.matchesCache;
  }

  async getUpcomingImportantMatches(limit?: number): Promise<FeaturedFixtureWithImportance[]> {
    const allMatches = await this.getAllFixtures();
    const now = Date.now();
    const upcomingImportant = allMatches.filter(m => m.importance > 0 && new Date(m.dateTime).getTime() >= now);
    return limit ? upcomingImportant.slice(0, limit) : upcomingImportant;
  }

  async getMatchesByImportance(minImportance: number): Promise<FeaturedFixtureWithImportance[]> {
    const allMatches = await this.getAllFixtures();
    return allMatches.filter(m => m.importance >= minImportance);
  }

  // Clear both caches
  clearCache(): void {
    this.clearCache();
    this.footballDataService.clearCache();
  }
}
