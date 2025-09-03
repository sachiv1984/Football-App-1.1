// src/pages/HomePage.tsx
import React, { useState } from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import { designTokens } from '../styles/designTokens';
import OptimizedFeaturedGamesCarousel from '../components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel';
import { FixturesDebugTable } from '../components/FixturesDebugTable';
import { ErrorBoundary, CarouselErrorBoundary } from '../components/ErrorBoundary';
import { useFixtures } from '../hooks/useFixtures';

// -------------------------
// HomePage Component
// -------------------------
const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'standings'>('fixtures');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDebugTable, setShowDebugTable] = useState(true);

  const { featuredFixtures, allFixtures, loading, error } = useFixtures();

  const handleToggleDarkMode = () => setIsDarkMode(!isDarkMode);
  const handleGameSelect = (fixture: typeof featuredFixtures[number]) => {
    console.log('Selected fixture:', fixture.id);
  };

  return (
    <ErrorBoundary>
      <div
        style={{
          background: designTokens.colors.neutral.background,
          color: designTokens.colors.neutral.darkGrey,
          minHeight: '100vh',
        }}
      >
        <Header isDarkMode={isDarkMode} onToggleDarkMode={handleToggleDarkMode} />

        {/* Spacer */}
        <div style={{ marginTop: '2rem' }} />

        {/* Debug Table */}
        {showDebugTable && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-yellow-800">🔍 API Debug Mode</h3>
                <p className="text-sm text-yellow-700">Review API data</p>
              </div>
              <button
                onClick={() => setShowDebugTable(false)}
                className="text-yellow-600 hover:text-yellow-800 text-sm"
              >
                Hide Debug Table
              </button>
            </div>
            <FixturesDebugTable fixtures={allFixtures} />
          </div>
        )}

        {/* Carousel */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <CarouselErrorBoundary>
            {loading ? (
              <p className="text-center py-8">Loading fixtures...</p>
            ) : error ? (
              <p className="text-center py-8 text-red-600">Error loading fixtures: {error}</p>
            ) : (
              <OptimizedFeaturedGamesCarousel
                fixtures={featuredFixtures}
                onGameSelect={handleGameSelect}
                className="my-8"
              />
            )}
          </CarouselErrorBoundary>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TabNavigation
            activeTab={activeTab}
            onTabChange={(tabId: string) =>
              setActiveTab(tabId as 'fixtures' | 'standings')
            }
            tabs={[
              {
                label: 'Fixtures',
                id: 'fixtures',
                content: <FixturesList fixtures={allFixtures} />,
              },
              {
                label: 'Standings',
                id: 'standings',
                content: <LeagueTable rows={[]} />, // replace with actual standings if available
              },
            ]}
          />
        </div>

        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default HomePage;
