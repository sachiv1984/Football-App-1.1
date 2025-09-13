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
  stats: {
    [key: string]: StatValue;
  } & {
    recentForm?: FormData;
  };
  league?: string;
  season?: string;
  className?: string;
}

type StatCategory = 'form' | 'goals' | 'corners' | 'cards' | 'shooting' | 'fouls';

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
    switch (category) {
      case 'goals':
        return {
          'Matches Played': stats.matchesPlayed || { homeValue: 0, awayValue: 0 },
          'Goals For': stats.goalsFor || { homeValue: 0, awayValue: 0 },
          'Goals Against': stats.goalsAgainst || { homeValue: 0, awayValue: 0 },
          'Total Goals': stats.totalGoals || { homeValue: 0, awayValue: 0 },
          'Over 1.5 Goals': stats.over15Goals || { homeValue: 0, awayValue: 0, unit: '%' },
          'Over 2.5 Goals': stats.over25Goals || { homeValue: 0, awayValue: 0, unit: '%' },
          'Over 3.5 Goals': stats.over35Goals || { homeValue: 0, awayValue: 0, unit: '%' },
          'Both Teams Score': stats.bothTeamsScore || { homeValue: 0, awayValue: 0, unit: '%' },
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

  const renderFormContent = () => {
    if (!stats.recentForm) {
      return (
        <div className="text-center py-8">
          <p className="text-gray-600">No form data available</p>
        </div>
      );
    }

    const { homeResults, awayResults, homeStats, awayStats } = stats.recentForm;

    return (
      <div className="space-y-8">
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
            <h2 className="text-2xl font-bold text-gray-900">Recent Form</h2>
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

        {/* Form badges */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {homeResults.map((result, index) => (
              <span
                key={index}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white ${
                  result === 'W' ? 'bg-green-500' : result === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              >
                {result}
              </span>
            ))}
          </div>
          
          <div className="text-center">
            <span className="text-sm text-gray-600">Last {Math.max(homeResults.length, awayResults.length)} matches</span>
          </div>
          
          <div className="flex space-x-2">
            {awayResults.map((result, index) => (
              <span
                key={index}
                className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white ${
                  result === 'W' ? 'bg-green-500' : result === 'D' ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              >
                {result}
              </span>
            ))}
          </div>
        </div>

        {/* Form stats */}
        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{homeStats.won}</div>
            <div className="text-sm text-gray-600">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{homeStats.drawn}</div>
            <div className="text-sm text-gray-600">Draws</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{homeStats.lost}</div>
            <div className="text-sm text-gray-600">Losses</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{awayStats.won}</div>
            <div className="text-sm text-gray-600">Wins</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{awayStats.drawn}</div>
            <div className="text-sm text-gray-600">Draws</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{awayStats.lost}</div>
            <div className="text-sm text-gray-600">Losses</div>
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
      <div className="p-6">
        {activeTab === 'form' ? (
          renderFormContent()
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
                  <span className="text-2xl font-bold text-gray-900">
                    {statData.homeValue}{statData.unit || ''}
                  </span>
                  <div className="text-center">
                    <span className="text-lg font-medium text-gray-700">{statName}</span>
                    {statData.leagueAverage && (
                      <div className="text-sm text-gray-500 mt-1">
                        Avg: {statData.leagueAverage}{statData.unit || ''}
                      </div>
                    )}
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {statData.awayValue}{statData.unit || ''}
                  </span>
                </div>
              ))}
            </div>

            {/* Visual comparison bars */}
            <div className="mt-8 space-y-4">
              {Object.entries(currentStats).map(([statName, statData]) => {
                const total = statData.homeValue + statData.awayValue;
                const homePercentage = total > 0 ? (statData.homeValue / total) * 100 : 50;
                const awayPercentage = total > 0 ? (statData.awayValue / total) * 100 : 50;
                
                return (
                  <div key={`${statName}-bar`} className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 text-center">{statName}</div>
                    <div className="flex h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-500 transition-all duration-300"
                        style={{ width: `${homePercentage}%` }}
                      />
                      <div 
                        className="bg-red-500 transition-all duration-300"
                        style={{ width: `${awayPercentage}%` }}
                      />
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
