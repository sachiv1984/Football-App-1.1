// src/pages/HomePage.tsx
import React, { useState } from 'react';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import TabNavigation from '../components/common/TabNavigation/TabNavigation';
import FixturesList from '../components/fixtures/FixturesList/FixturesList';
import FixtureCard from '../components/fixtures/FixtureCard/FixtureCard';
import LeagueTable from '../components/league/LeagueTable/LeagueTable';
import { designTokens } from '../styles/designTokens';
import OptimizedFeaturedGamesCarousel from '../components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel';
import { FixturesDebugTable } from '../components/FixturesDebugTable';
import { ErrorBoundary, CarouselErrorBoundary } from '../components/ErrorBoundary';
import { useFixtures } from '../hooks/useFixtures';
import { useGameWeekFixtures } from '../hooks/useGameWeekFixtures';
import { FeaturedFixtureWithImportance, Game } from '../types';


// -------------------------
// HomePage Component
// -------------------------
const HomePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fixtures' | 'gameweek' | 'standings'>('fixtures');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showDebugTable, setShowDebugTable] = useState(true);

  // Existing hooks
  const { featuredFixtures, allFixtures, loading, error } = useFixtures();
  
  // New game week hook
  const { 
    fixtures: gameWeekFixtures, 
    gameWeekInfo, 
    isLoading: gameWeekLoading, 
    error: gameWeekError,
    refetch: refetchGameWeek
  } = useGameWeekFixtures();

  const handleToggleDarkMode = () => setIsDarkMode(!isDarkMode);
  
const handleGameSelect = (fixture: FeaturedFixtureWithImportance | Game) => {
  console.log('Selected fixture:', fixture.id);

  // Only available on Featured fixtures
  if ('importanceScore' in fixture) {
    console.log('Importance Score:', fixture.importanceScore);
  }
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
                isLoading={loading}
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
              setActiveTab(tabId as 'fixtures' | 'gameweek' | 'standings')
            }
            tabs={[
              {
                label: 'All Fixtures',
                id: 'fixtures',
                content: <FixturesList fixtures={allFixtures} />,
              },
              {
                label: 'This Matchday',
                id: 'gameweek',
                content: (
                  <div className="space-y-6">
                    {/* Game Week Overview */}
                    {gameWeekInfo && (
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">
                              Matchday {gameWeekInfo.currentWeek}
                            </h3>
                            <p className="text-gray-600 text-sm">
                              {gameWeekInfo.isComplete ? 'All matches completed' : `${gameWeekInfo.finishedGames} of ${gameWeekInfo.totalGames} matches played`}
                            </p>
                          </div>
                          <button
                            onClick={refetchGameWeek}
                            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            disabled={gameWeekLoading}
                          >
                            {gameWeekLoading ? 'Refreshing...' : 'Refresh'}
                          </button>
                        </div>
                        
                        {/* Stats Grid */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{gameWeekInfo.finishedGames}</div>
                            <div className="text-sm text-gray-500">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{gameWeekInfo.upcomingGames}</div>
                            <div className="text-sm text-gray-500">Upcoming</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-700">{gameWeekInfo.totalGames}</div>
                            <div className="text-sm text-gray-500">Total</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Game Week Fixtures */}
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
                      <div className="space-y-4">
                        {gameWeekFixtures.map((fixture) => (
                          <FixtureCard
                            key={fixture.id}
                            fixture={fixture}
                            onClick={handleGameSelect}
                            size="lg"
                            showVenue={true}
                            showAIInsight={true}
                            className="hover:scale-[1.02] transition-transform duration-200"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <div className="text-gray-400 text-lg mb-2">📅</div>
                        <p className="text-gray-600">No fixtures available for this matchday</p>
                      </div>
                    )}
                  </div>
                ),
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