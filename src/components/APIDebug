import React, { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Database, TrendingUp } from 'lucide-react';

// Mock API service for demonstration
const mockOddsAPIService = {
  async getOddsForMatch(homeTeam, awayTeam) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock response
    return {
      matchId: `${homeTeam.toLowerCase()}_vs_${awayTeam.toLowerCase()}`,
      totalGoalsOdds: {
        market: 'Over/Under 2.5 Goals',
        overOdds: 1.95,
        underOdds: 1.90
      },
      bttsOdds: {
        market: 'Both Teams To Score',
        yesOdds: 1.85,
        noOdds: 2.00
      },
      totalCardsOdds: {
        market: 'Over/Under 4.5 Cards',
        overOdds: 1.88,
        underOdds: 1.92
      },
      totalCornersOdds: {
        market: 'Over/Under 9.5 Corners',
        overOdds: 1.91,
        underOdds: 1.89
      },
      mostCornersOdds: {
        market: 'Most Corners',
        homeOdds: 2.10,
        awayOdds: 2.20,
        drawOdds: 3.50
      },
      lastFetched: Date.now()
    };
  },
  
  getCacheStatus() {
    return {
      size: 3,
      matches: ['arsenal_vs_chelsea', 'liverpool_vs_mancity', 'manu_vs_tottenham'],
      entries: [
        {
          matchId: 'arsenal_vs_chelsea',
          hasGoalsOdds: true,
          hasBttsOdds: true,
          hasCardsOdds: true,
          hasCornersOdds: true,
          age: 150000
        }
      ]
    };
  },
  
  clearCache() {
    console.log('Cache cleared');
  }
};

