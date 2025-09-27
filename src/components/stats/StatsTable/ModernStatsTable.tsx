// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState } from 'react';
import { Team } from '../../../types';
import { useTeamStats } from '../../../hooks/useTeamStats';

// --- Type Definitions (Unchanged) ---
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

type StatCategory = 'form' | 'goals' | 'corners' | 'cards' | 'shooting' | 'fouls';

// Consistent spacing tokens (Unchanged)
const SPACING = {
  containerPadding: "p-0", 
  sectionSpacing: "space-y-6 sm:space-y-8",
  itemSpacing: "space-y-4 sm:space-y-5",
  gridGap: "gap-3 sm:gap-4",
  contentPaddingClass: "p-4 sm:p-6" 
};

// --- SHARED UTILITY FUNCTION (Unchanged) ---
const formatValue = (value: number, unit?: string, isMatchesPlayed?: boolean): string => {
  if (isMatchesPlayed) {
    return value.toString();
  }
  if (unit === '%') {
    return `${value}%`;
  }
  return value.toFixed(2);
};


// --- STAT CONFIGURATION MAP (Unchanged) ---
const STAT_CONFIGS: Record<Exclude<StatCategory, 'form'>, Record<string, { key: string; unit?: string }>> = {
  // ... (Configuration remains the same)
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


// --- FormResult Component (Unchanged) ---
const FormResult: React.FC<{ result: 'W' | 'D' | 'L', isLatest?: boolean }> = ({ result, isLatest }) => {
  
  const getResultStyle = (result: 'W' | 'D' | 'L', isLatest: boolean) => {
    // ... (Styling logic remains the same)
    let baseClasses = '';
    switch (result) {
      case 'W':
        baseClasses = 'bg-green-100 text-green-700 border-green-200';
        break;
      case 'D':
        baseClasses = 'bg-gray-100 text-gray-700 border-gray-200';
        break;
      case 'L':
        baseClasses = 'bg-red-100 text-red-700 border-red-200';
        break;
    }
    
    // Highlight latest result with thick border
    if (isLatest) {
      let latestBorderClasses = '';
      switch (result) {
        case 'W':
          latestBorderClasses = 'border-green-800 shadow-md'; 
          break;
        case 'D':
          latestBorderClasses = 'border-gray-800 shadow-md';
          break;
        case 'L':
          latestBorderClasses = 'border-red-800 shadow-md';
          break;
      }
      return `${baseClasses.replace(/border-(green|gray|red)-200/, '')} border-2 sm:border-4 ${latestBorderClasses}`;
    } else {
      return baseClasses;
    }
  };

  return (
    <div 
      className={`
        w-6 h-6 sm:w-8 sm:h-8 rounded border flex items-center justify-center 
        text-xs sm:text-sm font-semibold 
        ${getResultStyle(result, isLatest || false)}
      `}
    >
      {result}
    </div>
  );
};

// --- StatRow Component (Unchanged) ---
interface StatRowProps {
  label: string;
  homeValue: number | string;
  awayValue: number | string;
  leagueAverage?: number;
  unit?: string;
  isMatchesPlayed?: boolean;
}

const StatRow: React.FC<StatRowProps> = ({ 
  label, 
  homeValue, 
  awayValue, 
  leagueAverage, 
  unit, 
  isMatchesPlayed
}) => {
    const formatDisplayValue = (value: number | string) => {
        return typeof value === 'number' ? formatValue(value, unit, isMatchesPlayed) : value;
    };
    
    // NOTE: This grid definition is what we are mirroring for the Form display
    return (
        <div className={`grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_minmax(0,1fr)] ${SPACING.gridGap} items-center py-2`}>
            {/* Home Value (text-right) */}
            <div className="text-right min-w-0"> 
                <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
                    {formatDisplayValue(homeValue)}
                </span>
            </div>
            {/* Center Label (text-center, uses minmax(120px,2fr) width) */}
            <div className="text-center px-1 min-w-0">
                <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 block leading-tight break-words">
                    {label}
                </span>
                {leagueAverage !== undefined && (
                    <div className="text-xs sm:text-sm text-gray-500 mt-0.5">
                        Avg: {formatValue(leagueAverage, unit, isMatchesPlayed)}
                    </div>
                )}
            </div>
            {/* Away Value (text-left) */}
            <div className="text-left min-w-0"> 
                <span className="text-lg sm:text-xl lg:text-2xl font-medium text-gray-900">
                    {formatDisplayValue(awayValue)}
                </span>
            </div>
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

  // ... (useTeamStats hook and helpers remain the same)
  const { 
    stats: fetchedStats, 
    loading, 
    error, 
    refetch 
  } = useTeamStats(
    autoLoad ? homeTeam.name : undefined, 
    autoLoad ? awayTeam.name : undefined
  );

  const effectiveStats = propStats || fetchedStats;
  
  // Tabs definition
  const tabs: { key: StatCategory; label: string }[] = [
    { key: 'form', label: 'Form' },
    { key: 'goals', label: 'Goals' },
    { key: 'corners', label: 'Corners' },
    { key: 'cards', label: 'Cards' },
    { key: 'shooting', label: 'Shooting' },
    { key: 'fouls', label: 'Fouls' }
  ];

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

  const getStatsForCategory = (category: StatCategory): Record<string, StatValue> => {
    // FIX TS18047: Explicit null check
    if (!effectiveStats) {
        return {}; 
    }
    
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

  // --- RENDERING SUB-COMPONENTS ---
  
  // Component for Team Logos, Names, and Stat Title
  const renderTeamHeader = () => (
      {/* 🟢 CHANGE 1: Switched from items-end to items-center for better vertical alignment */}
      <div className={`grid grid-cols-3 ${SPACING.gridGap} items-center`}>
          {/* Home Team */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2 sm:space-y-3">
              {homeTeam.logo ? (
                <img src={homeTeam.logo} alt={`Logo for ${homeTeam.name}`} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
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
          
          {/* Center Title */}
          <div className="text-center px-1">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
              {getStatCategoryTitle(activeTab)}
            </h2>
          </div>
          
          {/* Away Team */}
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2 sm:space-y-3">
              {awayTeam.logo ? (
                <img src={awayTeam.logo} alt={`Logo for ${awayTeam.name}`} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
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
  );

  // --- RENDER FORM CONTENT ---
  const renderFormContent = () => {
    // FIX TS18047: Explicit null check for TypeScript safety
    if (!effectiveStats) {
      return (
        <div className="text-center py-8">
            <p className="text-gray-600">Statistics are unavailable.</p>
        </div>
      );
    }

    const recentForm = effectiveStats.recentForm as FormData | undefined;
    
    if (!recentForm) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No form data available</p>
        </div>
      );
    }

    const { homeResults, awayResults, homeStats, awayStats } = recentForm;
    const formStats = [
      { label: 'Matches Played', home: homeStats.matchesPlayed, away: awayStats.matchesPlayed, isMatchesPlayed: true },
      { label: 'Won', home: homeStats.won, away: awayStats.won },
      { label: 'Drawn', home: homeStats.drawn, away: awayStats.drawn },
      { label: 'Lost', home: homeStats.lost, away: awayStats.lost },
    ];

    return (
      <div className={SPACING.sectionSpacing}>
        
        {/* 🟢 CHANGE 2: Form display uses the SAME GRID as StatRow for perfect label alignment */}
        <div className={`grid grid-cols-[minmax(0,1fr)_minmax(120px,2fr)_minmax(0,1fr)] ${SPACING.gridGap} items-center`}>
          {/* Home team form (Aligned Right) */}
          <div className="flex justify-end min-w-0">
            <div className="flex space-x-1 sm:space-x-2">
              {Array.from({ length: 5 - homeResults.length }).map((_, index) => (
                <div key={`empty-home-${index}`} className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-200 bg-gray-50 flex-shrink-0"></div>
              ))}
              {homeResults.map((result, index) => (
                <div key={`home-${index}`} className="flex-shrink-0">
                  <FormResult 
                    result={result} 
                    isLatest={index === homeResults.length - 1}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Center form label (Aligned with StatRow labels) */}
          <div className="text-center px-1 min-w-0">
            <span className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 whitespace-nowrap">Form</span>
          </div>

          {/* Away team form (Aligned Left) */}
          <div className="flex justify-start min-w-0">
            <div className="flex space-x-1 sm:space-x-2">
              {awayResults.slice().reverse().map((result, index) => (
                <div key={`away-${index}`} className="flex-shrink-0">
                  <FormResult 
                    result={result} 
                    isLatest={index === 0}
                  />
                </div>
              ))}
              {Array.from({ length: 5 - awayResults.length }).map((_, index) => (
                <div key={`empty-away-${index}`} className="w-6 h-6 sm:w-8 sm:h-8 rounded border border-gray-200 bg-gray-50 flex-shrink-0"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats comparison - USES StatRow COMPONENT */}
        <div className={SPACING.itemSpacing}>
          {formStats.map(stat => (
            <StatRow
              key={stat.label}
              label={stat.label}
              homeValue={stat.home}
              awayValue={stat.away}
              isMatchesPlayed={stat.isMatchesPlayed}
            />
          ))}
        </div>
      </div>
    );
  };
  // --- END: RENDER FORM CONTENT ---


  // --- LOADING/ERROR STATES (Unchanged) ---
  if (showLoadingState && autoLoad && loading && !propStats) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
        <div className={`${SPACING.contentPaddingClass} text-center`}>
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
        <div className={`${SPACING.contentPaddingClass} text-center`}>
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

  if (!effectiveStats) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
        <div className={`${SPACING.contentPaddingClass} text-center`}>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-gray-600 font-medium mb-2">📊 No Statistics Available</div>
            <p className="text-gray-700 text-sm">No statistics data is currently available for these teams.</p>
          </div>
        </div>
      </div>
    );
  }
  // --- END: LOADING/ERROR STATES ---


  // --- MAIN RENDER ---
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      
      {/* HEADER BLOCK */}
      <div className="w-full">
  
        {/* Navigation tabs (Unchanged) */}
        <div className="bg-gray-50 border-b border-gray-200 w-full flex">
          
          {/* Mobile Tabs */}
          <div className="flex w-full sm:hidden"> 
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-1 py-3 text-xs font-medium text-center border-b-2 transition-colors min-w-0 ${
                  activeTab === tab.key
                    ? 'text-purple-600 border-purple-600 bg-white'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="block truncate">{tab.label}</span>
              </button>
            ))}
          </div>
          
          {/* Desktop Tabs */}
          <div className="hidden sm:flex w-full">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-1 py-3 sm:px-2 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors text-center min-w-0 ${
                  activeTab === tab.key
                    ? 'text-purple-600 border-purple-600 bg-white'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-border-gray-300'
                }`}
              >
                <span className="block truncate">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      
        {/* League indicator (Unchanged) */}
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

      {/* Content Area: Uses SPACING.contentPaddingClass for consistent padding */}
      <div className={SPACING.contentPaddingClass}>
        
        {/* Standardized margin below header */}
        <div className="mb-6 sm:mb-8">
            {renderTeamHeader()}
        </div>

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
