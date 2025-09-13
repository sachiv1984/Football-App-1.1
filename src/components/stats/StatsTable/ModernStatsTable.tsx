// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState } from 'react';
import { Team } from '../../../types';

interface StatValue {
  homeValue: number;
  awayValue: number;
  leagueAverage?: number;
  unit?: string;
}

interface StatsData {
  goalsScored?: StatValue;
  goalsConceded?: StatValue;
  goalDifference?: StatValue;
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

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto ${className}`}>
      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 sm:px-6 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
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
                <h2 className="text-base font-semibold text-gray-900">Team Form</h2>
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

            {/* Unified form with aligned stats */}
            <div className="flex justify-between items-start mb-4">
              {/* Home */}
              <div className="flex flex-col items-center space-y-1">
                <div className="flex space-x-1 sm:space-x-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const idx = stats.recentForm!.homeResults.length - 5 + i;
                    const result = idx >= 0 ? stats.recentForm!.homeResults[idx] : undefined;
                    const isLast = idx === stats.recentForm!.homeResults.length - 1;
                    return <FormResultBox key={`home-${i}`} result={result} isLast={isLast} size="small" />;
                  })}
                </div>
                <div className="flex flex-col items-center text-base font-semibold text-gray-900 mt-1">
                  <span>{stats.recentForm.homeStats.matchesPlayed}</span>
                  <span>{stats.recentForm.homeStats.won}</span>
                  <span>{stats.recentForm.homeStats.drawn}</span>
                  <span>{stats.recentForm.homeStats.lost}</span>
                </div>
              </div>

              {/* Center heading */}
              <div className="flex flex-col items-center space-y-2">
                <span className="text-base font-semibold text-gray-900">Form</span>
                <div className="flex flex-col items-center text-base font-semibold text-gray-900 space-y-1 mt-1">
                  <span>Matches played</span>
                  <span>Won</span>
                  <span>Drawn</span>
                  <span>Lost</span>
                </div>
              </div>

              {/* Away */}
              <div className="flex flex-col items-center space-y-1">
                <div className="flex space-x-1 sm:space-x-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const idx = stats.recentForm!.awayResults.length - 5 + i;
                    const result = idx >= 0 ? stats.recentForm!.awayResults[idx] : undefined;
                    const isLast = idx === stats.recentForm!.awayResults.length - 1;
                    return <FormResultBox key={`away-${i}`} result={result} isLast={isLast} size="small" />;
                  }).reverse()}
                </div>
                <div className="flex flex-col items-center text-base font-semibold text-gray-900 mt-1">
                  <span>{stats.recentForm.awayStats.matchesPlayed}</span>
                  <span>{stats.recentForm.awayStats.won}</span>
                  <span>{stats.recentForm.awayStats.drawn}</span>
                  <span>{stats.recentForm.awayStats.lost}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(currentStats).map(([statName, stat]) => {
              if (!stat) return null;
              const total = stat.homeValue + stat.awayValue;
              const homePercent = total > 0 ? Math.round((stat.homeValue / total) * 100) : 50;
              const awayPercent = total > 0 ? Math.round((stat.awayValue / total) * 100) : 50;

              return (
                <div key={statName}>
                  <div className="flex justify-between text-base font-semibold">
                    <span>{stat.homeValue}{stat.unit || ''}</span>
                    <span className="text-center">{statName}</span>
                    <span>{stat.awayValue}{stat.unit || ''}</span>
                  </div>
                  <div className="flex h-2 sm:h-3 bg-gray-200 rounded-full overflow-hidden mt-1">
                    <div className="bg-blue-500" style={{ width: `${homePercent}%` }} />
                    <div className="bg-red-500" style={{ width: `${awayPercent}%` }} />
                  </div>
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
