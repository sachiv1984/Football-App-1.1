import React, { useState } from 'react';
import { TrendingUp, Target, AlertCircle, Filter } from 'lucide-react';

// Mock hook implementation for demo (replace with actual hook in production)
const useBettingInsights = () => {
  const [insights] = useState([
    {
      team: 'Arsenal',
      market: 'cards',
      outcome: 'Over 1.5 Team Cards',
      hitRate: 100,
      matchesAnalyzed: 5,
      isStreak: false,
      threshold: 1.5,
      averageValue: 2.4,
      recentMatches: [
        { opponent: 'Chelsea', value: 3, hit: true, date: '2025-09-28' },
        { opponent: 'Man City', value: 2, hit: true, date: '2025-09-21' },
        { opponent: 'Liverpool', value: 2, hit: true, date: '2025-09-14' },
        { opponent: 'Tottenham', value: 3, hit: true, date: '2025-09-07' },
        { opponent: 'Aston Villa', value: 2, hit: true, date: '2025-08-31' }
      ]
    },
    {
      team: 'Man City',
      market: 'corners',
      outcome: 'Over 5.5 Team Corners',
      hitRate: 100,
      matchesAnalyzed: 8,
      isStreak: true,
      streakLength: 8,
      threshold: 5.5,
      averageValue: 7.2,
      recentMatches: [
        { opponent: 'Arsenal', value: 8, hit: true, date: '2025-09-28' },
        { opponent: 'Liverpool', value: 7, hit: true, date: '2025-09-21' },
        { opponent: 'Chelsea', value: 6, hit: true, date: '2025-09-14' },
        { opponent: 'Tottenham', value: 9, hit: true, date: '2025-09-07' },
        { opponent: 'Newcastle', value: 7, hit: true, date: '2025-08-31' },
        { opponent: 'Brighton', value: 6, hit: true, date: '2025-08-24' },
        { opponent: 'Everton', value: 8, hit: true, date: '2025-08-17' },
        { opponent: 'West Ham', value: 7, hit: true, date: '2025-08-10' }
      ]
    },
    {
      team: 'Liverpool',
      market: 'both_teams_to_score',
      outcome: 'Both Teams to Score - Yes',
      hitRate: 100,
      matchesAnalyzed: 5,
      isStreak: false,
      threshold: 0.5,
      averageValue: 1,
      recentMatches: [
        { opponent: 'Man City', value: 1, hit: true, date: '2025-09-28' },
        { opponent: 'Arsenal', value: 1, hit: true, date: '2025-09-21' },
        { opponent: 'Chelsea', value: 1, hit: true, date: '2025-09-14' },
        { opponent: 'Newcastle', value: 1, hit: true, date: '2025-09-07' },
        { opponent: 'Brighton', value: 1, hit: true, date: '2025-08-31' }
      ]
    }
  ]);

  return {
    insights,
    loading: false,
    error: null,
    stats: {
      totalPatterns: 3,
      teamsAnalyzed: 3,
      streakCount: 1,
      rollingCount: 2
    }
  };
};

const BettingInsightsDashboard = () => {
  const { insights, loading, error, stats } = useBettingInsights();
  const [selectedMarket, setSelectedMarket] = useState('all');

  const filteredInsights = selectedMarket === 'all' 
    ? insights 
    : insights.filter(i => i.market === selectedMarket);

  const getMarketColor = (market) => {
    const colors = {
      cards: 'bg-yellow-100 text-yellow-800',
      corners: 'bg-blue-100 text-blue-800',
      fouls: 'bg-red-100 text-red-800',
      goals: 'bg-green-100 text-green-800',
      shots_on_target: 'bg-purple-100 text-purple-800',
      both_teams_to_score: 'bg-indigo-100 text-indigo-800'
    };
    return colors[market] || 'bg-gray-100 text-gray-800';
  };

  const getMarketLabel = (market) => {
    const labels = {
      cards: 'Cards',
      corners: 'Corners',
      fouls: 'Fouls',
      goals: 'Goals',
      shots_on_target: 'Shots',
      both_teams_to_score: 'BTTS'
    };
    return labels[market] || market;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // NOTE: You still need to complete the rest of the component's JSX here.
  // The original code snippet ended abruptly after the loading block.
  // For now, I'll add a minimal placeholder return statement to make the component valid.

  if (error) {
    return <div className="p-4 text-red-700 bg-red-100 rounded-lg flex items-center"><AlertCircle className="w-5 h-5 mr-2" /> Error loading insights.</div>;
  }

  // Placeholder for the main component rendering
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
        <TrendingUp className="w-8 h-8 mr-3 text-blue-600" />
        AI Betting Insights Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-4 mb-8 text-center">
        {/* Stats Cards - Example structure */}
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-xl font-semibold text-blue-600">{stats.totalPatterns}</p>
          <p className="text-sm text-gray-500">Total Patterns</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-xl font-semibold text-green-600">{stats.teamsAnalyzed}</p>
          <p className="text-sm text-gray-500">Teams Analyzed</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-xl font-semibold text-yellow-600">{stats.streakCount}</p>
          <p className="text-sm text-gray-500">Active Streaks</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-xl font-semibold text-indigo-600">{stats.rollingCount}</p>
          <p className="text-sm text-gray-500">Rolling Patterns</p>
        </div>
      </div>

      {/* Filter and Content Section */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-gray-800">Available Insights ({filteredInsights.length})</h2>
        <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                className="p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
                <option value="all">All Markets</option>
                <option value="cards">Cards</option>
                <option value="corners">Corners</option>
                <option value="both_teams_to_score">BTTS</option>
                {/* Add other markets as needed */}
            </select>
        </div>
      </div>

      <div className="space-y-6">
        {filteredInsights.length > 0 ? (
          filteredInsights.map((insight, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center">
                  <Target className="w-6 h-6 mr-3 text-red-500" />
                  {insight.team} - <span className="ml-2 text-blue-600">{insight.outcome}</span>
                </h3>
                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getMarketColor(insight.market)}`}>
                  {getMarketLabel(insight.market)}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Hit Rate</p>
                  <p className="text-2xl font-extrabold text-green-600">{insight.hitRate}%</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Matches Analyzed</p>
                  <p className="text-2xl font-extrabold text-gray-900">{insight.matchesAnalyzed}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg. Value</p>
                  <p className="text-2xl font-extrabold text-purple-600">{insight.averageValue}</p>
                </div>
              </div>

              {insight.isStreak && (
                <div className="mt-4 p-3 bg-red-50 text-red-800 rounded-lg flex items-center font-medium">
                  <TrendingUp className="w-5 h-5 mr-2" />
                  STREAK: Hit in the last {insight.streakLength} matches!
                </div>
              )}

              <div className="mt-4 border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Recent Match History (Last 5)</p>
                <div className="flex space-x-1">
                  {insight.recentMatches.slice(0, 5).map((match, matchIndex) => (
                    <div 
                      key={matchIndex} 
                      title={`${match.opponent}: ${match.value}`}
                      className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white transition-colors duration-200 ${
                        match.hit ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                      }`}
                    >
                      {match.value}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ))
        ) : (
          <div className="p-10 text-center text-gray-500 bg-white rounded-xl shadow-lg">
            <Filter className="w-10 h-10 mx-auto mb-3" />
            No insights found for the selected market.
          </div>
        )}
      </div>
    </div>
  );
};

export default BettingInsightsDashboard;
