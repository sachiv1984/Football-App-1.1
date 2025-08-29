// src/mocks/mockData.ts

import {
  Team,
  Competition,
  Game,
  FeaturedFixtureWithImportance,
  AIInsight,
} from '../types';

// -------------------------
// Teams
// -------------------------
export const teams: Team[] = [
  {
    id: 1,
    name: 'Manchester United',
    shortName: 'MANU',
    logo: undefined,
    colors: { primary: '#DA291C', secondary: '#FBE122' },
    form: ['W', 'D', 'L'],
    position: 1,
  },
  {
    id: 2,
    name: 'Liverpool',
    shortName: 'LIV',
    logo: undefined,
    colors: { primary: '#C8102E', secondary: '#00B2A9' },
    form: ['L', 'W', 'W'],
    position: 2,
  },
];

// -------------------------
// Competitions
// -------------------------
export const competitions: Competition[] = [
  {
    id: 'premier-league',
    name: 'Premier League',
    shortName: 'EPL',
    country: 'England',
    logo: undefined,
  },
];

// -------------------------
// AI Insights
// -------------------------
export const aiInsights: AIInsight[] = [
  {
    id: '1',
    title: 'High Possession',
    description: 'Home team has consistently dominated possession in last 5 matches.',
    confidence: 'high',
    probability: 0.85,
    market: 'possession',
    odds: '1.5',
    supportingData: 'Average possession: 63%',
  },
];

// -------------------------
// Games / Fixtures
// -------------------------
export const games: Game[] = [
  {
    id: 1,
    homeTeam: teams[0],
    awayTeam: teams[1],
    dateTime: new Date().toISOString(),
    venue: 'Old Trafford',
    matchWeek: 1,
    isLive: false,
    importance: 5,
    competition: competitions[0],
    homeScore: 2,
    awayScore: 1,
    status: 'finished',
    aiInsight: aiInsights[0],
  },
];

// -------------------------
// Featured Fixtures
// -------------------------
export const featuredFixtures: FeaturedFixtureWithImportance[] = [
  {
    ...games[0],
    importanceScore: 5, // required
    tags: ['top-six', 'derby'],
    matchWeek: games[0].matchWeek ?? 1,
    isBigMatch: true,
  },
];
