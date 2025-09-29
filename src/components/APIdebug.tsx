// src/components/APIdebug.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, XCircle, RefreshCw, Database, TrendingUp, Wifi, WifiOff, Eye, Code } from 'lucide-react';

const APIdebug = () => {
  const [homeTeam, setHomeTeam] = useState('Arsenal');
  const [awayTeam, setAwayTeam] = useState('Chelsea');
  const [loading, setLoading] = useState(false);
  const [oddsData, setOddsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheStatus, setCacheStatus] = useState<any>(null);
  const [logs, setLogs] = useState<Array<{ timestamp: string; message: string; type: string }>>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState('unknown');
  const [rawResponse, setRawResponse] = useState<any>(null);
  const [showRawData, setShowRawData] = useState(false);

  // Common Premier League teams for quick testing
  const premierLeagueTeams = [
    'Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton',
    'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Liverpool',
    'Luton Town', 'Manchester City', 'Manchester United', 'Newcastle',
    'Nottingham Forest', 'Sheffield United', 'Tottenham', 'West Ham', 'Wolves'
  ];

  const addLog = (message: string, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 20));
  };

  // Check API key status on mount
  useEffect(() => {
    checkApiKeyStatus();
  }, []);

  const checkApiKeyStatus = () => {
    // Check if API key exists (client-side check)
    const hasKey = typeof process !== 'undefined' && process.env?.ODDS_API_KEY;
    const hasViteKey = typeof import.meta !== 'undefined' && import.meta.env?.VITE_ODDS_API_KEY;
    
    if (hasKey || hasViteKey) {
      setApiKeyStatus('configured');
      addLog('✅ API key detected in environment', 'success');
    } else {
      setApiKeyStatus('missing');
      addLog('⚠️ No API key detected - using mock mode', 'warning');
    }
  };

  const fetchOdds = async () => {
    setLoading(true);
    setError(null);
    setRawResponse(null);
    addLog(`🔍 Fetching odds for ${homeTeam} vs ${awayTeam}...`, 'info');

    try {
      // TODO: Replace with actual API call
      // import { oddsAPIService } from '../services/api/oddsAPIService';
      // const data = await oddsAPIService.getOddsForMatch(homeTeam, awayTeam);
      
      // Mock the API response structure for now
      const normalizedHome = homeTeam.toLowerCase().replace(/\s+/g, '');
      const normalizedAway = awayTeam.toLowerCase().replace(/\s+/g, '');
      const matchId = `${normalizedHome}_vs_${normalizedAway}`;
      
      addLog(`📝 Generated Match ID: ${matchId}`, 'info');

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      const mockData = {
        matchId,
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
        homeCardsOdds: {
          market: 'Home Team Over/Under 2.5 Cards',
          overOdds: 2.10,
          underOdds: 1.75
        },
        awayCardsOdds: {
          market: 'Away Team Over/Under 2.5 Cards',
          overOdds: 2.05,
          underOdds: 1.78
        },
        mostCardsOdds: {
          market: 'Most Cards',
          homeOdds: 2.20,
          awayOdds: 2.10,
          drawOdds: 3.50
        },
        totalCornersOdds: {
          market: 'Over/Under 9.5 Corners',
          overOdds: 1.91,
          underOdds: 1.89
        },
        homeCornersOdds: {
          market: 'Home Team Over/Under 4.5 Corners',
          overOdds: 1.95,
          underOdds: 1.85
        },
        awayCornersOdds: {
          market: 'Away Team Over/Under 4.5 Corners',
          overOdds: 2.00,
          underOdds: 1.80
        },
        mostCornersOdds: {
          market: 'Most Corners',
          homeOdds: 2.10,
          awayOdds: 2.20,
          drawOdds: 3.50
        },
        lastFetched: Date.now()
      };

      setOddsData(mockData);
      setRawResponse(mockData);
      addLog('✅ Odds data fetched successfully', 'success');
      addLog(`📊 Markets found: Goals, BTTS, Cards, Corners`, 'success');
      
      // Update cache status
      updateCacheStatus();
    } catch (err: any) {
      setError(err.message);
      addLog(`❌ Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateCacheStatus = () => {
    // Mock cache status
    const mockCache = {
      size: 3,
      matches: ['arsenal_vs_chelsea', 'liverpool_vs_mancity', 'manu_vs_tottenham'],
      entries: [
        {
          matchId: 'arsenal_vs_chelsea',
          hasGoalsOdds: true,
          hasBttsOdds: true,
          hasCardsOdds: true,
          hasMostCardsOdds: true,
          hasCornersOdds: true,
          age: 150000
        },
        {
          matchId: 'liverpool_vs_mancity',
          hasGoalsOdds: true,
          hasBttsOdds: true,
          hasCardsOdds: false,
          hasMostCardsOdds: false,
          hasCornersOdds: true,
          age: 350000
        }
      ]
    };
    
    setCacheStatus(mockCache);
    addLog('🔄 Cache status updated', 'info');
  };

  const clearCache = () => {
    setCacheStatus(null);
    addLog('🗑️ Cache cleared', 'info');
  };

  const calculateEV = (percentage: number, odds: number) => {
    if (!odds || odds <= 1.05) return 0;
    const prob = percentage / 100;
    const ev = (prob * (odds - 1)) - ((1 - prob) * 1);
    return ev.toFixed(4);
  };

  const calculateImpliedProb = (odds: number) => {
    if (!odds || odds <= 1) return 0;
    return ((1 / odds) * 100).toFixed(1);
  };

  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-300 bg-red-500/10';
      case 'success': return 'text-green-300 bg-green-500/10';
      case 'warning': return 'text-yellow-300 bg-yellow-500/10';
      default: return 'text-purple-200 bg-white/5';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-purple-400" />
              <div>
                <h1 className="text-3xl font-bold text-white">Odds API Debug Dashboard</h1>
                <p className="text-purple-200 text-sm mt-1">Test odds fetching, caching, and EV calculations</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              apiKeyStatus === 'configured' ? 'bg-green-500/20 text-green-300' :
              apiKeyStatus === 'missing' ? 'bg-yellow-500/20 text-yellow-300' :
              'bg-gray-500/20 text-gray-300'
            }`}>
              {apiKeyStatus === 'configured' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {apiKeyStatus === 'configured' ? 'API Connected' : 
                 apiKeyStatus === 'missing' ? 'Mock Mode' : 'Unknown'}
              </span>
            </div>
          </div>
        </div>

        {/* API Configuration Info */}
        <div className="bg-blue-500/10 backdrop-blur-lg rounded-2xl p-4 border border-blue-500/30">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-blue-300 font-semibold mb-1">Configuration Check</h3>
              <p className="text-blue-200 text-sm mb-2">
                This dashboard simulates your oddsAPIService. To use real data:
              </p>
              <ul className="text-blue-200 text-sm space-y-1 list-disc list-inside">
                <li>Set <code className="bg-blue-900/30 px-1 rounded">ODDS_API_KEY</code> in your .env file</li>
                <li>Or set <code className="bg-blue-900/30 px-1 rounded">VITE_ODDS_API_KEY</code> for Vite projects</li>
                <li>Current sport key: <code className="bg-blue-900/30 px-1 rounded">soccer_epl</code></li>
                <li>Bookmaker: <code className="bg-blue-900/30 px-1 rounded">draftkings</code></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Match Selection */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4">Match Selection</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">Home Team</label>
              <select
                value={homeTeam}
                onChange={(e) => setHomeTeam(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {premierLeagueTeams.map(team => (
                  <option key={team} value={team} className="bg-slate-800">{team}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">Away Team</label>
              <select
                value={awayTeam}
                onChange={(e) => setAwayTeam(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {premierLeagueTeams.filter(t => t !== homeTeam).map(team => (
                  <option key={team} value={team} className="bg-slate-800">{team}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchOdds}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Fetching Odds...
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  Fetch Odds
                </>
              )}
            </button>
            <button
              onClick={() => setShowRawData(!showRawData)}
              className="px-6 py-3 bg-white/5 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-all duration-200 flex items-center gap-2"
            >
              <Code className="w-5 h-5" />
              {showRawData ? 'Hide' : 'Show'} Raw
            </button>
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

        {/* Raw Response Data */}
        {showRawData && rawResponse && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Raw API Response</h2>
              <button
                onClick={() => navigator.clipboard.writeText(JSON.stringify(rawResponse, null, 2))}
                className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded text-sm hover:bg-purple-500/30"
              >
                Copy JSON
              </button>
            </div>
            <pre className="bg-black/30 p-4 rounded-lg overflow-auto max-h-96 text-sm text-green-400 font-mono">
              {JSON.stringify(rawResponse, null, 2)}
            </pre>
          </div>
        )}

        {/* Odds Display - Compact version to save space */}
        {oddsData && !showRawData && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-white">Odds Data</h2>
              <div className="flex items-center gap-2 text-sm text-green-400">
                <CheckCircle className="w-4 h-4" />
                Match ID: <code className="bg-white/5 px-2 py-1 rounded text-xs">{oddsData.matchId}</code>
              </div>
            </div>

            {/* Goals & Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Goals */}
              {oddsData.totalGoalsOdds && (
                <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl p-4 border border-green-500/20">
                  <h4 className="text-green-300 font-semibold mb-2 text-sm">⚽ Total Goals 2.5</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Over</span>
                      <span className="text-green-400 font-mono font-bold">{oddsData.totalGoalsOdds.overOdds.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Under</span>
                      <span className="text-green-400 font-mono font-bold">{oddsData.totalGoalsOdds.underOdds.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-400 pt-1 border-t border-white/10">
                      EV @65%: {calculateEV(65, oddsData.totalGoalsOdds.overOdds)}
                    </div>
                  </div>
                </div>
              )}

              {/* BTTS */}
              {oddsData.bttsOdds && (
                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl p-4 border border-blue-500/20">
                  <h4 className="text-blue-300 font-semibold mb-2 text-sm">🎯 BTTS</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Yes</span>
                      <span className="text-blue-400 font-mono font-bold">{oddsData.bttsOdds.yesOdds.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white">No</span>
                      <span className="text-blue-400 font-mono font-bold">{oddsData.bttsOdds.noOdds.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-400 pt-1 border-t border-white/10">
                      EV @60%: {calculateEV(60, oddsData.bttsOdds.yesOdds)}
                    </div>
                  </div>
                </div>
              )}

              {/* Cards */}
              {oddsData.totalCardsOdds && (
                <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-xl p-4 border border-yellow-500/20">
                  <h4 className="text-yellow-300 font-semibold mb-2 text-sm">🟨 Total Cards 4.5</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Over</span>
                      <span className="text-yellow-400 font-mono font-bold">{oddsData.totalCardsOdds.overOdds.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Under</span>
                      <span className="text-yellow-400 font-mono font-bold">{oddsData.totalCardsOdds.underOdds.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-400 pt-1 border-t border-white/10">
                      EV @70%: {calculateEV(70, oddsData.totalCardsOdds.overOdds)}
                    </div>
                  </div>
                </div>
              )}

              {/* Corners */}
              {oddsData.totalCornersOdds && (
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-4 border border-indigo-500/20">
                  <h4 className="text-indigo-300 font-semibold mb-2 text-sm">🚩 Total Corners 9.5</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Over</span>
                      <span className="text-indigo-400 font-mono font-bold">{oddsData.totalCornersOdds.overOdds.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-white">Under</span>
                      <span className="text-indigo-400 font-mono font-bold">{oddsData.totalCornersOdds.underOdds.toFixed(2)}</span>
                    </div>
                    <div className="text-xs text-gray-400 pt-1 border-t border-white/10">
                      EV @62%: {calculateEV(62, oddsData.totalCornersOdds.overOdds)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/20 text-center">
              <div className="text-sm text-purple-300">
                Last Fetched: {new Date(oddsData.lastFetched).toLocaleString()} • Cache TTL: 10 minutes
              </div>
            </div>
          </div>
        )}

        {/* Cache Status & Activity Logs Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cache Status */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Cache Status</h2>
              <div className="flex gap-2">
                <button
                  onClick={updateCacheStatus}
                  className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-all text-sm flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh
                </button>
                <button
                  onClick={clearCache}
                  className="px-3 py-1 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition-all text-sm"
                >
                  Clear
                </button>
              </div>
            </div>

            {cacheStatus ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-purple-300 text-xs mb-1">Size</div>
                    <div className="text-white text-xl font-bold">{cacheStatus.size}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-purple-300 text-xs mb-1">Matches</div>
                    <div className="text-white text-xl font-bold">{cacheStatus.matches.length}</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-purple-300 text-xs mb-1">Hit Rate</div>
                    <div className="text-white text-xl font-bold">85%</div>
                  </div>
                </div>

                {cacheStatus.entries && cacheStatus.entries.length > 0 && (
                  <div className="bg-white/5 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3 text-sm">Cached Entries</h3>
                    <div className="space-y-2">
                      {cacheStatus.entries.map((entry: any, idx: number) => (
                        <div key={idx} className="bg-black/20 rounded p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-purple-200 text-sm font-mono">{entry.matchId}</span>
                            <span className="text-purple-300 text-xs">
                              {Math.floor(entry.age / 1000 / 60)}m ago
                            </span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            {entry.hasGoalsOdds && (
                              <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded">⚽ Goals</span>
                            )}
                            {entry.hasBttsOdds && (
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">🎯 BTTS</span>
                            )}
                            {entry.hasCardsOdds && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded">🟨 Cards</span>
                            )}
                            {entry.hasCornersOdds && (
                              <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded">🚩 Corners</span>
                            )}
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
                <p className="text-sm">No cache data. Fetch odds to populate.</p>
              </div>
            )}
          </div>

          {/* Activity Logs */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Activity Logs</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-8 text-purple-300">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No activity yet. Start fetching odds.</p>
                </div>
              ) : (
                logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2 p-2 rounded-lg text-xs ${getLogColor(log.type)}`}
                  >
                    <span className="text-purple-400 font-mono flex-shrink-0">{log.timestamp}</span>
                    <span className="flex-1">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default APIdebug;
