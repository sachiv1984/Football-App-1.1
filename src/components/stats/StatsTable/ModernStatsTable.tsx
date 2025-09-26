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
  stats?: Record<string, any>; // Optional override stats
  league?: string;
  season?: string;
  className?: string;
  // New props for automatic data loading
  autoLoad?: boolean;
  showLoadingState?: boolean;
}

// Updated to include goals
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
    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded border flex items-center justify-center text-xs sm:text-sm font-semibold ${getResultStyle(result)}`}>
      {result}
    </div>
  );
};

const ModernStatsTable: React.FC<ModernStatsTableProps> = ({
  homeTeam,
  awayTeam,
  stats: propStats,
  league = "Premier League",
  season = "25/26",
  className = "",
  autoLoad = true,
  showLoadingState = true
}) => {
  const [activeTab, setActiveTab] = useState<StatCategory>('form');

  // Use the hook to fetch real data
  const { 
    stats: fetchedStats, 
    loading, 
    error, 
    refetch 
  } = useTeamStats(
    autoLoad ? homeTeam.name : undefined, 
    autoLoad ? awayTeam.name : undefined
  );

  // Determine which stats to use: propStats > fetchedStats
  const effectiveStats = propStats || fetchedStats;

  // Loading state
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

  // Error state
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

  // No data state
  if (!effectiveStats) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
        <div className="p-6 text-center">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-gray-600 font-medium mb-2">📊 No Statistics Available</div>
            <p className="text-gray-700 text-sm">No statistics data is currently available for these teams.</p>
          </div>
        </div>
      </div>
    );
  }

  // Updated tabs to include goals
  const tabs: { key: StatCategory; label: string }[] = [
    { key: 'form', label: 'Form' },
    { key: 'goals', label: 'Goals' },
    { key: 'corners', label: 'Corners' },
    { key: 'cards', label: 'Cards' },
    { key: 'shooting', label: 'Shooting' },
    { key: 'fouls', label: 'Fouls' }
  ];

  // Updated to include goals
  const getStatCategoryTitle = (category: StatCategory): string => {
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

  // Updated to include goals stats
  const getStatsForCategory = (category: StatCategory): Record<string, StatValue> => {
    const getStat = (key: string, unit?: string): StatValue => {
      const stat = (effectiveStats as any)[key];
      if (stat && typeof stat === 'object' && 'homeValue' in stat && 'awayValue' in stat) {
        return { ...stat, unit } as StatValue;
      }
      return { homeValue: 0, awayValue: 0, unit };
    };

    switch (category) {
      case 'goals':
        return {
          'Matches Played': getStat('goalsMatchesPlayed'),
          'Goals For': getStat('goalsFor'),
          'Goals Against': getStat('goalsAgainst'),
          'Total Goals': getStat('totalGoals'),
          'Over 1.5 Match Goals': getStat('over15MatchGoals', '%'),
          'Over 2.5 Match Goals': getStat('over25MatchGoals', '%'),
          'Over 3.5 Match Goals': getStat('over35MatchGoals', '%'),
          'Both Teams to Score': getStat('bothTeamsToScore', '%'),
        };
      case 'corners':
        return {
          'Matches Played': getStat('cornersMatchesPlayed'),
          'Corners Taken': getStat('cornersTaken'),
          'Corners Against': getStat('cornersAgainst'),
          'Total Corners': getStat('totalCorners'),
          'Over 7.5 Match Corners': getStat('over75MatchCorners', '%'),
          'Over 8.5 Match Corners': getStat('over85MatchCorners', '%'),
          'Over 9.5 Match Corners': getStat('over95MatchCorners', '%'),
          'Over 10.5 Match Corners': getStat('over105MatchCorners', '%'),
          'Over 11.5 Match Corners': getStat('over115MatchCorners', '%'),
        };
      case 'cards':
        return {
          'Matches Played': getStat('cardsMatchesPlayed'),
          'Cards Shown': getStat('cardsShown'),
          'Cards Against': getStat('cardsAgainst'),
          'Total Cards': getStat('totalCards'),
          'Over 0.5 Team Cards': getStat('over05TeamCards', '%'),
          'Over 1.5 Team Cards': getStat('over15TeamCards', '%'),
          'Over 2.5 Team Cards': getStat('over25TeamCards', '%'),
          'Over 3.5 Team Cards': getStat('over35TeamCards', '%'),
        };
      case 'shooting':
        return {
          'Matches Played': getStat('shootingMatchesPlayed'),
          'Shots': getStat('shots'),
          'Shots Against': getStat('shotsAgainst'),
          'Shots on Target': getStat('shotsOnTarget'),
          'Shots on Target Against': getStat('shotsOnTargetAgainst'),
          'Over 2.5 Team Shots on Target': getStat('over25TeamShotsOnTarget', '%'),
          'Over 3.5 Team Shots on Target': getStat('over35TeamShotsOnTarget', '%'),
          'Over 4.5 Team Shots on Target': getStat('over45TeamShotsOnTarget', '%'),
          'Over 5.5 Team Shots on Target': getStat('over55TeamShotsOnTarget', '%'),
        };
      case 'fouls':
        return {
          'Matches Played': getStat('foulsMatchesPlayed'),
          'Fouls Committed': getStat('foulsCommitted'),
          'Fouls Won': getStat('foulsWon'),
          'Total Fouls': getStat('totalFouls'),
          'Over 8.5 Team Fouls Committed': getStat('over85TeamFoulsCommitted', '%'),
          'Over 9.5 Team Fouls Committed': getStat('over95TeamFoulsCommitted', '%'),
          'Over 10.5 Team Fouls Committed': getStat('over105TeamFoulsCommitted', '%'),
          'Over 11.5 Team Fouls Committed': getStat('over115TeamFoulsCommitted', '%'),
        };
      default:
        return {};
    }
  };

  const formatValue = (value: number, unit?: string, isMatchesPlayed?: boolean): string => {
    if (isMatchesPlayed) {
      return value.toString();
    }
    if (unit === '%') {
      return `${value}%`;
    }
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
        {/* Team logos and title - Using Grid Layout */}
        <div className="grid grid-cols-3 gap-4 items-center mb-6 sm:mb-8">
          <div className="flex items-center justify-start">
            {homeTeam.logo ? (
              <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
            ) : (
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-xs sm:text-sm">{homeTeam.shortName?.charAt(0) || homeTeam.name.charAt(0)}</span>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Team Form</h2>
          </div>
          
          <div className="flex items-center justify-end">
            {awayTeam.logo ? (
              <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
            ) : (
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-xs sm:text-sm">{awayTeam.shortName?.charAt(0) || awayTeam.name.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Form display - Using Grid Layout */}
        <div className="grid grid-cols-3 gap-4 items-center mb-6 sm:mb-8">
          {/* Home team form - right aligned */}
          <div className="flex space-x-1 sm:space-x-2 justify-end">
            {Array.from({ length: 5 - homeResults.length }).map((_, index) => (
              <div key={`empty-home-${index}`} className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-200 bg-gray-50"></div>
            ))}
            {homeResults.map((result, index) => (
              <FormResult key={`home-${index}`} result={result} />
            ))}
          </div>

          {/* Center form label */}
          <div className="text-center">
            <span className="text-sm sm:text-lg font-medium text-gray-700">Form</span>
          </div>

          {/* Away team form - left aligned */}
          <div className="flex space-x-1 sm:space-x-2 justify-start">
            {awayResults.map((result, index) => (
              <FormResult key={`away-${index}`} result={result} />
            ))}
            {Array.from({ length: 5 - awayResults.length }).map((_, index) => (
              <div key={`empty-away-${index}`} className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-200 bg-gray-50"></div>
            ))}
          </div>
        </div>

        {/* Stats comparison - Using Grid Layout */}
        <div className="space-y-4 sm:space-y-6">
  <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
    <span className="text-lg sm:text-2xl font-medium text-gray-900 text-center">{homeStats.matchesPlayed}</span>
    <div className="text-center">
      <span className="text-sm sm:text-lg font-medium text-gray-700">Matches Played</span>
    </div>
    <span className="text-lg sm:text-2xl font-medium text-gray-900 text-center">{awayStats.matchesPlayed}</span>
  </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            <span className="text-lg sm:text-2xl font-medium text-gray-900 text-right">{homeStats.won}</span>
            <div className="text-center">
              <span className="text-sm sm:text-lg font-medium text-gray-700">Won</span>
            </div>
            <span className="text-lg sm:text-2xl font-medium text-gray-900 text-left">{awayStats.won}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            <span className="text-lg sm:text-2xl font-medium text-gray-900 text-right">{homeStats.drawn}</span>
            <div className="text-center">
              <span className="text-sm sm:text-lg font-medium text-gray-700">Drawn</span>
            </div>
            <span className="text-lg sm:text-2xl font-medium text-gray-900 text-left">{awayStats.drawn}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
            <span className="text-lg sm:text-2xl font-medium text-gray-900 text-right">{homeStats.lost}</span>
            <div className="text-center">
              <span className="text-sm sm:text-lg font-medium text-gray-700">Lost</span>
            </div>
            <span className="text-lg sm:text-2xl font-medium text-gray-900 text-left">{awayStats.lost}</span>
          </div>
        </div>
      </div>
    );
  };

  const currentStats = getStatsForCategory(activeTab);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header with navigation tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto scrollbar-hide w-full">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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
      <div className="px-3 sm:px-6 py-2 sm:py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
        <p className="text-xs sm:text-sm text-gray-600">
          Showing stats for {league} {season}
        </p>
        {autoLoad && (fetchedStats ? (
          <span className="text-xs text-green-600 font-medium">Live Data</span>
        ) : propStats ? (
          <span className="text-xs text-blue-600 font-medium">Custom Data</span>
        ) : (
          <span className="text-xs text-gray-600 font-medium">No Data</span>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-6">
        {activeTab === 'form' ? (
          renderFormContent()
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Team logos and title - Using Grid Layout */}
            <div className="grid grid-cols-3 gap-4 items-center mb-6 sm:mb-8">
              <div className="flex items-center justify-start">
                {homeTeam.logo ? (
                  <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-xs sm:text-sm">{homeTeam.shortName?.charAt(0) || homeTeam.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{getStatCategoryTitle(activeTab)}</h2>
              </div>
              
              <div className="flex items-center justify-end">
                {awayTeam.logo ? (
                  <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-xs sm:text-sm">{awayTeam.shortName?.charAt(0) || awayTeam.name.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>

       {/* Stats comparison - Using Grid Layout */}
<div className="space-y-4 sm:space-y-6">
  {Object.entries(currentStats).map(([statName, statData]) => {
    const isMatchesPlayed = statName === 'Matches Played';
    return (
      <div key={statName} className="grid grid-cols-3 gap-2 sm:gap-4 items-center">
        <span className="text-lg sm:text-2xl font-medium text-gray-900 text-center">
          {formatValue(statData.homeValue, statData.unit, isMatchesPlayed)}
        </span>
        <div className="text-center px-1">
          <span className="text-sm sm:text-lg font-medium text-gray-700 block leading-tight">{statName}</span>
          {statData.leagueAverage && (
            <div className="text-xs sm:text-sm text-gray-500 mt-1">
              Avg: {formatValue(statData.leagueAverage, statData.unit, isMatchesPlayed)}
            </div>
          )}
        </div>
        <span className="text-lg sm:text-2xl font-medium text-gray-900 text-center">
          {formatValue(statData.awayValue, statData.unit, isMatchesPlayed)}
        </span>
      </div>
    );
  })}
</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernStatsTable;