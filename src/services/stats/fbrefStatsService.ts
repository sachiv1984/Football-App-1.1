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
  
  // Advanced stats (mostly estimated/calculated from basic data)
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
    
    console.log('Parsing stats table with headers:', table.headers);
    
    const headers = table.headers.map(h => h.toLowerCase());
    
    // More flexible header matching
    const teamIndex = headers.findIndex(h => 
      h.includes('squad') || h.includes('team') || h === 'club' || h.includes('club')
    );
    const mpIndex = headers.findIndex(h => 
      h === 'mp' || h.includes('played') || h.includes('matches')
    );
    const wIndex = headers.findIndex(h => h === 'w' || h === 'won');
    const dIndex = headers.findIndex(h => h === 'd' || h === 'drawn' || h === 'draw');
    const lIndex = headers.findIndex(h => h === 'l' || h === 'lost');
    const gfIndex = headers.findIndex(h => 
      h === 'gf' || h.includes('goals for') || h === 'gls'
    );
    const gaIndex = headers.findIndex(h => 
      h === 'ga' || h.includes('goals against') || h.includes('conceded')
    );
    const ptsIndex = headers.findIndex(h => h === 'pts' || h === 'points');

    console.log('Header indices:', {
      team: teamIndex,
      mp: mpIndex, 
      w: wIndex, 
      d: dIndex, 
      l: lIndex,
      gf: gfIndex,
      ga: gaIndex,
      pts: ptsIndex
    });

    table.rows.forEach((row, index) => {
      if (row.length < 4) return;

      const teamName = typeof row[teamIndex] === 'object' ? row[teamIndex].text : row[teamIndex];
      if (!teamName || teamName.trim() === '') return;

      const normalizedTeam = normalizeTeamName(teamName);
      
      const getValue = (index: number): number => {
        if (index === -1) return 0;
        const cell = row[index];
        const value = typeof cell === 'object' ? cell.text : cell;
        const numValue = parseInt(String(value).replace(/[^\d]/g, '')) || 0;
        return numValue;
      };

      const stats = {
        team: normalizedTeam,
        matchesPlayed: getValue(mpIndex),
        won: getValue(wIndex),
        drawn: getValue(dIndex),
        lost: getValue(lIndex),
        goalsFor: getValue(gfIndex),
        goalsAgainst: getValue(gaIndex),
        points: getValue(ptsIndex),
      };

      console.log(`Team ${normalizedTeam} stats:`, stats);
      teamStats.set(normalizedTeam, stats);
    });

    console.log(`Parsed ${teamStats.size} teams from stats table`);
    return teamStats;
  }

  private parseFixturesForForm(fixturesData: ScrapedData): Map<string, ('W' | 'D' | 'L')[]> {
    const teamForms = new Map<string, ('W' | 'D' | 'L')[]>();
    
    console.log('Looking for fixtures table in:', fixturesData.tables.map(t => ({ caption: t.caption, id: t.id })));
    
    const fixturesTable = fixturesData.tables.find(table =>
      table.caption.toLowerCase().includes('fixtures') ||
      table.caption.toLowerCase().includes('schedule') ||
      table.caption.toLowerCase().includes('scores') ||
      table.id.toLowerCase().includes('schedule') ||
      table.id.toLowerCase().includes('fixtures')
    );

    if (!fixturesTable) {
      console.warn('No fixtures table found');
      return teamForms;
    }

    console.log('Found fixtures table:', fixturesTable.caption);
    console.log('Fixtures headers:', fixturesTable.headers);

    const headers = fixturesTable.headers.map(h => h.toLowerCase());
    const homeIndex = headers.findIndex(h => h.includes('home'));
    const awayIndex = headers.findIndex(h => h.includes('away'));
    const scoreIndex = headers.findIndex(h => h.includes('score') || h.includes('result'));
    const dateIndex = headers.findIndex(h => h.includes('date'));

    console.log('Fixtures header indices:', {
      home: homeIndex,
      away: awayIndex,
      score: scoreIndex,
      date: dateIndex
    });

    // Get completed fixtures, sorted by date (most recent first)
    const completedFixtures: Array<{
      home: string;
      away: string;
      homeScore: number;
      awayScore: number;
      date: Date;
    }> = [];

    fixturesTable.rows.forEach((row, index) => {
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

    console.log(`Found ${completedFixtures.length} completed fixtures`);

    // Sort by date (most recent first)
    completedFixtures.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate form for each team (last 5 games)
    const teamGames = new Map<string, Array<'W' | 'D' | 'L'>>();

    completedFixtures.forEach(fixture => {
      // Initialize arrays
      if (!teamGames.has(fixture.home)) teamGames.set(fixture.home, []);
      if (!teamGames.has(fixture.away)) teamGames.set(fixture.away, []);

      const homeForm = teamGames.get(fixture.home)!;
      const awayForm = teamGames.get(fixture.away)!;

      // Only add if we don't have 5 results yet
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

    console.log(`Calculated form for ${teamGames.size} teams`);
    teamGames.forEach((form, team) => {
      console.log(`${team} form:`, form);
    });

    return teamGames;
  }

  private estimateAdvancedStats(basicStats: Partial<TeamSeasonStats>): Partial<TeamSeasonStats> {
    const mp = basicStats.matchesPlayed || 0;
    const gf = basicStats.goalsFor || 0;
    const ga = basicStats.goalsAgainst || 0;
    const pts = basicStats.points || 0;
    
    // Estimate advanced stats based on performance
    const avgGoalsFor = mp > 0 ? gf / mp : 0;
    const avgGoalsAgainst = mp > 0 ? ga / mp : 0;
    const pointsPerGame = mp > 0 ? pts / mp : 0;
    
    // Rough estimates based on league averages and performance
    const estimatedShots = Math.round(avgGoalsFor * 15 * mp); // ~15 shots per goal
    const estimatedShotsOnTarget = Math.round(estimatedShots * 0.35); // ~35% on target
    const estimatedShotsAgainst = Math.round(avgGoalsAgainst * 15 * mp);
    const estimatedShotsOnTargetAgainst = Math.round(estimatedShotsAgainst * 0.35);
    
    const estimatedCorners = Math.round(mp * (4 + pointsPerGame)); // 4-7 corners per game based on performance
    const estimatedCornersAgainst = Math.round(mp * (7 - pointsPerGame));
    
    const estimatedFouls = Math.round(mp * (10 + (3 - pointsPerGame))); // 10-13 fouls per game
    const estimatedFouled = Math.round(mp * (10 + pointsPerGame));
    
    const estimatedYellowCards = Math.round(mp * 2.2); // ~2.2 yellow cards per game
    const estimatedRedCards = Math.round(mp * 0.1); // ~0.1 red cards per game

    return {
      ...basicStats,
      shots: estimatedShots,
      shotsOnTarget: estimatedShotsOnTarget,
      shotsAgainst: estimatedShotsAgainst,
      shotsOnTargetAgainst: estimatedShotsOnTargetAgainst,
      corners: estimatedCorners,
      cornersAgainst: estimatedCornersAgainst,
      fouls: estimatedFouls,
      fouled: estimatedFouled,
      yellowCards: estimatedYellowCards,
      redCards: estimatedRedCards,
    };
  }

  private async refreshCache(): Promise<void> {
    try {
      console.log(`Refreshing FBref stats cache for ${this.currentLeague}...`);
      
      const [statsData, fixturesData] = await Promise.all([
        this.scrapeStatsData(),
        this.scrapeFixturesData()
      ]);

      console.log('Stats data tables:', statsData.tables.map(t => ({ caption: t.caption, id: t.id })));

      // Find the main league table - try multiple approaches
      let leagueTable = statsData.tables.find(table => 
        table.caption.toLowerCase().includes('table') || 
        table.id.toLowerCase().includes('results') ||
        table.id.toLowerCase().includes('stats_standard')
      );

      // If not found, take the largest table (likely the main one)
      if (!leagueTable) {
        leagueTable = statsData.tables.reduce((largest, current) => 
          current.rows.length > largest.rows.length ? current : largest
        );
      }

      if (!leagueTable || leagueTable.rows.length === 0) {
        throw new Error('No valid league table found in scraped data');
      }

      console.log(`Using table: "${leagueTable.caption}" with ${leagueTable.rows.length} rows`);

      const basicStats = this.parseStatsTable(leagueTable);
      const teamForms = this.parseFixturesForForm(fixturesData);

      // Combine data and create full team stats
      this.statsCache.clear();
      
      basicStats.forEach((stats, teamName) => {
        const form = teamForms.get(teamName) || [];
        const enhancedStats = this.estimateAdvancedStats(stats);
        
        this.statsCache.set(teamName, {
          ...enhancedStats,
          recentForm: form,
        } as TeamSeasonStats);
      });

      this.cacheTime = Date.now();
      console.log(`Stats cache refreshed with ${this.statsCache.size} teams`);
      
      // Log sample data for debugging
      const sampleTeam = Array.from(this.statsCache.values())[0];
      if (sampleTeam) {
        console.log('Sample team data:', sampleTeam);
      }
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
    const stats = this.statsCache.get(normalizedName);
    
    if (!stats) {
      console.warn(`No stats found for team: ${teamName} (normalized: ${normalizedName})`);
      console.warn('Available teams:', Array.from(this.statsCache.keys()));
    }
    
    return stats || null;
  }

  async getMatchStats(homeTeam: string, awayTeam: string): Promise<TeamStatsData> {
    const homeStats = await this.getTeamStats(homeTeam);
    const awayStats = await this.getTeamStats(awayTeam);

    if (!homeStats || !awayStats) {
      throw new Error(`Stats not found for teams: ${homeTeam} vs ${awayTeam}`);
    }

    // Calculate percentage stats based on match data
    const calculateOverPercentage = (total: number, matches: number, threshold: number): number => {
      if (matches === 0) return 0;
      const avg = total / matches;
      // Simple estimation - in reality you'd need match-by-match data
      if (avg > threshold) return Math.min(90, Math.round(60 + (avg - threshold) * 10));
      return Math.max(10, Math.round(50 - (threshold - avg) * 10));
    };

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
      
      // Corners stats
      cornersMatchesPlayed: { homeValue: homeStats.matchesPlayed, awayValue: awayStats.matchesPlayed },
      cornersTaken: { homeValue: homeStats.corners, awayValue: awayStats.corners },
      cornersAgainst: { homeValue: homeStats.cornersAgainst, awayValue: awayStats.cornersAgainst },
      totalCorners: { homeValue: homeStats.corners + homeStats.cornersAgainst, awayValue: awayStats.corners + awayStats.cornersAgainst },
      over75MatchCorners: { 
        homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 7.5),
        awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 7.5)
      },
      over85MatchCorners: { 
        homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 8.5),
        awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 8.5)
      },
      over95MatchCorners: { 
        homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 9.5),
        awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 9.5)
      },
      over105MatchCorners: { 
        homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 10.5),
        awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 10.5)
      },
      over115MatchCorners: { 
        homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 11.5),
        awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 11.5)
      },
      
      // Cards stats
      cardsMatchesPlayed: { homeValue: homeStats.matchesPlayed, awayValue: awayStats.matchesPlayed },
      cardsShown: { homeValue: homeStats.yellowCards + homeStats.redCards, awayValue: awayStats.yellowCards + awayStats.redCards },
      cardsAgainst: { homeValue: 0, awayValue: 0 }, // Would need opponent data
      totalCards: { homeValue: homeStats.yellowCards + homeStats.redCards, awayValue: awayStats.yellowCards + awayStats.redCards },
      over05TeamCards: { 
        homeValue: calculateOverPercentage(homeStats.yellowCards + homeStats.redCards, homeStats.matchesPlayed, 0.5),
        awayValue: calculateOverPercentage(awayStats.yellowCards + awayStats.redCards, awayStats.matchesPlayed, 0.5)
      },
      over15TeamCards: { 
        homeValue: calculateOverPercentage(homeStats.yellowCards + homeStats.redCards, homeStats.matchesPlayed, 1.5),
        awayValue: calculateOverPercentage(awayStats.yellowCards + awayStats.redCards, awayStats.matchesPlayed, 1.5)
      },
      over25TeamCards: { 
        homeValue: calculateOverPercentage(homeStats.yellowCards + homeStats.redCards, homeStats.matchesPlayed, 2.5),
        awayValue: calculateOverPercentage(awayStats.yellowCards + awayStats.redCards, awayStats.matchesPlayed, 2.5)
      },
      over35TeamCards: { 
        homeValue: calculateOverPercentage(homeStats.yellowCards + homeStats.redCards, homeStats.matchesPlayed, 3.5),
        awayValue: calculateOverPercentage(awayStats.yellowCards + awayStats.redCards, awayStats.matchesPlayed, 3.5)
      },
      
      // Shooting stats
      shootingMatchesPlayed: { homeValue: homeStats.matchesPlayed, awayValue: awayStats.matchesPlayed },
      shots: { homeValue: homeStats.shots, awayValue: awayStats.shots },
      shotsAgainst: { homeValue: homeStats.shotsAgainst, awayValue: awayStats.shotsAgainst },
      shotsOnTarget: { homeValue: homeStats.shotsOnTarget, awayValue: awayStats.shotsOnTarget },
      shotsOnTargetAgainst: { homeValue: homeStats.shotsOnTargetAgainst, awayValue: awayStats.shotsOnTargetAgainst },
      over25TeamShotsOnTarget: { 
        homeValue: calculateOverPercentage(homeStats.shotsOnTarget, homeStats.matchesPlayed, 2.5),
        awayValue: calculateOverPercentage(awayStats.shotsOnTarget, awayStats.matchesPlayed, 2.5)
      },
      over35TeamShotsOnTarget: { 
        homeValue: calculateOverPercentage(homeStats.shotsOnTarget, homeStats.matchesPlayed, 3.5),
        awayValue: calculateOverPercentage(awayStats.shotsOnTarget, awayStats.matchesPlayed, 3.5)
      },
      over45TeamShotsOnTarget: { 
        homeValue: calculateOverPercentage(homeStats.shotsOnTarget, homeStats.matchesPlayed, 4.5),
        awayValue: calculateOverPercentage(awayStats.shotsOnTarget, awayStats.matchesPlayed, 4.5)
      },
      over55TeamShotsOnTarget: { 
        homeValue: calculateOverPercentage(homeStats.shotsOnTarget, homeStats.matchesPlayed, 5.5),
        awayValue: calculateOverPercentage(awayStats.shotsOnTarget, awayStats.matchesPlayed, 5.5)
      },
      
      // Fouls stats
      foulsMatchesPlayed: { homeValue: homeStats.matchesPlayed, awayValue: awayStats.matchesPlayed },
      foulsCommitted: { homeValue: homeStats.fouls, awayValue: awayStats.fouls },
      foulsWon: { homeValue: homeStats.fouled, awayValue: awayStats.fouled },
      totalFouls: { homeValue: homeStats.fouls + homeStats.fouled, awayValue: awayStats.fouls + awayStats.fouled },
      over85TeamFoulsCommitted: { 
        homeValue: calculateOverPercentage(homeStats.fouls, homeStats.matchesPlayed, 8.5),
        awayValue: calculateOverPercentage(awayStats.fouls, awayStats.matchesPlayed, 8.5)
      },
      over95TeamFoulsCommitted: { 
        homeValue: calculateOverPercentage(homeStats.fouls, homeStats.matchesPlayed, 9.5),
        awayValue: calculateOverPercentage(awayStats.fouls, awayStats.matchesPlayed, 9.5)
      },
      over105TeamFoulsCommitted: { 
        homeValue: calculateOverPercentage(homeStats.fouls, homeStats.matchesPlayed, 10.5),
        awayValue: calculateOverPercentage(awayStats.fouls, awayStats.matchesPlayed, 10.5)
      },
      over115TeamFoulsCommitted: { 
        homeValue: calculateOverPercentage(homeStats.fouls, homeStats.matchesPlayed, 11.5),
        awayValue: calculateOverPercentage(awayStats.fouls, awayStats.matchesPlayed, 11.5)
      },
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