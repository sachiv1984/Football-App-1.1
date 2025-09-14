// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState } from 'react';
import { Team } from '../../../types';

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
  stats: Record<string, any>;
  league?: string;
  season?: string;
  className?: string;
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
  stats,
  league = "Premier League",
  season = "25/26",
  className = ""
}) => {
  const [activeTab, setActiveTab] = useState<StatCategory>('form');

  const tabs: { key: StatCategory; label: string }[] = [
    { key: 'form', label: 'Form' },
    { key: 'corners', label: 'Team Corners' },
    { key: 'cards', label: 'Team Cards' },
    { key: 'shooting', label: 'Team Shooting' },
    { key: 'fouls', label: 'Team Fouls' }
  ];

  const getStatsForCategory = (category: StatCategory): Record<string, StatValue> => {
    const getStat = (key: string, unit?: string): StatValue => {
      const stat = stats[key];
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
      return value.toString(); // Whole number for matches played
    }
    if (unit === '%') {
      return `${value}%`; // Percentage with % symbol
    }
    return value.toFixed(2); // 2 decimal places for other stats
  };

  const renderFormContent = () => {
    const recentForm = stats.recentForm as FormData | undefined;
    
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
        {/* Team logos and title - mobile responsive */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div className="flex items-center">
            {homeTeam.logo ? (
              <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
            ) : (
              <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-xs sm:text-sm">{homeTeam.shortName.charAt(0)}</span>
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
                <span className="text-gray-600 font-semibold text-xs sm:text-sm">{awayTeam.shortName.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Form display - mobile responsive with better spacing */}
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

        {/* Stats comparison - mobile responsive */}
        <div className="space-y-4 sm:space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">{homeStats.matchesPlayed}</span>
            <span className="text-sm sm:text-lg font-medium text-gray-700 text-center px-2 flex-1">Matches Played</span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">{awayStats.matchesPlayed}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">{homeStats.won}</span>
            <span className="text-sm sm:text-lg font-medium text-gray-700 text-center px-2 flex-1">Won</span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">{awayStats.won}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">{homeStats.drawn}</span>
            <span className="text-sm sm:text-lg font-medium text-gray-700 text-center px-2 flex-1">Drawn</span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">{awayStats.drawn}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">{homeStats.lost}</span>
            <span className="text-sm sm:text-lg font-medium text-gray-700 text-center px-2 flex-1">Lost</span>
            <span className="text-xl sm:text-2xl font-bold text-gray-900 min-w-0">{awayStats.lost}</span>
          </div>
        </div>
      </div>
    );
  };

  const currentStats = getStatsForCategory(activeTab);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header with navigation tabs - improved mobile scrolling */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
              activeTab === tab.key
                ? 'text-purple-600 border-purple-600 bg-white'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* League indicator - mobile responsive */}
      <div className="px-3 sm:px-6 py-2 sm:py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs sm:text-sm text-gray-600">
          Showing stats for {league} {season}
        </p>
      </div>

      {/* Content - improved mobile padding */}
      <div className="p-3 sm:p-6">
        {activeTab === 'form' ? (
          renderFormContent()
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Team logos and title - responsive */}
            <div className="flex items-center justify-between mb-6 sm:mb-8">
              <div className="flex items-center">
                {homeTeam.logo ? (
                  <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-xs sm:text-sm">{homeTeam.shortName.charAt(0)}</span>
                  </div>
                )}
              </div>
              
              <div className="text-center px-2">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 capitalize">{activeTab}</h2>
              </div>
              
              <div className="flex items-center">
                {awayTeam.logo ? (
                  <img src={awayTeam.logo} alt={awayTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-xs sm:text-sm">{awayTeam.shortName.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats comparison - improved mobile layout with proper formatting */}
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