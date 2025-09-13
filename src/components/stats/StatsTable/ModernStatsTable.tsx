// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState } from 'react';
import { Team } from '../../../types';

interface StatValue {
  homeValue: number | string;
  awayValue: number | string;
  leagueAverage?: number;
  unit?: string;
}

interface GoalsExtraStats {
  matchesPlayed: number;
  goalsFor: number;
  goalsAgainst: number;
  totalGoals: number;
  over15: string;
  over25: string;
  over35: string;
  btts: string;
}

interface StatsData {
  goalsScored?: StatValue;
  goalsConceded?: StatValue;
  goalDifference?: StatValue;
  goalsExtra?: GoalsExtraStats; // ✅ NEW
  corners?: StatValue;
  cornersAgainst?: StatValue;
  yellowCards?: StatValue;
  redCards?: StatValue;
  shotsOnTarget?: StatValue;
  totalShots?: StatValue;
  shotAccuracy?: StatValue;
  fouls?: StatValue;
  foulsWon?: StatValue;
  recentForm?: {
    homeResults: ('W' | 'D' | 'L')[];
    awayResults: ('W' | 'D' | 'L')[];
    homeStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
    awayStats: { matchesPlayed: number; won: number; drawn: number; lost: number };
  };
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

interface FormResultBoxProps {
  result?: 'W' | 'D' | 'L';
  isLast?: boolean;
  size?: 'small' | 'normal';
}

const FormResultBox: React.FC<FormResultBoxProps> = ({ result, isLast, size = 'normal' }) => {
  const getStyle = (r?: 'W' | 'D' | 'L') => {
    switch (r) {
      case 'W':
        return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', underline: 'bg-green-700' };
      case 'D':
        return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', underline: 'bg-gray-700' };
      case 'L':
        return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', underline: 'bg-red-700' };
      default:
        return { bg: 'bg-gray-50', text: 'text-gray-300', border: 'border-gray-200', underline: '' };
    }
  };

  const style = getStyle(result);
  const boxSize = size === 'small' ? 'w-6 h-6 sm:w-8 sm:h-8 text-xs sm:text-sm' : 'w-8 h-8 sm:w-10 sm:h-10 text-sm';

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={`rounded border flex items-center justify-center font-semibold ${boxSize} ${style.bg} ${style.text} ${style.border}`}
      >
        {result || ''}
      </div>
      {isLast && result && <span className={`block w-full h-1 mt-1 ${style.underline}`} />}
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
          'Goals Scored': stats.goalsScored || { homeValue: 0, awayValue: 0 },
          'Goals Conceded': stats.goalsConceded || { homeValue: 0, awayValue: 0 },
          'Goal Difference': stats.goalDifference || { homeValue: 0, awayValue: 0 },
          ...(stats.goalsExtra
            ? {
                'Matches Played': { homeValue: stats.goalsExtra.matchesPlayed, awayValue: stats.goalsExtra.matchesPlayed },
                'Goals For': { homeValue: stats.goalsExtra.goalsFor, awayValue: stats.goalsExtra.goalsFor },
                'Goals Against': { homeValue: stats.goalsExtra.goalsAgainst, awayValue: stats.goalsExtra.goalsAgainst },
                'Total Goals': { homeValue: stats.goalsExtra.totalGoals, awayValue: stats.goalsExtra.totalGoals },
                'Over 1.5 Match Goals': { homeValue: stats.goalsExtra.over15, awayValue: stats.goalsExtra.over15 },
                'Over 2.5 Match Goals': { homeValue: stats.goalsExtra.over25, awayValue: stats.goalsExtra.over25 },
                'Over 3.5 Match Goals': { homeValue: stats.goalsExtra.over35, awayValue: stats.goalsExtra.over35 },
                'Both Teams To Score': { homeValue: stats.goalsExtra.btts, awayValue: stats.goalsExtra.btts },
              }
            : {}),
        };
      case 'corners':
        return {
          'Corners Won': stats.corners || { homeValue: 0, awayValue: 0 },
          'Corners Conceded': stats.cornersAgainst || { homeValue: 0, awayValue: 0 },
        };
      case 'cards':
        return {
          'Yellow Cards': stats.yellowCards || { homeValue: 0, awayValue: 0 },
          'Red Cards': stats.redCards || { homeValue: 0, awayValue: 0 },
        };
      case 'shooting':
        return {
          'Shots on Target': stats.shotsOnTarget || { homeValue: 0, awayValue: 0 },
          'Total Shots': stats.totalShots || { homeValue: 0, awayValue: 0 },
          'Shot Accuracy': stats.shotAccuracy || { homeValue: 0, awayValue: 0, unit: '%' },
        };
      case 'fouls':
        return {
          'Fouls Committed': stats.fouls || { homeValue: 0, awayValue: 0 },
          'Fouls Won': stats.foulsWon || { homeValue: 0, awayValue: 0 },
        };
      default:
        return {};
    }
  };

  const currentStats = getStatsForCategory(activeTab);

  const formatValue = (value: number | string | undefined, unit?: string) => {
    if (value === undefined) return '-';
    if (typeof value === 'string') return value;
    return `${value}${unit || ''}`;
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto ${className}`}>
      {/* Responsive Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-hidden">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-2 py-2 text-xs sm:px-4 sm:py-3 sm:text-sm font-medium text-center whitespace-nowrap border-b-2 transition-colors ${
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
      <div className="px-4 sm:px-6 py-2 bg-gray-50 border-b border-gray-100">
        <p className="text-sm text-gray-600">
          Showing stats for {league} {season}
        </p>
      </div>

      {/* Tab content */}
      <div className="p-4 sm:p-6 min-w-[500px]">
        {activeTab === 'form' && stats.recentForm ? (
          <div>
            {/* Team logos */}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center">
                {homeTeam.logo ? (
                  <img src={homeTeam.logo} alt={homeTeam.name} className="w-8 h-8 sm:w-12 sm:h-12 object-contain" />
                ) : (
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-xs sm:text-sm">{homeTeam.shortName.charAt(0)}</span>
                  </div>
                )}
              </div>

              <div className="text-center">
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

            {/* Form results */}
            <div className="flex justify-between items-center mb-4">
              {/* Home form */}
              <div className="flex space-x-1 sm:space-x-2">
                {Array.from({ length: 5 }).map((_, i) => {
                  const idx = stats.recentForm!.homeResults.length - 5 + i;
                  const result = idx >= 0 ? stats.recentForm!.homeResults[idx] : undefined;
                  const isLast = idx === stats.recentForm!.homeResults.length - 1;
                  return <FormResultBox key={`home-${i}`} result={result} isLast={isLast} size="small" />;
                })}
              </div>

              {/* Heading */}
              <div className="text-center">
                <span className="text-sm sm:text-lg font-semibold text-gray-700">Form</span>
              </div>

              {/* Away form */}
              <div className="flex space-x-1 sm:space-x-2">
                {Array.from({ length: 5 })
                  .map((_, i) => {
                    const idx = stats.recentForm!.awayResults.length - 5 + i;
                    const result = idx >= 0 ? stats.recentForm!.awayResults[idx] : undefined;
                    const isLast = idx === stats.recentForm!.awayResults.length - 1;
                    return <FormResultBox key={`away-${i}`} result={result} isLast={isLast} size="small" />;
                  })
                  .reverse()}
              </div>
            </div>

            {/* MP/W/D/L */}
            <div className="grid grid-cols-3 text-center text-sm sm:text-base font-semibold text-gray-900 mt-4">
              {/* Home */}
              <div className="flex flex-col items-end space-y-1">
                <span>{stats.recentForm.homeStats.matchesPlayed}</span>
                <span>{stats.recentForm.homeStats.won}</span>
                <span>{stats.recentForm.homeStats.drawn}</span>
                <span>{stats.recentForm.homeStats.lost}</span>
              </div>

              {/* Heading */}
              <div className="flex flex-col items-center space-y-1">
                <span>Matches played</span>
                <span>Won</span>
                <span>Drawn</span>
                <span>Lost</span>
              </div>

              {/* Away */}
              <div className="flex flex-col items-start space-y-1">
                <span>{stats.recentForm.awayStats.matchesPlayed}</span>
                <span>{stats.recentForm.awayStats.won}</span>
                <span>{stats.recentForm.awayStats.drawn}</span>
                <span>{stats.recentForm.awayStats.lost}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(currentStats).map(([statName, stat]) => {
              if (!stat) return null;

              const isNumeric = typeof stat.homeValue === 'number' && typeof stat.awayValue === 'number';
              const total = isNumeric ? (stat.homeValue as number) + (stat.awayValue as number) : 0;
              const homePercent = isNumeric && total > 0 ? Math.round(((stat.homeValue as number) / total) * 100) : 50;
              const awayPercent = isNumeric && total > 0 ? Math.round(((stat.awayValue as number) / total) * 100) : 50;

              return (
                <div key={statName}>
                  <div className="flex justify-between text-sm sm:text-base font-medium">
                    <span>{formatValue(stat.homeValue, stat.unit)}</span>
                    <span className="text-center">{statName}</span>
                    <span>{formatValue(stat.awayValue, stat.unit)}</span>
                  </div>
                  {isNumeric && (
                    <div className="flex h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div className="bg-blue-500" style={{ width: `${homePercent}%` }} />
                      <div className="bg-red-500" style={{ width: `${awayPercent}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernStatsTable;

// --- Example Mock Data ---
export const mockStats: StatsData = {
  goalsScored: { homeValue: 5, awayValue: 7 },
  goalsConceded: { homeValue: 3, awayValue: 6 },
  goalDifference: { homeValue: 2, awayValue: 1 },
  goalsExtra: {
    matchesPlayed: 3,
    goalsFor: 1.62,
    goalsAgainst: 1.42,
    totalGoals: 2,
    over15: "100%",
    over25: "50%",
    over35: "25%",
    btts: "43%",
  },
  recentForm: {
    homeResults: ['W', 'D', 'L'],
    awayResults: ['L', 'W'],
    homeStats: { matchesPlayed: 3, won: 1, drawn: 1, lost: 1 },
    awayStats: { matchesPlayed: 2, won: 1, drawn: 0, lost: 1 },
  },
};
