// src/services/stats/fbrefStatsService.ts
import { fbrefScraper, type ScrapedData, type TableData } from '../scrape/Fbref';
import { normalizeTeamName } from '../../utils/teamUtils';

interface TeamFormData {
  homeResults: ('W' | 'D' | 'L')[];
  awayResults: ('W' | 'D' | 'L')[];
  homeStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
  awayStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
}

interface TeamStatsData {
  // Form data
  recentForm: TeamFormData;
  
  // Core stats
  cornersMatchesPlayed: { homeValue: number; awayValue: number };
  cornersTaken: { homeValue: number; awayValue: number };
  cornersAgainst: { homeValue: number; awayValue: number };
  totalCorners: { homeValue: number; awayValue: number };
  over75MatchCorners: { homeValue: number; awayValue: number };
  over85MatchCorners: { homeValue: number; awayValue: number };
  over95MatchCorners: { homeValue: number; awayValue: number };
  over105MatchCorners: { homeValue: number; awayValue: number };
  over115MatchCorners: { homeValue: number; awayValue: number };
  
  cardsMatchesPlayed: { homeValue: number; awayValue: number };
  cardsShown: { homeValue: number; awayValue: number };
  cardsAgainst: { homeValue: number; awayValue: number };
  totalCards: { homeValue: number; awayValue: number };
  over05TeamCards: { homeValue: number; awayValue: number };
  over15TeamCards: { homeValue: number; awayValue: number };
  over25TeamCards: { homeValue: number; awayValue: number };
  over35TeamCards: { homeValue: number; awayValue: number };
  
  shootingMatchesPlayed: { homeValue: number; awayValue: number };
  shots: { homeValue: number; awayValue: number };
  shotsAgainst: { homeValue: number; awayValue: number };
  shotsOnTarget: { homeValue: number; awayValue: number };
  shotsOnTargetAgainst: { homeValue: number; awayValue: number };
  over25TeamShotsOnTarget: { homeValue: number; awayValue: number };
  over35TeamShotsOnTarget: { homeValue: number; awayValue: number };
  over45TeamShotsOnTarget: { homeValue: number; awayValue: number };
  over55TeamShotsOnTarget: { homeValue: number; awayValue: number };
  
  foulsMatchesPlayed: { homeValue: number; awayValue: number };
  foulsCommitted: { homeValue: number; awayValue: number };
  foulsWon: { homeValue: number; awayValue: number };
  totalFouls: { homeValue: number; awayValue: number };
  over85TeamFoulsCommitted: { homeValue: number; awayValue: number };
  over95TeamFoulsCommitted: { homeValue: number; awayValue: number };
  over105TeamFoulsCommitted: { homeValue: number; awayValue: number };
  over115TeamFoulsCommitted: { homeValue: number; awayValue: number };
}

interface TeamSeasonStats {
  team: string;
  matchesPlayed: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  
  // Advanced stats
  shots: number;
  shotsOnTarget: number;
  shotsAgainst: number;
  shotsOnTargetAgainst: number;
  corners: number;
  cornersAgainst: number;
  fouls: number;
  fouled: number;
  yellowCards: number;
  redCards: number;
  
  // Form (last 5 games)
  recentForm: ('W' | 'D' | 'L')[];
}

export class FBrefStatsService {
  private statsCache: Map<string, TeamSeasonStats> = new Map();
  private cacheTime = 0;
  private readonly cacheTimeout = 30 * 60 * 1000; // 30 minutes

  private readonly FBREF_URLS = {
    premierLeague: {
      stats: 'https://fbref.com/en/comps/9/stats/Premier-League-Stats',
      fixtures: 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures',
    },
    laLiga: {
      stats: 'https://fbref.com/en/comps/12/stats/La-Liga-Stats',
      fixtures: 'https://fbref.com/en/comps/12/schedule/La-Liga-Scores-and-Fixtures',
    },
    bundesliga: {
      stats: 'https://fbref.com/en/comps/20/stats/Bundesliga-Stats',
      fixtures: 'https://fbref.com/en/comps/20/schedule/Bundesliga-Scores-and-Fixtures',
    },
    serieA: {
      stats: 'https://fbref.com/en/comps/11/stats/Serie-A-Stats',
      fixtures: 'https://fbref.com/en/comps/11/schedule/Serie-A-Scores-and-Fixtures',
    },
    ligue1: {
      stats: 'https://fbref.com/en/comps/13/stats/Ligue-1-Stats',
      fixtures: 'https://fbref.com/en/comps/13/schedule/Ligue-1-Scores-and-Fixtures',
    },
  };

