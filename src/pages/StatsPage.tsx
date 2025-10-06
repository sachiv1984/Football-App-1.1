// src/pages/StatsPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import MatchHeader from '../components/stats/match/MatchHeader';
import ModernStatsTable from '../components/stats/StatsTable/ModernStatsTable';
import FBrefScraperVercel from '../components/FBrefScraper';
import UnifiedBettingInsights from '../components/insights/UnifiedBettingInsights';
import { useFixtures, useFixtureNavigation } from '../hooks/useFixtures';
import { useGameWeekFixtures } from '../hooks/useGameWeekFixtures';
import { useBettingInsights } from '../hooks/useBettingInsights';
import { designTokens } from '../styles/designTokens';
import { RefreshCw, AlertCircle, TrendingUp, Target, Filter } from 'lucide-react';
import type { Fixture, Team } from '../types'; // 💡 Ensure 'Team' is imported if not already in 'Fixture'

// Import the service and type for enriching insights
import { matchContextService, MatchContextInsight } from '../services/ai/matchContextService';
import { BettingInsight } from '../services/ai/bettingInsightsService';
// 🛠️ NEW: Import the team name utility for robust client-side filtering
import { normalizeTeamName } from '../utils/teamUtils'; 


const StatsPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { goBack, goHome } = useFixtureNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentFixture, setCurrentFixture] = useState<Fixture | null>(null);
  const [showDebugger, setShowDebugger] = useState(false);
  
  const [enrichedMatchPatterns, setEnrichedMatchPatterns] = useState<MatchContextInsight[]>([]);

  const { featuredFixtures } = useFixtures();
  const { fixtures: gameWeekFixtures } = useGameWeekFixtures();

  const {
    insights: allBettingPatterns,
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
    // ... (rest of fixture finding logic remains the same)
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

  // Effect to filter patterns by match teams AND enrich them asynchronously
  useEffect(() => {
    if (!currentFixture || patternsLoading || patternsError) {
        setEnrichedMatchPatterns([]);
        return;
    }

    const homeTeamName = currentFixture.homeTeam.name;
    const awayTeamName = currentFixture.awayTeam.name;
    
    // 1. 🛠️ NORMALIZE FIXTURE NAMES FOR ROBUST FILTERING
    const normalizedHome = normalizeTeamName(homeTeamName);
    const normalizedAway = normalizeTeamName(awayTeamName);
    
    // 2. Filter the base insights by team (optimized single loop)
    const homeInsights: BettingInsight[] = [];
    const awayInsights: BettingInsight[] = [];

    // Pattern.team is already canonical
    for (const pattern of allBettingPatterns) {
        const teamCanonical = pattern.team;
        
        // Compare the canonical pattern name against the normalized fixture name
        if (teamCanonical === normalizedHome) {
            homeInsights.push(pattern);
        } else if (teamCanonical === normalizedAway) {
            awayInsights.push(pattern);
        }
    }

    // 3. Define the asynchronous enrichment function
    const enrichAndSet = async () => {
        try {
            // Pass the normalized names to the service.
            const enriched = await matchContextService.enrichMatchInsights(
                normalizedHome, 
                normalizedAway,
                homeInsights,
                awayInsights
            );
            setEnrichedMatchPatterns(enriched);
        } catch (error) {
            console.error("Failed to enrich match insights with context:", error);
            setEnrichedMatchPatterns([]); 
        }
    };

    enrichAndSet();
    
  }, [allBettingPatterns, currentFixture, patternsLoading, patternsError]);


  // --- Render Logic ---
  if (!currentFixture) {
    // ... (Loading state)
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
  
  // 💡 NOTE: The normalized names are no longer calculated here as they are not
  // needed for the props. The full Team objects are passed directly.

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
        {/* ... (debugger and navigation) ... */}
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
            
            {/* Header */}
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
            <div className="p-4 sm:p-6">
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

              {/* NEW UNIFIED INSIGHTS COMPONENT (FIXED PROPS) */}
              {!patternsLoading && !patternsError && (
                <UnifiedBettingInsights
                  insights={enrichedMatchPatterns}
                  // ✅ FIX: Pass the full Team objects from the fixture to satisfy the component's new prop requirement.
                  homeTeam={currentFixture.homeTeam} 
                  awayTeam={currentFixture.awayTeam}
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
