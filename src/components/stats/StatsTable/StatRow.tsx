// src/components/stats/StatsTable/StatRow.tsx
import React from 'react';
import { StatRowProps } from './StatsTable.types';

const StatRow: React.FC<StatRowProps> = ({
  statName,
  homeValue,
  awayValue,
  leagueAverage,
  unit = '',
  reverseComparison = false,
  className = ''
}) => {
  const getComparisonClass = (value: number, comparison: number) => {
    if (value === comparison) return 'text-gray-600';
    
    const isBetter = reverseComparison ? value < comparison : value > comparison;
    return isBetter ? 'text-green-600 font-semibold' : 'text-red-600';
  };

  const getProgressBarWidth = (value: number, max: number) => {
    const percentage = Math.min((value / max) * 100, 100);
    return `${percentage}%`;
  };

  const maxValue = Math.max(homeValue, awayValue, leagueAverage || 0);

  return (
    <tr className={`border-b border-gray-100 hover:bg-gray-50 ${className}`}>
      {/* Home Team Value */}
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end space-x-2">
          <span className={leagueAverage ? getComparisonClass(homeValue, leagueAverage) : 'text-gray-900'}>
            {homeValue}{unit}
          </span>
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: getProgressBarWidth(homeValue, maxValue) }}
            />
          </div>
        </div>
      </td>

      {/* Stat Name */}
      <td className="px-4 py-3 text-center font-medium text-gray-900 bg-gray-50">
        {statName}
        {leagueAverage && (
          <div className="text-xs text-gray-500 mt-1">
            Avg: {leagueAverage}{unit}
          </div>
        )}
      </td>

      {/* Away Team Value */}
      <td className="px-4 py-3 text-left">
        <div className="flex items-center space-x-2">
          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-red-500 rounded-full transition-all duration-300"
              style={{ width: getProgressBarWidth(awayValue, maxValue) }}
            />
          </div>
          <span className={leagueAverage ? getComparisonClass(awayValue, leagueAverage) : 'text-gray-900'}>
            {awayValue}{unit}
          </span>
        </div>
      </td>
    </tr>
  );
};

export default StatRow;
