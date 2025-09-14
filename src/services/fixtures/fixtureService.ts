// src/services/fixtures/fixtureService.ts
import { redisGet, redisSet } from '../upstash/redis';

export class FixtureService {
  constructor() {
    this.matchesCache = [];
    this.cacheTime = 0;
    this.cacheTimeout = 10 * 60 * 1000; // 10 min
  }

  // -------------------------
  // Configurable lists
  // -------------------------
  SHORT_NAME_OVERRIDES = {
    "Manchester United FC": "Man Utd",
    "Brighton & Hove Albion FC": "Brighton",
  };

  BIG_SIX = ['Arsenal', 'Chelsea', 'Liverpool', 'Manchester City', 'Manchester United', 'Tottenham Hotspur'];
  
  DERBIES = [
    ['Arsenal', 'Tottenham Hotspur'],
    ['Liverpool', 'Everton'],
    ['Manchester United', 'Manchester City'],
    ['Chelsea', 'Arsenal'],
    ['Chelsea', 'Tottenham Hotspur'],
    ['Chelsea', 'Fulham'],
    ['Crystal Palace', 'Brighton & Hove Albion'],
  ];

  TEAM_COLORS = {
    Arsenal: { primary: '#EF0107', secondary: '#023474' },
    Chelsea: { primary: '#034694', secondary: '#FFFFFF' },
    Liverpool: { primary: '#C8102E', secondary: '#F6EB61' },
    'Manchester City': { primary: '#6CABDD', secondary: '#1C2C5B' },
    'Manchester United': { primary: '#DA020E', secondary: '#FBE122' },
    'Tottenham Hotspur': { primary: '#132257', secondary: '#FFFFFF' },
  };

  // -------------------------
  // Cache helpers
  // -------------------------
  isCacheValid() {
    return this.matchesCache.length > 0 && (Date.now() - this.cacheTime < this.cacheTimeout);
  }

  clearCache() {
    this.matchesCache = [];
    this.cacheTime = 0;
  }

  // -------------------------
  // Data fetching
  // -------------------------
  async fetchMatches() {
    // Attempt Redis cache first
    const cached = await redisGet('matches');
    if (cached) return cached;

    const res = await fetch('/api/matches');
    if (!res.ok) throw new Error('Failed to fetch matches');
    const data = await res.json();

    await redisSet('matches', data, 60); // cache 1 min for live

    return data;
  }

  async fetchStandings() {
    const cached = await redisGet('standings');
    if (cached) return cached;

    const res = await fetch('/api/standings');
    if (!res.ok) throw new Error('Failed to fetch standings');
    const data = await res.json();

    await redisSet('standings', data, 300); // cache 5 min
    return data;
  }

  // -------------------------
  // Team helpers
  // -------------------------
  getTeamColors(teamName) {
    return this.TEAM_COLORS[teamName] || {};
  }

  parseForm(formString) {
    if (!formString) return [];
    return formString
      .split(',')
      .map(f => (['W', 'D', 'L'].includes(f.trim()) ? f.trim() : 'D'));
  }

  async getTeamDetails(team, standings) {
    const teamStanding = standings.find(s => s.team.id === team.id);
    const shortName = this.SHORT_NAME_OVERRIDES[team.name] || team.shortName || team.tla || team.name;

    return {
      id: team.id.toString(),
      name: team.name,
      shortName,
      logo: team.crest || '',
      colors: this.getTeamColors(team.name),
      form: this.parseForm(teamStanding?.form),
    };
  }

  // -------------------------
  // Match helpers
  // -------------------------
  isDerby(home, away) {
    return this.DERBIES.some(d => d.includes(home) && d.includes(away));
  }

  isMatchFinished(status) {
    return status && ['FINISHED', 'POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(status);
  }

  isMatchUpcoming(status) {
    return status && ['SCHEDULED', 'TIMED'].includes(status);
  }

  isMatchLive(status) {
    return status && ['LIVE', 'IN_PLAY', 'PAUSED', 'HALF_TIME'].includes(status);
  }

  calculateImportance(match, standings) {
    if (this.isMatchFinished(match.status)) return 0;

    let importance = 3;

    if (match.matchday >= 35) importance += 3;
    else if (match.matchday >= 25) importance += 2;
    else if (match.matchday >= 15) importance += 1;

    if (standings) {
      const homePos = standings.find(s => s.team.id === match.homeTeam.id)?.position || 20;
      const awayPos = standings.find(s => s.team.id === match.awayTeam.id)?.position || 20;

      if (homePos <= 6 && awayPos <= 6) importance += 3;
      else if ((homePos <= 10 && awayPos > 10) || (homePos > 10 && awayPos <= 10)) importance += 1;
      else if (homePos >= 17 && awayPos >= 17) importance += 2;
    }

    const homeBigSix = this.BIG_SIX.includes(match.homeTeam.name);
    const awayBigSix = this.BIG_SIX.includes(match.awayTeam.name);
    if (homeBigSix && awayBigSix) importance += 2;
    else if (homeBigSix || awayBigSix) importance += 1;

    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) importance += 2;
    if (this.isMatchLive(match.status)) importance += 1;

    return Math.min(importance, 10);
  }

  getDayTag(dateStr) {
    const day = new Date(dateStr).getDay();
    if (day === 0) return 'sunday-fixture';
    if (day === 6) return 'saturday-fixture';
    if (day === 1) return 'monday-night-football';
    return null;
  }

