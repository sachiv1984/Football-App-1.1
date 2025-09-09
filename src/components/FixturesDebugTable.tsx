import React, { useState } from 'react';
import { useGameWeekFixtures } from '../hooks/useGameWeekFixtures';
import type { FeaturedFixtureWithImportance } from '../types';

export const FixturesDebugTable: React.FC = () => {
  const { fixtures, gameWeekInfo, isLoading, error, refetch } = useGameWeekFixtures();
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
      minute: '2-digit',
    });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6 flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
        <span className="text-lg font-medium text-gray-600">Loading game week fixtures...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-2">
            <span className="text-red-500 text-xl mr-2">⚠️</span>
            <h3 className="text-lg font-semibold text-red-800">API Error</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={() => refetch()}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry API Call
          </button>
        </div>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No fixtures available for this matchday</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      {gameWeekInfo && (
        <div className="bg-gray-50 border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Matchday {gameWeekInfo.currentWeek}</h2>
          <button
            onClick={refetch}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">#</th>
              <th className="text-left p-3 font-semibold text-gray-700">Competition</th>
              <th className="text-left p-3 font-semibold text-gray-700">Home Team</th>
              <th className="text-left p-3 font-semibold text-gray-700">Away Team</th>
              <th className="text-left p-3 font-semibold text-gray-700">Date & Time</th>
              <th className="text-left p-3 font-semibold text-gray-700">Venue</th>
              <th className="text-left p-3 font-semibold text-gray-700">Importance</th>
              <th className="text-left p-3 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {fixtures.map((fixture: FeaturedFixtureWithImportance, index: number) => (
              <React.Fragment key={fixture.id}>
                <tr
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    expandedRow === index ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="p-3 text-sm font-medium text-gray-900">{index + 1}</td>
                  <td className="p-3">
                    <div className="flex items-center space-x-2">
                      {fixture.competition.logo && (
                        <img
                          src={fixture.competition.logo}
                          alt={fixture.competition.name}
                          className="w-5 h-5"
                        />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{fixture.competition.name}</div>
                        <div className="text-xs text-gray-500">Week {fixture.matchWeek}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{fixture.homeTeam.name}</div>
                    {fixture.homeTeam.shortName && (
                      <div className="text-xs text-gray-500">({fixture.homeTeam.shortName})</div>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-gray-900">{fixture.awayTeam.name}</div>
                    {fixture.awayTeam.shortName && (
                      <div className="text-xs text-gray-500">({fixture.awayTeam.shortName})</div>
                    )}
                  </td>
                  <td className="p-3 text-sm font-medium text-gray-900">
                    {formatDate(fixture.dateTime)}
                  </td>
                  <td className="p-3 text-sm text-gray-900">{fixture.venue}</td>
                  <td className="p-3 flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">{fixture.importance}/10</span>
                    <div
                      className={`w-3 h-3 rounded-full ${
                        fixture.importance >= 8
                          ? 'bg-red-500'
                          : fixture.importance >= 6
                          ? 'bg-orange-500'
                          : fixture.importance >= 4
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                      }`}
                    ></div>
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
                    <td colSpan={8} className="p-4">
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
