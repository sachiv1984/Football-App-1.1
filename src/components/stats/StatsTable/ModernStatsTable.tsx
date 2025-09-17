// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState, useEffect } from 'react';
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

type StatCategory = 'form' | 'corners' | 'cards' | 'shooting' | 'fouls';

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

  // Mock data fallback (same as before)
  const mockStats = {
    recentForm: {
      homeResults: ['W', 'L', 'W', 'D', 'W'] as ('W' | 'D' | 'L')[],
      awayResults: ['L', 'W', 'D', 'W', 'L'] as ('W' | 'D' | 'L')[],
      homeStats: { matchesPlayed: 28, won: 18, drawn: 6, lost: 4 },
      awayStats: { matchesPlayed: 28, won: 12, drawn: 8, lost: 8 }
    },
    cornersMatchesPlayed: { homeValue: 28, awayValue: 28 },
    cornersTaken: { homeValue: 156.00, awayValue: 134.00 },
    cornersAgainst: { homeValue: 98.00, awayValue: 142.00 },
    totalCorners: { homeValue: 254.00, awayValue: 276.00 },
    over75MatchCorners: { homeValue: 89, awayValue: 82 },
    over85MatchCorners: { homeValue: 82, awayValue: 75 },
    over95MatchCorners: { homeValue: 75, awayValue: 68 },
    over105MatchCorners: { homeValue: 64, awayValue: 57 },
    over115MatchCorners: { homeValue: 50, awayValue: 43 },
    cardsMatchesPlayed: { homeValue: 28, awayValue: 28 },
    cardsShown: { homeValue: 67.00, awayValue: 54.00 },
    cardsAgainst: { homeValue: 42.00, awayValue: 58.00 },
    totalCards: { homeValue: 109.00, awayValue: 112.00 },
    over05TeamCards: { homeValue: 100, awayValue: 96 },
    over15TeamCards: { homeValue: 93, awayValue: 89 },
    over25TeamCards: { homeValue: 79, awayValue: 71 },
    over35TeamCards: { homeValue: 57, awayValue: 46 },
    shootingMatchesPlayed: { homeValue: 28, awayValue: 28 },
    shots: { homeValue: 378.00, awayValue: 321.00 },
    shotsAgainst: { homeValue: 287.00, awayValue: 356.00 },
    shotsOnTarget: { homeValue: 142.00, awayValue: 118.00 },
    shotsOnTargetAgainst: { homeValue: 98.00, awayValue: 134.00 },
    over25TeamShotsOnTarget: { homeValue: 96, awayValue: 89 },
    over35TeamShotsOnTarget: { homeValue: 89, awayValue: 82 },
    over45TeamShotsOnTarget: { homeValue: 82, awayValue: 71 },
    over55TeamShotsOnTarget: { homeValue: 68, awayValue: 57 },
    foulsMatchesPlayed: { homeValue: 28, awayValue: 28 },
    foulsCommitted: { homeValue: 324.00, awayValue: 298.00 },
    foulsWon: { homeValue: 276.00, awayValue: 312.00 },
    totalFouls: { homeValue: 600.00, awayValue: 610.00 },
    over85TeamFoulsCommitted: { homeValue: 93, awayValue: 86 },
    over95TeamFoulsCommitted: { homeValue: 86, awayValue: 79 },
    over105TeamFoulsCommitted: { homeValue: 79, awayValue: 71 },
    over115TeamFoulsCommitted: { homeValue: 71, awayValue: 64 }
  };

  // Determine which stats to use: propStats > fetchedStats > mockStats
  const effectiveStats = propStats || fetchedStats || mockStats;

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

  const tabs: { key: StatCategory; label: string }[] = [
    { key: 'form', label: 'Form' },
    { key: 'corners', label: 'Corners' },
    { key: 'cards', label: 'Cards' },
    { key: 'shooting', label: 'Shooting' },
    { key: 'fouls', label: 'Fouls' }
  ];

  const getStatCategoryTitle = (category: StatCategory): string => {
    switch (category) {
      case 'form':
        return 'Team Form';
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

  const getStatsForCategory = (category: StatCategory): Record<string, StatValue> => {
    const getStat = (key: string, unit?: string): StatValue => {
      const stat = (effectiveStats as any)[key];
      if (stat && typeof stat === 'object' && 'homeValue' in stat && 'awayValue' in stat) {
        return { ...stat, unit } as StatValue;
      }
      return { homeValue: 0, awayValue: 0, unit };
    };

    switch (category) {
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
        {/* Team logos and title */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center">
            {homeTeam.logo ? (
              <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
            ) : (
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-xs sm:text-sm">{homeTeam.shortName?.charAt(0) || homeTeam.name.charAt(0)}</span>
              </div>
            )}
          </div>
          
          <div className="text-center px-2">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Team Form</h2>
          </div>
          
          <div className="flex items-center">
            {awayTeam.logo ? (
              <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
            ) : (
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-xs sm:text-sm">{awayTeam.shortName?.charAt(0) || awayTeam.name.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Form display */}
        <div className="flex justify-between items-center mb-6 sm:mb-8 px-2 sm:px-0">
          {/* Home team form */}
          <div className="flex space-x-1 sm:space-x-2">
            {Array.from({ length: 5 - homeResults.length }).map((_, index) => (
              <div key={`empty-home-${index}`} className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-200 bg-gray-50"></div>
            ))}
            {homeResults.map((result, index) => (
              <FormResult key={`home-${index}`} result={result} />
            ))}
          </div>

          {/* Center form label */}
          <div className="text-center px-2 sm:px-4">
            <span className="text-sm sm:text-lg font-medium text-gray-700">Form</span>
          </div>

          {/* Away team form */}
          <div className="flex space-x-1 sm:space-x-2">
            {awayResults.map((result, index) => (
              <FormResult key={`away-${index}`} result={result} />
            ))}
            {Array.from({ length: 5 - awayResults.length }).map((_, index) => (
              <div key={`empty-away-${index}`} className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-200 bg-gray-50"></div>
            ))}
          </div>
        </div>

        {/* Stats comparison */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0">{homeStats.matchesPlayed}</span>
            <span className="text-sm sm:text-lg font-medium text-gray-700 text-center px-2 flex-1">Matches Played</span>
            <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0">{awayStats.matchesPlayed}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0">{homeStats.won}</span>
            <span className="text-sm sm:text-lg font-medium text-gray-700 text-center px-2 flex-1">Won</span>
            <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0">{awayStats.won}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0">{homeStats.drawn}</span>
            <span className="text-sm sm:text-lg font-medium text-gray-700 text-center px-2 flex-1">Drawn</span>
            <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0">{awayStats.drawn}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0">{homeStats.lost}</span>
            <span className="text-sm sm:text-lg font-medium text-gray-700 text-center px-2 flex-1">Lost</span>
            <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0">{awayStats.lost}</span>
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
        ) : (
          <span className="text-xs text-orange-600 font-medium">Sample Data</span>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-6">
        {activeTab === 'form' ? (
          renderFormContent()
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Team logos and title */}
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center">
                {homeTeam.logo ? (
                  <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-xs sm:text-sm">{homeTeam.shortName?.charAt(0) || homeTeam.name.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              <div className="text-center px-2">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">{getStatCategoryTitle(activeTab)}</h2>
              </div>
              
              <div className="flex items-center">
                {awayTeam.logo ? (
                  <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-xs sm:text-sm">{awayTeam.shortName?.charAt(0) || awayTeam.name.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats comparison */}
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(currentStats).map(([statName, statData]) => {
                const isMatchesPlayed = statName === 'Matches Played';
                return (
                  <div key={statName} className="flex justify-between items-center">
                    <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0 flex-shrink-0 w-16 sm:w-auto text-left">
                      {formatValue(statData.homeValue, statData.unit, isMatchesPlayed)}
                    </span>
                    <div className="text-center px-2 sm:px-4 flex-1 min-w-0">
                      <span className="text-sm sm:text-lg font-medium text-gray-700 block leading-tight">{statName}</span>
                      {statData.leagueAverage && (
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                          Avg: {formatValue(statData.leagueAverage, statData.unit, isMatchesPlayed)}
                        </div>
                      )}
                    </div>
                    <span className="text-lg sm:text-2xl font-medium text-gray-900 min-w-0 flex-shrink-0 w-16 sm:w-auto text-right">
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