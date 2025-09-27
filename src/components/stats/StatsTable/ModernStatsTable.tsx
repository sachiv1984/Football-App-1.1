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

// Consistent spacing tokens
const SPACING = {
  // Container padding
  containerPadding: "p-4 sm:p-6",
  
  // Section spacing (between major sections)
  sectionSpacing: "space-y-6 sm:space-y-8",
  
  // Item spacing (between individual items/stats)
  itemSpacing: "space-y-4 sm:space-y-5",
  
  // Grid gaps
  gridGap: "gap-3 sm:gap-4",
  
  // Margins
  sectionMargin: "mb-6 sm:mb-8",
  itemMargin: "mb-4 sm:mb-5",
  
  // Tab padding
  tabPadding: "px-4 sm:px-6 py-3 sm:py-4",
  
  // Indicator padding
  indicatorPadding: "px-4 sm:px-6 py-3 sm:py-4"
};

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
        <div className={`${SPACING.containerPadding} text-center`}>
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
        <div className={`${SPACING.containerPadding} text-center`}>
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
        <div className={`${SPACING.containerPadding} text-center`}>
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
      <div className={SPACING.sectionSpacing}>
        {/* Team logos and title - Enhanced Grid Layout */}
        <div className={`grid grid-cols-3 ${SPACING.gridGap} items-center ${SPACING.sectionMargin}`}>
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2 sm:space-y-3">
              {homeTeam.logo ? (
                <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
              ) : (
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-xs sm:text-sm">{homeTeam.shortName?.charAt(0) || homeTeam.name.charAt(0)}</span>
                </div>
              )}
              <div className="text-center min-w-0">
                <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[80px] sm:max-w-[120px]">
                  {homeTeam.shortName || homeTeam.name}
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center px-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">Team Form</h2>
          </div>
          
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2 sm:space-y-3">
              {awayTeam.logo ? (
                <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
              ) : (
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-gray-600 font-semibold text-xs sm:text-sm">{awayTeam.shortName?.charAt(0) || awayTeam.name.charAt(0)}</span>
                </div>
              )}
              <div className="text-center min-w-0">
                <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[80px] sm:max-w-[120px]">
                  {awayTeam.shortName || awayTeam.name}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form display - Flexible Grid Layout for Form Badges */}
        <div className={`grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] ${SPACING.gridGap} items-center ${SPACING.sectionMargin}`}>
          {/* Home team form - centered with flexible width */}
          <div className="flex justify-center min-w-0">
            <div className="flex space-x-1 sm:space-x-2">
              {Array.from({ length: 5 - homeResults.length }).map((_, index) => (
                <div key={`empty-home-${index}`} className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-200 bg-gray-50 flex-shrink-0"></div>
              ))}
              {homeResults.map((result, index) => (
                <div key={`home-${index}`} className="flex-shrink-0">
                  <FormResult result={result} />
                </div>
              ))}
            </div>
          </div>

          {/* Center form label - auto width */}
          <div className="text-center px-3 sm:px-4">
            <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 whitespace-nowrap">Form</span>
          </div>

          {/* Away team form - centered with flexible width */}
          <div className="flex justify-center min-w-0">
            <div className="flex space-x-1 sm:space-x-2">
              {awayResults.map((result, index) => (
                <div key={`away-${index}`} className="flex-shrink-0">
                  <FormResult result={result} />
                </div>
              ))}
              {Array.from({ length: 5 - awayResults.length }).map((_, index) => (
                <div key={`empty-away-${index}`} className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-200 bg-gray-50 flex-shrink-0"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats comparison - Flexible Grid Layout */}
        <div className={SPACING.itemSpacing}>
          <div className={`grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_minmax(0,1fr)] ${SPACING.gridGap} items-center py-2`}>
            <div className="text-center min-w-0">
              <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">{homeStats.matchesPlayed}</span>
            </div>
            <div className="text-center px-1 min-w-0">
              <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 block leading-tight">Matches Played</span>
            </div>
            <div className="text-center min-w-0">
              <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">{awayStats.matchesPlayed}</span>
            </div>
          </div>

          <div className={`grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_minmax(0,1fr)] ${SPACING.gridGap} items-center py-2`}>
            <div className="text-center min-w-0">
              <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">{homeStats.won}</span>
            </div>
            <div className="text-center px-1 min-w-0">
              <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 block leading-tight">Won</span>
            </div>
            <div className="text-center min-w-0">
              <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">{awayStats.won}</span>
            </div>
          </div>

          <div className={`grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_minmax(0,1fr)] ${SPACING.gridGap} items-center py-2`}>
            <div className="text-center min-w-0">
              <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">{homeStats.drawn}</span>
            </div>
            <div className="text-center px-1 min-w-0">
              <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 block leading-tight">Drawn</span>
            </div>
            <div className="text-center min-w-0">
              <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">{awayStats.drawn}</span>
            </div>
          </div>

          <div className={`grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_minmax(0,1fr)] ${SPACING.gridGap} items-center py-2`}>
            <div className="text-center min-w-0">
              <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">{homeStats.lost}</span>
            </div>
            <div className="text-center px-1 min-w-0">
              <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 block leading-tight">Lost</span>
            </div>
            <div className="text-center min-w-0">
              <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">{awayStats.lost}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentStats = getStatsForCategory(activeTab);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header with navigation tabs - Responsive Layout */}
<div className="border-b border-gray-200 bg-gray-50">
        {/* Small mobile: Horizontal scroll (very small screens) */}
        <div className="flex overflow-x-auto scrollbar-hide w-full sm:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-2 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors min-w-[60px] ${
                activeTab === tab.key
                  ? 'text-purple-600 border-purple-600 bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Large mobile and up: Flex with equal distribution */}
        <div className="hidden sm:flex w-full">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-3 py-3 sm:px-4 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors text-center ${
                activeTab === tab.key
                  ? 'text-purple-600 border-purple-600 bg-white'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* League indicator */}
      <div className={`${SPACING.indicatorPadding} bg-gray-50 border-b border-gray-100 flex justify-between items-center`}>
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
      <div className={SPACING.containerPadding}>
        {activeTab === 'form' ? (
          renderFormContent()
        ) : (
          <div className={SPACING.sectionSpacing}>
            {/* Team logos and title - Enhanced Grid Layout */}
            <div className={`grid grid-cols-3 ${SPACING.gridGap} items-center ${SPACING.sectionMargin}`}>
              <div className="flex items-center justify-center">
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  {homeTeam.logo ? (
                    <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                  ) : (
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-xs sm:text-sm">{homeTeam.shortName?.charAt(0) || homeTeam.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="text-center min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[80px] sm:max-w-[120px]">
                      {homeTeam.shortName || homeTeam.name}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-center px-1">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">{getStatCategoryTitle(activeTab)}</h2>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="flex flex-col items-center space-y-2 sm:space-y-3">
                  {awayTeam.logo ? (
                    <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                  ) : (
                    <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 font-semibold text-xs sm:text-sm">{awayTeam.shortName?.charAt(0) || awayTeam.name.charAt(0)}</span>
                    </div>
                  )}
                  <div className="text-center min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[80px] sm:max-w-[120px]">
                      {awayTeam.shortName || awayTeam.name}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats comparison - Flexible Grid Layout */}
            <div className={SPACING.itemSpacing}>
              {Object.entries(currentStats).map(([statName, statData]) => {
                const isMatchesPlayed = statName === 'Matches Played';
                return (
                  <div key={statName} className={`grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_minmax(0,1fr)] ${SPACING.gridGap} items-center py-2`}>
                    <div className="text-center min-w-0">
                      <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
                        {formatValue(statData.homeValue, statData.unit, isMatchesPlayed)}
                      </span>
                    </div>
                    <div className="text-center px-1 min-w-0">
                      <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 block leading-tight break-words">
                        {statName}
                      </span>
                      {statData.leagueAverage && (
                        <div className="text-xs sm:text-sm text-gray-500 mt-1">
                          Avg: {formatValue(statData.leagueAverage, statData.unit, isMatchesPlayed)}
                        </div>
                      )}
                    </div>
                    <div className="text-center min-w-0">
                      <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
                        {formatValue(statData.awayValue, statData.unit, isMatchesPlayed)}
                      </span>
                    </div>
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