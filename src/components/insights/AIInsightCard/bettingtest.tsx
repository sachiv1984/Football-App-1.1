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
        <div className="
