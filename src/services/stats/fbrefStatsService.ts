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
      stats: [
        'https://fbref.com/en/comps/9/2025-2026/2025-2026-Premier-League-Stats', // Season-specific stats page
        'https://fbref.com/en/comps/9/Premier-League-Stats', // Current season stats
        'https://fbref.com/en/comps/9/stats/Premier-League-Stats', // Legacy stats URL
      ],
      fixtures: 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures',
    },
    laLiga: {
      stats: [
        'https://fbref.com/en/comps/12/2025-2026/2025-2026-La-Liga-Stats',
        'https://fbref.com/en/comps/12/La-Liga-Stats',
        'https://fbref.com/en/comps/12/stats/La-Liga-Stats',
      ],
      fixtures: 'https://fbref.com/en/comps/12/schedule/La-Liga-Scores-and-Fixtures',
    },
    bundesliga: {
      stats: [
        'https://fbref.com/en/comps/20/2025-2026/2025-2026-Bundesliga-Stats',
        'https://fbref.com/en/comps/20/Bundesliga-Stats',
        'https://fbref.com/en/comps/20/stats/Bundesliga-Stats',
      ],
      fixtures: 'https://fbref.com/en/comps/20/schedule/Bundesliga-Scores-and-Fixtures',
    },
    serieA: {
      stats: [
        'https://fbref.com/en/comps/11/2025-2026/2025-2026-Serie-A-Stats',
        'https://fbref.com/en/comps/11/Serie-A-Stats',
        'https://fbref.com/en/comps/11/stats/Serie-A-Stats',
      ],
      fixtures: 'https://fbref.com/en/comps/11/schedule/Serie-A-Scores-and-Fixtures',
    },
    ligue1: {
      stats: [
        'https://fbref.com/en/comps/13/2025-2026/2025-2026-Ligue-1-Stats',
        'https://fbref.com/en/comps/13/Ligue-1-Stats',
        'https://fbref.com/en/comps/13/stats/Ligue-1-Stats',
      ],
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
    const statsUrls = this.FBREF_URLS[this.currentLeague].stats;
    
    console.log(`Trying ${statsUrls.length} URLs to find league table...`);
    
    for (let i = 0; i < statsUrls.length; i++) {
      const url = statsUrls[i];
      console.log(`Attempt ${i + 1}: ${url}`);
      
      try {
        const data = await fbrefScraper.scrapeUrl(url);
        
        // Check if this data contains a league table
        const hasLeagueTable = data.tables.some(table => 
          (table.headers.includes('W') && table.headers.includes('D') && table.headers.includes('L')) ||
          table.id === 'results2025-202691_overall' ||
          (table.caption.toLowerCase().includes('table') && !table.caption.toLowerCase().includes('stats'))
        );
        
        if (hasLeagueTable) {
          console.log(`✅ Found league table at URL ${i + 1}: ${url}`);
          return data;
        } else {
          console.log(`❌ No league table found at URL ${i + 1}, trying next...`);
        }
      } catch (error) {
        console.log(`❌ Error with URL ${i + 1}: ${error}, trying next...`);
      }
    }
    
    // If no URL worked, return the last attempt's data or throw error
    console.log('⚠️  No URL contained league table, using last attempted URL...');
    return await fbrefScraper.scrapeUrl(statsUrls[statsUrls.length - 1]);
  }

  private async scrapeFixturesData(): Promise<ScrapedData> {
    const fixturesUrl = this.FBREF_URLS[this.currentLeague].fixtures;
    return await fbrefScraper.scrapeUrl(fixturesUrl);
  }

  private getRealWorldCornerEstimates(teamName: string, basicStats: Partial<TeamSeasonStats>): {
    corners: number;
    cornersAgainst: number;
  } {
    const mp = basicStats.matchesPlayed || 0;
    const pts = basicStats.points || 0;
    const gf = basicStats.goalsFor || 0;
    const ga = basicStats.goalsAgainst || 0;
    
    // More accurate corner estimates based on real Premier League data
    // Top 6 teams: 5-7 corners/game, Mid-table: 4-6, Bottom teams: 3-5
    const pointsPerGame = mp > 0 ? pts / mp : 0;
    const goalDifference = gf - ga;
    
    // Team-specific adjustments based on known playing styles
    let baseCorners = 4.5; // League average
    let baseCornersAgainst = 4.5;
    
    // Adjust based on team performance
    if (pointsPerGame > 2.0) { // Top teams
      baseCorners = 5.8;
      baseCornersAgainst = 4.0;
    } else if (pointsPerGame > 1.5) { // Mid-table
      baseCorners = 4.8;
      baseCornersAgainst = 4.5;
    } else { // Lower table
      baseCorners = 4.0;
      baseCornersAgainst = 5.2;
    }
    
    // Fine-tune based on attacking/defensive style
    const attackingModifier = Math.min(1, Math.max(-1, goalDifference / 10));
    baseCorners += attackingModifier * 0.8;
    baseCornersAgainst -= attackingModifier * 0.6;
    
    // Team-specific overrides for known playing styles
    const teamStyles: Record<string, { corners: number; cornersAgainst: number }> = {
      'Liverpool': { corners: 6.2, cornersAgainst: 3.8 },
      'Manchester City': { corners: 6.8, cornersAgainst: 3.5 },
      'Arsenal': { corners: 5.9, cornersAgainst: 4.1 },
      'Chelsea': { corners: 5.7, cornersAgainst: 4.0 },
      'Tottenham Hotspur': { corners: 5.5, cornersAgainst: 4.3 },
      'Manchester United': { corners: 5.4, cornersAgainst: 4.2 },
      'Newcastle United': { corners: 5.1, cornersAgainst: 4.4 },
      'Brighton & Hove Albion': { corners: 4.9, cornersAgainst: 4.6 },
      'Aston Villa': { corners: 4.8, cornersAgainst: 4.7 },
      'West Ham United': { corners: 4.6, cornersAgainst: 4.9 },
      'Crystal Palace': { corners: 4.2, cornersAgainst: 5.1 },
      'Everton': { corners: 4.0, cornersAgainst: 5.3 },
      'AFC Bournemouth': { corners: 4.3, cornersAgainst: 5.0 },
      'Fulham': { corners: 4.5, cornersAgainst: 4.8 },
      'Brentford': { corners: 4.1, cornersAgainst: 5.2 },
      'Nottingham Forest': { corners: 3.9, cornersAgainst: 5.4 },
      'Wolverhampton Wanderers': { corners: 3.8, cornersAgainst: 5.5 },
      'Burnley': { corners: 3.5, cornersAgainst: 6.0 },
      'Sheffield United': { corners: 3.4, cornersAgainst: 6.2 },
      'Luton Town': { corners: 3.2, cornersAgainst: 6.5 },
    };
    
    const style = teamStyles[teamName];
    if (style) {
      baseCorners = style.corners;
      baseCornersAgainst = style.cornersAgainst;
      console.log(`Using team-specific corner rates for ${teamName}: ${style.corners}/game for, ${style.cornersAgainst}/game against`);
    }
    
    const totalCorners = Math.round(baseCorners * mp);
    const totalCornersAgainst = Math.round(baseCornersAgainst * mp);
    
    console.log(`${teamName} corner calculation: ${baseCorners.toFixed(1)}/game * ${mp} games = ${totalCorners} total (${totalCornersAgainst} against)`);
    
    return {
      corners: totalCorners,
      cornersAgainst: totalCornersAgainst
    };
  }

  private parseStatsTable(table: TableData): Map<string, Partial<TeamSeasonStats>> {
    const teamStats = new Map<string, Partial<TeamSeasonStats>>();
    
    console.log('=== PARSING PREMIER LEAGUE TABLE ===');
    console.log('Table ID:', table.id);
    console.log('Table Caption:', table.caption);
    console.log('Original headers:', table.headers);
    
    const headers = table.headers.map(h => h.toLowerCase().trim());
    console.log('Lowercase headers:', headers);
    
    // Exact matching for Premier League table based on your scraped data
    const teamIndex = headers.findIndex(h => h === 'squad');
    const mpIndex = headers.findIndex(h => h === 'mp');
    const wIndex = headers.findIndex(h => h === 'w');
    const dIndex = headers.findIndex(h => h === 'd');
    const lIndex = headers.findIndex(h => h === 'l');
    const gfIndex = headers.findIndex(h => h === 'gf');
    const gaIndex = headers.findIndex(h => h === 'ga');
    const ptsIndex = headers.findIndex(h => h === 'pts');

    console.log('=== HEADER MAPPING ===');
    console.log('Squad Index:', teamIndex, '-> Header:', table.headers[teamIndex]);
    console.log('MP Index:', mpIndex, '-> Header:', table.headers[mpIndex]);
    console.log('W Index:', wIndex, '-> Header:', table.headers[wIndex]);
    console.log('D Index:', dIndex, '-> Header:', table.headers[dIndex]);
    console.log('L Index:', lIndex, '-> Header:', table.headers[lIndex]);
    console.log('GF Index:', gfIndex, '-> Header:', table.headers[gfIndex]);
    console.log('GA Index:', gaIndex, '-> Header:', table.headers[gaIndex]);
    console.log('Pts Index:', ptsIndex, '-> Header:', table.headers[ptsIndex]);

    console.log(`\n=== PROCESSING ${table.rows.length} ROWS ===`);

    table.rows.forEach((row, rowIndex) => {
      if (row.length < 4) {
        console.log(`Row ${rowIndex}: Skipped (too short: ${row.length} cells)`);
        return;
      }

      // Extract team name
      const teamCell = row[teamIndex];
      const teamName = typeof teamCell === 'object' ? teamCell.text : teamCell;
      
      if (!teamName || teamName.trim() === '' || teamName.toLowerCase().includes('total')) {
        console.log(`Row ${rowIndex}: Skipped (invalid team name: "${teamName}")`);
        return;
      }

      const normalizedTeam = normalizeTeamName(teamName);
      
      // Enhanced getValue function with better debugging
      const getValue = (index: number, fieldName: string): number => {
        if (index === -1) {
          console.log(`  ${fieldName}: No column found`);
          return 0;
        }
        
        const cell = row[index];
        const rawValue = typeof cell === 'object' ? cell.text : cell;
        const cleanValue = String(rawValue || '').trim();
        const numValue = parseInt(cleanValue.replace(/[^\d-]/g, '')) || 0;
        
        console.log(`  ${fieldName}: Raw="${rawValue}" -> Clean="${cleanValue}" -> Number=${numValue}`);
        return numValue;
      };

      console.log(`\nRow ${rowIndex}: Processing "${teamName}" -> "${normalizedTeam}"`);
      
      const stats = {
        team: normalizedTeam,
        matchesPlayed: getValue(mpIndex, 'MP'),
        won: getValue(wIndex, 'W'),
        drawn: getValue(dIndex, 'D'),
        lost: getValue(lIndex, 'L'),
        goalsFor: getValue(gfIndex, 'GF'),
        goalsAgainst: getValue(gaIndex, 'GA'),
        points: getValue(ptsIndex, 'Pts'),
      };

      console.log(`Final stats for ${normalizedTeam}:`, stats);
      teamStats.set(normalizedTeam, stats);
    });

    console.log(`\n=== PARSING COMPLETE ===`);
    console.log(`Successfully parsed ${teamStats.size} teams from stats table`);
    console.log('Team names in cache:', Array.from(teamStats.keys()));
    
    return teamStats;
  }

  private parseFixturesForForm(fixturesData: ScrapedData): {
    teamForms: Map<string, ('W' | 'D' | 'L')[]>;
    fixtures: Array<{
      home: string;
      away: string;
      homeScore: number;
      awayScore: number;
      date: Date;
      matchReportLink?: string;
    }>;
  } {
    const teamForms = new Map<string, ('W' | 'D' | 'L')[]>();
    const fixtures: Array<{
      home: string;
      away: string;
      homeScore: number;
      awayScore: number;
      date: Date;
      matchReportLink?: string;
    }> = [];
    
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
      return { teamForms, fixtures };
    }

    console.log('Found fixtures table:', fixturesTable.caption);
    console.log('Fixtures headers:', fixturesTable.headers);

    const headers = fixturesTable.headers.map(h => h.toLowerCase());
    const homeIndex = headers.findIndex(h => h.includes('home'));
    const awayIndex = headers.findIndex(h => h.includes('away'));
    const scoreIndex = headers.findIndex(h => h.includes('score') || h.includes('result'));
    const dateIndex = headers.findIndex(h => h.includes('date'));
    const reportIndex = headers.findIndex(h => h.includes('match report') || h.includes('report'));

    console.log('Fixtures header indices:', {
      home: homeIndex,
      away: awayIndex,
      score: scoreIndex,
      date: dateIndex,
      report: reportIndex
    });

    fixturesTable.rows.forEach((row, index) => {
      if (row.length < 4) return;

      const homeTeam = normalizeTeamName(typeof row[homeIndex] === 'object' ? row[homeIndex].text : row[homeIndex]);
      const awayTeam = normalizeTeamName(typeof row[awayIndex] === 'object' ? row[awayIndex].text : row[awayIndex]);
      const scoreStr = typeof row[scoreIndex] === 'object' ? row[scoreIndex].text : row[scoreIndex];
      const dateStr = typeof row[dateIndex] === 'object' ? row[dateIndex].text : row[dateIndex];

      // Try to get match report link
      let matchReportLink: string | undefined;
      if (reportIndex !== -1 && row[reportIndex]) {
        const reportCell = row[reportIndex];
        if (typeof reportCell === 'object' && reportCell.link) {
          matchReportLink = reportCell.link.startsWith('http') ? reportCell.link : `https://fbref.com${reportCell.link}`;
        }
      }

      if (!homeTeam || !awayTeam || !scoreStr || !scoreStr.includes('–')) return;

      const [homeScoreStr, awayScoreStr] = scoreStr.split('–');
      const homeScore = parseInt(homeScoreStr.trim());
      const awayScore = parseInt(awayScoreStr.trim());

      if (isNaN(homeScore) || isNaN(awayScore)) return;

      const fixture = {
        home: homeTeam,
        away: awayTeam,
        homeScore,
        awayScore,
        date: new Date(dateStr),
        matchReportLink
      };

      fixtures.push(fixture);
    });

    console.log(`Found ${fixtures.length} completed fixtures`);

    // Sort by date (most recent first)
    fixtures.sort((a, b) => b.date.getTime() - a.date.getTime());

    // Calculate form for each team (last 5 games)
    const teamGames = new Map<string, Array<'W' | 'D' | 'L'>>();

    fixtures.forEach(fixture => {
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
    console.log(`Match reports available for ${fixtures.filter(f => f.matchReportLink).length}/${fixtures.length} fixtures`);

    return { teamForms: teamGames, fixtures };
  }

  private estimateAdvancedStats(basicStats: Partial<TeamSeasonStats>): Partial<TeamSeasonStats> {
    const mp = basicStats.matchesPlayed || 0;
    const gf = basicStats.goalsFor || 0;
    const ga = basicStats.goalsAgainst || 0;
    const pts = basicStats.points || 0;
    const teamName = basicStats.team || 'Unknown';

    console.log(`\n=== ESTIMATING ADVANCED STATS for ${teamName} ===`);
    console.log(`Basic stats: MP=${mp}, GF=${gf}, GA=${ga}, Pts=${pts}`);

    // Get realistic corner estimates
    const cornerStats = this.getRealWorldCornerEstimates(teamName, basicStats);

    // Estimate other stats
    const avgGoalsFor = mp > 0 ? gf / mp : 0;
    const avgGoalsAgainst = mp > 0 ? ga / mp : 0;
    const pointsPerGame = mp > 0 ? pts / mp : 0;

    console.log(`Averages: Goals/game=${avgGoalsFor.toFixed(2)}, GA/game=${avgGoalsAgainst.toFixed(2)}, Pts/game=${pointsPerGame.toFixed(2)}`);

    // Shot estimates based on goals and team quality
    const estimatedShots = Math.round(avgGoalsFor * 15 * mp); // ~15 shots per goal
    const estimatedShotsOnTarget = Math.round(estimatedShots * 0.35); // ~35% on target
    const estimatedShotsAgainst = Math.round(avgGoalsAgainst * 15 * mp);
    const estimatedShotsOnTargetAgainst = Math.round(estimatedShotsAgainst * 0.35);

    // Foul estimates
    const estimatedFouls = Math.round(mp * (10 + (3 - pointsPerGame))); // 10-13 fouls per game
    const estimatedFouled = Math.round(mp * (10 + pointsPerGame));

    // Card estimates
    const estimatedYellowCards = Math.round(mp * 2.2); // ~2.2 yellow cards per game
    const estimatedRedCards = Math.round(mp * 0.1); // ~0.1 red cards per game

    const result = {
        ...basicStats,
        shots: estimatedShots,
        shotsOnTarget: estimatedShotsOnTarget,
        shotsAgainst: estimatedShotsAgainst,
        shotsOnTargetAgainst: estimatedShotsOnTargetAgainst,
        corners: cornerStats.corners,
        cornersAgainst: cornerStats.cornersAgainst,
        fouls: estimatedFouls,
        fouled: estimatedFouled,
        yellowCards: estimatedYellowCards,
        redCards: estimatedRedCards,
    };

    console.log(`Final estimated stats for ${teamName}:`, {
        corners: result.corners,
        cornersAgainst: result.cornersAgainst,
        shots: result.shots,
        fouls: result.fouls
    });

    return result;
}

  private async refreshCache(): Promise<void> {
    try {
      console.log(`Refreshing FBref stats cache for ${this.currentLeague}...`);
      
      const [statsData, fixturesData] = await Promise.all([
        this.scrapeStatsData(),
        this.scrapeFixturesData(),
        this.scrapeAdvancedStatsData().catch(() => null) // Don't fail if advanced data unavailable
      ]);

      console.log('=== AVAILABLE TABLES ===');
      statsData.tables.forEach((table, index) => {
        console.log(`Table ${index}:`);
        console.log(`  ID: "${table.id}"`);
        console.log(`  Caption: "${table.caption}"`);
        console.log(`  Rows: ${table.rows.length}`);
        console.log(`  Headers: [${table.headers.slice(0, 8).join(', ')}...]`);
        console.log(`  Has W/D/L columns: ${table.headers.includes('W') && table.headers.includes('D') && table.headers.includes('L')}`);
      });

      // Find the correct Premier League TABLE (not player stats)
      // Priority 1: Table with the exact ID we found from scraping
      let leagueTable = statsData.tables.find(table => 
        table.id === 'results2025-202691_overall'
      );

      // Priority 2: Table that has W, D, L columns (league table, not player stats)
      if (!leagueTable) {
        leagueTable = statsData.tables.find(table => 
          table.headers.includes('W') && 
          table.headers.includes('D') && 
          table.headers.includes('L') &&
          table.headers.includes('Squad') &&
          !table.caption.toLowerCase().includes('stats') // Avoid "Standard Stats" tables
        );
      }

      // Priority 3: Table with "Table" in caption that has league-style headers
      if (!leagueTable) {
        leagueTable = statsData.tables.find(table => 
          table.caption.toLowerCase().includes('table') &&
          !table.caption.toLowerCase().includes('stats') &&
          table.headers.includes('Pts') &&
          table.headers.includes('Squad')
        );
      }

      // Priority 4: Any table with W/D/L columns
      if (!leagueTable) {
        leagueTable = statsData.tables.find(table => 
          table.headers.includes('W') && 
          table.headers.includes('D') && 
          table.headers.includes('L')
        );
      }

      if (!leagueTable || leagueTable.rows.length === 0) {
        console.error('❌ NO VALID LEAGUE TABLE FOUND!');
        console.error('Available tables:', statsData.tables.map(t => ({ 
          id: t.id, 
          caption: t.caption, 
          headers: t.headers.slice(0, 5),
          hasWDL: t.headers.includes('W') && t.headers.includes('D') && t.headers.includes('L')
        })));
        throw new Error('No valid league table found in scraped data');
      }

      // Validate that we have the correct table structure
      const requiredColumns = ['Squad', 'W', 'D', 'L', 'MP'];
      const missingColumns = requiredColumns.filter(col => !leagueTable.headers.includes(col));
      
      if (missingColumns.length > 0) {
        console.error('❌ SELECTED TABLE MISSING REQUIRED COLUMNS!');
        console.error('Missing columns:', missingColumns);
        console.error('Available columns:', leagueTable.headers);
        throw new Error(`Selected table missing required columns: ${missingColumns.join(', ')}`);
      }

      console.log(`\n✅ SELECTED CORRECT TABLE ===`);
      console.log(`ID: "${leagueTable.id}"`);
      console.log(`Caption: "${leagueTable.caption}"`);
      console.log(`Rows: ${leagueTable.rows.length}`);
      console.log(`Headers: [${leagueTable.headers.join(', ')}]`);
      console.log(`Has all required columns: ✅`);


      const basicStats = this.parseStatsTable(leagueTable);
      const teamForms = this.parseFixturesForForm(fixturesData);

      // Combine data and create full team stats
      this.statsCache.clear();
      
      basicStats.forEach((stats, teamName) => {
        const form = teamForms.get(teamName) || [];
        const enhancedStats = this.estimateAdvancedStats(stats);
        
        const finalStats = {
          ...enhancedStats,
          recentForm: form,
        } as TeamSeasonStats;
        
        console.log(`\nFinal stats for ${teamName}:`, {
          mp: finalStats.matchesPlayed,
          w: finalStats.won,
          d: finalStats.drawn,
          l: finalStats.lost,
          corners: finalStats.corners,
          cornersAgainst: finalStats.cornersAgainst,
          form: finalStats.recentForm
        });
        
        this.statsCache.set(teamName, finalStats);
      });

      this.cacheTime = Date.now();
      console.log(`\n=== CACHE REFRESH COMPLETE ===`);
      console.log(`Stats cache refreshed with ${this.statsCache.size} teams`);
      console.log('Available teams in cache:', Array.from(this.statsCache.keys()));
      
      // Log a sample team's complete data
      const sampleTeam = Array.from(this.statsCache.values())[0];
      if (sampleTeam) {
        console.log('\n=== SAMPLE TEAM DATA ===');
        console.log('Sample team complete data:', sampleTeam);
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
