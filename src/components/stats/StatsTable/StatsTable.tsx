// src/components/stats/StatsTable/StatsTable.tsx
import React from 'react';
import StatRow from './StatRow';
import { StatsTableProps } from './StatsTable.types';

const StatsTable: React.FC<StatsTableProps> = ({
  homeTeam,
  awayTeam,
  stats,
  className = ''
}) => {
  const { homeTeamStats, awayTeamStats, leagueAverages } = stats;

  return (
    <div className={`card ${className}`}>
      {/* Team Headers */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-3 items-center">
          <div className="flex items-center justify-end space-x-2">
            <img src={homeTeam.logo} alt={homeTeam.name} className="team-logo" />
            <span className="font-semibold">{homeTeam.shortName}</span>
          </div>
          <div className="text-center font-bold text-gray-600">
            Statistics
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-semibold">{awayTeam.shortName}</span>
            <img src={awayTeam.logo} alt={awayTeam.name} className="team-logo" />
          </div>
        </div>
      </div>

      {/* Stats Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <tbody>
            {/* Attacking Stats */}
            <tr className="bg-blue-50">
              <td colSpan={3} className="px-4 py-2 font-semibold text-blue-800">
                ⚽ Attacking
              </td>
            </tr>
            <StatRow
              statName="Shots on Target"
              homeValue={homeTeamStats.shotsOnTarget ?? 0}
              awayValue={awayTeamStats.shotsOnTarget ?? 0}
              leagueAverage={leagueAverages.shotsOnTarget ?? 0}
            />
            <StatRow
              statName="Total Shots"
              homeValue={homeTeamStats.totalShots ?? 0}
              awayValue={awayTeamStats.totalShots ?? 0}
              leagueAverage={leagueAverages.totalShots ?? 0}
            />
            <StatRow
              statName="Corners"
              homeValue={homeTeamStats.corners ?? 0}
              awayValue={awayTeamStats.corners ?? 0}
              leagueAverage={leagueAverages.corners ?? 0}
            />

            {/* Possession Stats */}
            <tr className="bg-green-50">
              <td colSpan={3} className="px-4 py-2 font-semibold text-green-800">
                🏃 Possession
              </td>
            </tr>
            <StatRow
              statName="Possession"
              homeValue={homeTeamStats.possession ?? 0}
              awayValue={awayTeamStats.possession ?? 0}
              leagueAverage={leagueAverages.possession ?? 0}
              unit="%"
            />
            <StatRow
              statName="Pass Accuracy"
              homeValue={homeTeamStats.passAccuracy ?? 0}
              awayValue={awayTeamStats.passAccuracy ?? 0}
              leagueAverage={leagueAverages.passAccuracy ?? 0}
              unit="%"
            />

            {/* Discipline Stats */}
            <tr className="bg-yellow-50">
              <td colSpan={3} className="px-4 py-2 font-semibold text-yellow-800">
                ⚠️ Discipline
              </td>
            </tr>
            <StatRow
              statName="Fouls"
              homeValue={homeTeamStats.fouls ?? 0}
              awayValue={awayTeamStats.fouls ?? 0}
              leagueAverage={leagueAverages.fouls ?? 0}
              reverseComparison={true}
            />
            <StatRow
              statName="Yellow Cards"
              homeValue={homeTeamStats.yellowCards ?? 0}
              awayValue={awayTeamStats.yellowCards ?? 0}
              leagueAverage={leagueAverages.yellowCards ?? 0}
              reverseComparison={true}
            />
            <StatRow
              statName="Red Cards"
              homeValue={homeTeamStats.redCards ?? 0}
              awayValue={awayTeamStats.redCards ?? 0}
              leagueAverage={leagueAverages.redCards ?? 0}
              reverseComparison={true}
            />
            <StatRow
              statName="Offsides"
              homeValue={homeTeamStats.offsides ?? 0}
              awayValue={awayTeamStats.offsides ?? 0}
              leagueAverage={leagueAverages.offsides ?? 0}
              reverseComparison={true}
            />
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="p-4 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-600 space-y-1">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-blue-500 rounded"></div>
              <span>{homeTeam.shortName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-3 h-2 bg-red-500 rounded"></div>
              <span>{awayTeam.shortName}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-green-600 font-semibold">Green</span>
              <span>= Above average</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsTable;
