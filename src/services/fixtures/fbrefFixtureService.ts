// src/services/fixtures/fbrefFixtureService.ts
import type { FeaturedFixtureWithImportance } from '../../types';
import { fbrefScraper, type ScrapedData, type TableData } from '../scrape/Fbref';

interface ParsedFixture {
  id: string;
  dateTime: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  venue?: string;
  matchWeek?: number;
}

export class FBrefFixtureService {
  private fixturesCache: FeaturedFixtureWithImportance[] = [];
  private cacheTime = 0;
  private readonly cacheTimeout = 15 * 60 * 1000; // 15 minutes

  // Configurable URLs
  private readonly FBREF_URLS = {
    premierLeague: {
      fixtures: 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/9/Premier-League-Stats',
      stats: 'https://fbref.com/en/comps/9/stats/Premier-League-Stats'
    },
    laLiga: {
      fixtures: 'https://fbref.com/en/comps/12/schedule/La-Liga-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/12/La-Liga-Stats'
    },
    bundesliga: {
      fixtures: 'https://fbref.com/en/comps/20/schedule/Bundesliga-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/20/Bundesliga-Stats'
    },
    serieA: {
      fixtures: 'https://fbref.com/en/comps/11/schedule/Serie-A-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/11/Serie-A-Stats'
    },
    ligue1: {
      fixtures: 'https://fbref.com/en/comps/13/schedule/Ligue-1-Scores-and-Fixtures',
      standings: 'https://fbref.com/en/comps/13/Ligue-1-Stats'
    }
  };

  private currentLeague: keyof typeof this.FBREF_URLS = 'premierLeague';

  // Same configuration as your original service
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

  // Cache helpers
  private isCacheValid(): boolean {
    return this.fixturesCache.length > 0 && (Date.now() - this.cacheTime < this.cacheTimeout);
  }

  public clearCache(): void {
  this.fixturesCache = [];
  this.cacheTime = 0;
  console.log('Cache cleared');
}

  // Scrape fixture data from FBref
  private async scrapeFixtures(customUrl?: string): Promise<ScrapedData> {
    const fixturesUrl = customUrl || this.FBREF_URLS[this.currentLeague].fixtures;
    console.log(`Scraping fixtures from: ${fixturesUrl}`);
    return await fbrefScraper.scrapeUrl(fixturesUrl);
  }

  // Method to change league/competition
  setLeague(league: keyof typeof this.FBREF_URLS): void {
    if (this.currentLeague !== league) {
      this.currentLeague = league;
      this.clearCache(); // Clear cache when switching leagues
      console.log(`Switched to ${league} league`);
    }
  }

  // Method to scrape custom URL
  async scrapeCustomUrl(url: string): Promise<ScrapedData> {
    if (!url.startsWith('https://fbref.com/')) {
      throw new Error('URL must be from fbref.com');
    }
    console.log(`Scraping custom URL: ${url}`);
    return await fbrefScraper.scrapeUrl(url);
  }

  // Get current league info
  getCurrentLeague(): { name: string; urls: { fixtures: string; standings?: string; stats?: string } } {
  return {
    name: this.currentLeague,
    urls: this.FBREF_URLS[this.currentLeague]
  };
}

  // Parse team name and handle variations
  private normalizeTeamName(teamName: string): string {
    const cleanName = teamName.trim();
    
    // Handle common FBref variations
    const nameMap: Record<string, string> = {
      'Brighton': 'Brighton & Hove Albion',
      'Man Utd': 'Manchester United',
      'Man City': 'Manchester City',
      'Spurs': 'Tottenham Hotspur',
      'Leicester': 'Leicester City',
      'Wolves': 'Wolverhampton Wanderers',
      'Newcastle': 'Newcastle United',
      'West Ham': 'West Ham United',
      'Palace': 'Crystal Palace',
      'Forest': 'Nottingham Forest',
      'Sheffield Utd': 'Sheffield United',
    };

    return nameMap[cleanName] || cleanName;
  }

