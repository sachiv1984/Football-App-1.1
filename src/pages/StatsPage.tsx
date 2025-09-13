// src/pages/StatsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import MatchHeader from '../components/stats/match/MatchHeader';
import StatsTable from '../components/stats/StatsTable/StatsTable';
import { useFixtureNavigation } from '../hooks/useNavigation';
import { useFixtures } from '../hooks/useFixtures';
import { useGameWeekFixtures } from '../hooks/useGameWeekFixtures';
import { designTokens } from '../styles/designTokens';
import type { Fixture } from '../types';

const StatsPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { goBack, goHome } = useFixtureNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentFixture, setCurrentFixture] = useState<Fixture | null>(null);

  // Get fixtures from both sources to find the matching one
  const { featuredFixtures } = useFixtures();
  const { fixtures: gameWeekFixtures } = useGameWeekFixtures();

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

  // Mock stats data - replace with actual data from your API/hooks
  const getMockStats = () => {
    if (!currentFixture) return null;

    return {
      homeTeamStats: {
        shotsOnTarget: 5,
        totalShots: 12,
        corners: 7,
        possession: 58,
        passAccuracy: 87,
        fouls: 11,
        yellowCards: 2,
        redCards: 0,
        offsides: 3
      },
      awayTeamStats: {
        shotsOnTarget: 3,
        totalShots: 8,
        corners: 4,
        possession: 42,
        passAccuracy: 81,
        fouls: 14,
        yellowCards: 3,
        redCards: 1,
        offsides: 2
      },
      leagueAverages: {
        shotsOnTarget: 4.2,
        totalShots: 11.5,
        corners: 5.8,
        possession: 50,
        passAccuracy: 84,
        fouls: 12.3,
        yellowCards: 2.1,
        redCards: 0.2,
        offsides: 2.7
      }
    };
  };

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

  const statsData = getMockStats();

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
          {/* Match Statistics - Now using StatsTable component */}
          {statsData && (
            <StatsTable
              homeTeam={currentFixture.homeTeam}
              awayTeam={currentFixture.awayTeam}
              stats={statsData}
              className="shadow-sm"
            />
          )}

          {/* Betting Insights Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Betting Insights</h2>
            <p className="text-gray-600 mb-4">Best bets and predictions will go here</p>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>This section will include:</strong>
              </p>
              <ul className="text-sm text-blue-800 space-y-1 ml-4">
                <li>• Recommended bets based on analysis</li>
                <li>• Odds comparison</li>
                <li>• Predictions and insights</li>
                <li>• Historical head-to-head data</li>
                <li>• Form analysis and trends</li>
              </ul>
            </div>
          </div>

          {/* Additional Statistics Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Form Guide */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Form</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{currentFixture.homeTeam.shortName}</span>
                  <div className="flex space-x-1">
                    {['W', 'W', 'D', 'L', 'W'].map((result, index) => (
                      <span
                        key={index}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          result === 'W' ? 'bg-green-500' :
                          result === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{currentFixture.awayTeam.shortName}</span>
                  <div className="flex space-x-1">
                    {['L', 'W', 'W', 'D', 'L'].map((result, index) => (
                      <span
                        key={index}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          result === 'W' ? 'bg-green-500' :
                          result === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                      >
                        {result}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Head to Head */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Head to Head</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Total Meetings</span>
                  <span className="font-semibold">12</span>
                </div>
                <div className="flex justify-between">
                  <span>{currentFixture.homeTeam.shortName} Wins</span>
                  <span className="font-semibold text-blue-600">5</span>
                </div>
                <div className="flex justify-between">
                  <span>Draws</span>
                  <span className="font-semibold text-gray-600">3</span>
                </div>
                <div className="flex justify-between">
                  <span>{currentFixture.awayTeam.shortName} Wins</span>
                  <span className="font-semibold text-red-600">4</span>
                </div>
              </div>
            </div>
          </div>

          {/* Debug Info (remove this later) */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-green-800 font-semibold mb-2">Debug Info (Remove Later)</h3>
            <p className="text-green-700 text-sm mb-2">
              Successfully found fixture: {currentFixture.homeTeam.shortName} vs {currentFixture.awayTeam.shortName}
            </p>
            <p className="text-green-700 text-sm">
              Match ID: <span className="font-mono bg-green-100 px-1 rounded">{matchId}</span>
            </p>
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