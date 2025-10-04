// src/pages/StatsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import MatchHeader from '../components/stats/match/MatchHeader';
import ModernStatsTable from '../components/stats/StatsTable/ModernStatsTable';
import FBrefScraperVercel from '../components/FBrefScraper';
import MatchBettingPatterns from '../components/insights/BettingPatterns/MatchBettingPatterns';
import { useFixtures, useFixtureNavigation } from '../hooks/useFixtures';
import { useGameWeekFixtures } from '../hooks/useGameWeekFixtures';
import { useBettingInsights } from '../hooks/useBettingInsights';
import { designTokens } from '../styles/designTokens';
import { RefreshCw, AlertCircle, TrendingUp, Target } from 'lucide-react';
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

  // Betting Patterns Hook
  const {
    insights: bettingPatterns,
    loading: patternsLoading,
    error: patternsError,
    refresh: refreshPatterns,
  } = useBettingInsights({
    autoRefresh: true,
    sortByStreak: true
  });

  // Filter patterns for current match teams
  const matchPatterns = React.useMemo(() => {
    if (!currentFixture) return [];
    
    const homeTeam = currentFixture.homeTeam.name.toLowerCase();
    const awayTeam = currentFixture.awayTeam.name.toLowerCase();
    
    return bettingPatterns.filter(pattern => 
      pattern.team.toLowerCase() === homeTeam || 
      pattern.team.toLowerCase() === awayTeam
    );
  }, [bettingPatterns, currentFixture]);

  const handleToggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Find the fixture that matches the matchId
  useEffect(() => {
    if (!matchId) return;

    const allFixtures = [...featuredFixtures, ...gameWeekFixtures];
    
    let foundFixture = allFixtures.find(fixture => 
      fixture.id?.toString() === matchId
    );

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

          {/* BETTING PATTERNS SECTION */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Betting Pattern Analysis
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      100% hit rate patterns detected from recent team performance
                    </p>
                  </div>
                </div>
                
                {/* Refresh Button */}
                <button
                  onClick={refreshPatterns}
                  disabled={patternsLoading}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    patternsLoading
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${patternsLoading ? 'animate-spin' : ''}`} />
                  {patternsLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6">
              {patternsLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="inline-flex items-center space-x-3 mb-4">
                      <TrendingUp className="w-6 h-6 text-purple-600 animate-pulse" />
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                    </div>
                    <p className="text-gray-600 font-medium">Analyzing patterns...</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Scanning team performance data
                    </p>
                  </div>
                </div>
              )}

              {patternsError && !patternsLoading && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-md">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Unable to Load Patterns
                    </h3>
                    <p className="text-gray-600 mb-4 text-sm">{patternsError.message}</p>
                    <button
                      onClick={refreshPatterns}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {!patternsLoading && !patternsError && matchPatterns.length > 0 && (
                <>
                  {/* Stats Overview */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Target className="w-4 h-4 text-blue-600" />
                        <p className="text-xs text-blue-600 font-medium uppercase">Total Patterns</p>
                      </div>
                      <p className="text-2xl font-bold text-blue-900">{matchPatterns.length}</p>
                    </div>
                    
                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-purple-600" />
                        <p className="text-xs text-purple-600 font-medium uppercase">Streaks (7+)</p>
                      </div>
                      <p className="text-2xl font-bold text-purple-900">
                        {matchPatterns.filter(p => p.isStreak).length}
                      </p>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 rounded-full bg-green-600"></div>
                        <p className="text-xs text-green-600 font-medium uppercase truncate">
                          {currentFixture.homeTeam.name}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        {matchPatterns.filter(p => 
                          p.team.toLowerCase() === currentFixture.homeTeam.name.toLowerCase()
                        ).length}
                      </p>
                    </div>

                    <div className="bg-orange-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-4 h-4 rounded-full bg-orange-600"></div>
                        <p className="text-xs text-orange-600 font-medium uppercase truncate">
                          {currentFixture.awayTeam.name}
                        </p>
                      </div>
                      <p className="text-2xl font-bold text-orange-900">
                        {matchPatterns.filter(p => 
                          p.team.toLowerCase() === currentFixture.awayTeam.name.toLowerCase()
                        ).length}
                      </p>
                    </div>
                  </div>

                  {/* Patterns Display */}
                  <MatchBettingPatterns 
                    insights={matchPatterns}
                    homeTeam={currentFixture.homeTeam.name}
                    awayTeam={currentFixture.awayTeam.name}
                  />

                  {/* Info Box */}
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 Understanding Patterns</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>100% Hit Rate:</strong> Pattern hit in every analyzed match</li>
                      <li>• <strong>Streaks (7+):</strong> Consecutive matches hitting the threshold</li>
                      <li>• <strong>Rolling (5):</strong> Last 5 matches all hit the threshold</li>
                      <li>• <strong>Threshold:</strong> The betting line (e.g., 3+ shots on target)</li>
                      <li>• <strong>Average:</strong> Team's average performance in this market</li>
                    </ul>
                  </div>

                  {/* Responsible Gambling Notice */}
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-xs text-yellow-800">
                      <strong>⚠️ Please Gamble Responsibly:</strong> Pattern detection shows historical data only. 
                      Past performance does not guarantee future results. Always bet within your means. 18+ only.
                    </p>
                  </div>
                </>
              )}

              {!patternsLoading && !patternsError && matchPatterns.length === 0 && (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-md">
                    <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No Patterns Found
                    </h3>
                    <p className="text-gray-600 text-sm mb-2">
                      No 100% hit rate patterns detected for {currentFixture.homeTeam.name} or {currentFixture.awayTeam.name} 
                      in their recent matches.
                    </p>
                    <p className="text-xs text-gray-500">
                      Patterns require either a 7+ match streak or 5 consecutive matches hitting the same threshold.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <div className="mt-12 lg:mt-16" />
      <Footer />
    </div>
  );
};

export default StatsPage;