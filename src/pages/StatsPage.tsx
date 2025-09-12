// src/pages/StatsPage.tsx
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Header from '../components/common/Header/Header';
import Footer from '../components/common/Footer/Footer';
import { useFixtureNavigation } from '../hooks/useNavigation';
import { designTokens } from '../styles/designTokens';

const StatsPage: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const { goBack, goHome } = useFixtureNavigation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  const handleToggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <div
      style={{
        background: designTokens.colors.neutral.background,
        color: designTokens.colors.neutral.darkGrey,
        minHeight: '100vh',
      }}
    >
      <Header isDarkMode={isDarkMode} onToggleDarkMode={handleToggleDarkMode} />

      {/* Header to Content Spacing - same as HomePage */}
      <div className="mt-4 lg:mt-6" />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header with Navigation */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900">
                Match Statistics
              </h1>
              <p className="text-gray-600 mt-1">
                Match ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">{matchId}</span>
              </p>
            </div>
            
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
        </div>

        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <div className="text-green-600 text-2xl mr-3">🎉</div>
            <div>
              <h3 className="text-green-800 font-semibold">Navigation Working!</h3>
              <p className="text-green-700 text-sm">
                Click-through successful. Ready to build out the stats components.
              </p>
            </div>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-8">
          {/* Fixture Details Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Fixture Details</h2>
            <p className="text-gray-600 mb-4">Team vs Team match information will go here</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>This section will include:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Team names, logos, and colors</li>
                <li>• Match date, time, and venue</li>
                <li>• Current score (if live/finished)</li>
                <li>• Match status and competition info</li>
              </ul>
            </div>
          </div>

          {/* Match Statistics Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Match Statistics</h2>
            <p className="text-gray-600 mb-4">Detailed match statistics will go here</p>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">
                <strong>This section will include:</strong>
              </p>
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Possession percentage</li>
                <li>• Shots on target / total shots</li>
                <li>• Cards (yellow/red)</li>
                <li>• Corners, fouls, offsides</li>
                <li>• Pass accuracy and other detailed stats</li>
              </ul>
            </div>
          </div>

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

      {/* Footer Spacing - same as HomePage */}
      <div className="mt-12 lg:mt-16" />
      <Footer />
    </div>
  );
};

export default StatsPage;
