// src/pages/HomePage.tsx
import React, { useState } from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import InsightsContainer from '../components/insights/AIInsightCard/InsightsContainer';
import { designTokens } from '../styles/designTokens';
import { AIInsight, Fixture, Team, LeagueTableRow, FeaturedFixture } from '../types';
import OptimizedFeaturedGamesCarousel from '../components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel';

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

// Regular Fixtures for tabs
const fixtures: Fixture[] = [
  {
    id: 'fixture-1',
    homeTeam: manUtd,
    awayTeam: chelsea,
    competition: { 
      id: 'pl', 
      name: 'Premier League', 
      shortName: 'PL',
      logo: '', 
      country: 'England' 
    },
    dateTime: '2025-08-26T20:00:00Z',
    venue: 'Old Trafford',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
    aiInsight: {
      id: 'insight-featured',
      title: 'Over 2.5 Goals Expected',
      description: 'Both teams have strong attacking records',
      confidence: 'high',
      probability: 0.75,
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
      shortName: 'PL',
      logo: '', 
      country: 'England' 
    },
    dateTime: '2025-08-27T18:00:00Z',
    venue: 'Emirates Stadium',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
  },
];

// Featured fixtures for carousel (with required properties)
const featuredFixtures: FeaturedFixture[] = [
  {
    id: 'fixture-1',
    homeTeam: manUtd,
    awayTeam: chelsea,
    competition: { 
      id: 'pl', 
      name: 'Premier League', 
      shortName: 'PL',
      logo: '', 
      country: 'England' 
    },
    dateTime: '2025-08-26T20:00:00Z',
    venue: 'Old Trafford',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
    // Required FeaturedFixture properties
    importance: 85,
    importanceScore: 85,
    matchWeek: 1,
    isBigMatch: true,
    tags: ['top-six'],
    aiInsight: {
      id: 'insight-featured',
      title: 'Over 2.5 Goals Expected',
      description: 'Both teams have strong attacking records',
      confidence: 'high',
      probability: 0.75,
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
      shortName: 'PL',
      logo: '', 
      country: 'England' 
    },
    dateTime: '2025-08-27T18:00:00Z',
    venue: 'Emirates Stadium',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0,
    // Required FeaturedFixture properties
    importance: 90,
    importanceScore: 90,
    matchWeek: 1,
    isBigMatch: true,
    tags: ['title-race', 'top-six']
  },
];

// AI Insights
const insights: AIInsight[] = [
  {
    id: 'insight-1',
    title: 'Over 2.5 Goals Likely',
    description: 'Both teams average 3+ goals combined in last 5 matches.',
    confidence: 'high',
    probability: 0.72,
    market: 'total_goals',
    odds: '1.8',
    supportingData: 'Recent meetings: 4/5 matches over 2.5 goals',
  },
  {
    id: 'insight-2',
    title: 'High Corner Count',
    description: 'Home team averages 6 corners per game.',
    confidence: 'medium',
    probability: 0.65,
    market: 'corners',
    odds: '2.0',
  },
  {
    id: 'insight-3',
    title: 'Clean Sheet Possible',
    description: 'Away team has kept a clean sheet in 2 of last 5 matches.',
    confidence: 'low',
    probability: 0.45,
    market: 'clean_sheet',