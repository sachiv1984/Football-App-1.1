import React, { useState } from 'react';
import { Trophy, TrendingUp, AlertTriangle, CheckCircle, XCircle, Target, Home, Plane, Info, Zap, Award, Filter } from 'lucide-react';
import { betRankingService, BetTier, RankedBet } from '../../services/ai/betRankingService';
import { MatchContextInsight } from '../../services/ai/matchContextService';

interface UnifiedBettingInsightsProps {
  insights: MatchContextInsight[];
  homeTeam: string;
  awayTeam: string;
}

const UnifiedBettingInsights: React.FC<UnifiedBettingInsightsProps> = ({ 
  insights, 
  homeTeam, 
  awayTeam 
}) => {
  const [selectedTier, setSelectedTier] = useState<'all' | BetTier>('all');
  const [showAccasOnly, setShowAccasOnly] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<'all' | 'home' | 'away'>('all');
  
  // Rank all bets
  const rankedBets = showAccasOnly 
    ? betRankingService.getAccumulatorBets(insights)
    : betRankingService.rankBets(insights);
  
  // Filter by tier
  const tierFiltered = selectedTier === 'all' 
    ? rankedBets 
    : rankedBets.filter(bet => bet.tier === selectedTier);
  
  // Filter by team
  const finalFiltered = selectedTeam === 'all'
    ? tierFiltered
    : tierFiltered.filter(bet => {
        const isHomeTeam = bet.team.toLowerCase() === homeTeam.toLowerCase();
        return selectedTeam === 'home' ? isHomeTeam : !isHomeTeam;
      });
  
  const getTierColor = (tier: BetTier) => {
    switch (tier) {
      case BetTier.EXCELLENT: return 'bg-emerald-500';
      case BetTier.GOOD: return 'bg-blue-500';
      case BetTier.FAIR: return 'bg-yellow-500';
      case BetTier.POOR: return 'bg-orange-500';
      case BetTier.AVOID: return 'bg-red-500';
    }
  };
  
  const getTierBadgeColor = (tier: BetTier) => {
    switch (tier) {
      case BetTier.EXCELLENT: return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case BetTier.GOOD: return 'bg-blue-100 text-blue-800 border-blue-300';
      case BetTier.FAIR: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case BetTier.POOR: return 'bg-orange-100 text-orange-800 border-orange-300';
      case BetTier.AVOID: return 'bg-red-100 text-red-800 border-red-300';
    }
  };
  
  const tierCounts = {
    [BetTier.EXCELLENT]: rankedBets.filter(b => b.tier === BetTier.EXCELLENT).length,
    [BetTier.GOOD]: rankedBets.filter(b => b.tier === BetTier.GOOD).length,
    [BetTier.FAIR]: rankedBets.filter(b => b.tier === BetTier.FAIR).length,
    [BetTier.POOR]: rankedBets.filter(b => b.tier === BetTier.POOR).length,
    [BetTier.AVOID]: rankedBets.filter(b => b.tier === BetTier.AVOID).length,
  };
  
  const accumulatorBets = rankedBets.filter(b => b.accumulatorSafe);
  const bestBet = rankedBets.length > 0 ? rankedBets[0] : null;
  
  const homeCount = rankedBets.filter(b => b.team.toLowerCase() === homeTeam.toLowerCase()).length;
  const awayCount = rankedBets.filter(b => b.team.toLowerCase() === awayTeam.toLowerCase()).length;
  
  return (
    <div className="space-y-6 bg-gray-50 rounded-xl shadow-2xl p-6">
      {/* Header with Summary */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl p-6 shadow-lg">
        <h2 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
          <Trophy className="w-8 h-8" />
          {homeTeam} vs {awayTeam} - Betting Recommendations
        </h2>
        <p className="text-sm opacity-90 mb-4">AI-Ranked betting opportunities based on statistical patterns</p>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-xs opacity-90">Total Insights</p>
            <p className="text-3xl font-bold">{rankedBets.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-xs opacity-90">Excellent</p>
            <p className="text-3xl font-bold text-emerald-300">{tierCounts[BetTier.EXCELLENT]}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-xs opacity-90">Good</p>
            <p className="text-3xl font-bold text-blue-300">{tierCounts[BetTier.GOOD]}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-xs opacity-90">Acca Safe</p>
            <p className="text-3xl font-bold text-yellow-300">{accumulatorBets.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-lg p-3">
            <p className="text-xs opacity-90">Best Score</p>
            <p className="text-3xl font-bold text-green-300">{bestBet?.betScore ?? 0}</p>
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-md space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="font-bold text-gray-800">Filters</h3>
        </div>
        
        {/* Team Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTeam('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedTeam === 'all'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Teams ({rankedBets.length})
          </button>
          <button
            onClick={() => setSelectedTeam('home')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              selectedTeam === 'home'
                ? 'bg-green-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Home className="w-4 h-4" />
            {homeTeam} ({homeCount})
          </button>
          <button
            onClick={() => setSelectedTeam('away')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              selectedTeam === 'away'
                ? 'bg-orange-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Plane className="w-4 h-4" />
            {awayTeam} ({awayCount})
          </button>
        </div>
        
        {/* Tier Filter */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedTier('all')}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              selectedTier === 'all'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Tiers
          </button>
          <button
            onClick={() => setSelectedTier(BetTier.EXCELLENT)}
            className={`px-3 py-2 rounded-lg font-semibold transition-all ${
              selectedTier === BetTier.EXCELLENT
                ? 'bg-emerald-500 text-white shadow-lg'
                : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
            }`}
          >
            Excellent ({tierCounts[BetTier.EXCELLENT]})
          </button>
          <button
            onClick={() => setSelectedTier(BetTier.GOOD)}
            className={`px-3 py-2 rounded-lg font-semibold transition-all ${
              selectedTier === BetTier.GOOD
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
            }`}
          >
            Good ({tierCounts[BetTier.GOOD]})
          </button>
          <button
            onClick={() => setSelectedTier(BetTier.FAIR)}
            className={`px-3 py-2 rounded-lg font-semibold transition-all ${
              selectedTier === BetTier.FAIR
                ? 'bg-yellow-500 text-white shadow-lg'
                : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
            }`}
          >
            Fair ({tierCounts[BetTier.FAIR]})
          </button>
        </div>
        
        {/* Acca Toggle */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAccasOnly}
              onChange={(e) => setShowAccasOnly(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded"
            />
            <span className="font-semibold text-gray-700">
              Show Accumulator-Safe Bets Only ({accumulatorBets.length})
            </span>
          </label>
        </div>
      </div>
      
      {/* Best Bet Highlight */}
      {bestBet && !showAccasOnly && selectedTier === 'all' && selectedTeam === 'all' && bestBet.betScore >= 75 && (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border-4 border-yellow-400 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-10 h-10 text-yellow-600" />
            <div>
              <h3 className="text-2xl font-extrabold text-gray-900">
                🏆 TOP PICK - Highest Ranked Bet
              </h3>
              <p className="text-sm text-gray-600">This is statistically the strongest opportunity in this match</p>
            </div>
          </div>
          {/* 💥 FIX APPLIED HERE: Added homeTeam and awayTeam props */}
          <BetCard 
            bet={bestBet} 
            isHighlight={true} 
            rank={1}
            homeTeam={homeTeam} // <-- FIX
            awayTeam={awayTeam} // <-- FIX
          />
        </div>
      )}
      
      {/* Bet List */}
      <div className="space-y-4">
        {finalFiltered.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center shadow-md">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-xl font-bold text-gray-600">No bets match your filters</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filter settings</p>
          </div>
        ) : (
          finalFiltered.map((bet, idx) => (
            <BetCard 
              key={idx} 
              bet={bet} 
              rank={showAccasOnly || selectedTier !== 'all' ? undefined : idx + 1}
              homeTeam={homeTeam}
              awayTeam={awayTeam}
            />
          ))
        )}
      </div>
      
      {/* Summary Footer */}
      {finalFiltered.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-md">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Info className="w-5 h-5" />
            Betting Strategy Summary
          </h3>
          <div className="space-y-2 text-sm text-gray-700">
            <p>• <strong>{tierCounts[BetTier.EXCELLENT]}</strong> Excellent bets (80+ score) - Heavy stake recommended</p>
            <p>• <strong>{tierCounts[BetTier.GOOD]}</strong> Good bets (65-79 score) - Standard stake</p>
            <p>• <strong>{accumulatorBets.length}</strong> bets qualify for accumulators (strict criteria met)</p>
            <p className="text-xs text-gray-500 mt-4">
              Tip: For best results, focus on Excellent and Good tiers. Avoid betting on Fair/Poor unless you have strong personal conviction.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

const BetCard: React.FC<{ 
  bet: RankedBet; 
  rank?: number; 
  isHighlight?: boolean;
  homeTeam: string;
  awayTeam: string;
}> = ({ bet, rank, isHighlight = false, homeTeam, awayTeam }) => {
  const [expanded, setExpanded] = useState(isHighlight);
  
  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500 to-green-400';
    if (score >= 65) return 'from-blue-500 to-blue-400';
    if (score >= 45) return 'from-yellow-500 to-yellow-400';
    if (score >= 30) return 'from-orange-500 to-orange-400';
    return 'from-red-500 to-red-400';
  };
  
  const getTierBorderColor = (tier: BetTier) => {
    switch (tier) {
      case BetTier.EXCELLENT: return 'border-emerald-500 hover:border-emerald-600';
      case BetTier.GOOD: return 'border-blue-500 hover:border-blue-600';
      case BetTier.FAIR: return 'border-yellow-500 hover:border-yellow-600';
      case BetTier.POOR: return 'border-orange-500 hover:border-orange-600';
      case BetTier.AVOID: return 'border-red-500 hover:border-red-600';
    }
  };
  
  const getMarketColor = (market: string) => {
    const colors: Record<string, string> = {
      cards: 'bg-yellow-100 text-yellow-800',
      corners: 'bg-blue-100 text-blue-800',
      fouls: 'bg-red-100 text-red-800',
      goals: 'bg-green-100 text-green-800',
      shots_on_target: 'bg-purple-100 text-purple-800',
      total_shots: 'bg-violet-100 text-violet-800',
      both_teams_to_score: 'bg-indigo-100 text-indigo-800',
      total_match_corners: 'bg-cyan-100 text-cyan-800',
      total_match_cards: 'bg-amber-100 text-amber-800'
    };
    return colors[market] || 'bg-gray-100 text-gray-800';
  };
  
  const isHomeTeam = bet.team.toLowerCase() === homeTeam.toLowerCase();
  const teamColor = isHomeTeam ? 'text-green-700' : 'text-orange-700';
  const teamBg = isHomeTeam ? 'bg-green-50' : 'bg-orange-50';
  
  return (
    <div 
      className={`bg-white rounded-xl border-2 ${getTierBorderColor(bet.tier)} shadow-lg overflow-hidden transition-all hover:shadow-xl ${
        isHighlight ? 'ring-4 ring-yellow-300' : ''
      }`}
    >
      {/* Card Header - Always Visible */}
      <div 
        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {rank && (
              <div className={`w-12 h-12 rounded-full ${bet.betScore >= 80 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' : 'bg-gray-200'} flex items-center justify-center font-bold text-xl ${bet.betScore >= 80 ? 'text-white' : 'text-gray-700'} shadow-md flex-shrink-0`}>
                #{rank}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <div className={`px-3 py-1 rounded-full ${teamBg} ${teamColor} font-bold text-sm flex items-center gap-1`}>
                  {isHomeTeam ? <Home className="w-3 h-3" /> : <Plane className="w-3 h-3" />}
                  {bet.team}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getMarketColor(bet.market)}`}>
                  {bet.market.replace(/_/g, ' ').toUpperCase()}
                </span>
                {bet.isStreak && bet.streakLength && (
                  <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {bet.streakLength} Game Streak
                  </span>
                )}
              </div>
              <h4 className="text-xl font-extrabold text-gray-900 mb-1">{bet.outcome}</h4>
              <p className="text-sm text-gray-600">
                {bet.hitRate}% hit rate • {bet.matchesAnalyzed} matches • Avg: {bet.averageValue}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-shrink-0">
            {bet.accumulatorSafe && (
              <div className="hidden sm:block px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold border-2 border-purple-300">
                ✓ ACCA SAFE
              </div>
            )}
            
            <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getScoreGradient(bet.betScore)} flex items-center justify-center shadow-lg flex-shrink-0`}>
              <div className="text-center text-white">
                <p className="text-2xl font-extrabold">{bet.betScore}</p>
                <p className="text-xs font-semibold">SCORE</p>
              </div>
            </div>
            
            <TrendingUp className={`w-6 h-6 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </div>
      
      {/* Expanded Details */}
      {expanded && (
        <div className="border-t-2 border-gray-200 p-6 space-y-6 bg-gray-50">
          
          {/* Recommendation Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h5 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
              <Award className="w-5 h-5" />
              Match Analysis & Recommendation
            </h5>
            <p className="text-sm text-blue-800 leading-relaxed">
              {bet.matchContext.recommendation}
            </p>
          </div>
          
          {/* Why This Tier */}
          <div>
            <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Why This Bet is Ranked "{bet.tier}"
            </h5>
            <ul className="space-y-2">
              {bet.reasoning.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white p-2 rounded">
                  <span className="text-green-500 mt-0.5 flex-shrink-0">✓</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Red Flags */}
          {bet.redFlags.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded p-4">
              <h5 className="font-bold text-red-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                Red Flags & Risks
              </h5>
              <ul className="space-y-1">
                {bet.redFlags.map((flag, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-red-700">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">⚠</span>
                    <span>{flag}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Key Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase mb-1">Confidence</p>
              <p className="text-2xl font-bold text-gray-900">{bet.context?.confidence?.score ?? 0}<span className="text-sm">/100</span></p>
              <p className="text-xs text-gray-600">{bet.context?.confidence?.level}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase mb-1">Matchup</p>
              <p className="text-2xl font-bold text-gray-900">{bet.matchContext.strengthOfMatch}</p>
              <p className="text-xs text-gray-600">vs Opposition</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase mb-1">Data Quality</p>
              <p className="text-2xl font-bold text-gray-900">{bet.matchContext.dataQuality}</p>
              <p className="text-xs text-gray-600">{bet.matchContext.oppositionMatches}m opponent</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500 uppercase mb-1">Opposition Avg</p>
              <p className="text-2xl font-bold text-gray-900">{bet.matchContext.oppositionAllows}</p>
              <p className="text-xs text-gray-600">{bet.matchContext.venueSpecific ? 'Venue-specific' : 'All matches'}</p>
            </div>
          </div>
          
          {/* Home/Away Venue Split */}
          {bet.context?.homeAwaySupportForSample && (
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <h5 className="font-bold text-gray-900 mb-3 text-sm">Venue Consistency (Pattern Sample)</h5>
              <div className="grid grid-cols-2 gap-3">
                {bet.context.homeAwaySupportForSample.home.matches > 0 && (
                  <div className={`p-3 rounded border-2 ${bet.matchContext.isHome ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Home className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-bold text-gray-700">HOME ({bet.context.homeAwaySupportForSample.home.matches}m)</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{bet.context.homeAwaySupportForSample.home.hitRate}%</p>
                    <p className="text-xs text-gray-600">Avg: {bet.context.homeAwaySupportForSample.home.average}</p>
                  </div>
                )}
                {bet.context.homeAwaySupportForSample.away.matches > 0 && (
                  <div className={`p-3 rounded border-2 ${!bet.matchContext.isHome ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Plane className="w-4 h-4 text-gray-600" />
                      <span className="text-xs font-bold text-gray-700">AWAY ({bet.context.homeAwaySupportForSample.away.matches}m)</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{bet.context.homeAwaySupportForSample.away.hitRate}%</p>
                    <p className="text-xs text-gray-600">Avg: {bet.context.homeAwaySupportForSample.away.average}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Recent Form */}
          <div>
            <h5 className="font-bold text-gray-900 mb-3 text-sm">Recent Form (Last {Math.min(5, bet.recentMatches.length)} Matches)</h5>
            <div className="space-y-2">
              {bet.recentMatches.slice(0, 5).map((match, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded transition-colors ${
                    match.hit ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${match.hit ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-medium text-gray-700">vs {match.opponent}</span>
                    {match.isHome !== undefined && (
                      match.isHome ? <Home className="w-3 h-3 text-gray-400" /> : <Plane className="w-3 h-3 text-gray-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">{match.value}</span>
                    {match.hit ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedBettingInsights;
