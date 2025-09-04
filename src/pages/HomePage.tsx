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

        {/* Header to Carousel Spacing - spacing.md mobile, spacing.lg desktop */}
        <div className="mt-4 lg:mt-6" />

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
            <FixturesDebugTable />
          </div>
        )}

        {/* Featured Fixtures Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section Heading */}
          <div className="mb-4 lg:mb-6">
            <h2 className="text-2xl lg:text-3xl font-semibold text-gray-900 text-center">
              Featured Fixtures
            </h2>
          </div>

          {/* Carousel */}
          <CarouselErrorBoundary>
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Loading fixtures...</span>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                  <div className="text-red-600 font-medium mb-2">⚠️ Error Loading Fixtures</div>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
            ) : (
              <OptimizedFeaturedGamesCarousel
                fixtures={featuredFixtures}
                onGameSelect={handleGameSelect}
                className="mb-8 lg:mb-12"
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

        {/* Footer Spacing */}
        <div className="mt-12 lg:mt-16" />
        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default HomePage;