  // Parse date from various FBref formats
  private parseDate(dateStr: string, timeStr?: string): string {
    try {
      // Handle formats like "2024-01-15" or "Mon, Jan 15"
      let date: Date;
      
      if (dateStr.includes('-')) {
        // ISO format: 2024-01-15
        date = new Date(dateStr);
      } else {
        // Parse formats like "Mon, Jan 15" or "January 15"
        date = new Date(dateStr + ', 2024'); // Assume current year
      }

      // Add time if provided (e.g., "15:00")
      if (timeStr && timeStr.includes(':')) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        date.setHours(hours, minutes);
      }

      return date.toISOString();
    } catch (error) {
      console.error('Error parsing date:', dateStr, timeStr, error);
      return new Date().toISOString();
    }
  }

  // Parse status from FBref format
  private parseStatus(statusStr: string): 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming' {
  if (!statusStr) return 'upcoming';
  
  const status = statusStr.toLowerCase().trim();
  
  if (status.includes('postponed') || status.includes('cancelled')) return 'postponed';
  if (status.includes('ft') || status.includes('full-time') || /^\d+-\d+$/.test(status)) return 'finished';
  if (status.includes("'") || status.includes('ht') || status.includes('live')) return 'live';
  if (status.includes('tbd') || status.includes('to be determined')) return 'upcoming';
  
  return 'scheduled';
}

  // Extract fixtures from scraped table
  private parseFixturesFromTable(table: TableData): ParsedFixture[] {
    const fixtures: ParsedFixture[] = [];
    
    // Find relevant columns (adjust based on actual FBref table structure)
    const headers = table.headers.map(h => h.toLowerCase());
    const dateIndex = headers.findIndex(h => h.includes('date'));
    const timeIndex = headers.findIndex(h => h.includes('time'));
    const homeIndex = headers.findIndex(h => h.includes('home') || h.includes('home team'));
    const awayIndex = headers.findIndex(h => h.includes('away') || h.includes('away team'));
    const scoreIndex = headers.findIndex(h => h.includes('score') || h.includes('result'));
    const venueIndex = headers.findIndex(h => h.includes('venue') || h.includes('stadium'));
    const weekIndex = headers.findIndex(h => h.includes('wk') || h.includes('week') || h.includes('round'));

    table.rows.forEach((row, index) => {
      try {
        // Skip header rows or empty rows
        if (row.length < 4) return;

        const homeTeamData = row[homeIndex];
        const awayTeamData = row[awayIndex];
        
        if (!homeTeamData || !awayTeamData) return;

        const homeTeam = this.normalizeTeamName(
          typeof homeTeamData === 'object' ? homeTeamData.text : homeTeamData
        );
        const awayTeam = this.normalizeTeamName(
          typeof awayTeamData === 'object' ? awayTeamData.text : awayTeamData
        );

        const dateStr = dateIndex >= 0 ? 
          (typeof row[dateIndex] === 'object' ? row[dateIndex].text : row[dateIndex]) : '';
        const timeStr = timeIndex >= 0 ? 
          (typeof row[timeIndex] === 'object' ? row[timeIndex].text : row[timeIndex]) : '';
        
        const scoreStr = scoreIndex >= 0 ? 
          (typeof row[scoreIndex] === 'object' ? row[scoreIndex].text : row[scoreIndex]) : '';
        
        const venueStr = venueIndex >= 0 ? 
          (typeof row[venueIndex] === 'object' ? row[venueIndex].text : row[venueIndex]) : '';

        const weekStr = weekIndex >= 0 ? 
          (typeof row[weekIndex] === 'object' ? row[weekIndex].text : row[weekIndex]) : '';

        // Parse scores if available
        let homeScore: number | undefined;
        let awayScore: number | undefined;
        let status = 'upcoming';

        if (scoreStr && scoreStr.includes('–')) {
          const scores = scoreStr.split('–').map(s => s.trim());
          if (scores.length === 2) {
            const home = parseInt(scores[0]);
            const away = parseInt(scores[1]);
            if (!isNaN(home) && !isNaN(away)) {
              homeScore = home;
              awayScore = away;
              status = 'finished';
            }
          }
        }

        const fixture: ParsedFixture = {
          id: `fbref-${index}-${homeTeam}-${awayTeam}`.replace(/\s+/g, '-'),
          dateTime: this.parseDate(dateStr, timeStr),
          homeTeam,
          awayTeam,
          homeScore,
          awayScore,
          status: this.parseStatus(scoreStr || status),
          venue: venueStr || 'TBD',
          matchWeek: weekStr ? parseInt(weekStr) || 1 : 1,
        };

        fixtures.push(fixture);
      } catch (error) {
        console.error('Error parsing fixture row:', row, error);
      }
    });

    return fixtures;
  }

  // Transform parsed fixture to FeaturedFixtureWithImportance
  private transformFixture(parsed: ParsedFixture): FeaturedFixtureWithImportance {
    const importance = this.calculateImportance(parsed);
    const tags = this.generateTags(parsed, importance);

    return {
      id: parsed.id,
      dateTime: parsed.dateTime,
      homeTeam: {
        id: parsed.homeTeam.replace(/\s+/g, '-').toLowerCase(),
        name: parsed.homeTeam,
        shortName: this.SHORT_NAME_OVERRIDES[parsed.homeTeam] || parsed.homeTeam,
        colors: this.TEAM_COLORS[parsed.homeTeam] || {},
        form: [], // Could be enhanced by scraping additional data
      },
      awayTeam: {
        id: parsed.awayTeam.replace(/\s+/g, '-').toLowerCase(),
        name: parsed.awayTeam,
        shortName: this.SHORT_NAME_OVERRIDES[parsed.awayTeam] || parsed.awayTeam,
        colors: this.TEAM_COLORS[parsed.awayTeam] || {},
        form: [], // Could be enhanced by scraping additional data
      },
      venue: parsed.venue || 'TBD',
      competition: {
        id: 'premier-league',
        name: 'Premier League',
        logo: '',
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

  // Calculate importance (same logic as original service)
  private calculateImportance(fixture: ParsedFixture): number {
    if (fixture.status === 'finished') return 0;

    let importance = 3;
    const matchday = fixture.matchWeek || 1;

    // Matchday weight
    if (matchday >= 35) importance += 3;
    else if (matchday >= 25) importance += 2;
    else if (matchday >= 15) importance += 1;

    // Big six
    const homeBigSix = this.BIG_SIX.includes(fixture.homeTeam);
    const awayBigSix = this.BIG_SIX.includes(fixture.awayTeam);
    if (homeBigSix && awayBigSix) importance += 2;
    else if (homeBigSix || awayBigSix) importance += 1;

    // Derby
    if (this.isDerby(fixture.homeTeam, fixture.awayTeam)) importance += 2;

    // Live match
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

  // Refresh cache by scraping FBref
  private async refreshCache(customUrl?: string): Promise<void> {
    try {
      console.log('Refreshing FBref fixtures cache...');
      const scrapedData = await this.scrapeFixtures(customUrl);
      
      // Find the fixtures table (adjust selector based on actual FBref structure)
      const fixturesTable = scrapedData.tables.find(table => 
        table.caption.toLowerCase().includes('fixtures') ||
        table.caption.toLowerCase().includes('schedule') ||
        table.caption.toLowerCase().includes('scores') ||
        table.id.includes('schedule') ||
        table.id.includes('fixture')
      );

      if (!fixturesTable) {
        console.log('Available tables:', scrapedData.tables.map(t => ({ id: t.id, caption: t.caption })));
        throw new Error('No fixtures table found in scraped data');
      }

      console.log(`Found fixtures table: ${fixturesTable.caption} with ${fixturesTable.rows.length} rows`);

      const parsedFixtures = this.parseFixturesFromTable(fixturesTable);
      console.log(`Parsed ${parsedFixtures.length} fixtures`);

      this.fixturesCache = parsedFixtures
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

  // Public methods (same interface as original service)
  async getFeaturedFixtures(limit: number = 8): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    
    const now = Date.now();
    const nextWeek = now + 7 * 24 * 60 * 60 * 1000;
    
    return this.fixturesCache
      .filter(fixture => {
        const fixtureTime = new Date(fixture.dateTime).getTime();
        return fixture.importance > 0 && fixtureTime >= now && fixtureTime <= nextWeek;
      })
      .slice(0, limit);
  }

  async getAllFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.fixturesCache;
  }

  async getCurrentGameWeekFixtures(): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    
    // Find current game week (first week with unfinished games)
    const weekGroups = this.fixturesCache.reduce((acc, fixture) => {
      const week = fixture.matchWeek;
      if (!acc[week]) acc[week] = [];
      acc[week].push(fixture);
      return acc;
    }, {} as Record<number, FeaturedFixtureWithImportance[]>);

    const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);
    
    for (const week of sortedWeeks) {
      const weekFixtures = weekGroups[week];
      const hasUnfinishedGames = weekFixtures.some(fixture => 
        fixture.status === 'scheduled' || 
        fixture.status === 'upcoming' || 
        fixture.status === 'live'
      );

      if (hasUnfinishedGames) {
        return weekFixtures.sort((a, b) => 
          new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
        );
      }
    }

    return [];
  }

  async getUpcomingImportantMatches(limit?: number): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    const now = Date.now();
    const upcomingImportant = this.fixturesCache.filter(m => 
      m.importance > 0 && new Date(m.dateTime).getTime() >= now
    );
    return limit ? upcomingImportant.slice(0, limit) : upcomingImportant;
  }

  async getMatchesByImportance(minImportance: number): Promise<FeaturedFixtureWithImportance[]> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.fixturesCache.filter(m => m.importance >= minImportance);
  }

  async getGameWeekInfo(): Promise<{
    currentWeek: number;
    isComplete: boolean;
    totalGames: number;
    finishedGames: number;
    upcomingGames: number;
  }> {
    if (!this.isCacheValid()) await this.refreshCache();
    
    // const allFixtures = this.fixturesCache;
    const currentWeekFixtures = await this.getCurrentGameWeekFixtures();
    
    if (currentWeekFixtures.length === 0) {
      return {
        currentWeek: 1,
        isComplete: true,
        totalGames: 0,
        finishedGames: 0,
        upcomingGames: 0
      };
    }
    
    const currentWeek = currentWeekFixtures[0].matchWeek;
    const finishedGames = currentWeekFixtures.filter(f => 
      f.status === 'finished' || f.status === 'postponed'
    ).length;
    
    const upcomingGames = currentWeekFixtures.filter(f => 
      f.status === 'scheduled' || f.status === 'upcoming' || f.status === 'live'
    ).length;
    
    return {
      currentWeek,
      isComplete: upcomingGames === 0,
      totalGames: currentWeekFixtures.length,
      finishedGames,
      upcomingGames
    };
  }
}

// Export singleton instance
export const fbrefFixtureService = new FBrefFixtureService();
