// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState } from 'react';
import { Team } from '../../../types';
import { useTeamStats } from '../../../hooks/useTeamStats';

// --- Type Definitions ---
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

// --- Consistent spacing tokens ---
const SPACING = {
  containerPadding: "p-0", 
  sectionSpacing: "space-y-6 sm:space-y-8",
  itemSpacing: "space-y-4 sm:space-y-5",
  gridGap: "gap-3 sm:gap-4",
  contentPaddingClass: "p-4 sm:p-6" 
};

// --- Shared utility ---
/**
 * Simplified formatting logic to determine rounding based on stat type.
 * Forces integers for Matches Played, Form stats (W/D/L count), and Percentages.
 */
const formatValue = (
  value: number, 
  unit?: string, 
  isMatchesPlayed?: boolean, 
  isFormStat?: boolean
): string => {
  // Integers are required for matches played, form stats, and all percentages.
  const requiresInteger = isMatchesPlayed || isFormStat || unit === '%';
  
  if (requiresInteger) {
    // If the unit is %, append the symbol after rounding.
    return unit === '%' ? `${Math.round(value)}%` : Math.round(value).toString();
  }
  
  // Default for all averages (Goals For, Shots on Target, Fouls Committed)
  return value.toFixed(2);
};

// --- MOVED OUTSIDE COMPONENT - Now accessible to renderTeamHeader ---
const getStatCategoryTitle = (category: StatCategory): string => {
  switch (category) {
    case 'form': return 'Team Form';
    case 'goals': return 'Team Goals';
    case 'corners': return 'Team Corners';
    case 'cards': return 'Team Cards';
    case 'shooting': return 'Team Shooting';
    case 'fouls': return 'Team Fouls';
    default: return 'Team Stats';
  }
};

// --- STAT CONFIGURATION MAP ---
const STAT_CONFIGS: Record<Exclude<StatCategory, 'form'>, Record<string, { key: string; unit?: string }>> = {
  goals: {
    'Matches Played': { key: 'goalsMatchesPlayed' },
    'Goals For': { key: 'goalsFor' },
    'Goals Against': { key: 'goalsAgainst' },
    'Total Goals': { key: 'totalGoals' },
    'Over 1.5 Match Goals': { key: 'over15MatchGoals', unit: '%' },
    'Over 2.5 Match Goals': { key: 'over25MatchGoals', unit: '%' },
    'Over 3.5 Match Goals': { key: 'over35MatchGoals', unit: '%' },
    'Both Teams to Score': { key: 'bothTeamsToScore', unit: '%' },
  },
  corners: {
    'Matches Played': { key: 'cornersMatchesPlayed' },
    'Corners Taken': { key: 'cornersTaken' },
    'Corners Against': { key: 'cornersAgainst' },
    'Total Corners': { key: 'totalCorners' },
    'Over 7.5 Match Corners': { key: 'over75MatchCorners', unit: '%' },
    'Over 8.5 Match Corners': { key: 'over85MatchCorners', unit: '%' },
    'Over 9.5 Match Corners': { key: 'over95MatchCorners', unit: '%' },
    'Over 10.5 Match Corners': { key: 'over105MatchCorners', unit: '%' },
    'Over 11.5 Match Corners': { key: 'over115MatchCorners', unit: '%' },
  },
  cards: {
    'Matches Played': { key: 'cardsMatchesPlayed' },
    'Cards Shown': { key: 'cardsShown' },
    'Cards Against': { key: 'cardsAgainst' },
    'Total Cards': { key: 'totalCards' },
    'Over 0.5 Team Cards': { key: 'over05TeamCards', unit: '%' },
    'Over 1.5 Team Cards': { key: 'over15TeamCards', unit: '%' },
    'Over 2.5 Team Cards': { key: 'over25TeamCards', unit: '%' },
    'Over 3.5 Team Cards': { key: 'over35TeamCards', unit: '%' },
  },
  shooting: {
    'Matches Played': { key: 'shootingMatchesPlayed' },
    'Shots': { key: 'shots' },
    'Shots Against': { key: 'shotsAgainst' },
    'Shots on Target': { key: 'shotsOnTarget' },
    'Shots on Target Against': { key: 'shotsOnTargetAgainst' },
    'Over 2.5 Team Shots on Target': { key: 'over25TeamShotsOnTarget', unit: '%' },
    'Over 3.5 Team Shots on Target': { key: 'over35TeamShotsOnTarget', unit: '%' },
    'Over 4.5 Team Shots on Target': { key: 'over45TeamShotsOnTarget', unit: '%' },
    'Over 5.5 Team Shots on Target': { key: 'over55TeamShotsOnTarget', unit: '%' },
  },
  fouls: {
    'Matches Played': { key: 'foulsMatchesPlayed' },
    'Fouls Committed': { key: 'foulsCommitted' },
    'Fouls Won': { key: 'foulsWon' },
    'Total Fouls': { key: 'totalFouls' },
    'Over 8.5 Team Fouls Committed': { key: 'over85TeamFoulsCommitted', unit: '%' },
    'Over 9.5 Team Fouls Committed': { key: 'over95TeamFoulsCommitted', unit: '%' },
    'Over 10.5 Team Fouls Committed': { key: 'over105TeamFoulsCommitted', unit: '%' },
    'Over 11.5 Team Fouls Committed': { key: 'over115TeamFoulsCommitted', unit: '%' },
  }
};