  generateTags(match, importance) {
    const tags = [];

    if (match.matchday <= 5) tags.push('early-season');
    else if (match.matchday >= 35) tags.push('title-race', 'relegation-battle');
    else if (match.matchday >= 25) tags.push('business-end');

    if (importance >= 8) tags.push('big-match');
    if (this.isDerby(match.homeTeam.name, match.awayTeam.name)) tags.push('derby');

    const dayTag = this.getDayTag(match.utcDate);
    if (dayTag) tags.push(dayTag);

    if (match.stage === 'REGULAR_SEASON') tags.push('league-match');
    if (this.isMatchLive(match.status)) tags.push('live');

    return tags;
  }

  mapStatus(status) {
    if (this.isMatchLive(status)) return 'live';
    if (this.isMatchUpcoming(status)) return 'upcoming';
    if (status === 'FINISHED') return 'finished';
    if (['POSTPONED', 'SUSPENDED', 'CANCELLED'].includes(status || '')) return 'postponed';
    return 'scheduled';
  }

  async transformMatch(match, standings) {
    const [homeTeam, awayTeam] = await Promise.all([
      this.getTeamDetails(match.homeTeam, standings),
      this.getTeamDetails(match.awayTeam, standings),
    ]);

    const importance = this.calculateImportance(match, standings);
    const tags = this.generateTags(match, importance);

    const homeScore = match.score?.fullTime?.home ?? 0;
    const awayScore = match.score?.fullTime?.away ?? 0;

    return {
      id: match.id.toString(),
      dateTime: match.utcDate,
      homeTeam,
      awayTeam,
      venue: match.venue || 'TBD',
      competition: {
        id: match.competition.code,
        name: match.competition.name,
        logo: match.competition.emblem || '',
      },
      matchWeek: match.matchday,
      importance,
      importanceScore: importance,
      tags,
      isBigMatch: importance >= 8,
      status: this.mapStatus(match.status),
      homeScore,
      awayScore,
    };
  }

  async refreshCache() {
    const [matches, standings] = await Promise.all([this.fetchMatches(), this.fetchStandings()]);
    const transformed = await Promise.all(matches.map(m => this.transformMatch(m, standings)));

    this.matchesCache = transformed.sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
    });

    this.cacheTime = Date.now();
  }

  getNextNDaysMatches(days) {
    const now = Date.now();
    const future = now + days * 24 * 60 * 60 * 1000;
    return this.matchesCache.filter(match => {
      const time = new Date(match.dateTime).getTime();
      return match.importance > 0 && time >= now && time <= future;
    });
  }

  getCurrentGameWeek(fixtures) {
    const weekGroups = fixtures.reduce((acc, fixture) => {
      const week = fixture.matchWeek;
      if (!acc[week]) acc[week] = [];
      acc[week].push(fixture);
      return acc;
    }, {});

    const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => a - b);

    for (const week of sortedWeeks) {
      const weekFixtures = weekGroups[week];
      const hasUnfinished = weekFixtures.some(f => f.status && ['scheduled', 'upcoming', 'live'].includes(f.status));
      if (hasUnfinished) return week;
    }

    return Math.max(...sortedWeeks) + 1;
  }

  isGameWeekComplete(fixtures, gameWeek) {
    const weekFixtures = fixtures.filter(f => f.matchWeek === gameWeek);
    if (weekFixtures.length === 0) return true;
    return weekFixtures.every(f => f.status && ['finished', 'postponed'].includes(f.status));
  }

  // -------------------------
  // Public Methods
  // -------------------------
  async getCurrentGameWeekFixtures() {
    if (!this.isCacheValid()) await this.refreshCache();
    const allFixtures = this.matchesCache;
    const currentGameWeek = this.getCurrentGameWeek(allFixtures);
    return allFixtures
      .filter(f => f.matchWeek === currentGameWeek)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }

  async getGameWeekInfo() {
    if (!this.isCacheValid()) await this.refreshCache();
    const allFixtures = this.matchesCache;
    const currentGameWeek = this.getCurrentGameWeek(allFixtures);
    const weekFixtures = allFixtures.filter(f => f.matchWeek === currentGameWeek);

    const finishedGames = weekFixtures.filter(f => f.status && ['finished', 'postponed'].includes(f.status)).length;
    const upcomingGames = weekFixtures.filter(f => f.status && ['scheduled', 'upcoming', 'live'].includes(f.status)).length;

    return {
      currentWeek: currentGameWeek,
      isComplete: this.isGameWeekComplete(allFixtures, currentGameWeek),
      totalGames: weekFixtures.length,
      finishedGames,
      upcomingGames,
    };
  }

  async getFeaturedFixtures(limit = 8) {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.getNextNDaysMatches(7).slice(0, limit);
  }

  async getAllFixtures() {
    if (!this.isCacheValid()) await this.refreshCache();
    return this.matchesCache;
  }

  async getUpcomingImportantMatches(limit) {
    const allMatches = await this.getAllFixtures();
    const now = Date.now();
    const upcoming = allMatches.filter(m => m.importance > 0 && new Date(m.dateTime).getTime() >= now);
    return limit ? upcoming.slice(0, limit) : upcoming;
  }

  async getMatchesByImportance(minImportance) {
    const allMatches = await this.getAllFixtures();
    return allMatches.filter(m => m.importance >= minImportance);
  }
}