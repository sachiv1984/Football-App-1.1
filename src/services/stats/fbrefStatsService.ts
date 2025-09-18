// src/services/stats/fbrefStatsService.ts
import { fbrefScraper, type ScrapedData, type TableData } from '../scrape/Fbref';
import { normalizeTeamName } from '../../utils/teamUtils';
import { fbrefMatchLogService,  } from './fbrefMatchLogService';

interface TeamFormData {
  homeResults: ('W' | 'D' | 'L')[];
  awayResults: ('W' | 'D' | 'L')[];
  homeStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
  awayStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
}

interface TeamStatsData {
  recentForm: TeamFormData;

  // Corners stats
  cornersMatchesPlayed: { homeValue: number; awayValue: number };
  cornersTaken: { homeValue: number; awayValue: number };
  cornersAgainst: { homeValue: number; awayValue: number };
  totalCorners: { homeValue: number; awayValue: number };
  over75MatchCorners: { homeValue: number; awayValue: number };
  over85MatchCorners: { homeValue: number; awayValue: number };
  over95MatchCorners: { homeValue: number; awayValue: number };
  over105MatchCorners: { homeValue: number; awayValue: number };
  over115MatchCorners: { homeValue: number; awayValue: number };
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

  // Corners
  corners: number;
  cornersAgainst: number;

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
        'https://fbref.com/en/comps/9/2025-2026/2025-2026-Premier-League-Stats',
        'https://fbref.com/en/comps/9/Premier-League-Stats',
        'https://fbref.com/en/comps/9/stats/Premier-League-Stats',
      ],
      fixtures: 'https://fbref.com/en/comps/9/schedule/Premier-League-Scores-and-Fixtures',
    },
    // other leagues...
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
    for (const url of statsUrls) {
      try {
        const data = await fbrefScraper.scrapeUrl(url);
        const hasLeagueTable = data.tables.some(
          table => table.headers.includes('W') && table.headers.includes('D') && table.headers.includes('L')
        );
        if (hasLeagueTable) return data;
      } catch {}
    }
    return await fbrefScraper.scrapeUrl(statsUrls[statsUrls.length - 1]);
  }

  private async scrapeFixturesData(): Promise<ScrapedData> {
    const fixturesUrl = this.FBREF_URLS[this.currentLeague].fixtures;
    return await fbrefScraper.scrapeUrl(fixturesUrl);
  }

  private parseStatsTable(table: TableData): Map<string, Partial<TeamSeasonStats>> {
    const teamStats = new Map<string, Partial<TeamSeasonStats>>();
    const headers = table.headers.map(h => h.toLowerCase().trim());

    const teamIndex = headers.findIndex(h => h === 'squad');
    const mpIndex = headers.findIndex(h => h === 'mp');
    const wIndex = headers.findIndex(h => h === 'w');
    const dIndex = headers.findIndex(h => h === 'd');
    const lIndex = headers.findIndex(h => h === 'l');
    const gfIndex = headers.findIndex(h => h === 'gf');
    const gaIndex = headers.findIndex(h => h === 'ga');
    const ptsIndex = headers.findIndex(h => h === 'pts');

    table.rows.forEach(row => {
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
      });
    });

    return teamStats;
  }

  private parseFixturesForForm(fixturesData: ScrapedData): Map<string, ('W' | 'D' | 'L')[]> {
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
    const dateIndex = headers.findIndex(h => h.includes('date'));

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

      // Update form arrays
      if (!teamForms.has(homeTeam)) teamForms.set(homeTeam, []);
      if (!teamForms.has(awayTeam)) teamForms.set(awayTeam, []);

      const homeForm = teamForms.get(homeTeam)!;
      const awayForm = teamForms.get(awayTeam)!;
      if (homeForm.length < 5) homeForm.push(homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'D');
      if (awayForm.length < 5) awayForm.push(awayScore > homeScore ? 'W' : awayScore < homeScore ? 'L' : 'D');
    });

    return teamForms;
  }

  private async refreshCache(): Promise<void> {
    const [statsData, fixturesData] = await Promise.all([this.scrapeStatsData(), this.scrapeFixturesData()]);
    let leagueTable = statsData.tables.find(table => table.headers.includes('W') && table.headers.includes('D') && table.headers.includes('L'));
    if (!leagueTable) throw new Error('No valid league table found');

    const basicStats = this.parseStatsTable(leagueTable);
    const teamForms = this.parseFixturesForForm(fixturesData);

    // Fetch corners for all fixtures
    const fixtureUrls = fixturesData.tables.flatMap(t =>
      t.rows.map(r => {
        const linkCell = r.find(c => typeof c === 'object' && (c as any).link);
        return linkCell ? (linkCell as any).link.startsWith('http' ? (linkCell as any).link : `https://fbref.com${(linkCell as any).link}`) : null;
      }).filter(Boolean) as string[]
    );
    const cornersData = await fbrefMatchLogService.scrapeMultiple(fixtureUrls);

    // Aggregate corners per team
    const cornersMap = new Map<string, { corners: number; cornersAgainst: number; matches: number }>();
    cornersData.forEach(cd => {
      const home = cornersMap.get(cd.homeTeam) || { corners: 0, cornersAgainst: 0, matches: 0 };
      home.corners += cd.homeCorners;
      home.cornersAgainst += cd.awayCorners;
      home.matches += 1;
      cornersMap.set(cd.homeTeam, home);

      const away = cornersMap.get(cd.awayTeam) || { corners: 0, cornersAgainst: 0, matches: 0 };
      away.corners += cd.awayCorners;
      away.cornersAgainst += cd.homeCorners;
      away.matches += 1;
      cornersMap.set(cd.awayTeam, away);
    });

    this.statsCache.clear();

    basicStats.forEach((stats, teamName) => {
      const form = teamForms.get(teamName) || [];
      const cornerStats = cornersMap.get(teamName) || { corners: 0, cornersAgainst: 0, matches: stats.matchesPlayed || 0 };

      this.statsCache.set(teamName, {
        ...stats,
        corners: cornerStats.corners,
        cornersAgainst: cornerStats.cornersAgainst,
        recentForm: form,
        matchesPlayed: stats.matchesPlayed || 0,
        won: stats.won || 0,
        drawn: stats.drawn || 0,
        lost: stats.lost || 0,
        goalsFor: stats.goalsFor || 0,
        goalsAgainst: stats.goalsAgainst || 0,
        points: stats.points || 0,
      } as TeamSeasonStats);
    });

    this.cacheTime = Date.now();
  }

  async getTeamStats(teamName: string): Promise<TeamSeasonStats | null> {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.statsCache.get(normalizeTeamName(teamName)) || null;
  }

  async getMatchStats(homeTeam: string, awayTeam: string): Promise<TeamStatsData> {
    const homeStats = await this.getTeamStats(homeTeam);
    const awayStats = await this.getTeamStats(awayTeam);
    if (!homeStats || !awayStats) throw new Error(`Stats not found for teams: ${homeTeam} vs ${awayTeam}`);

    const calculateOverPercentage = (total: number, matches: number, threshold: number): number => {
      if (matches === 0) return 0;
      const avg = total / matches;
      return avg > threshold ? Math.min(90, Math.round(60 + (avg - threshold) * 10)) : Math.max(10, Math.round(50 - (threshold - avg) * 10));
    };

    return {
      recentForm: {
        homeResults: homeStats.recentForm || [],
        awayResults: awayStats.recentForm || [],
        homeStats: { matchesPlayed: homeStats.matchesPlayed, won: homeStats.won, drawn: homeStats.drawn, lost: homeStats.lost },
        awayStats: { matchesPlayed: awayStats.matchesPlayed, won: awayStats.won, drawn: awayStats.drawn, lost: awayStats.lost },
      },
      cornersMatchesPlayed: { homeValue: homeStats.matchesPlayed, awayValue: awayStats.matchesPlayed },
      cornersTaken: { homeValue: homeStats.corners, awayValue: awayStats.corners },
      cornersAgainst: { homeValue: homeStats.cornersAgainst, awayValue: awayStats.cornersAgainst },
      totalCorners: { homeValue: homeStats.corners + homeStats.cornersAgainst, awayValue: awayStats.corners + awayStats.cornersAgainst },
      over75MatchCorners: { homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 7.5), awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 7.5) },
      over85MatchCorners: { homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 8.5), awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 8.5) },
      over95MatchCorners: { homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 9.5), awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 9.5) },
      over105MatchCorners: { homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 10.5), awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 10.5) },
      over115MatchCorners: { homeValue: calculateOverPercentage(homeStats.corners + homeStats.cornersAgainst, homeStats.matchesPlayed, 11.5), awayValue: calculateOverPercentage(awayStats.corners + awayStats.cornersAgainst, awayStats.matchesPlayed, 11.5) },
    };
  }
}

export const fbrefStatsService = new FBrefStatsService();
