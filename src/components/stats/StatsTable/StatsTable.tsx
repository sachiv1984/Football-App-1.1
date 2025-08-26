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
              homeValue={homeTeamStats.shotsOnTarget}
              awayValue={awayTeamStats.shotsOnTarget}
              leagueAverage={leagueAverages.shotsOnTarget}
            />
            <StatRow
              statName="Total Shots"
              homeValue={homeTeamStats.totalShots}
              awayValue={awayTeamStats.totalShots}
              leagueAverage={leagueAverages.totalShots}
            />
            <StatRow
              statName="Corners"
              homeValue={homeTeamStats.corners}
              awayValue={awayTeamStats.corners}
              leagueAverage={leagueAverages.corners}
            />

            {/* Possession Stats */}
            <tr className="bg-green-50">
              <td colSpan={3} className="px-4 py-2 font-semibold text-green-800">
                🏃 Possession
              </td>
            </tr>
            <StatRow
              statName="Possession"
              homeValue={homeTeamStats.possession}
              awayValue={awayTeamStats.possession}
              leagueAverage={leagueAverages.possession}
              unit="%"
            />
            <StatRow
              statName="Pass Accuracy"
              homeValue={homeTeamStats.passAccuracy}
              awayValue={awayTeamStats.passAccuracy}
              leagueAverage={leagueAverages.passAccuracy}
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
              homeValue={homeTeamStats.fouls}
              awayValue={awayTeamStats.fouls}
              leagueAverage={leagueAverages.fouls}
              reverseComparison={true}
            />
            <StatRow
              statName="Yellow Cards"
              homeValue={homeTeamStats.yellowCards}
              awayValue={awayTeamStats.yellowCards}
              leagueAverage={leagueAverages.yellowCards}
              reverseComparison={true}
            />
            <StatRow
              statName="Red Cards"
              homeValue={homeTeamStats.redCards}
              awayValue={awayTeamStats.redCards}
              leagueAverage={leagueAverages.redCards}
              reverseComparison={true}
            />
            <StatRow
              statName="Offsides"
              homeValue={homeTeamStats.offsides}
              awayValue={awayTeamStats.offsides}
              leagueAverage={leagueAverages.offsides}
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
