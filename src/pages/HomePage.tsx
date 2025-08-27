// src/pages/HomePage.tsx
import React from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import HeroSection from '../components/fixtures/HeroSection/HeroSection';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import InsightsContainer from '../components/insights/AIInsightCard/InsightsContainer';
import { designTokens } from '../styles/designTokens';
import { AIInsight, Fixture, Team } from '../types';

const HomePage: React.FC = () => {

  // Teams
  const manUtd: Team = {
    id: 'man-utd',
    name: 'Manchester United',
    shortName: 'MUN',
    logo: '/images/man-utd.png',
    colors: { primary: '#DC143C', secondary: '#FFD700' },
    form: ['W', 'D', 'L', 'W', 'W'] as ('W' | 'D' | 'L')[]
    position: 3,
  };

  const chelsea: Team = {
    id: 'chelsea',
    name: 'Chelsea',
    shortName: 'CHE',
    logo: '/images/chelsea.png',
    colors: { primary: '#034694', secondary: '#FFFFFF' },
    form: ['W', 'D', 'L', 'W', 'W'] as ('W' | 'D' | 'L')[]
    position: 5,
  };

  // Featured Fixture
  const fixtures: import('../types').Fixture[] = [
  {
    id: 'fixture-1',
    homeTeam: manUtd,
    awayTeam: chelsea,
    competition: { id: 'pl', name: 'Premier League', logo: '/images/pl.png', country: 'England' },
    dateTime: '2025-08-26T20:00:00Z',
    venue: 'Old Trafford',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0
  },
  {
    id: 'fixture-2',
    homeTeam: { ...manUtd, id: 'arsenal', name: 'Arsenal', shortName: 'ARS' },
    awayTeam: { ...chelsea, id: 'liverpool', name: 'Liverpool', shortName: 'LIV' },
    competition: { id: 'pl', name: 'Premier League', logo: '/images/pl.png', country: 'England' },
    dateTime: '2025-08-27T18:00:00Z',
    venue: 'Emirates Stadium',
    status: 'scheduled',
    homeScore: 0,
    awayScore: 0
  }
];

  // AI Insights
  const insights: import('../types').AIInsight[] = [
  {
    id: 'insight-1',
    title: 'Over 2.5 Goals Likely',
    description: 'Both teams average 3+ goals combined in last 5 matches.',
    confidence: 'high',
    market: 'total_goals',
    odds: '1.8',
    supportingData: 'Recent meetings: 4/5 matches over 2.5 goals'
  },
  {
    id: 'insight-2',
    title: 'High Corner Count',
    description: 'Home team averages 6 corners per game.',
    confidence: 'medium',
    market: 'corners',
    odds: '2.0'
  },
  {
    id: 'insight-3',
    title: 'Clean Sheet Possible',
    description: 'Away team has kept a clean sheet in 2 of last 5 matches.',
    confidence: 'low',
    market: 'clean_sheet',
    odds: '2.5'
  }
];



  // League Standings
  const standings = [
    { position: 1, team: 'Arsenal', points: 9, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 7, goalsAgainst: 2, goalDifference: 5 },
    { position: 2, team: 'Liverpool', points: 7, played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 6, goalsAgainst: 3, goalDifference: 3 },
    { position: 3, team: 'Chelsea', points: 6, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, goalDifference: 2 },
    { position: 4, team: 'Manchester City', points: 6, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 4, goalsAgainst: 3, goalDifference: 1 },
    { position: 5, team: 'Manchester United', points: 4, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 4, goalDifference: -1 },
  ];

  return (
   <div style={{ background: designTokens.colors.neutral.background, color: designTokens.colors.neutral.darkGrey, minHeight: '100vh' }}>
      <Header />

      {/* Hero Section */}
      <HeroSection featuredFixture={featuredFixture} />

      {/* Tab Navigation */}
     <TabNavigation
      tabs={[
    { label: 'Fixtures', id: 'fixtures', content: <FixturesList fixtures={fixtures} /> },
    { label: 'Standings', id: 'standings', content: <LeagueTable standings={standings} /> },
    { label: 'Insights', id: 'insights', content: <InsightsContainer insights={insights} /> },
  ]}
  defaultActive="fixtures"
/>



      <main style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        <section id="fixtures" style={{ marginBottom: '3rem' }}>
          <h2>Upcoming Fixtures</h2>
          <FixturesList fixtures={fixtures} />
        </section>

        <section id="insights" style={{ marginBottom: '3rem' }}>
          <h2>AI Betting Insights</h2>
          <InsightsContainer insights={insights} />
        </section>

        <section id="standings" style={{ marginBottom: '3rem' }}>
          <h2>League Standings</h2>
          <LeagueTable standings={standings} />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
