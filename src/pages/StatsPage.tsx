// src/pages/StatsPage.tsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const StatsPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - you can import your existing header component */}
      <header className="bg-white shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold">Match Stats</h1>
          <button 
            onClick={handleGoBack}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            ← Back to Fixtures
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">Match Details</h2>
          <p className="text-lg">
            Match ID: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{matchId}</span>
          </p>
          <p className="text-green-600 mt-2 font-semibold">
            🎉 Routing is working! This proves the click-through is successful.
          </p>
        </div>

        {/* Placeholder sections for your future components */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">Fixture Card Component</h3>
            <p className="text-gray-500">Team vs Team details will go here</p>
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                This will show: Team names, date, time, venue, current score, etc.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">Stats Component</h3>
            <p className="text-gray-500">Match statistics will go here</p>
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                This will show: Possession, shots, cards, corners, fouls, etc.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">Betting Insights</h3>
            <p className="text-gray-500">Best bets will go here</p>
            <div className="mt-3 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                This will show: Recommended bets, odds analysis, predictions
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - you can import your existing footer component */}
      <footer className="bg-gray-800 text-white p-4 mt-8">
        <div className="container mx-auto text-center">
          <p>Footer content</p>
        </div>
      </footer>
    </div>
  );
};

export default StatsPage;