  private currentLeague: keyof typeof this.FBREF_URLS = 'premierLeague';

  private isCacheValid(): boolean {
    return this.statsCache.size > 0 && Date.now() - this.cacheTime < this.cacheTimeout;
  }

  public clearCache(): void {
    this.statsCache.clear();
    this.cacheTime = 0;
    console.log('Stats cache cleared');
  }

  setLeague(league: keyof typeof this.FBREF_URLS): void {
    if (this.currentLeague !== league) {
      this.currentLeague = league;
      this.clearCache();
    }
  }

  private async scrapeStatsData(): Promise<ScrapedData> {
    const statsUrl = this.FBREF_URLS[this.currentLeague].stats;
    return await fbrefScraper.scrapeUrl(statsUrl);
  }

  private async scrapeFixturesData(): Promise<ScrapedData> {
    const fixturesUrl = this.FBREF_URLS[this.currentLeague].fixtures;
    return await fbrefScraper.scrapeUrl(fixturesUrl);
  }

  private parseStatsTable(table: TableData): Map<string, Partial<TeamSeasonStats>> {
    const teamStats = new Map<string, Partial<TeamSeasonStats>>();
    
    const headers = table.headers.map(h => h.toLowerCase());
    const teamIndex = headers.findIndex(h => h.includes('squad') || h.includes('team'));
    const mpIndex = headers.findIndex(h => h === 'mp' || h.includes('played'));
    const wIndex = headers.findIndex(h => h === 'w' || h === 'won');
    const dIndex = headers.findIndex(h => h === 'd' || h === 'drawn');
    const lIndex = headers.findIndex(h => h === 'l' || h === 'lost');
    const gfIndex = headers.findIndex(h => h === 'gf' || h.includes('goals for'));
    const gaIndex = headers.findIndex(h => h === 'ga' || h.includes('goals against'));
    const ptsIndex = headers.findIndex(h => h === 'pts' || h === 'points');

    table.rows.forEach(row => {
      if (row.length < 4) return;

      const teamName = typeof row[teamIndex] === 'object' ? row[teamIndex].text : row[teamIndex];
      if (!teamName) return;

      const normalizedTeam = normalizeTeamName(teamName);
      
      const getValue = (index: number): number => {
        if (index === -1) return 0;
        const value = typeof row[index] === 'object' ? row[index].text : row[index];
        return parseInt(value) || 0;
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
      });
    });

