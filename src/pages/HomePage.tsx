// src/pages/HomePage.tsx
import React, { useState } from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import InsightsContainer from '../components/insights/AIInsightCard/InsightsContainer';
import { designTokens } from '../styles/designTokens';
import { AIInsight, Fixture, Team, LeagueTableRow } from '../types';
import OptimizedFeaturedGamesCarousel from '../components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';

// Helper function to convert Game to FeaturedFixtureWithImportance
const convertToFeaturedFixture = (fixture: Fixture): FeaturedFixtureWithImportance => ({
  ...fixture,
  importance: 50, // Default importance
  importanceScore: calculateImportanceScore(fixture),
  tags: generateTags(fixture),
  matchWeek: fixture.matchWeek || 1,
  isBigMatch: checkIfBigMatch(fixture)
});

// Calculate importance score based on teams and other factors
const calculateImportanceScore = (fixture: Fixture): number => {
  let score = 50; // Base score
  
  // Boost for big six teams
  const bigSixTeams = ['arsenal', 'liverpool', 'chelsea', 'man-city', 'man-utd', 'tottenham'];
  const isHomeBigSix = bigSixTeams.includes(fixture.homeTeam.id);
  const isAwayBigSix = bigSixTeams.includes(fixture.awayTeam.id);
  
  if (isHomeBigSix && isAwayBigSix) score += 30; // Both big six
  else if (isHomeBigSix || isAwayBigSix) score += 15; // One big six
  
  // Boost for live games
  if (fixture.status === 'live') score += 20;
  
  // Boost if positions are close (assuming positions exist)
  if (fixture.homeTeam.position && fixture.awayTeam.position) {
    const positionDiff = Math.abs(fixture.homeTeam.position - fixture.awayTeam.position);
    if (positionDiff <= 2) score += 10;
  }
  
  return Math.min(100, score);
};

// Check if it's a big match
const checkIfBigMatch = (fixture: Fixture): boolean => {
  const bigSixTeams = ['arsenal', 'liverpool', 'chelsea', 'man-city', 'man-utd', 'tottenham'];
  return bigSixTeams.includes(fixture.homeTeam.id) && bigSixTeams.includes(fixture.awayTeam.id);
};

// Generate tags for the fixture
const generateTags = (fixture: Fixture): string[] => {
  const tags: string[] = [];
  
  const bigSixTeams = ['arsenal', 'liverpool', 'chelsea', 'man-city', 'man-utd', 'tottenham'];
  const isHomeBigSix = bigSixTeams.includes(fixture.homeTeam.id);
  const isAwayBigSix = bigSixTeams.includes(fixture.awayTeam.id);
  
  if (isHomeBigSix && isAwayBigSix) {
    tags.push('top-six');
  }
  
  // Check for derbies (simplified example)
  const londonTeams = ['arsenal', 'chelsea', 'tottenham'];
  const manchesterTeams = ['man-city', 'man-utd'];
  
  if (londonTeams.includes(fixture.homeTeam.id) && londonTeams.includes(fixture.awayTeam.id)) {
    tags.push('derby');
  }
  
  if (manchesterTeams.includes(fixture.homeTeam.id) && manchesterTeams.includes(fixture.awayTeam.id)) {
    tags.push('derby');
  }
  
  // Add more tag logic as needed
  if (fixture.homeTeam.position === 1 || fixture.awayTeam.position === 1) {
    tags.push('title-race');
  }
  
  return tags;
};

// Placeholder Teams
const arsenal: Team = {
  id: 'arsenal',
  name: 'Arsenal',
  shortName: 'ARS',
  logo: '',
  colors: { primary: '#EF0000', secondary: '#FFFF00' },
  form: ['W', 'W', 'W', 'D', 'W'] as ('W' | 'D' | 'L')[],
  position: 1,
};

const liverpool: Team = {
  id: 'liverpool',
  name: 'Liverpool',
  shortName: 'LIV',
  logo: '',
  colors: { primary: '#C8102E', secondary: '#00B2A9' },
  form: ['W', 'D', 'W', 'L', 'W'] as ('W' | 'D' | 'L')[],
  position: 2,
};

const chelsea: Team = {
  id: 'chelsea',
  name: 'Chelsea',
  shortName: 'CHE',
  logo: '',
  colors: { primary: '#034694', secondary: '#FFFFFF' },
  form: ['L', 'W', 'D', 'W', 'L'] as ('W' | 'D' | 'L')[],
  position: 3,
};

const manCity: Team = {
  id: 'man-city',
  name: 'Manchester City',
  shortName: 'MCI',
  logo: '',
  colors: { primary: '#6CABDD', secondary: '#FFFFFF' },
  form: ['W', 'W', 'L', 'D', 'W'] as ('W' | 'D' | 'L')[],
  position: 4,
};

const manUtd: Team = {
  id: 'man-utd',
  name: 'Manchester United',
  shortName: 'MUN',
  logo: '',
  colors: { primary: '#DC143C', secondary: '#FFD700' },
  form: ['W', 'D', 'L', 'W', 'W'] as ('W' | 'D' | 'L')[],
  position: 5,
};

// Fixtures
const fixtures: Fixture[] = [
  {
    id: 'fixture-1',
    homeTeam: manUtd,
    awayTeam: chelsea,
    competition: { 
      id: 'pl', 
      name: 'Premier League', 
      shortName: 'PL', // Added missing shortName
      logo: '', 
      country: 'England' 
    },
    dateTime: '2025-08-26T20:00:00Z',
    venue: 'Old Trafford',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
    matchWeek: 3,
    aiInsight: {
      id: 'insight-featured',
      title: 'Over 2.5 Goals Expected',
      description: 'Both teams have strong attacking records',
      confidence: 'high',
      probability: 0.75, // Added missing probability
      market: 'total_goals',
      odds: '1.8',
    }
  },
  {
    id: 'fixture-2',
    homeTeam: arsenal,
    awayTeam: liverpool,
    competition: { 
      id: 'pl', 
      name: 'Premier League', 
      shortName: 'PL', // Added missing shortName
      logo: '', 
      country: 'England' 
    },
    dateTime: '2025-08-27T18:00:00Z',
    venue: 'Emirates Stadium',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
    matchWeek: 3,
  },
];

// Convert fixtures to featured fixtures
const featuredFixtures: FeaturedFixtureWithImportance[] = fixtures.map(convertToFeaturedFixture);

// AI Insights
const insights: AIInsight[] = [
  {
    id: 'insight-1',
    title: 'Over 2.5 Goals Likely',
    description: 'Both teams average 3+ goals combined in last 5 matches.',
    confidence: 'high',
    probability: 0.72, // Added missing probability
    market: 'total_goals',
    odds: '1.8',
    supportingData: 'Recent meetings: 4/5 matches over 2.5 goals',
  },
  {
    id: 'insight-2',
    title: 'High Corner Count',
    description: 'Home team averages 6 corners per game