// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState } from 'react';
import { Team } from '../../../types';

interface StatValue {
  homeValue: number;
  awayValue: number;
  leagueAverage?: number;
  unit?: string;
}

interface RecentForm {
  homeValue: number;
  awayValue: number;
  results: {
    home: ('W' | 'D' | 'L')[];
    away: ('W' | 'D' | 'L')[];
  };
}

interface StatsData {
  goalsScored: StatValue;
  goalsConceded: StatValue;
  goalDifference: StatValue;
  corners: StatValue;
  cornersAgainst: StatValue;
  yellowCards: StatValue;
  redCards: StatValue;
  shotsOnTarget: StatValue;
  totalShots: StatValue;
  shotAccuracy: StatValue;
  fouls: StatValue;
  foulsWon: StatValue;
  recentForm?: RecentForm;
}

interface ModernStatsTableProps {
  homeTeam: Team;
  awayTeam: Team;
  stats: StatsData;
  league?: string;
  season?: string;
  className?: string;
}

type StatCategory = 'form' | 'goals' | 'corners' | 'cards' | 'shooting' | 'fouls';

const FormResult: React.FC<{ result: 'W' | 'D' | 'L' }> = ({ result }) => {
  const getResultStyle = (result: 'W' | 'D' | 'L') => {
    switch (result) {
      case 'W':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'D':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'L':
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };
  return (
    <div
      className={`w-8 h-8 rounded border flex items-center justify-center text-sm font-semibold ${getResultStyle(result)}`}
    >
      {result}
    </div>
  );
};

const ModernStatsTable: React.FC<ModernStatsTableProps> = ({
  homeTeam,
  awayTeam,
  stats,
  league = 'Premier League',
  season = '25/26',
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<StatCategory>('form');

  const tabs: { key: StatCategory; label: string }[] = [
    { key: 'form', label: 'Form' },
    { key: 'goals', label: 'Goals' },
    { key: 'corners', label: 'Corners' },
    { key: 'cards', label: 'Cards' },
    { key: 'shooting', label: 'Shooting' },
    { key: 'fouls', label: 'Fouls' },
  ];

  const getStatsForCategory = (category: StatCategory) => {
    switch (category) {
      case 'goals':
        return {
          'Goals Scored': stats.goalsScored,
          'Goals Conceded': stats.goalsConceded,
          'Goal Difference': stats.goalDifference,
        };
      case 'corners':
        return {
          'Corners Won': stats.corners,
          'Corners Conceded': stats.cornersAgainst,
        };
      case 'cards':
        return {
          'Yellow Cards': stats.yellowCards,
          'Red Cards': stats.redCards,
        };
      case 'shooting':
        return {
          'Shots on Target': stats.shotsOnTarget,
          'Total Shots': stats.totalShots,
          'Shot Accuracy': stats.shotAccuracy,
        };
      case 'fouls':
        return {
          'Fouls Committed': stats.fouls,
          'Fouls Won': stats.foulsWon,
        };
      default:
        return {};
    }
  };

  const currentStats = getStatsForCategory(activeTab);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-purple-600 border-purple-600 bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* League indicator */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-sm text-gray-600">
          Showing stats for {league} {season}
        </p>
      </div>

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'form' && stats.recentForm ? (
          <div className="space-y-6">
            {/* Form display */}
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                {stats.recentForm.results.home.map((res, i) => (
                  <FormResult key={i} result={res} />
                ))}
              </div>
              <span className="text-lg font-semibold text-gray-700">Form</span>
              <div className="flex space-x-2">
                {stats.recentForm.results.away.map((res, i) => (
                  <FormResult key={i} result={res} />
                ))}
              </div>
            </div>

            {/* Stats comparison */}
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-gray-900">{stats.recentForm.homeValue}</span>
              <span className="text-lg font-medium text-gray-700">Matches Played</span>
              <span className="text-2xl font-bold text-gray-900">{stats.recentForm.awayValue}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(currentStats).map(([statName, statData]) => (
              <div key={statName} className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{statData.homeValue}{statData.unit || ''}</span>
                <div className="text-center">
                  <span className="text-lg font-medium text-gray-700">{statName}</span>
                  {statData.leagueAverage && (
                    <div className="text-sm text-gray-500 mt-1">
                      Avg: {statData.leagueAverage}{statData.unit || ''}
                    </div>
                  )}
                </div>
                <span className="text-2xl font-bold text-gray-900">{statData.awayValue}{statData.unit || ''}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernStatsTable;
