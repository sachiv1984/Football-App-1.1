// src/pages/StatsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import MatchHeader from '../components/stats/match/MatchHeader';
import ModernStatsTable from '../components/stats/StatsTable/ModernStatsTable';
import FBrefScraperVercel from '../components/FBrefScraper';
import AIInsightCard from '../components/insights/AIInsightCard/AIInsightCard';
import { useFixtureNavigation } from '../hooks/useNavigation';
import { useFixtures } from '../hooks/useFixtures';
import { useGameWeekFixtures } from '../hooks/useGameWeekFixtures';
import { useAIBettingInsights, AIInsight } from '../hooks/useAIBettingInsights';
import { designTokens } from '../styles/designTokens';
import { Brain, RefreshCw, AlertCircle } from 'lucide-react';
import type { Fixture } from '../types';

const StatsPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { goBack, goHome } = useFixtureNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentFixture, setCurrentFixture] = useState<Fixture | null>(null);
  const [showDebugger, setShowDebugger] = useState(false);

  // Get fixtures from both sources to find the matching one
  const { featuredFixtures } = useFixtures();
  const { fixtures: gameWeekFixtures } = useGameWeekFixtures();

  // AI Betting Insights Hook
  // The hook is correctly called with string arguments (even if empty initially)
  const {
    insights,
    loading: insightsLoading,
    error: insightsError,
    refresh: refreshInsights,
    stats: insightStats,
    isRefreshing
  } = useAIBettingInsights(
    currentFixture?.homeTeam?.name || '',
    currentFixture?.awayTeam?.name || '',
    {
      enabled: !!currentFixture,
      cacheTimeout: 10 * 60 * 1000, // 10 minutes
      maxRetries: 2
    }
  );

  const handleToggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Find the fixture that matches the matchId
  useEffect(() => {
    if (!matchId) return;

    // Combine all fixtures from different sources
    const allFixtures = [...featuredFixtures, ...gameWeekFixtures];
    
    // Try to find exact match by ID first
    let foundFixture = allFixtures.find(fixture => 
      fixture.id?.toString() === matchId
    );

    // If not found by ID, try to match by generated matchId
    if (!foundFixture) {
      foundFixture = allFixtures.find(fixture => {
        const homeTeam = fixture.homeTeam.name || fixture.homeTeam.shortName || 'home';
        const awayTeam = fixture.awayTeam.name || fixture.awayTeam.shortName || 'away';
        const date = new Date(fixture.dateTime).toISOString().split('T')[0];
        
        const generatedId = `${homeTeam}-vs-${awayTeam}-${date}`
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');
        
        return generatedId === matchId;
      });
    }

    setCurrentFixture(foundFixture || null);
  }, [matchId, featuredFixtures, gameWeekFixtures]);

  // Loading state while we find the fixture
  if (!currentFixture) {
    return (
      <div
        style={{
          background: designTokens.colors.neutral.background,
          color: designTokens.colors.neutral.darkGrey,
          minHeight: '100vh',
        }}
      >
        <Header isDarkMode={isDarkMode} onToggleDarkMode={handleToggleDarkMode} />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Loading match details...</span>
            </div>
            
            {/* Fallback if fixture not found */}
            <div className="mt-8">
              <p className="text-gray-600 mb-4">
                Match ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{matchId}</span>
              </p>
              <div className="space-x-2">
                <button 
                  onClick={goBack}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                  ← Back
                </button>
                <button 
                  onClick={goHome}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: designTokens.colors.neutral.background,
        color: designTokens.colors.neutral.darkGrey,
        minHeight: '100vh',
      }}
    >
      <Header isDarkMode={isDarkMode} onToggleDarkMode={handleToggleDarkMode} />

      {/* Match Header as secondary header */}
      <MatchHeader fixture={currentFixture} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">
            Match Analysis
          </h1>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowDebugger(!showDebugger)}
              className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                showDebugger 
                  ? 'bg-purple-600 text-white hover:bg-purple-700' 
                  : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
              }`}
            >
              {showDebugger ? 'Hide Debugger' : 'Show Debugger'}
            </button>
            <button 
              onClick={goBack}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
            >
              ← Back
            </button>
            <button 
              onClick={goHome}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Home
            </button>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Debug Panel */}
          {showDebugger && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  🔧 FBref Data Debugger
                  <span className="text-sm font-normal text-gray-600">
                    Test and debug data scraping
                  </span>
                </h2>
              </div>
              <div className="p-6">
                <FBrefScraperVercel />
              </div>
            </div>
          )}

          {/* Modern Stats Table with Live Data */}
          <ModernStatsTable
            homeTeam={currentFixture.homeTeam}
            awayTeam={currentFixture.awayTeam}
            league="Premier League"
            season="25/26"
            autoLoad={true}
            showLoadingState={true}
          />

          {/* AI Betting Insights Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Brain className="w-6 h-6 text-purple-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      AI Betting Insights
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {/* Note: insightStats may be an empty object on initial render, but the hook structure handles it */}
                      {insightStats?.totalInsights > 0 
                        ? `${insightStats.totalInsights} insights • ${insightStats.highConfidence} high confidence • ${insightStats.mediumConfidence} medium confidence`
                        : 'Analyzing match data for betting opportunities...'
                      }
                    </p>
                  </div>
                </div>
                
                {/* Refresh Button */}
                <button
                  onClick={refreshInsights}
                  disabled={isRefreshing}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isRefreshing
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Loading State */}
              {insightsLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-3 mb-4">
                      <Brain className="w-6 h-6 text-purple-600 animate-pulse" />
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    </div>
                    <p className="text-gray-600 font-medium">Analyzing match data...</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Processing {currentFixture.homeTeam.name} vs {currentFixture.awayTeam.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {insightsError && !insightsLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Unable to Generate Insights
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      {insightsError}
                    </p>
                    <button
                      onClick={refreshInsights}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* Success State - Display Insights */}
              {!insightsLoading && !insightsError && insights.length > 0 && (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {/* 👇 FIX 2: Explicitly type the 'insight' parameter to resolve TS7006 */}
                    {insights.map((insight: AIInsight) => ( 
                      <AIInsightCard
                        key={insight.id}
                        insight={insight}
                        showServiceBadge={true}
                        animated={true}
                        compact={false}
                      />
                    ))}
                  </div>
                  
                  {/* Responsible Gambling Notice */}
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      <strong>⚠️ Please Gamble Responsibly:</strong> These insights are for entertainment purposes only. 
                      Always bet within your means and seek help if gambling becomes a problem. 18+ only.
                    </p>
                  </div>
                </>
              )}

              {/* Empty State */}
              {!insightsLoading && !insightsError && insights.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-md">
                    <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Insights Available
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm">
                      Unable to generate betting insights for this match. This could be due to 
                      insufficient data or the match being too far in the future.
                    </p>
                    <button
                      onClick={refreshInsights}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Retry Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer Spacing */}
      <div className="mt-12 lg:mt-16" />
      <Footer />
    </div>
  );
};

export default StatsPage;

