// src/pages/HomePage.tsx
import React, { useState } from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import { designTokens } from '../styles/designTokens';
import { Fixture, Team, LeagueTableRow } from '../types';
import OptimizedFeaturedGamesCarousel from '../components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../hooks/useFeaturedGamesCarousel';

// Helper functions to convert fixtures
const convertToFeaturedFixture = (fixture: Fixture): FeaturedFixtureWithImportance => ({
  ...fixture,
  importance: 50,
  importanceScore: 50, // Simplified for demo
  tags: [],
  matchWeek: fixture.matchWeek || 1,
  isBigMatch: false,
});

// Placeholder Teams
const arsenal: Team = { id: 'arsenal', name: 'Arsenal', shortName: 'ARS', logo: '', colors: { primary: '#EF0000', secondary: '#FFFF00' }, form: ['W','W','W','D','W'], position: 1 };
const liverpool: Team = { id: 'liverpool', name: 'Liverpool', shortName: 'LIV', logo: '', colors: { primary: '#C8102E', secondary: '#00B2A9' }, form: ['W','D','W','L','W'], position: 2 };
const chelsea: Team = { id: 'chelsea', name: 'Chelsea', shortName: 'CHE', logo: '', colors: { primary: '#034694', secondary: '#FFFFFF' }, form: ['L','W','D','W','L'], position: 3 };
const manUtd: Team = { id: 'man-utd', name: 'Manchester United', shortName: 'MUN', logo: '', colors: { primary: '#DC143C', secondary: '#FFD700' }, form: ['W','D','L','W','W'], position: 5 };

// Fixtures
const fixtures: Fixture[] = [
  { id: 'fixture-1', homeTeam: manUtd, awayTeam: chelsea, competition: { id: 'pl', name: 'Premier League', shortName: 'PL', logo: '', country: 'England' }, dateTime: '2025-08-26T20:00:00Z', venue: 'Old Trafford', status: 'scheduled', homeScore: 0, awayScore: 0, matchWeek: 3 },
  { id: 'fixture-2', homeTeam: arsenal, awayTeam: liverpool, competition: { id: 'pl', name: 'Premier League', shortName: 'PL', logo: '', country: 'England' }, dateTime: '2025-08-27T18:00:00Z', venue: 'Emirates Stadium', status: 'scheduled', homeScore: 0, awayScore: 0, matchWeek: 3 },
];

// Convert fixtures to featured
const featuredFixtures: FeaturedFixtureWithImportance[] = fixtures.map(convertToFeaturedFixture);

// League Standings
const standings: LeagueTableRow[] = [
  { position: 1, team: arsenal, played: 3, won: 3, drawn: 0, lost: 0, goalsFor: 7, goalsAgainst: 2, goalDifference: 5, points: 9, form: arsenal.form, lastUpdated: '2025-08-27' },
  { position: 2, team: liverpool, played: 3, won: 2, drawn: 1, lost: 0, goalsFor: 6, goalsAgainst: 3, goalDifference: 3, points: 7, form: liverpool.form, lastUpdated: '2025-08-27' },
  { position: 3, team: chelsea, played: 3, won: 2, drawn: 0, lost: 1, goalsFor: 5, goalsAgainst: 3, goalDifference: 2, points: 6, form: chelsea.form, lastUpdated: '2025-08-27' },
  { position: 4, team: manUtd, played: 3, won: 1, drawn: 1, lost: 1, goalsFor: 3, goalsAgainst: 4, goalDifference: -1, points: 4, form: manUtd.form, lastUpdated: '2025-08-27' },
];

const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'standings'>('fixtures');
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleToggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleGameSelect = (fixture: FeaturedFixtureWithImportance) => {
    console.log('Selected fixture:', fixture.id);
  };

  const { featuredGames, scrollRef, scrollToIndex } = useFeaturedGamesCarousel(featuredFixtures, 5000);

  return (
    <div style={{ background: designTokens.colors.neutral.background, color: designTokens.colors.neutral.darkGrey, minHeight: '100vh' }}>
      <Header isDarkMode={isDarkMode} onToggleDarkMode={handleToggleDarkMode} />

      {/* Carousel Section */}
      <OptimizedFeaturedGamesCarousel
        fixtures={featuredGames}
        onGameSelect={handleGameSelect}
        autoRefresh={true}
        rotateInterval={5000}
        maxFeaturedGames={4}
        scrollRef={scrollRef} // passed so component can use it if needed
      />

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={(tabId: string) => setActiveTab(tabId as 'fixtures' | 'standings')}
        tabs={[
          { label: 'Fixtures', id: 'fixtures', content: <FixturesList fixtures={fixtures} /> },
          { label: 'Standings', id: 'standings', content: <LeagueTable rows={standings} /> },
        ]}
      />

      <Footer />
    </div>
  );
};


export default HomePage;
