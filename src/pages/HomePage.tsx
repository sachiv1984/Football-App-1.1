// src/pages/HomePage.tsx
import React, { useState } from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import FixtureCard from '../components/fixtures/FixtureCard/FixtureCard';
import { designTokens } from '../styles/designTokens';
import OptimizedFeaturedGamesCarousel from '../components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel';
import { ErrorBoundary, CarouselErrorBoundary } from '../components/ErrorBoundary';
import { useFixtures } from '../hooks/useFixtures';
import { useGameWeekFixtures } from '../hooks/useGameWeekFixtures';
import { FeaturedFixtureWithImportance, Game } from '../types';

// -------------------------
// HomePage Component
// -------------------------
const HomePage: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Existing hooks
  const { featuredFixtures, loading, error } = useFixtures();

  // New game week hook
  const {
    fixtures: gameWeekFixtures,
    isLoading: gameWeekLoading,
    error: gameWeekError,
    refetch: refetchGameWeek,
  } = useGameWeekFixtures();

  const handleToggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const handleGameSelect = (fixture: FeaturedFixtureWithImportance | Game) => {
    console.log('Selected fixture:', fixture.id);

    if ('importanceScore' in fixture) {
      console.log('Importance Score:', fixture.importanceScore);
    }
  };

  // Helper: map Game -> FeaturedFixtureWithImportance
  const mapToFeaturedFixture = (fixture: Game): FeaturedFixtureWithImportance => ({
    ...fixture,
    importanceScore: 0,
    tags: [],
    isBigMatch: false,
  });

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

        <div className="mt-4 lg:mt-6" />

        {/* Featured Fixtures Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-4 lg:mb-6">
            <h2 className="text-2xl lg:text-3xl font-semibold text-gray-900 text-center">
              Featured Fixtures
            </h2>
          </div>

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
              <>
                <OptimizedFeaturedGamesCarousel
                  fixtures={featuredFixtures.map(mapToFeaturedFixture)}
                  onGameSelect={handleGameSelect}
                  isLoading={loading}
                  className="mb-8 lg:mb-12"
                />
              </>
            )}
          </CarouselErrorBoundary>
        </div>

        {/* Matchday Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
          <div className="mb-6">
            <h2 className="text-2xl lg:text-3xl font-semibold text-gray-900 text-center">
              Current Matchday
            </h2>
          </div>

          <div className="space-y-10">
            {gameWeekLoading ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600">Loading matchday fixtures...</span>
                </div>
              </div>
            ) : gameWeekError ? (
              <div className="text-center py-8">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
                  <div className="text-red-600 font-medium mb-2">⚠️ Error Loading Matchday</div>
                  <p className="text-red-700 text-sm mb-4">{gameWeekError}</p>
                  <button
                    onClick={refetchGameWeek}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : gameWeekFixtures.length > 0 ? (
              <div className="space-y-10">
                {Object.entries(
                  gameWeekFixtures.reduce((groups, fixture) => {
                    const date = new Date(fixture.dateTime).toLocaleDateString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    });
                    if (!groups[date]) {
                      groups[date] = [];
                    }
                    groups[date].push(fixture);
                    return groups;
                  }, {} as Record<string, Game[]>)
                ).map(([date, fixtures]) => (
                  <div key={date} className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-800 text-left">{date}</h3>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {fixtures.map((fixture) => (
                        <FixtureCard
                          key={fixture.id}
                          fixture={mapToFeaturedFixture(fixture)}
                          size="lg"
                          showVenue={true}
                          enableNavigation={true}
                          className="hover:scale-[1.02] transition-transform duration-200"
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-2">📅</div>
                <p className="text-gray-600">No fixtures available for this matchday</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-12 lg:mt-16" />
        <Footer />
      </div>
    </ErrorBoundary>
  );
};

export default HomePage;
