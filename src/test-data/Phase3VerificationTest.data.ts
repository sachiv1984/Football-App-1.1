// src/test-data/Phase3VerificationTest.data.ts
import { Fixture, FeaturedFixture } from '../components/fixtures/HeroSection/HeroSection.types';
import { LeagueTableRow } from '../components/league/LeagueTable/LeagueTable.types';

// ✅ Featured Fixture
export const featuredFixture: FeaturedFixture = {
  id: 'fixture-1',
  homeTeam: {
    id: 'man-utd',
    name: 'Manchester United',
    shortName: 'MUN',
    logo: 'https://via.placeholder.com/64x64/DC143C/FFFFFF?text=MUN',
    colors: { primary: '#DC143C', secondary: '#FFD700' },
    form: ['W', 'W', 'D', 'W', 'L'],
    position: 3
  },
  awayTeam: {
    id: 'chelsea',
    name: 'Chelsea FC',
    shortName: 'CHE',
    logo: 'https://via.placeholder.com/64x64/034694/FFFFFF?text=CHE',
    colors: { primary: '#034694', secondary: '#FFFFFF' },
    form: ['W', 'L', 'W', 'W', 'D'],
    position: 5
  },
  competition: {
    name: 'Premier League',
    logo: 'https://via.placeholder.com/32x32/37003C/FFFFFF?text=PL'
  },
  dateTime: '2024-03-10T15:00:00Z',
  venue: 'Old Trafford',
  aiInsight: {
    title: 'High-Scoring Encounter Expected',
    description: 'Both teams average 2.3 goals per game. Over 2.5 goals has hit in 4/5 recent meetings.',
    confidence: 'high',
    probability: 78
  }
};

// ✅ Upcoming Fixtures
export const fixtures: Fixture[] = [
  {
    id: 'fixture-2',
    homeTeam: featuredFixture.homeTeam,
    awayTeam: featuredFixture.awayTeam,
    competition: featuredFixture.competition,
    dateTime: '2024-03-17T17:00:00Z',
    venue: 'Old Trafford'
  },
  {
    id: 'fixture-3',
    homeTeam: featuredFixture.awayTeam,
    awayTeam: featuredFixture.homeTeam,
    competition: featuredFixture.competition,
    dateTime: '2024-03-24T15:00:00Z',
    venue: 'Stamford Bridge'
  }
];

// ✅ League Table Mock
export const leagueTableRows: LeagueTableRow[] = [
  {
    position: 1,
    team: { name: 'Manchester City', id: 'man-city' },
    played: 30,
    won: 22,
    drawn: 5,
    lost: 3,
    goalsFor: 70,
    goalsAgainst: 25,
    goalDifference: 45,
    points: 71,
    form: ['W', 'W', 'D', 'W', 'W']
  },
  {
    position: 2,
    team: { name: 'Liverpool', id: 'liverpool' },
    played: 30,
    won: 20,
    drawn: 7,
    lost: 3,
    goalsFor: 65,
    goalsAgainst: 28,
    goalDifference: 37,
    points: 67,
    form: ['W', 'D', 'W', 'W', 'L']
  },
  {
    position: 3,
    team: { name: 'Manchester United', id: 'man-utd' },
    played: 30,
    won: 19,
    drawn: 6,
    lost: 5,
    goalsFor: 60,
    goalsAgainst: 30,
    goalDifference: 30,
    points: 63,
    form: ['W', 'W', 'D', 'W', 'L']
  }
];