    return teamStats;
  }

  private parseFixturesForForm(fixturesData: ScrapedData): Map<string, ('W' | 'D' | 'L')[]> {
    const teamForms = new Map<string, ('W' | 'D' | 'L')[]>();
    
    const fixturesTable = fixturesData.tables.find(table =>
      table.caption.toLowerCase().includes('fixtures') ||
      table.caption.toLowerCase().includes('schedule') ||
      table.id.toLowerCase().includes('schedule')
    );

    if (!fixturesTable) return teamForms;

    const headers = fixturesTable.headers.map(h => h.toLowerCase());
    const homeIndex = headers.findIndex(h => h.includes('home'));
    const awayIndex = headers.findIndex(h => h.includes('away'));
    const scoreIndex = headers.findIndex(h => h.includes('score') || h.includes('result'));
    const dateIndex = headers.findIndex(h => h.includes('date'));

    // Get completed fixtures, sorted by date (most recent first)
    const completedFixtures: Array<{
      home: string;
      away: string;
      homeScore: number;
      awayScore: number;
      date: Date;
    }> = [];

    fixturesTable.rows.forEach(row => {
      if (row.length < 4) return;

      const homeTeam = normalizeTeamName(typeof row[homeIndex] === 'object' ? row[homeIndex].text : row[homeIndex]);
      const awayTeam = normalizeTeamName(typeof row[awayIndex] === 'object' ? row[awayIndex].text : row[awayIndex]);
      const scoreStr = typeof row[scoreIndex] === 'object' ? row[scoreIndex].text : row[scoreIndex];
      const dateStr = typeof row[dateIndex] === 'object' ? row[dateIndex].text : row[dateIndex];

      if (!homeTeam || !awayTeam || !scoreStr || !scoreStr.includes('–')) return;

      const [homeScoreStr, awayScoreStr] = scoreStr.split('–');
      const homeScore = parseInt(homeScoreStr.trim());
      const awayScore = parseInt(awayScoreStr.trim());

      if (isNaN(homeScore) || isNaN(awayScore)) return;

      completedFixtures.push({
        home: homeTeam,
        away: awayTeam,
        homeScore,
        awayScore,
        date: new Date(dateStr)
      });
    });

    // Sort by date (most recent first)
    completedFixtures.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate form for each team (last 5 games)
    const teamGames = new Map<string, Array<'W' | 'D' | 'L'>>();

    completedFixtures.forEach(fixture => {
      // Home team result
      if (!teamGames.has(fixture.home)) teamGames.set(fixture.home, []);
      if (!teamGames.has(fixture.away)) teamGames.set(fixture.away, []);

      const homeForm = teamGames.get(fixture.home)!;
      const awayForm = teamGames.get(fixture.away)!;

      if (homeForm.length < 5) {
        if (fixture.homeScore > fixture.awayScore) homeForm.push('W');
        else if (fixture.homeScore < fixture.awayScore) homeForm.push('L');
        else homeForm.push('D');
      }

      if (awayForm.length < 5) {
        if (fixture.awayScore > fixture.homeScore) awayForm.push('W');
        else if (fixture.awayScore < fixture.homeScore) awayForm.push('L');
        else awayForm.push('D');
      }
    });

    return teamGames;
  }

  private async refreshCache(): Promise<void> {
    try {
      console.log('Refreshing FBref stats cache...');
      
      const [statsData, fixturesData] = await Promise.all([
        this.scrapeStatsData(),
        this.scrapeFixturesData()
      ]);

      // Parse league table
      const leagueTable = statsData.tables.find(table => 
        table.caption.toLowerCase().includes('table') || 
        table.id.toLowerCase().includes('results')
      );

      if (!leagueTable) {
        throw new Error('No league table found in scraped data');
      }

      const basicStats = this.parseStatsTable(leagueTable);
      const teamForms = this.parseFixturesForForm(fixturesData);

      // Combine data and create full team stats
      this.statsCache.clear();
      
      basicStats.forEach((stats, teamName) => {
        const form = teamForms.get(teamName) || [];
        
        this.statsCache.set(teamName, {
          ...stats,
          // Set defaults for advanced stats (would need additional scraping for real values)
          shots: 0,
          shotsOnTarget: 0,
          shotsAgainst: 0,
          shotsOnTargetAgainst: 0,
          corners: 0,
          cornersAgainst: 0,
          fouls: 0,
          fouled: 0,
          yellowCards: 0,
          redCards: 0,
          recentForm: form,
        } as TeamSeasonStats);
      });

      this.cacheTime = Date.now();
      console.log(`Stats cache refreshed with ${this.statsCache.size} teams`);
    } catch (error) {
      console.error('Error refreshing FBref stats cache:', error);
      throw error;
    }
  }

  async getTeamStats(teamName: string): Promise<TeamSeasonStats | null> {
    if (!this.isCacheValid()) {
      await this.refreshCache();
    }

    const normalizedName = normalizeTeamName(teamName);
    return this.statsCache.get(normalizedName) || null;
  }

  async getMatchStats(homeTeam: string, awayTeam: string): Promise<TeamStatsData> {
    const homeStats = await this.getTeamStats(homeTeam);
    const awayStats = await this.getTeamStats(awayTeam);

    if (!homeStats || !awayStats) {
      throw new Error(`Stats not found for teams: ${homeTeam} vs ${awayTeam}`);
    }

    // Calculate stats based on available data
    // Note: Some advanced stats would need additional API calls or more detailed scraping
    
    return {
      recentForm: {
        homeResults: homeStats.recentForm || [],
        awayResults: awayStats.recentForm || [],
        homeStats: {
          matchesPlayed: homeStats.matchesPlayed,
          won: homeStats.won,
          drawn: homeStats.drawn,
          lost: homeStats.lost,
        },
        awayStats: {
          matchesPlayed: awayStats.matchesPlayed,
          won: awayStats.won,
          drawn: awayStats.drawn,
          lost: awayStats.lost,
        },
      },
      
      // Basic stats (real data)
      cornersMatchesPlayed: { homeValue: homeStats.matchesPlayed, awayValue: awayStats.matchesPlayed },
      cornersTaken: { homeValue: homeStats.corners, awayValue: awayStats.corners },
      cornersAgainst: { homeValue: homeStats.cornersAgainst, awayValue: awayStats.cornersAgainst },
      totalCorners: { homeValue: homeStats.corners + homeStats.cornersAgainst, awayValue: awayStats.corners + awayStats.cornersAgainst },
      
      // Percentage calculations (would need match-by-match data for accuracy)
      over75MatchCorners: { homeValue: 0, awayValue: 0 }, // Placeholder - needs detailed calculation
      over85MatchCorners: { homeValue: 0, awayValue: 0 },
      over95MatchCorners: { homeValue: 0, awayValue: 0 },
      over105MatchCorners: { homeValue: 0, awayValue: 0 },
      over115MatchCorners: { homeValue: 0, awayValue: 0 },
      
      cardsMatchesPlayed: { homeValue: homeStats.matchesPlayed, awayValue: awayStats.matchesPlayed },
      cardsShown: { homeValue: homeStats.yellowCards + homeStats.redCards, awayValue: awayStats.yellowCards + awayStats.redCards },
      cardsAgainst: { homeValue: 0, awayValue: 0 }, // Would need opponent data
      totalCards: { homeValue: homeStats.yellowCards + homeStats.redCards, awayValue: awayStats.yellowCards + awayStats.redCards },
      over05TeamCards: { homeValue: 0, awayValue: 0 },
      over15TeamCards: { homeValue: 0, awayValue: 0 },
      over25TeamCards: { homeValue: 0, awayValue: 0 },
      over35TeamCards: { homeValue: 0, awayValue: 0 },
      
      shootingMatchesPlayed: { homeValue: homeStats.matchesPlayed, awayValue: awayStats.matchesPlayed },
      shots: { homeValue: homeStats.shots, awayValue: awayStats.shots },
      shotsAgainst: { homeValue: homeStats.shotsAgainst, awayValue: awayStats.shotsAgainst },
      shotsOnTarget: { homeValue: homeStats.shotsOnTarget, awayValue: awayStats.shotsOnTarget },
      shotsOnTargetAgainst: { homeValue: homeStats.shotsOnTargetAgainst, awayValue: awayStats.shotsOnTargetAgainst },
      over25TeamShotsOnTarget: { homeValue: 0, awayValue: 0 },
      over35TeamShotsOnTarget: { homeValue: 0, awayValue: 0 },
      over45TeamShotsOnTarget: { homeValue: 0, awayValue: 0 },
      over55TeamShotsOnTarget: { homeValue: 0, awayValue: 0 },
      
      foulsMatchesPlayed: { homeValue: homeStats.matchesPlayed, awayValue: awayStats.matchesPlayed },
      foulsCommitted: { homeValue: homeStats.fouls, awayValue: awayStats.fouls },
      foulsWon: { homeValue: homeStats.fouled, awayValue: awayStats.fouled },
      totalFouls: { homeValue: homeStats.fouls + homeStats.fouled, awayValue: awayStats.fouls + awayStats.fouled },
      over85TeamFoulsCommitted: { homeValue: 0, awayValue: 0 },
      over95TeamFoulsCommitted: { homeValue: 0, awayValue: 0 },
      over105TeamFoulsCommitted: { homeValue: 0, awayValue: 0 },
      over115TeamFoulsCommitted: { homeValue: 0, awayValue: 0 },
    };
  }

  async getAllTeamStats(): Promise<TeamSeasonStats[]> {
    if (!this.isCacheValid()) {
      await this.refreshCache();
    }
    return Array.from(this.statsCache.values());
  }
}

export const fbrefStatsService = new FBrefStatsService();