const OddsDebugDashboard = () => {
  const [homeTeam, setHomeTeam] = useState('Arsenal');
  const [awayTeam, setAwayTeam] = useState('Chelsea');
  const [loading, setLoading] = useState(false);
  const [oddsData, setOddsData] = useState(null);
  const [error, setError] = useState(null);
  const [cacheStatus, setCacheStatus] = useState(null);
  const [logs, setLogs] = useState([]);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }].slice(-10));
  };

  const fetchOdds = async () => {
    setLoading(true);
    setError(null);
    addLog(`Fetching odds for ${homeTeam} vs ${awayTeam}...`, 'info');

    try {
      const data = await mockOddsAPIService.getOddsForMatch(homeTeam, awayTeam);
      
      if (!data) {
        throw new Error('No odds data returned from API');
      }

      setOddsData(data);
      addLog('✅ Odds data fetched successfully', 'success');
      
      // Update cache status
      const cache = mockOddsAPIService.getCacheStatus();
      setCacheStatus(cache);
    } catch (err) {
      setError(err.message);
      addLog(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = () => {
    mockOddsAPIService.clearCache();
    setCacheStatus(null);
    addLog('🗑️ Cache cleared', 'info');
  };

  const updateCacheStatus = () => {
    const cache = mockOddsAPIService.getCacheStatus();
    setCacheStatus(cache);
    addLog('🔄 Cache status updated', 'info');
  };

  const calculateEV = (percentage, odds) => {
    if (!odds || odds <= 1.05) return 0;
    const prob = percentage / 100;
    const ev = (prob * (odds - 1)) - ((1 - prob) * 1);
    return ev.toFixed(4);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-8 h-8 text-purple-400" />
            <h1 className="text-3xl font-bold text-white">Odds API Debug Dashboard</h1>
          </div>
          <p className="text-purple-200">Test and debug odds fetching, caching, and EV calculations</p>
        </div>

        {/* Input Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Match Selection</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">Home Team</label>
              <input
                type="text"
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Arsenal"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">Away Team</label>
              <input
                type="text"
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="e.g., Chelsea"
              />
            </div>
            <div className="flex items-end gap-2">
              <button
                onClick={fetchOdds}
                disabled={loading}
                className="flex-1 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Fetch Odds
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 backdrop-blur-lg rounded-2xl p-4 border border-red-500/50 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-400 font-semibold">Error</h3>
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Odds Display */}
        {oddsData && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Odds Data</h2>
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                Match ID: {oddsData.matchId}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Goals Market */}
              {oddsData.totalGoalsOdds && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
                    ⚽ {oddsData.totalGoalsOdds.market}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Over 2.5</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.totalGoalsOdds.overOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">Under 2.5</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.totalGoalsOdds.underOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <div className="text-xs text-purple-300">
                        EV (65% hit): {calculateEV(65, oddsData.totalGoalsOdds.overOdds)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BTTS Market */}
              {oddsData.bttsOdds && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
                    🎯 {oddsData.bttsOdds.market}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Yes</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.bttsOdds.yesOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">No</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.bttsOdds.noOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <div className="text-xs text-purple-300">
                        EV (60% hit): {calculateEV(60, oddsData.bttsOdds.yesOdds)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cards Market */}
              {oddsData.totalCardsOdds && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
                    🟨 {oddsData.totalCardsOdds.market}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Over 4.5</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.totalCardsOdds.overOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">Under 4.5</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.totalCardsOdds.underOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <div className="text-xs text-purple-300">
                        EV (70% hit): {calculateEV(70, oddsData.totalCardsOdds.overOdds)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Corners Market */}
              {oddsData.totalCornersOdds && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
                    🚩 {oddsData.totalCornersOdds.market}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Over 9.5</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.totalCornersOdds.overOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">Under 9.5</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.totalCornersOdds.underOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <div className="text-xs text-purple-300">
                        EV (62% hit): {calculateEV(62, oddsData.totalCornersOdds.overOdds)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Most Corners */}
              {oddsData.mostCornersOdds && (
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <h3 className="text-purple-300 font-semibold mb-3 flex items-center gap-2">
                    🏆 {oddsData.mostCornersOdds.market}
                  </h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white">Home</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.mostCornersOdds.homeOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">Away</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.mostCornersOdds.awayOdds.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white">Draw</span>
                      <span className="text-green-400 font-mono font-semibold">
                        {oddsData.mostCornersOdds.drawOdds.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="text-sm text-purple-300">
                Last Fetched: {new Date(oddsData.lastFetched).toLocaleString()}
              </div>
            </div>
          </div>
        )}

        {/* Cache Status */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Cache Status</h2>
            <div className="flex gap-2">
              <button
                onClick={updateCacheStatus}
                className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all duration-200 flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              <button
                onClick={clearCache}
                className="px-4 py-2 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all duration-200"
              >
                Clear Cache
              </button>
            </div>
          </div>

          {cacheStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-purple-300 text-sm mb-1">Cache Size</div>
                  <div className="text-white text-2xl font-bold">{cacheStatus.size}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-purple-300 text-sm mb-1">Cached Matches</div>
                  <div className="text-white text-2xl font-bold">{cacheStatus.matches.length}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <div className="text-purple-300 text-sm mb-1">Hit Rate</div>
                  <div className="text-white text-2xl font-bold">85%</div>
                </div>
              </div>

              {cacheStatus.entries && cacheStatus.entries.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3">Cache Entries</h3>
                  <div className="space-y-2">
                    {cacheStatus.entries.map((entry, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-purple-200">{entry.matchId}</span>
                        <div className="flex gap-2">
                          {entry.hasGoalsOdds && <span className="text-green-400">⚽</span>}
                          {entry.hasCardsOdds && <span className="text-yellow-400">🟨</span>}
                          {entry.hasCornersOdds && <span className="text-blue-400">🚩</span>}
                          <span className="text-purple-300">
                            {Math.floor(entry.age / 1000 / 60)}m ago
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-purple-300">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No cache data available. Fetch some odds to populate the cache.</p>
            </div>
          )}
        </div>

        {/* Activity Logs */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Activity Logs</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center py-8 text-purple-300">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No activity yet. Start fetching odds to see logs.</p>
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-3 p-3 rounded-lg ${
                    log.type === 'error' ? 'bg-red-500/10' :
                    log.type === 'success' ? 'bg-green-500/10' :
                    'bg-white/5'
                  }`}
                >
                  <span className="text-purple-400 text-xs font-mono">{log.timestamp}</span>
                  <span className={`text-sm flex-1 ${
                    log.type === 'error' ? 'text-red-300' :
                    log.type === 'success' ? 'text-green-300' :
                    'text-purple-200'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OddsDebugDashboard;