// --- Enhanced FormResult Component ---
const FormResult: React.FC<{ result: 'W' | 'D' | 'L', isLatest?: boolean, position?: number, totalResults?: number }> = ({ 
  result, 
  isLatest, 
  position = 0, 
  totalResults = 5 
}) => {
  
  const getResultStyle = (result: 'W' | 'D' | 'L', isLatest: boolean, position: number, totalResults: number) => {
    let baseClasses = '';
    switch (result) {
      case 'W':
        baseClasses = 'bg-gradient-to-br from-green-100 to-green-200 text-green-800 border-green-400';
        break;
      case 'D':
        baseClasses = 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-800 border-gray-400';
        break;
      case 'L':
        baseClasses = 'bg-gradient-to-br from-red-100 to-red-200 text-red-800 border-red-400';
        break;
    }
    
    // Latest result gets enhanced styling
    if (isLatest) {
      let latestEnhancement = '';
      switch (result) {
        case 'W':
          latestEnhancement = 'border-green-600 shadow-md transform scale-105'; 
          break;
        case 'D':
          latestEnhancement = 'border-gray-600 shadow-md transform scale-105';
          break;
        case 'L':
          latestEnhancement = 'border-red-600 shadow-md transform scale-105';
          break;
      }
      return `${baseClasses} border-4 ${latestEnhancement}`;
    }
    
    return `${baseClasses} border-2`;
  };

  return (
    <div 
      className={`
        w-6 h-6 sm:w-8 sm:h-8 rounded border flex items-center justify-center 
        text-xs sm:text-sm font-semibold transition-all duration-200
        hover:scale-110
        ${getResultStyle(result, isLatest || false, position, totalResults)}
      `}
      style={{ opacity: 0.6 + (position / (totalResults - 1)) * 0.4 }}
    >
      {result}
    </div>
  );
};

// --- StatRow Component ---
interface StatRowProps {
  label: string;
  homeValue: number | string;
  awayValue: number | string;
  leagueAverage?: number;
  unit?: string;
  isMatchesPlayed?: boolean;
  statType?: StatCategory;
}

