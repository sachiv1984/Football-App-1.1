// src/pages/HomePage.tsx
import React, { useState } from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import { designTokens } from '../styles/designTokens';
import { Fixture, Team, LeagueTableRow } from '../types';
import { OptimizedFeaturedGamesCarousel } from '../components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel';
import { FixturesDebugTable } from '../components/FixturesDebugTable'; // Add this import
import type { FeaturedFixtureWithImportance } from '../types';
import { ErrorBoundary, CarouselErrorBoundary } from '../components/ErrorBoundary'; // Add this import

// Helper function to convert Fixture to FeaturedFixtureWithImportance
const convertToFeaturedFixture = (fixture: Fixture): FeaturedFixtureWithImportance => ({
  ...fixture,
  importance: 50,
  importanceScore: calculateImportanceScore(fixture),
  tags: generateTags(fixture),
  matchWeek: fixture.matchWeek || 1,
  isBigMatch: checkIfBigMatch(fixture),
});

// Calculate importance score based on teams and other factors
const calculateImportanceScore = (fixture: Fixture): number => {
  let score = 50;
  const bigSixTeams = ['arsenal', 'liverpool', 'chelsea', 'man-city', 'man-utd', 'tottenham'];
  const isHomeBigSix = bigSixTeams.includes(fixture.homeTeam.id);
  const isAwayBigSix = bigSixTeams.includes(fixture.awayTeam.id);

  if (isHomeBigSix && isAwayBigSix) score += 30;
  else if (isHomeBigSix || isAwayBigSix) score += 15;

  if (fixture.status === 'live') score += 20;

  if (fixture.homeTeam.position && fixture.awayTeam.position) {
    const positionDiff = Math.abs(fixture.homeTeam.position - fixture.awayTeam.position);
    if (positionDiff <= 2) score += 10;
  }

  return Math.min(100, score);
};

const checkIfBigMatch = (fixture: Fixture): boolean => {
  const bigSixTeams = ['arsenal', 'liverpool', 'chelsea', 'man-city', 'man-utd', 'tottenham'];
  return bigSixTeams.includes(fixture.homeTeam.id) && bigSixTeams.includes(fixture.awayTeam.id);
};

const generateTags = (fixture: Fixture): string[] => {
  const tags: string[] = [];
  const bigSixTeams = ['arsenal', 'liverpool', 'chelsea', 'man-city', 'man-utd', 'tottenham'];

  if (bigSixTeams.includes(fixture.homeTeam.id) && bigSixTeams.includes(fixture.awayTeam.id)) {
    tags.push('top-six');
  }

  const londonTeams = ['arsenal', 'chelsea', 'tottenham'];
  const manchesterTeams = ['man-city', 'man-utd'];

  if (londonTeams.includes(fixture.homeTeam.id) && londonTeams.includes(fixture.awayTeam.id)) tags.push('derby');
  if (manchesterTeams.includes(fixture.homeTeam.id) && manchesterTeams.includes(fixture.awayTeam.id)) tags.push('derby');

  if (fixture.homeTeam.position === 1 || fixture.awayTeam.position === 1) tags.push('title-race');

  return tags;
};

// Example Teams (keeping these for your other components that still use mock data)
const arsenal: Team = { id: 'arsenal', name: 'Arsenal', shortName: 'ARS', logo: '', colors: { primary: '#EF0000', secondary: '#FFFF00' }, form: ['W', 'W', 'W', 'D', 'W'], position: 1 };
const liverpool: Team = { id: 'liverpool', name: 'Liverpool', shortName: 'LIV', logo: '', colors: { primary: '#C8102E', secondary: '#00B2A9' }, form: ['W', 'D', 'W', 'L', 'W'], position: 2 };
const chelsea: Team = { id: 'chelsea', name: 'Chelsea', shortName: 'CHE', logo: '', colors: { primary: '#034694', secondary: '#FFFFFF' }, form: ['L', 'W', 'D', 'W', 'L'], position: 3 };
const manCity: Team = { id: 'man-city', name: 'Manchester City', shortName: 'MCI', logo: '', colors: { primary: '#6CABDD', secondary: '#FFFFFF' },
