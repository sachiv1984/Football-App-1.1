// src/test-data/Phase3VerificationTest.data.ts
import { Competition, AIInsight, Team } from '../components/fixtures/HeroSection/HeroSection.types';

// ✅ Fixtures
export const mockFixtures = [
  {
    id: 'fixture-1',
    homeTeam: {
      id: 'team-1',
      name: 'Manchester United',
      shortName: 'Man Utd',
      logo: '/logos/manutd.png',
      colors: { primary: '#DA291C', secondary: '#FFE500' },
      form: ['W', 'W', 'D', 'L', 'W'],
      position: 1
    } as Team,
    awayTeam: {
      id: 'team-2',
      name: 'Liverpool',
      shortName: 'LIV',
      logo: '/logos/liverpool.png',
      colors: { primary: '#C8102E', secondary: '#00B2A9' },
      form: ['W', 'D', 'W', 'W', 'L'],
      position: 2
    } as Team,
    date: '2025-09-01T15:00:00Z',
    venue: 'Old Trafford'
  }
];

// ✅ Competitions
export const mockCompetitions: Competition[] = [
  {
    id: 'comp-1',
    name: 'Premier League',
    logo: '/logos/epl.png'
  }
];

// ✅ AI Insights (updated to use allowed categories)
export const mockInsights: AIInsight[] = [
  {
    title: 'High pressing style',
    description: 'Manchester United has consistently applied a high press in the last 5 matches.',
    category: 'possession', // replaced invalid category
    confidence: 'high',
    probability: 0.88
  },
  {
    title: 'Strong defense',
    description: 'Liverpool conceded less than 1 goal per match in the last 5 games.',
    category: 'goals', // replaced invalid category
    confidence: 'medium',
    probability: 0.72
  }
];

// ✅ Teams (added required "position" property)
export const mockTeams: Team[] = [
  {
    id: 'team-1',
    name: 'Manchester United',
    shortName: 'Man Utd',
    logo: '/logos/manutd.png',
    colors: { primary: '#DA291C', secondary: '#FFE500' },
    form: ['W', 'W', 'D', 'L', 'W'],
    position: 1
  },
  {
    id: 'team-2',
    name: 'Liverpool',
    shortName: 'LIV',
    logo: '/logos/liverpool.png',
    colors: { primary: '#C8102E', secondary: '#00B2A9' },
    form: ['W', 'D', 'W', 'W', 'L'],
    position: 2
  },
  {
    id: 'team-3',
    name: 'Chelsea',
    shortName: 'CHE',
    logo: '/logos/chelsea.png',
    colors: { primary: '#034694', secondary: '#FFFFFF' },
    form: ['L', 'W', 'D', 'W', 'L'],
    position: 3
  }
];
