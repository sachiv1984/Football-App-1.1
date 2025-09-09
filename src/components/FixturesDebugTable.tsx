import React, { useState } from 'react';
import { useGameWeekFixtures } from '../hooks/useGameWeekFixtures';
import type { FeaturedFixtureWithImportance } from '../types';

export const FixturesDebugTable: React.FC = () => {
  const { fixtures: gameWeekFixtures, gameWeekInfo, isLoading, error, refetch } = useGameWeekFixtures();
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRowExpansion = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  const formatDate = (dateTime: string) =>
    new Date(dateTime).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  if (isLoading) {
    return <div className="text-gray-500 p-4">Loading game week fixtures debug data...</div>;
  }

  if (error) {
    return (
      <div className="text-red-600 p-4">
        Error loading game week fixtures debug data: {error}{' '}
        <button onClick={refetch} className="ml-2 px-3 py-1 bg-blue-600 text-white rounded text-sm">Retry</button>
      </div>
    );
  }

  if (!gameWeekFixtures || gameWeekFixtures.length === 0) {
    return <div className="text-gray-500 p-4">No fixtures available for the current matchday.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">
          Game Week {gameWeekInfo?.currentWeek} Debug Table
        </h2>
        <button
          onClick={refetch}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">#</th>
              <th className="text-left p-3 font-semibold text-gray-700">Home Team</th>
              <th className="text-left p-3 font-semibold text-gray-700">Away Team</th>
              <th className="text-left p-3 font-semibold text-gray-700">Time</th>
              <th className="text-left p-3 font-semibold text-gray-700">Venue</th>
              <th className="text-left p-3 font-semibold text-gray-700">Importance</th>
              <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {gameWeekFixtures.map((fixture: FeaturedFixtureWithImportance, index: number) => (
              <React.Fragment key={fixture.id}>
                <tr className={`border-b hover:bg-gray-50 transition-colors ${expandedRow === index ? 'bg-blue-50' : ''}`}>
                  <td className="p-3 text-sm font-medium text-gray-900">{index + 1}</td>
                  <td className="p-3">{fixture.homeTeam.shortName} {fixture.homeTeam.logo && '✅'}</td>
                  <td className="p-3">{fixture.awayTeam.shortName} {fixture.awayTeam.logo && '✅'}</td>
                  <td className="p-3 text-sm font-medium text-gray-900">
                    {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </td>
                  <td className="p-3 text-sm">{fixture.venue}</td>
                  <td className="p-3 flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{fixture.importance}</span>
                    <div className={`w-3 h-3 rounded-full ${
                      fixture.importance >= 80 ? 'bg-yellow-400' :
                      fixture.importance >= 60 ? 'bg-orange-400' : 'bg-gray-300'
                    }`}></div>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => toggleRowExpansion(index)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      {expandedRow === index ? 'Hide' : 'Details'}
                    </button>
                  </td>
                </tr>

                {expandedRow === index && (
                  <tr className="bg-blue-50 border-b">
                    <td colSpan={7} className="p-4">
                      <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60 border">
                        {JSON.stringify(fixture, null, 2)}
                      </pre>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
