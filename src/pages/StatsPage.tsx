// src/pages/StatsPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import MatchHeader from '../components/stats/match/MatchHeader';
import ModernStatsTable from '../components/stats/StatsTable/ModernStatsTable';
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

  const getModernStatsData = () => {
    if (!currentFixture) return null;

    return {
      // Form data (separate structure)
      recentForm: {
        homeResults: ['W', 'W', 'L', 'D', 'W'] as ('W' | 'D' | 'L')[],
        awayResults: ['L', 'D', 'W', 'L', 'W'] as ('W' | 'D' | 'L')[],
        homeStats: { matchesPlayed: 28, won: 18, drawn: 6, lost: 4 },
        awayStats: { matchesPlayed: 28, won: 12, drawn: 8, lost: 8 }
      },

      // Corners data
      cornersMatchesPlayed: { homeValue: 28, awayValue: 28 },
      cornersTaken: { homeValue: 156.00, awayValue: 134.00 },
      cornersAgainst: { homeValue: 98.00, awayValue: 142.00 },
      totalCorners: { homeValue: 254.00, awayValue: 276.00 },
      over75MatchCorners: { homeValue: 89, awayValue: 82 },
      over85MatchCorners: { homeValue: 82, awayValue: 75 },
      over95MatchCorners: { homeValue: 75, awayValue: 68 },
      over105MatchCorners: { homeValue: 64, awayValue: 57 },
      over115MatchCorners: { homeValue: 50, awayValue: 43 },

      // Cards data
      cardsMatchesPlayed: { homeValue: 28, awayValue: 28 },
      cardsShown: { homeValue: 67.00, awayValue: 54.00 },
      cardsAgainst: { homeValue: 42.00, awayValue: 58.00 },
      totalCards: { homeValue: 109.00, awayValue: 112.00 },
      over05TeamCards: { homeValue: 100, awayValue: 96 },
      over15TeamCards: { homeValue: 93, awayValue: 89 },
      over25TeamCards: { homeValue: 79, awayValue: 71 },
      over35TeamCards: { homeValue: 57, awayValue: 46 },

      // Shooting data
      shootingMatchesPlayed: { homeValue: 28, awayValue: 28 },
      shots: { homeValue: 378.00, awayValue: 321.00 },
      shotsAgainst: { homeValue: 287.00, awayValue: 356.00 },
      shotsOnTarget: { homeValue: 142.00, awayValue: 118.00 },
      shotsOnTargetAgainst: { homeValue: 98.00, awayValue: 134.00 },
      over25TeamShotsOnTarget: { homeValue: 96, awayValue: 89 },
      over35TeamShotsOnTarget: { homeValue: 89, awayValue: 82 },
      over45TeamShotsOnTarget: { homeValue: 82, awayValue: 71 },
      over55TeamShotsOnTarget: { homeValue: 68, awayValue: 57 },

      // Fouls data
      foulsMatchesPlayed: { homeValue: 28, awayValue: 28 },
      foulsCommitted: { homeValue: 324.00, awayValue: 298.00 },
      foulsWon: { homeValue: 276.00, awayValue: 312.00 },
      totalFouls: { homeValue: 600.00, awayValue: 610.00 },
      over85TeamFoulsCommitted: { homeValue: 93, awayValue: 86 },
      over95TeamFoulsCommitted: { homeValue: 86, awayValue: 79 },
      over105TeamFoulsCommitted: { homeValue: 79, awayValue: 71 },
      over115TeamFoulsCommitted: { homeValue: 71, awayValue: 64 }
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

  const modernStatsData = getModernStatsData();

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
          {/* Modern Stats Table with Tabs */}
          {modernStatsData && (
            <ModernStatsTable
              homeTeam={currentFixture.homeTeam}
              awayTeam={currentFixture.awayTeam}
              stats={modernStatsData}
              league="Premier League"
              season="25/26"
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
        </div>
      </main>

      {/* Footer Spacing */}
      <div className="mt-12 lg:mt-16" />
      <Footer />
    </div>
  );
};

export default StatsPage;