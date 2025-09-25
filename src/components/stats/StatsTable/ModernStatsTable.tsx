// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState } from 'react';
import { Team } from '../../../types';
import { useTeamStats } from '../../../hooks/useTeamStats';

interface FormData {
  homeResults: ('W' | 'D' | 'L')[];
  awayResults: ('W' | 'D' | 'L')[];
  homeStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
  awayStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
}

interface StatValue {
  homeValue: number;
  awayValue: number;
  leagueAverage?: number;
  unit?: string;
}

interface ModernStatsTableProps {
  homeTeam: Team;
  awayTeam: Team;
  stats?: Record<string, any>;
  league?: string;
  season?: string;
  className?: string;
  autoLoad?: boolean;
  showLoadingState?: boolean;
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
      className={`w-8 h-8 sm:w-10 sm:h-10 rounded border flex items-center justify-center text-xs sm:text-sm font-semibold ${getResultStyle(
        result
      )}`}
    >
      {result}
    </div>
  );
};

const ModernStatsTable: React.FC<ModernStatsTableProps> = ({
  homeTeam,
  awayTeam,
  stats: propStats,
  league = 'Premier League',
  season = '25/26',
  className = '',
  autoLoad = true,
  showLoadingState = true,
}) => {
  const [activeTab, setActiveTab] = useState<StatCategory>('form');

  const { stats: fetchedStats, loading, error, refetch } = useTeamStats(
    autoLoad ? homeTeam.name : undefined,
    autoLoad ? awayTeam.name : undefined
  );

  const mockStats = {
    // ... same mockStats as before
  };

  const effectiveStats = propStats || fetchedStats || mockStats;

  // Loading & error state
  if (showLoadingState && autoLoad && loading && !propStats) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
        <div className="p-6 text-center">
          <div className="inline-flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600">Loading team statistics...</span>
          </div>
        </div>
      </div>
    );
  }

  if (showLoadingState && autoLoad && error && !propStats) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
        <div className="p-6 text-center">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-600 font-medium mb-2">⚠️ Error Loading Statistics</div>
            <p className="text-red-700 text-sm mb-4">{error}</p>
            <button
              onClick={refetch}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { key: StatCategory; label: string }[] = [
    { key: 'form', label: 'Form' },
    { key: 'goals', label: 'Goals' },
    { key: 'corners', label: 'Corners' },
    { key: 'cards', label: 'Cards' },
    { key: 'shooting', label: 'Shooting' },
    { key: 'fouls', label: 'Fouls' },
  ];

  const getStatCategoryTitle = (category: StatCategory) => {
    switch (category) {
      case 'form':
        return 'Team Form';
      case 'goals':
        return 'Team Goals';
      case 'corners':
        return 'Team Corners';
      case 'cards':
        return 'Team Cards';
      case 'shooting':
        return 'Team Shooting';
      case 'fouls':
        return 'Team Fouls';
      default:
        return 'Team Stats';
    }
  };

  const formatValue = (value: number, unit?: string, isMatchesPlayed?: boolean) => {
    if (isMatchesPlayed) return value.toString();
    if (unit === '%') return `${value}%`;
    return value.toFixed(2);
  };

  const renderFormContent = () => {
    const recentForm = effectiveStats.recentForm as FormData | undefined;

    if (!recentForm) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No form data available</p>
        </div>
      );
    }

    const { homeResults, awayResults, homeStats, awayStats } = recentForm;

    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Logos & Title */}
        <div className="flex items-center justify-between mb-6 sm:mb-8 px-4 sm:px-6">
          {/* Home */}
          <div className="flex items-center">
            {homeTeam.logo ? (
              <img src={homeTeam.logo} alt={homeTeam.name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm sm:text-base">
                  {homeTeam.shortName?.charAt(0) || homeTeam.name.charAt(0)}
                </span>
              </div>
            )}
          </div>

          {/* Title */}
          <div className="text-center px-2">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Team Form</h2>
          </div>

          {/* Away */}
          <div className="flex items-center">
            {awayTeam.logo ? (
              <img src={awayTeam.logo} alt={awayTeam.name} className="w-10 h-10 sm:w-12 sm:h-12 object-contain" />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm sm:text-base">
                  {awayTeam.shortName?.charAt(0) || awayTeam.name.charAt(0)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Form Boxes */}
        <div className="flex justify-between items-center px-4 sm:px-6">
          <div className="flex space-x-2 sm:space-x-3">
            {Array.from({ length: 5 - homeResults.length }).map((_, i) => (
              <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded border border-gray-200 bg-gray-50"></div>
            ))}
            {homeResults.map((result, i) => (
              <FormResult key={i} result={result} />
            ))}
          </div>

          <div className="text-center px-4">
            <span className="text-sm sm:text-lg font-medium text-gray-700">Form</span>
          </div>

          <div className="flex space-x-2 sm:space-x-3">
            {awayResults.map((result, i) => (
              <FormResult key={i} result={result} />
            ))}
            {Array.from({ length: 5 - awayResults.length }).map((_, i) => (
              <div key={i} className="w-8 h-8 sm:w-10 sm:h-10 rounded border border-gray-200 bg-gray-50"></div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          {[
            { label: 'Matches Played', home: homeStats.matchesPlayed, away: awayStats.matchesPlayed },
            { label: 'Won', home: homeStats.won, away: awayStats.won },
            { label: 'Drawn', home: homeStats.drawn, away: awayStats.drawn },
            { label: 'Lost', home: homeStats.lost, away: awayStats.lost },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex justify-between items-center border-b border-gray-100 py-2 sm:py-3 transition-colors hover:bg-gray-50 rounded"
            >
              <span className="text-lg sm:text-2xl font-medium text-gray-900 flex-shrink-0 w-16 text-left">{stat.home}</span>
              <span className="text-sm sm:text-lg font-medium text-gray-700 text-center flex-1">{stat.label}</span>
              <span className="text-lg sm:text-2xl font-medium text-gray-900 flex-shrink-0 w-16 text-right">{stat.away}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto scrollbar-hide w-full">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'text-purple-600 border-purple-600 bg-white font-semibold'
                : 'text-gray-600 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* League Indicator */}
      <div className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <p className="text-xs sm:text-sm text-gray-600">
          Showing stats for {league} {season}
        </p>
        {autoLoad && (fetchedStats ? (
          <span className="text-xs text-green-600 font-medium">Live Data</span>
        ) : (
          <span className="text-xs text-orange-600 font-medium">Sample Data</span>
        ))}
      </div>

      {/* Content with smooth fade */}
      <div className="p-4 sm:p-6 transition-opacity duration-300 ease-in-out opacity-100">
        {activeTab === 'form' ? renderFormContent() : (
          <div className="space-y-6 sm:space-y-8 px-0 sm:px-0">
            {/* Stats Rows (reuse same pattern as renderFormContent) */}
            {/* ...your stats row rendering logic here, similar to above, with hover & padding */}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernStatsTable;
