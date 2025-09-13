// src/components/stats/StatsTable/ModernStatsTable.tsx
import React, { useState } from 'react';

interface ModernStatsTableProps {
  homeTeam: {
    name: string;
    shortName: string;
    logo: string;
  };
  awayTeam: {
    name: string;
    shortName: string;
    logo: string;
  };
  stats: {
    [key: string]: {
      homeValue: number;
      awayValue: number;
      leagueAverage?: number;
      unit?: string;
    };
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
          // Form content would go here - you could integrate your TeamForm component
          <div className="text-center py-8">
            <p className="text-gray-600">Form component would be rendered here</p>
            <p className="text-sm text-gray-500 mt-2">
              You can integrate the TeamForm component above
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Team headers */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <img src={homeTeam.logo} alt={homeTeam.name} className="w-12 h-12 object-contain" />
                <span className="font-semibold text-lg text-gray-900">{homeTeam.shortName}</span>
              </div>
              
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 capitalize">{activeTab}</h2>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className="font-semibold text-lg text-gray-900">{awayTeam.shortName}</span>
                <img src={awayTeam.logo} alt={awayTeam.name} className="w-12 h-12 object-contain" />
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
