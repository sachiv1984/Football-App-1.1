// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState } from 'react';
import { Team } from '../../../types';

interface StatValue {
  homeValue: number;
  awayValue: number;
  leagueAverage?: number;
  unit?: string;
}

interface FormStats {
  homeForm: {
    results: ('W' | 'D' | 'L')[];
    matchesPlayed: number;
    won: number;
    drawn: number;
    lost: number;
  };
  awayForm: {
    results: ('W' | 'D' | 'L')[];
    matchesPlayed: number;
    won: number;
    drawn: number;
    lost: number;
  };
}

interface ModernStatsTableProps {
  homeTeam: Team;
  awayTeam: Team;
  stats: Record<string, StatValue>;
  formData?: FormStats;
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
    <div
      className={`w-8 h-8 rounded border flex items-center justify-center text-sm font-semibold ${getResultStyle(result)}`}
    >
      {result}
    </div>
  );
};

const ModernStatsTable: React.FC<ModernStatsTableProps> = ({
  homeTeam,
  awayTeam,
  stats,
  formData,
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
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>
      {/* Tabs */}
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

      {/* Tab content */}
      <div className="p-6">
        {activeTab === 'form' && formData ? (
          <div>
            {/* Team logos and title */}
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

            {/* Form display */}
            <div className="flex justify-between items-center mb-8">
              <div className="flex space-x-2">
                {Array.from({ length: 5 - formData.homeForm.results.length }).map((_, index) => (
                  <div key={`empty-home-${index}`} className="w-8 h-8 rounded border border-gray-200 bg-gray-50"></div>
                ))}
                {formData.homeForm.results.map((result, index) => (
                  <FormResult key={`home-${index}`} result={result} />
                ))}
              </div>

              <div className="text-center">
                <span className="text-lg font-semibold text-gray-700">Form</span>
              </div>

              <div className="flex space-x-2">
                {formData.awayForm.results.map((result, index) => (
                  <FormResult key={`away-${index}`} result={result} />
                ))}
                {Array.from({ length: 5 - formData.awayForm.results.length }).map((_, index) => (
                  <div key={`empty-away-${index}`} className="w-8 h-8 rounded border border-gray-200 bg-gray-50"></div>
                ))}
              </div>
            </div>

            {/* Stats comparison */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{formData.homeForm.matchesPlayed}</span>
                <span className="text-lg font-medium text-gray-700">Matches Played</span>
                <span className="text-2xl font-bold text-gray-900">{formData.awayForm.matchesPlayed}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{formData.homeForm.won}</span>
                <span className="text-lg font-medium text-gray-700">Won</span>
                <span className="text-2xl font-bold text-gray-900">{formData.awayForm.won}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{formData.homeForm.drawn}</span>
                <span className="text-lg font-medium text-gray-700">Drawn</span>
                <span className="text-2xl font-bold text-gray-900">{formData.awayForm.drawn}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-2xl font-bold text-gray-900">{formData.homeForm.lost}</span>
                <span className="text-lg font-medium text-gray-700">Lost</span>
                <span className="text-2xl font-bold text-gray-900">{formData.awayForm.lost}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Team headers */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                {homeTeam.logo ? (
                  <img src={homeTeam.logo} alt={homeTeam.name} className="w-12 h-12 object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-sm">{homeTeam.shortName.charAt(0)}</span>
                  </div>
                )}
                <span className="font-semibold text-lg text-gray-900">{homeTeam.shortName}</span>
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h2>
              </div>

              <div className="flex items-center space-x-3">
                <span className="font-semibold text-lg text-gray-900">{awayTeam.shortName}</span>
                {awayTeam.logo ? (
                  <img src={awayTeam.logo} alt={awayTeam.name} className="w-12 h-12 object-contain" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 font-semibold text-sm">{awayTeam.shortName.charAt(0)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-6">
              {Object.entries(currentStats).map(([statName, statData]) => (
                <div key={statName} className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-gray-900">{statData.homeValue}{statData.unit || ''}</span>
                  <div className="text-center">
                    <span className="text-lg font-medium text-gray-700">{statName}</span>
                    {statData.leagueAverage && (
                      <div className="text-sm text-gray-500 mt-1">
                        Avg: {statData.leagueAverage}{statData.unit || ''}
                      </div>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-gray-900">{statData.awayValue}{statData.unit || ''}</span>
                </div>
              ))}
            </div>

            {/* Visual bars */}
            <div className="mt-8 space-y-4">
              {Object.entries(currentStats).map(([statName, statData]) => {
                const total = statData.homeValue + statData.awayValue;
                const homePercent = total > 0 ? (statData.homeValue / total) * 100 : 50;
                const awayPercent = total > 0 ? (statData.awayValue / total) * 100 : 50;

                return (
                  <div key={`${statName}-bar`} className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 text-center">{statName}</div>
                    <div className="flex h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div className="bg-blue-500 transition-all duration-300" style={{ width: `${homePercent}%` }} />
                      <div className="bg-red-500 transition-all duration-300" style={{ width: `${awayPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{homeTeam.shortName}: {statData.homeValue}{statData.unit || ''}</span>
                      <span>{awayTeam.shortName}: {statData.awayValue}{statData.unit || ''}</span>
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
