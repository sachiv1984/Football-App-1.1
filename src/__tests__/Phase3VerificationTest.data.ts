// src/__tests__/Phase3VerificationTest.data.ts

import { LeagueTableRow } from '../components/league/LeagueTable/LeagueTable.types';
import { FeaturedFixture, Fixture, Team } from '../components/fixtures/HeroSection/HeroSection.types';

// Sample Teams
const manUtd: Team = {
  id: 'man-utd',
  name: 'Manchester United',
  shortName: 'MUN',
  logo: 'https://via.placeholder.com/64x64/DC143C/FFFFFF?text=MUN',
  colors: { primary: '#DC143C', secondary: '#FFD700' },
  form: ['W', 'W', 'D', 'W', 'L'],
  position: 3
};

const chelsea: Team = {
  id: 'chelsea',
  name: 'Chelsea FC',
  shortName: 'CHE',
  logo: 'https://via.placeholder.com/64x64/034694/FFFFFF?text=CHE',
  colors: { primary: '#034694', secondary: '#FFFFFF' },
  form: ['W', 'L', 'W', 'W', 'D'],
  position: 5
};

// Featured Fixture
export const featuredFixture: FeaturedFixture = {
  id: 'fixture-1',
  homeTeam: manUtd,
  awayTeam: chelsea,
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

// Upcoming Fixtures
export const fixtures: Fixture[] = [
  {
    id: 'fixture-2',
    homeTeam: manUtd,
    awayTeam: chelsea,
    dateTime: '2024-03-17T15:00:00Z',
    competition: featuredFixture.competition,
    venue: 'Old Trafford'
  },
  {
    id: 'fixture-3',
    homeTeam: chelsea,
    awayTeam: manUtd,
    dateTime: '2024-03-24T15:00:00Z',
    competition: featuredFixture.competition,
    venue: 'Stamford Bridge'
  }
];

// League Table Rows
export const leagueTableRows: LeagueTableRow[] = [
  {
    position: 1,
    team: manUtd,
    played: 20,
    won: 14,
    drawn: 4,
    lost: 2,
    goalsFor: 40,
    goalsAgainst: 20,
    goalDifference: 20,
    points: 46,
    form: manUtd.form
  },
  {
    position: 2,
    team: chelsea,
    played: 20,
    won: 12,
    drawn: 5,
    lost: 3,
    goalsFor: 38,
    goalsAgainst: 18,
    goalDifference: 20,
    points: 41,
    form: chelsea.form
  }
];
