import React, { useState } from 'react';
import { useFixtures } from '../hooks/useFixtures';
import type { FeaturedFixtureWithImportance } from '../types';

export const FixturesDebugTable: React.FC = () => {
  const { featuredFixtures, allFixtures, loading, error, refetch } = useFixtures();
  const [activeTab, setActiveTab] = useState<'featured' | 'all'>('featured');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const currentFixtures = activeTab === 'featured' ? featuredFixtures : allFixtures;

  const formatDate = (dateTime: string) => {
    return new Date(dateTime).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleRowExpansion = (index: number) => {
    setExpandedRow(expandedRow === index ? null : index);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <span className="text-lg font-medium text-gray-600">Loading fixtures data...</span>
        </div>
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

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header with tabs and stats */}
      <div className="bg-gray-50 border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">API Data Debug Table</h2>
          <button
            onClick={() => refetch()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm transition-colors"
          >
            Refresh Data
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setActiveTab('featured')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'featured'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Featured ({featuredFixtures.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Fixtures ({allFixtures.length})
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-white rounded p-3 border">
            <div className="font-semibold text-gray-700">Total Fixtures</div>
            <div className="text-2xl font-bold text-blue-600">{currentFixtures.length}</div>
          </div>
          <div className="bg-white rounded p-3 border">
            <div className="font-semibold text-gray-700">Competitions</div>
            <div className="text-2xl font-bold text-green-600">
              {new Set(currentFixtures.map(f => f.competition.name)).size}
            </div>
          </div>
          <div className="bg-white rounded p-3 border">
            <div className="font-semibold text-gray-700">Unique Teams</div>
            <div className="text-2xl font-bold text-purple-600">
              {new Set([
                ...currentFixtures.map(f => f.homeTeam.name),
                ...currentFixtures.map(f => f.awayTeam.name)
              ]).size}
            </div>
          </div>
        </div>
      </div>

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
            {currentFixtures.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center p-8 text-gray-500">
                  No fixtures found
                </td>
              </tr>
            ) : (
              currentFixtures.map((fixture, index) => (
                <React.Fragment key={index}>
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
                    <td className="p-3">
                      <div className="text-sm font-medium text-gray-900">
                        {formatDate(fixture.dateTime)}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-gray-900">{fixture.venue}</div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">{fixture.importance}/10</span>
                        <div className={`w-3 h-3 rounded-full ${
                          fixture.importance >= 8 ? 'bg-red-500' :
                          fixture.importance >= 6 ? 'bg-orange-500' :
                          fixture.importance >= 4 ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                      </div>
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
                  
                  {/* Expanded row details */}
                  {expandedRow === index && (
                    <tr className="bg-blue-50 border-b">
                      <td colSpan={8} className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Fixture Details</h4>
                            <div className="space-y-1">
                              <div><span className="font-medium">ID:</span> {fixture.id}</div>
                              <div><span className="font-medium">Status:</span> {fixture.status}</div>
                              <div><span className="font-medium">Round:</span> {fixture.round || 'N/A'}</div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Team Form</h4>
                            <div className="space-y-2">
                              <div>
                                <span className="font-medium">Home Form:</span>
                                <div className="flex space-x-1 mt-1">
                                  {fixture.homeTeam.form?.slice(-5).map((result, i) => (
                                    <span
                                      key={i}
                                      className={`w-6 h-6 text-xs font-bold rounded-full flex items-center justify-center ${
                                        result === 'W' ? 'bg-green-500 text-white' :
                                        result === 'D' ? 'bg-yellow-500 text-white' :
                                        'bg-red-500 text-white'
                                      }`}
                                    >
                                      {result}
                                    </span>
                                  )) || <span className="text-gray-500">No form data</span>}
                                </div>
                              </div>
                              <div>
                                <span className="font-medium">Away Form:</span>
                                <div className="flex space-x-1 mt-1">
                                  {fixture.awayTeam.form?.slice(-5).map((result, i) => (
                                    <span
                                      key={i}
                                      className={`w-6 h-6 text-xs font-bold rounded-full flex items-center justify-center ${
                                        result === 'W' ? 'bg-green-500 text-white' :
                                        result === 'D' ? 'bg-yellow-500 text-white' :
                                        'bg-red-500 text-white'
                                      }`}
                                    >
                                      {result}
                                    </span>
                                  )) || <span className="text-gray-500">No form data</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="font-semibold text-gray-700 mb-2">Additional Info</h4>
                            <div className="space-y-1">
                              <div>
                                <span className="font-medium">Tags:</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {fixture.tags?.map((tag, i) => (
                                    <span
                                      key={i}
                                      className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                    >
                                      {tag}
                                    </span>
                                  )) || <span className="text-gray-500">No tags</span>}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Raw JSON data (collapsible) */}
                        <details className="mt-4">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                            View Raw JSON Data
                          </summary>
                          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-60 border">
                            {JSON.stringify(fixture, null, 2)}
                          </pre>
                        </details>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary panel */}
      <div className="bg-gray-50 border-t p-4">
        <h3 className="font-semibold text-gray-700 mb-3">Data Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          
          {/* Competitions breakdown */}
          <div>
            <h4 className="font-medium text-gray-600 mb-2">Competitions Found:</h4>
            <div className="space-y-1">
              {Array.from(new Set(currentFixtures.map(f => f.competition.name))).map(comp => (
                <div key={comp} className="flex justify-between">
                  <span className="text-gray-700">{comp}</span>
                  <span className="font-medium text-blue-600">
                    {currentFixtures.filter(f => f.competition.name === comp).length}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Teams breakdown */}
          <div>
            <h4 className="font-medium text-gray-600 mb-2">Teams (Sample):</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {Array.from(new Set([
                ...currentFixtures.map(f => f.homeTeam.name),
                ...currentFixtures.map(f => f.awayTeam.name)
              ])).slice(0, 8).map(team => (
                <div key={team} className="text-gray-700 text-xs">{team}</div>
              ))}
              {Array.from(new Set([
                ...currentFixtures.map(f => f.homeTeam.name),
                ...currentFixtures.map(f => f.awayTeam.name)
              ])).length > 8 && (
                <div className="text-gray-500 text-xs italic">
                  +{Array.from(new Set([
                    ...currentFixtures.map(f => f.homeTeam.name),
                    ...currentFixtures.map(f => f.awayTeam.name)
                  ])).length - 8} more...
                </div>
              )}
            </div>
          </div>

          {/* Importance distribution */}
          <div>
            <h4 className="font-medium text-gray-600 mb-2">Importance Distribution:</h4>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-red-600">High (8-10):</span>
                <span className="font-medium">{currentFixtures.filter(f => f.importance >= 8).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-orange-600">Medium (6-7):</span>
                <span className="font-medium">{currentFixtures.filter(f => f.importance >= 6 && f.importance < 8).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-600">Low (4-5):</span>
                <span className="font-medium">{currentFixtures.filter(f => f.importance >= 4 && f.importance < 6).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Other (&lt;4):</span>
                <span className="font-medium">{currentFixtures.filter(f => f.importance < 4).length}</span>
              </div>
            </div>
          </div>

          {/* Date range */}
          <div>
            <h4 className="font-medium text-gray-600 mb-2">Date Range:</h4>
            {currentFixtures.length > 0 && (
              <div className="space-y-1 text-xs">
                <div>
                  <span className="font-medium">Earliest:</span>
                  <div className="text-gray-700">
                    {new Date(Math.min(...currentFixtures.map(f => new Date(f.dateTime).getTime()))).toLocaleDateString('en-GB')}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Latest:</span>
                  <div className="text-gray-700">
                    {new Date(Math.max(...currentFixtures.map(f => new Date(f.dateTime).getTime()))).toLocaleDateString('en-GB')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
