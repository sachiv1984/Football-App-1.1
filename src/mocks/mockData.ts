import { Team, FeaturedFixtureWithImportance, AIInsight } from '../types';

export const mockTeams: Team[] = [
  { id: 1, name: 'Team A', shortName: 'A', colors: { primary: '#ff0000' } },
  { id: 2, name: 'Team B', shortName: 'B', colors: { primary: '#0000ff' } },
  { id: 3, name: 'Team C', shortName: 'C', colors: { primary: '#00ff00' } },
  { id: 4, name: 'Team D', shortName: 'D', colors: { primary: '#ffff00' } },
];

export const mockAIInsight: AIInsight = {
  id: 'insight-1',
  title: 'High Press Expected',
  description: 'Team A tends to press high against Team B.',
  confidence: 'high',
  probability: 0.75,
  market: 'Over/Under 2.5 Goals',
  odds: '1.85',
  supportingData: 'Team A has scored in 4/5 matches against Team B.',
};

export const mockFeaturedGames: FeaturedFixtureWithImportance[] = [
  {
    id: 101,
    homeTeam: mockTeams[0],
    awayTeam: mockTeams[1],
    dateTime: '2025-08-30T18:00:00Z',
    venue: 'Stadium X',
    importance: 5,
    importanceScore: 80,
    matchWeek: 3,
    isBigMatch: true,
    tags: ['top-six', 'derby'],
    aiInsight: mockAIInsight,
  },
  {
    id: 102,
    homeTeam: mockTeams[2],
    awayTeam: mockTeams[3],
    dateTime: '2025-08-31T20:00:00Z',
    venue: 'Stadium Y',
    importance: 4,
    importanceScore: 65,
    matchWeek: 3,
    isBigMatch: false,
    tags: ['relegation-battle'],
    aiInsight: {
      id: 'insight-2',
      title: 'Low Scoring Game Expected',
      description: 'Both teams have weak attacking records.',
      confidence: 'medium',
      probability: 0.6,
    },
  },
];
