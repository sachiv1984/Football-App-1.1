// src/pages/HomePage.tsx
import React, { useState } from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import HeroSection from '../components/fixtures/HeroSection/HeroSection';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import InsightsContainer from '../components/insights/AIInsightCard/InsightsContainer';
import { designTokens } from '../styles/designTokens';
import { AIInsight, Fixture, Team, LeagueTableRow, FeaturedFixture } from '../types';

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
  },
];

// Featured Fixture - explicitly typed as FeaturedFixture
const featuredFixture: FeaturedFixture = {
  ...fixtures[0],
  aiInsight: fixtures[0].aiInsight ? {
    title: fixtures[0].aiInsight.title,
    description: fixtures[0].aiInsight.description,
    confidence: fixtures[0].aiInsight.confidence,
    probability: fixtures[0].aiInsight.probability,
  } : undefined
};

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
    description: 'Home team averages 6 corners per game.',
    confidence: 'medium',
    probability: 0.65, // Added missing probability
    market: 'corners',
    odds: '2.0',
  },
  {
    id: 'insight-3',
    title: 'Clean Sheet Possible',
    description: 'Away team has kept a clean sheet in 2 of last 5 matches.',
    confidence: 'low',
    probability: 0.45, // Added missing probability
    market: 'clean_sheet',
    odds: '2.5',
  },
];

// League Standings - now includes form and lastUpdated
const standings: LeagueTableRow[] = [
  { position: 1, team: arsenal, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 7, goalsAgainst: 2, goalDifference: 5, points: 9, form: arsenal.form, lastUpdated: '2025-08-27' },
  { position: 2, team: liverpool, played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 6, goalsAgainst: 3, goalDifference: 3, points: 7, form: liverpool.form, lastUpdated: '2025-08-27' },
  { position: 3, team: chelsea, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, goalDifference: 2, points: 6, form: chelsea.form, lastUpdated: '2025-08-27' },
  { position: 4, team: manCity, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: 1, points: 6, form: manCity.form, lastUpdated: '2025-08-27' },
  { position: 5, team: manUtd, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 4, goalDifference: -1, points: 4, form: manUtd.form, lastUpdated: '2025-08-27' },
];

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'standings' | 'insights'>('fixtures');

  return (
    <div style={{ background: designTokens.colors.neutral.background, color: designTokens.colors.neutral.darkGrey, minHeight: '100vh' }}>
      <Header />

      {/* Hero Section */}
      <HeroSection featuredFixture={featuredFixture} />

      {/* Tab Navigation */}
   <TabNavigation
  activeTab={activeTab}
  onTabChange={(tabId: string) => setActiveTab(tabId as 'fixtures' | 'standings' | 'insights')}
  tabs={[
    { label: 'Fixtures', id: 'fixtures', content: <FixturesList fixtures={fixtures} /> },
    { label: 'Standings', id: 'standings', content: <LeagueTable rows={standings} /> },
    { 
      label: 'AI Insights', 
      id: 'insights', 
      content: <InsightsContainer insights={insights} title="AI Insights" /> 
    },
  ]}
/>



      <Footer />
    </div>
  );
};

export default HomePage;
