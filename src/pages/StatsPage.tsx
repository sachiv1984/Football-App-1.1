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

  const { featuredFixtures } = useFixtures();
  const { fixtures: gameWeekFixtures } = useGameWeekFixtures();

  const handleToggleDarkMode = () => setIsDarkMode(!isDarkMode);

  useEffect(() => {
    if (!matchId) return;

    const allFixtures = [...featuredFixtures, ...gameWeekFixtures];

    let foundFixture = allFixtures.find(
      (fixture) => fixture.id?.toString() === matchId
    );

    if (!foundFixture) {
      foundFixture = allFixtures.find((fixture) => {
        const homeTeam =
          fixture.homeTeam.name || fixture.homeTeam.shortName || 'home';
        const awayTeam =
          fixture.awayTeam.name || fixture.awayTeam.shortName || 'away';
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

  const getStatsData = () =>
    currentFixture
      ? {
          goalsScored: { homeValue: 8, awayValue: 5, leagueAverage: 6.2 },
          goalsConceded: { homeValue: 3, awayValue: 6, leagueAverage: 4.8 },
          goalDifference: { homeValue: 5, awayValue: -1, leagueAverage: 1.4 },
          corners: { homeValue: 21, awayValue: 15, leagueAverage: 18.3 },
          cornersAgainst: { homeValue: 12, awayValue: 19, leagueAverage: 15.7 },
          yellowCards: { homeValue: 6, awayValue: 9, leagueAverage: 7.2 },
          redCards: { homeValue: 0, awayValue: 1, leagueAverage: 0.3 },
          shotsOnTarget: { homeValue: 15, awayValue: 12, leagueAverage: 13.5 },
          totalShots: { homeValue: 42, awayValue: 38, leagueAverage: 40.2 },
          shotAccuracy: {
            homeValue: 36,
            awayValue: 32,
            leagueAverage: 34,
            unit: '%',
          },
          fouls: { homeValue: 33, awayValue: 41, leagueAverage: 37.8 },
          foulsWon: { homeValue: 38, awayValue: 35, leagueAverage: 36.5 },
          recentForm: {
            homeResults: ['W', 'W', 'L'] as ('W' | 'D' | 'L')[],
            awayResults: ['L', 'D', 'W'] as ('W' | 'D' | 'L')[],
            homeStats: { matchesPlayed: 3, won: 2, drawn: 0, lost: 1 },
            awayStats: { matchesPlayed: 3, won: 1, drawn: 1, lost: 1 },
          },
        }
      : null;

  if (!currentFixture) {
    return (
      <div
        style={{
          background: designTokens.colors.neutral.background,
          color: designTokens.colors.neutral.darkGrey,
          minHeight: '100vh',
        }}
      >
        <Header
          isDarkMode={isDarkMode}
          onToggleDarkMode={handleToggleDarkMode}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 mb-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="text-gray-600">Loading match details...</span>
            </div>
            <div className="mt-8">
              <p className="text-gray-600 mb-4">
                Match ID:{' '}
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                  {matchId}
                </span>
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

  const statsData = getStatsData();

  return (
    <div
      style={{
        background: designTokens.colors.neutral.background,
        color: designTokens.colors.neutral.darkGrey,
        minHeight: '100vh',
      }}
    >
      <Header isDarkMode={isDarkMode} onToggleDarkMode={handleToggleDarkMode} />

      <MatchHeader fixture={currentFixture} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        <div className="space-y-8">
          {statsData && (
            <ModernStatsTable
              homeTeam={currentFixture.homeTeam}
              awayTeam={currentFixture.awayTeam}
              stats={statsData}
              league="Premier League"
              season="25/26"
            />
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Betting Insights
            </h2>
            <p className="text-gray-600 mb-4">
              Best bets and predictions will go here
            </p>
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

      <div className="mt-12 lg:mt-16" />
      <Footer />
    </div>
  );
};

export default StatsPage;
