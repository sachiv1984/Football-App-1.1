// src/components/debug/DataDebug.tsx
import React, { useState, useEffect } from 'react';
import FootballDataService from '../../services/api/footballDataService';

const DataDebug: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const service = FootballDataService.getInstance();
        
        const [fixtures, standings, freshness] = await Promise.all([
          service.getFixtures(),
          service.getStandings(),
          service.getDataFreshness()
        ]);

        setData({
          fixtures: fixtures.slice(0, 3), // Just first 3 for display
          standings: standings.slice(0, 5), // Top 5
          freshness,
          fixturesCount: fixtures.length,
          standingsCount: standings.length
        });

        setError(null);
      } catch (err) {
        console.error('Debug data load error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="font-bold text-blue-800">🔍 Data Debug</h3>
        <p className="text-blue-600">Loading data files...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <h3 className="font-bold text-red-800">🔍 Data Debug - Error</h3>
        <p className="text-red-600">{error}</p>
        <details className="mt-2">
          <summary className="cursor-pointer text-red-500">Troubleshooting</summary>
          <div className="mt-2 text-sm text-red-600">
            <p>• Make sure you've run: <code>npm run update-data:all</code></p>
            <p>• Check if files exist: <code>public/data/fixtures.json</code></p>
            <p>• Check browser console for more details</p>
            <p>• Verify your API key is set in .env file</p>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div className="p-4 bg-green-50 rounded-lg mb-6">
      <h3 className="font-bold text-green-800 mb-3">🔍 Data Debug - Success!</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-semibold text-green-700">Data Freshness:</h4>
          <p>Fixtures: {new Date(data.freshness.fixtures).toLocaleString()}</p>
          <p>Standings: {new Date(data.freshness.standings).toLocaleString()}</p>
        </div>
        
        <div>
          <h4 className="font-semibold text-green-700">Data Counts:</h4>
          <p>Fixtures: {data.fixturesCount}</p>
          <p>Standings: {data.standingsCount}</p>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="font-semibold text-green-700">Sample Fixture:</h4>
        <pre className="bg-white p-2 rounded text-xs overflow-x-auto">
          {JSON.stringify(data.fixtures[0], null, 2)}
        </pre>
      </div>

      <div className="mt-4">
        <h4 className="font-semibold text-green-700">Top 3 Teams:</h4>
        <ul className="bg-white p-2 rounded">
          {data.standings.map((team: any, index: number) => (
            <li key={team.team.id} className="text-sm">
              {team.position}. {team.team.name} - {team.points} pts
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DataDebug;