const StatRow: React.FC<StatRowProps> = ({ 
  label, 
  homeValue, 
  awayValue, 
  leagueAverage, 
  unit, 
  isMatchesPlayed,
  statType = 'form'
}) => {
  const getPerformanceCategory = (value: number | string, statType: string, label: string) => {
    if (typeof value !== 'number' || isMatchesPlayed) return 'neutral';
    const isPositiveStat = 
      (statType === 'goals' && (label.includes('Goals For') || label.includes('Total Goals'))) ||
      (statType === 'corners' && label.includes('Corners Taken')) ||
      (statType === 'shooting' && label.includes('Shots on Target')) ||
      (statType === 'form' && label === 'Won') ||
      (label.includes('Over') && unit === '%');

    const isNegativeStat = 
      (statType === 'goals' && label.includes('Goals Against')) ||
      (statType === 'cards' && (label.includes('Cards Shown') || label.includes('Cards Against'))) ||
      (statType === 'fouls' && label.includes('Fouls Committed')) ||
      (statType === 'form' && label === 'Lost');

    if (leagueAverage !== undefined) {
      const difference = ((value - leagueAverage) / leagueAverage) * 100;
      const threshold = 15;
      if (isPositiveStat && difference > threshold) return 'excellent';
      if (isPositiveStat && difference < -threshold) return 'poor';
      if (isNegativeStat && difference > threshold) return 'poor';
      if (isNegativeStat && difference < -threshold) return 'excellent';
    }
    return 'neutral';
  };

  const getValueStyling = (value: number | string, statType: string, label: string) => {
    const category = getPerformanceCategory(value, statType, label);
    const baseClasses = "text-lg sm:text-xl lg:text-2xl font-medium transition-colors duration-200";
    switch (category) {
      case 'excellent': return `${baseClasses} text-green-600`;
      case 'poor': return `${baseClasses} text-red-600`;
      default: return `${baseClasses} text-gray-900`;
    }
  };

  const formatDisplayValue = (value: number | string) =>
    typeof value === 'number' 
      ? formatValue(value, unit, isMatchesPlayed, statType === 'form' && !isMatchesPlayed)
      : value;

  return (
    <div className={`grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_minmax(0,1fr)] ${SPACING.gridGap} items-center py-2 group hover:bg-gray-50 rounded-lg transition-all duration-150 px-2 hover:translate-x-1`}>
      <div className="text-right min-w-0">
        <span className={getValueStyling(homeValue, statType, label)}>
          {formatDisplayValue(homeValue)}
        </span>
      </div>
      <div className="text-center px-1 min-w-0">
        <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 block leading-tight break-words">{label}</span>
        {leagueAverage !== undefined && (
          <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
            Avg: {formatDisplayValue(leagueAverage)}
          </div>
        )}
      </div>
      <div className="text-left min-w-0">
        <span className={getValueStyling(awayValue, statType, label)}>
          {formatDisplayValue(awayValue)}
        </span>
      </div>
    </div>
  );
};

// --- Enhanced Team Logo Component ---
const StatsTeamLogo: React.FC<{ team: Team, size?: 'sm' | 'md' }> = ({ team, size = 'sm' }) => {
  const sizeClasses = {
    sm: "w-8 h-8 sm:w-12 sm:h-12",
    md: "w-12 h-12 sm:w-16 sm:h-16"
  };

  if (team.logo) {
    return (
      <img 
        src={team.logo} 
        alt={team.name} 
        className={`${sizeClasses[size]} object-contain`} 
      />
    );
  }

  return (
    <div className={`
      ${sizeClasses[size]} rounded-full 
      bg-gradient-to-br from-blue-500 to-blue-700 
      text-white font-semibold shadow-sm
      border-2 border-white border-opacity-60
      flex items-center justify-center
    `}>
      <span className="text-xs sm:text-sm">
        {team.shortName?.substring(0, 2) || team.name.substring(0, 2)}
      </span>
    </div>
  );
};

