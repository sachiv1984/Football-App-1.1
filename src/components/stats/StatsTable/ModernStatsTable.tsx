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
    <div className={`w-8 h-8 rounded border flex items-center justify-center text-sm font-semibold ${getResultStyle(result)}`}>
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
    { key: 'goals', label: 'Goals' },
    { key: 'corners', label: 'Corners' },
    { key: 'cards', label: 'Cards' },
    { key: 'shooting', label: 'Shooting' },
    { key: 'fouls', label: 'Fouls' }
  ];

  const getStatsForCategory = (category: StatCategory): Record<string, StatValue> => {
    const getStat = (key: string): StatValue => {
      const stat = stats[key];
      if (stat && typeof stat === 'object' && 'homeValue' in stat && 'awayValue' in stat) {
        return stat as StatValue;
      }
      return { homeValue: 0, awayValue: 0 };
    };

    switch (category) {
      case 'goals':
        return {
          'Matches Played': getStat('matchesPlayed'),
          'Goals For': getStat('goalsFor'),
          'Goals Against': getStat('goalsAgainst'),
          'Total Goals': getStat('totalGoals'),
          'Over 1.5 Goals': getStat('over15Goals'),
          'Over 2.5 Goals': getStat('over25Goals'),
          'Over 3.5 Goals': getStat('over35Goals'),
          'Both Teams Score': getStat('bothTeamsScore'),
        };
      case 'corners':
        return {
          'Corners Won': getStat('corners'),
          'Corners Conceded': getStat('cornersAgainst'),
        };
      case 'cards':
        return {
          'Yellow Cards': getStat('yellowCards'),
          'Red Cards': getStat('redCards'),
        };
      case 'shooting':
        return {
          'Shots on Target': getStat('shotsOnTarget'),
          'Total Shots': getStat('totalShots'),
          'Shot Accuracy': getStat('shotAccuracy'),
        };
      case 'fouls':
        return {
          'Fouls Committed': getStat('fouls'),
          'Fouls Won': getStat('foulsWon'),
        };
      default:
        return {};
    }
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
      <div className="space-y-8">
        {/* Team logos and title - consistent with TeamForm styling */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            {homeTeam.logo ? (
              <img src={homeTeam.logo} alt={homeTeam.name} className="w-12 h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">{homeTeam.shortName.charAt(0)}</span>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Team Form</h2>
          </div>
          
          <div className="flex items-center">
            {awayTeam.logo ? (
              <img src={awayTeam.logo} alt={awayTeam.name} className="w-12 h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">{awayTeam.shortName.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Form display - consistent with TeamForm styling */}
        <div className="flex justify-between items-center mb-8">
          {/* Home team form */}
          <div className="flex space-x-2">
            {Array.from({ length: 5 - homeResults.length }).map((_, index) => (
              <div key={`empty-home-${index}`} className="w-8 h-8 rounded border border-gray-200 bg-gray-50"></div>
            ))}
            {homeResults.map((result, index) => (
              <FormResult key={`home-${index}`} result={result} />
            ))}
          </div>

          {/* Center form label */}
          <div className="text-center">
            <span className="text-lg font-semibold text-gray-700">Form</span>
          </div>

          {/* Away team form */}
          <div className="flex space-x-2">
            {awayResults.map((result, index) => (
              <FormResult key={`away-${index}`} result={result} />
            ))}
            {Array.from({ length: 5 - awayResults.length }).map((_, index) => (
              <div key={`empty-away-${index}`} className="w-8 h-8 rounded border border-gray-200 bg-gray-50"></div>
            ))}
          </div>
        </div>

        {/* Stats comparison - consistent with TeamForm styling */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900">{homeStats.matchesPlayed}</span>
            <span className="text-lg font-medium text-gray-700">Matches Played</span>
            <span className="text-2xl font-bold text-gray-900">{awayStats.matchesPlayed}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900">{homeStats.won}</span>
            <span className="text-lg font-medium text-gray-700">Won</span>
            <span className="text-2xl font-bold text-gray-900">{awayStats.won}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900">{homeStats.drawn}</span>
            <span className="text-lg font-medium text-gray-700">Drawn</span>
            <span className="text-2xl font-bold text-gray-900">{awayStats.drawn}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900">{homeStats.lost}</span>
            <span className="text-lg font-medium text-gray-700">Lost</span>
            <span className="text-2xl font-bold text-gray-900">{awayStats.lost}</span>
          </div>
        </div>
      </div>
    );
  };

  const currentStats = getStatsForCategory(activeTab);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Header with navigation tabs */}
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

      {/* Content */}
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

            {/* Stats comparison - responsive layout */}
            <div className="space-y-4 sm:space-y-6">
              {Object.entries(currentStats).map(([statName, statData]) => (
                <div key={statName} className="flex justify-between items-center">
                  <span className="text-lg sm:text-2xl font-bold text-gray-900 min-w-0 flex-shrink">
                    {statData.homeValue}{statData.unit || ''}
                  </span>
                  <div className="text-center px-2 flex-1 min-w-0">
                    <span className="text-sm sm:text-lg font-medium text-gray-700 block">{statName}</span>
                    {statData.leagueAverage && (
                      <div className="text-xs sm:text-sm text-gray-500 mt-1">
                        Avg: {statData.leagueAverage}{statData.unit || ''}
                      </div>
                    )}
                  </div>
                  <span className="text-lg sm:text-2xl font-bold text-gray-900 min-w-0 flex-shrink">
                    {statData.awayValue}{statData.unit || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernStatsTable;
