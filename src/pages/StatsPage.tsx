import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import MatchHeader from '../components/stats/match/MatchHeader';
import ModernStatsTable from '../components/stats/StatsTable/ModernStatsTable';
import FBrefScraperVercel from '../components/FBrefScraper';
// REMOVED: import MatchBettingPatterns from '../components/insights/BettingPatterns/MatchBettingPatterns';
// ADDED: New unified insights component
import UnifiedBettingInsights from '../components/insights/UnifiedBettingInsights';
import { useFixtures, useFixtureNavigation } from '../hooks/useFixtures';
import { useGameWeekFixtures } from '../hooks/useGameWeekFixtures';
import { useBettingInsights } from '../hooks/useBettingInsights';
import { designTokens } from '../styles/designTokens';
import { RefreshCw, AlertCircle, TrendingUp, Target, Filter } from 'lucide-react';
import type { Fixture } from '../types';

// Import the service and type for enriching insights (THE CRITICAL FIX)
import { matchContextService, MatchContextInsight } from '../services/ai/matchContextService';
import { BettingInsight } from '../services/ai/bettingInsightsService';

const StatsPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { goBack, goHome } = useFixtureNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentFixture, setCurrentFixture] = useState<Fixture | null>(null);
  const [showDebugger, setShowDebugger] = useState(false);
  
  // NEW: State for the final, enriched patterns
  const [enrichedMatchPatterns, setEnrichedMatchPatterns] = useState<MatchContextInsight[]>([]);

  // Get fixtures from both sources to find the matching one
  const { featuredFixtures } = useFixtures();
  const { fixtures: gameWeekFixtures } = useGameWeekFixtures();

  // Betting Patterns Hook (fetches ALL patterns)
  const {
    insights: allBettingPatterns, // Renamed to clarify it's the full list
    loading: patternsLoading,
    error: patternsError,
    refresh: refreshPatterns,
  } = useBettingInsights({
    autoRefresh: true,
    sortByStreak: true
  });

  const handleToggleDarkMode = useCallback(() => setIsDarkMode(prev => !prev), []);

  // Find the fixture that matches the matchId (unchanged logic)
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

  // CRITICAL FIX: Effect to filter patterns by match teams AND enrich them asynchronously
  useEffect(() => {
    // Only proceed if we have a fixture, the patterns have loaded, and there's no error
    if (!currentFixture || patternsLoading || patternsError) {
        setEnrichedMatchPatterns([]);
        return;
    }

    const homeTeamName = currentFixture.homeTeam.name;
    const awayTeamName = currentFixture.awayTeam.name;
    
    // 1. Filter the base insights by team (optimized single loop)
    const homeInsights: BettingInsight[] = [];
    const awayInsights: BettingInsight[] = [];

    const homeNameLower = homeTeamName.toLowerCase();
    const awayNameLower = awayTeamName.toLowerCase();

    for (const pattern of allBettingPatterns) {
        const team = pattern.team.toLowerCase();
        if (team === homeNameLower) {
            homeInsights.push(pattern);
        } else if (team === awayNameLower) {
            awayInsights.push(pattern);
        }
    }

    // 2. Define the asynchronous enrichment function
    const enrichAndSet = async () => {
        try {
            const enriched = await matchContextService.enrichMatchInsights(
                homeTeamName,
                awayTeamName,
                homeInsights,
                awayInsights
            );
            setEnrichedMatchPatterns(enriched);
        } catch (error) {
            console.error("Failed to enrich match insights with context:", error);
            // Fallback to empty array on failure
            setEnrichedMatchPatterns([]); 
        }
    };

    enrichAndSet();
    
  }, [allBettingPatterns, currentFixture, patternsLoading, patternsError]);


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
  
  // NOTE: Home/Away pattern counts were removed as the new component calculates its own counts 
  // based on the RANKED list internally.

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

          {/* BETTING PATTERNS SECTION (Updated) */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            
            {/* Header (Simplified - Unified component has its own header) */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      Unified Betting Insights
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      AI-ranked patterns and recommendations for the match
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
            <div className="p-4 sm:p-6"> {/* Padding slightly reduced to accommodate UnifiedInsights' own padding */}
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

              {/* NEW UNIFIED INSIGHTS COMPONENT */}
              {!patternsLoading && !patternsError && (
                <UnifiedBettingInsights
                  insights={enrichedMatchPatterns} // <-- Passing the enriched data
                  homeTeam={currentFixture.homeTeam.name}
                  awayTeam={currentFixture.awayTeam.name}
                />
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