// --- Team Header - Now can access getStatCategoryTitle ---
const renderTeamHeader = (homeTeam: Team, awayTeam: Team, activeTab: StatCategory) => (
  // ✅ CHANGE 1: Added border-b and pb-4 to cleanly separate the header from the stats below.
  <div className={`grid grid-cols-3 ${SPACING.gridGap} items-center border-b border-gray-100 pb-4 mb-4`}>
    {/* Home Team */}
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center space-y-2 sm:space-y-3">
        <StatsTeamLogo team={homeTeam} size="sm" />
        <div className="text-center min-w-0">
          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[80px] sm:max-w-[120px]">
            {homeTeam.shortName || homeTeam.name}
          </div>
        </div>
      </div>
    </div>

    {/* Center Title - Now uses dynamic title */}
    <div className="text-center px-1">
      <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
        {getStatCategoryTitle(activeTab)}
      </h2>
    </div>

    {/* Away Team */}
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center space-y-2 sm:space-y-3">
        <StatsTeamLogo team={awayTeam} size="sm" />
        <div className="text-center min-w-0">
          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate max-w-[80px] sm:max-w-[120px]">
            {awayTeam.shortName || awayTeam.name}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// --- ModernStatsTable Component ---
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

  const { stats: fetchedStats, loading, error } = useTeamStats(
    autoLoad ? homeTeam.name : undefined, 
    autoLoad ? awayTeam.name : undefined
  );

  const effectiveStats = propStats || fetchedStats;

  const tabs: { key: StatCategory; label: string }[] = [
    { key: 'form', label: 'Form' },
    { key: 'goals', label: 'Goals' },
    { key: 'corners', label: 'Corners' },
    { key: 'cards', label: 'Cards' },
    { key: 'shooting', label: 'Shooting' },
    { key: 'fouls', label: 'Fouls' }
  ];

  const getStatsForCategory = (category: StatCategory): Record<string, StatValue> => {
    if (!effectiveStats) return {};
    const getStat = (key: string, unit?: string): StatValue => {
      const stat = (effectiveStats as any)[key];
      if (stat && typeof stat === 'object' && 'homeValue' in stat && 'awayValue' in stat) {
        return { ...stat, unit } as StatValue;
      }
      return { homeValue: 0, awayValue: 0, unit };
    };
    if (category === 'form') return {};
    const categoryMap = STAT_CONFIGS[category as Exclude<StatCategory, 'form'>];
    if (!categoryMap) return {};
    return Object.entries(categoryMap).reduce((acc, [label, { key, unit }]) => {
      acc[label] = getStat(key, unit);
      return acc;
    }, {} as Record<string, StatValue>);
  };

  const currentStats = getStatsForCategory(activeTab);

  // --- Render Form Content ---
  const renderFormContent = () => {
    if (!effectiveStats)
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">Statistics are unavailable.</p>
        </div>
      );

    const recentForm = effectiveStats.recentForm as FormData | undefined;
    if (!recentForm)
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No form data available</p>
        </div>
      );

    const { homeResults, awayResults, homeStats, awayStats } = recentForm;

    const formStatMap = [
      { key: 'matchesPlayed', label: 'Matches Played', isMatchesPlayed: true },
      { key: 'won', label: 'Won', isMatchesPlayed: false }, 
      { key: 'drawn', label: 'Drawn', isMatchesPlayed: false }, 
      { key: 'lost', label: 'Lost', isMatchesPlayed: false }, 
    ] as const;

    const formStats = formStatMap.map(item => ({
      label: item.label,
      home: homeStats[item.key as keyof typeof homeStats], 
      away: awayStats[item.key as keyof typeof awayStats], 
      isMatchesPlayed: item.isMatchesPlayed,
    }));

    // ✅ CHANGE 2: Removed SPACING.sectionSpacing from the top div, 
    // and applied smaller spacing directly inside.
    return (
      <div className="space-y-4 sm:space-y-6"> 
        
        {/* Form Row */}
        <div className={`grid grid-cols-[1fr_auto_1fr] ${SPACING.gridGap} items-center`}>
          {/* Home Team Form */}
          <div className="flex justify-end min-w-0">
            <div className="flex space-x-1 sm:space-x-2 flex-nowrap">
              {Array.from({ length: 5 - homeResults.length }).map((_, index) => (
                <div key={`empty-home-${index}`} className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-200 bg-gray-50 flex-shrink-0"></div>
              ))}
              {homeResults.map((result, index) => (
                <div key={`home-${index}`} className="flex-shrink-0">
                  <FormResult 
                    result={result} 
                    isLatest={index === homeResults.length - 1}
                    position={index}
                    totalResults={homeResults.length}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Center Label */}
          <div className="text-center text-sm sm:text-base font-medium text-gray-700">Form</div>

          {/* Away Team Form */}
          <div className="flex justify-start min-w-0">
            <div className="flex space-x-1 sm:space-x-2 flex-nowrap">
              {awayResults.slice().reverse().map((result, index) => (
                <div key={`away-${index}`} className="flex-shrink-0">
                  <FormResult 
                    result={result} 
                    isLatest={index === 0}
                    position={awayResults.length - 1 - index}
                    totalResults={awayResults.length}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Rows (uses itemSpacing from the general section) */}
        <div className={SPACING.itemSpacing}>
          {formStats.map((row) => (
            <StatRow
              key={row.label}
              label={row.label}
              homeValue={row.home}
              awayValue={row.away}
              isMatchesPlayed={row.isMatchesPlayed}
              statType="form"
            />
          ))}
        </div>
      </div>
    );
  };

  // --- Loading/Error States ---
  if (showLoadingState && autoLoad && loading && !propStats) {
    return (
      <div className="text-center py-12 text-gray-500">Loading statistics...</div>
    );
  }

  if (showLoadingState && autoLoad && error && !propStats) {
    return (
      <div className="text-center py-12 text-red-500">Failed to load statistics.</div>
    );
  }

  if (!effectiveStats) {
    return (
      <div className="text-center py-12 text-gray-500">No statistics available.</div>
    );
  }

  // --- Main Render ---
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* HEADER BLOCK */}
      <div className="w-full">
        {/* Tabs */}
        <div className="bg-gray-50 border-b border-gray-200 w-full flex">
          {/* Mobile Tabs */}
          <div className="flex w-full sm:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex-1 px-1 py-3 text-xs font-medium text-center border-b-2
                  transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) min-w-0 relative
                  ${activeTab === tab.key
                    ? 'text-purple-800 border-purple-600 bg-white shadow-sm transform -translate-y-0.5 z-10'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {activeTab === tab.key && (
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-50 to-transparent opacity-60 rounded-t-md pointer-events-none" />
                )}
                <span className="block truncate relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Desktop Tabs */}
          <div className="hidden sm:flex w-full">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  flex-1 px-2 py-4 text-sm font-medium border-b-2 
                  transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) text-center min-w-0 relative
                  ${activeTab === tab.key
                    ? 'text-purple-800 border-purple-600 bg-white shadow-sm transform -translate-y-0.5 z-10'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                {activeTab === tab.key && (
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-50 to-transparent opacity-60 rounded-t-md pointer-events-none" />
                )}
                <span className="block truncate relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* League Indicator */}
        <div className={`${SPACING.contentPaddingClass} bg-gray-50 border-b border-gray-100 flex justify-between items-center`}>
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
      </div>

      {/* Content */}
      <div className={SPACING.contentPaddingClass}>
        <div className="mb-0">{renderTeamHeader(homeTeam, awayTeam, activeTab)}</div>
        {activeTab === 'form' ? (
          renderFormContent()
        ) : (
          <div className={SPACING.itemSpacing}>
            {Object.entries(currentStats).map(([statName, statData]) => {
              const isMatchesPlayed = statName === 'Matches Played';
              const typedStatData = statData as StatValue;
              return (
                <StatRow
                  key={statName}
                  label={statName}
                  homeValue={typedStatData.homeValue}
                  awayValue={typedStatData.awayValue}
                  leagueAverage={typedStatData.leagueAverage}
                  unit={typedStatData.unit}
                  isMatchesPlayed={isMatchesPlayed}
                  statType={activeTab}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernStatsTable;
