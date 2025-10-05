// src/components/insights/BettingPatterns/MatchBettingPatterns.tsx
import React from 'react';
import { TrendingUp, Target, Home, Plane, Award, Info } from 'lucide-react';

interface RecentMatch {
  opponent: string;
  value: number;
  hit: boolean;
  date?: string;
  isHome?: boolean;
}

export interface BettingInsight {
  team: string;
  market: string; 
  outcome: string;
  hitRate: number;
  matchesAnalyzed: number;
  isStreak: boolean;
  streakLength?: number; 
  threshold: number;
  averageValue: number;
  comparison?: string;
  recentMatches: RecentMatch[];
  context?: {
    homeAwaySupport?: {
      home: { hitRate: number; matches: number; average: number };
      away: { hitRate: number; matches: number; average: number };
    };
    confidence?: {
      score: number;
      level: 'Low' | 'Medium' | 'High' | 'Very High';
      factors: string[];
    };
  };
}

interface MatchBettingPatternsProps {
  insights: BettingInsight[];
  homeTeam: string;
  awayTeam: string;
}

const MatchBettingPatterns: React.FC<MatchBettingPatternsProps> = ({
  insights,
  homeTeam,
  awayTeam
}) => {
  const getMarketColor = (market: string) => {
    const colors: Record<string, string> = {
      cards: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      corners: 'bg-blue-100 text-blue-800 border-blue-200',
      fouls: 'bg-red-100 text-red-800 border-red-200',
      goals: 'bg-green-100 text-green-800 border-green-200',
      shots_on_target: 'bg-purple-100 text-purple-800 border-purple-200',
      total_shots: 'bg-violet-100 text-violet-800 border-violet-200',
      both_teams_to_score: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[market] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getMarketLabel = (market: string) => {
    const labels: Record<string, string> = {
      cards: 'Cards',
      corners: 'Corners',
      fouls: 'Fouls',
      goals: 'Goals',
      shots_on_target: 'Shots on Target',
      total_shots: 'Total Shots',
      both_teams_to_score: 'BTTS'
    };
    return labels[market] || market;
  };

  const getConfidenceColor = (level?: string) => {
    switch (level) {
      case 'Very High':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'High':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Medium':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Low':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Group insights by team
  const homeTeamInsights = insights.filter(
    i => i.team.toLowerCase() === homeTeam.toLowerCase()
  );
  const awayTeamInsights = insights.filter(
    i => i.team.toLowerCase() === awayTeam.toLowerCase()
  );

  const TeamInsightsSection = ({ 
    teamName, 
    teamInsights, 
    colorClass,
    isHome
  }: { 
    teamName: string; 
    teamInsights: BettingInsight[];
    colorClass: string;
    isHome: boolean;
  }) => {
    if (teamInsights.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
          <h3 className="text-lg font-semibold text-gray-900">{teamName}</h3>
          {isHome ? (
            <Home className="w-4 h-4 text-gray-500" />
          ) : (
            <Plane className="w-4 h-4 text-gray-500" />
          )}
          <span className="text-sm text-gray-500">
            ({teamInsights.length} pattern{teamInsights.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {teamInsights.map((insight, idx) => {
            const confidence = insight.context?.confidence;
            const homeAwaySupport = insight.context?.homeAwaySupport;
            const venueData = isHome ? homeAwaySupport?.home : homeAwaySupport?.away;

            return (
              <div 
                key={idx}
                className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Card Header */}
                <div className={`p-4 border-b ${
                  insight.isStreak 
                    ? 'bg-gradient-to-r from-purple-50 to-purple-100' 
                    : 'bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">{insight.outcome}</p>
                    </div>
                    {confidence && (
                      <div className={`px-2 py-1 rounded text-xs font-bold border ${getConfidenceColor(confidence.level)}`}>
                        {confidence.score}/100
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${getMarketColor(insight.market)}`}>
                      {getMarketLabel(insight.market)}
                    </span>
                    {insight.isStreak && insight.streakLength && (
                      <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {insight.streakLength} match streak
                      </span>
                    )}
                    {confidence && (
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getConfidenceColor(confidence.level)}`}>
                        <Award className="w-3 h-3 inline mr-1" />
                        {confidence.level}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Hit Rate Badge */}
                  <div className="flex items-center justify-between">
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <p className="text-xs text-green-600 font-medium uppercase mb-1">Hit Rate</p>
                      <p className="text-2xl font-bold text-green-800">{insight.hitRate}%</p>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-xs text-gray-500 uppercase">Sample Size</p>
                      <p className="text-lg font-bold text-gray-900">{insight.matchesAnalyzed} matches</p>
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Threshold</p>
                      <p className="text-lg font-bold text-gray-900">{insight.threshold}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase mb-1">Average</p>
                      <p className="text-lg font-bold text-gray-900">{insight.averageValue}</p>
                      {insight.averageValue > insight.threshold && (
                        <p className="text-xs text-green-600 font-medium">
                          +{((insight.averageValue - insight.threshold) / insight.threshold * 100).toFixed(0)}% above
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Home/Away Performance */}
                  {homeAwaySupport && (homeAwaySupport.home.matches > 0 || homeAwaySupport.away.matches > 0) && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 uppercase mb-2">Venue Performance</p>
                      <div className="grid grid-cols-2 gap-2">
                        {homeAwaySupport.home.matches > 0 && (
                          <div className={`p-2 rounded border-2 ${
                            isHome ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex items-center gap-1 mb-1">
                              <Home className="w-3 h-3 text-gray-600" />
                              <span className="text-xs font-semibold text-gray-700">HOME</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900">{homeAwaySupport.home.hitRate}%</p>
                            <p className="text-xs text-gray-600">{homeAwaySupport.home.matches}m | Avg: {homeAwaySupport.home.average}</p>
                          </div>
                        )}
                        {homeAwaySupport.away.matches > 0 && (
                          <div className={`p-2 rounded border-2 ${
                            !isHome ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
                          }`}>
                            <div className="flex items-center gap-1 mb-1">
                              <Plane className="w-3 h-3 text-gray-600" />
                              <span className="text-xs font-semibold text-gray-700">AWAY</span>
                            </div>
                            <p className="text-lg font-bold text-gray-900">{homeAwaySupport.away.hitRate}%</p>
                            <p className="text-xs text-gray-600">{homeAwaySupport.away.matches}m | Avg: {homeAwaySupport.away.average}</p>
                          </div>
                        )}
                      </div>
                      {venueData && venueData.hitRate < 100 && (
                        <p className="text-xs text-yellow-600 mt-2 flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>Lower {isHome ? 'home' : 'away'} hit rate ({venueData.hitRate}%) - pattern may be venue-dependent</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Confidence Factors */}
                  {confidence && confidence.factors.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 uppercase mb-2">Confidence Factors</p>
                      <div className="space-y-1">
                        {confidence.factors.slice(0, 3).map((factor, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-green-500 mt-0.5">✓</span>
                            <span className="text-xs text-gray-700">{factor}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent Matches Preview */}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-500 uppercase mb-2">Last 3 Matches</p>
                    <div className="space-y-1">
                      {insight.recentMatches.slice(0, 3).map((match: RecentMatch, matchIdx: number) => (
                        <div
                          key={matchIdx}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              match.hit ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span className="text-gray-700 font-medium">vs {match.opponent}</span>
                            {match.isHome !== undefined && (
                              match.isHome ? (
                                <Home className="w-3 h-3 text-gray-400" />
                              ) : (
                                <Plane className="w-3 h-3 text-gray-400" />
                              )
                            )}
                          </div>
                          <span className="text-gray-900 font-bold">{match.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Home Team Patterns */}
      <TeamInsightsSection 
        teamName={homeTeam}
        teamInsights={homeTeamInsights}
        colorClass="bg-green-500"
        isHome={true}
      />

      {/* Away Team Patterns */}
      <TeamInsightsSection 
        teamName={awayTeam}
        teamInsights={awayTeamInsights}
        colorClass="bg-orange-500"
        isHome={false}
      />

      {/* If no patterns for either team */}
      {insights.length === 0 && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No patterns detected</p>
          <p className="text-sm text-gray-500 mt-1">
            No 100% hit rate patterns found for either team
          </p>
        </div>
      )}
    </div>
  );
};

export default MatchBettingPatterns;// src/components/insights/BettingPatterns/MatchBettingPatterns.tsx
import React from 'react';
import { TrendingUp, Target } from 'lucide-react';

// --- TYPE DEFINITIONS FIXED HERE to resolve TS2322 ---
interface RecentMatch {
  opponent: string;
  value: number;
  hit: boolean;
  date?: string; // <-- FIXED: Made optional to match service definition
}

export interface BettingInsight {
  team: string;
  market: string; 
  outcome: string;
  hitRate: number;
  matchesAnalyzed: number;
  isStreak: boolean;
  streakLength?: number; 
  threshold: number;
  averageValue: number;
  recentMatches: RecentMatch[];
}
// -------------------------------------------

interface MatchBettingPatternsProps {
  insights: BettingInsight[];
  homeTeam: string;
  awayTeam: string;
}

const MatchBettingPatterns: React.FC<MatchBettingPatternsProps> = ({
  insights,
  homeTeam,
  awayTeam
}) => {
  const getMarketColor = (market: string) => {
    const colors: Record<string, string> = {
      cards: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      corners: 'bg-blue-100 text-blue-800 border-blue-200',
      fouls: 'bg-red-100 text-red-800 border-red-200',
      goals: 'bg-green-100 text-green-800 border-green-200',
      shots_on_target: 'bg-purple-100 text-purple-800 border-purple-200',
      total_shots: 'bg-violet-100 text-violet-800 border-violet-200',
      both_teams_to_score: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    };
    return colors[market] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getMarketLabel = (market: string) => {
    const labels: Record<string, string> = {
      cards: 'Cards',
      corners: 'Corners',
      fouls: 'Fouls',
      goals: 'Goals',
      shots_on_target: 'Shots on Target',
      total_shots: 'Total Shots',
      both_teams_to_score: 'BTTS'
    };
    return labels[market] || market;
  };

  // Group insights by team
  const homeTeamInsights = insights.filter(
    i => i.team.toLowerCase() === homeTeam.toLowerCase()
  );
  const awayTeamInsights = insights.filter(
    i => i.team.toLowerCase() === awayTeam.toLowerCase()
  );

  const TeamInsightsSection = ({ 
    teamName, 
    teamInsights, 
    colorClass 
  }: { 
    teamName: string; 
    teamInsights: BettingInsight[];
    colorClass: string;
  }) => {
    if (teamInsights.length === 0) return null;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
          <h3 className="text-lg font-semibold text-gray-900">{teamName}</h3>
          <span className="text-sm text-gray-500">
            ({teamInsights.length} pattern{teamInsights.length !== 1 ? 's' : ''})
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {teamInsights.map((insight, idx) => (
            <div 
              key={idx}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Card Header */}
              <div className={`p-4 border-b ${
                insight.isStreak 
                  ? 'bg-gradient-to-r from-purple-50 to-purple-100' 
                  : 'bg-gray-50'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{insight.outcome}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold border ${getMarketColor(insight.market)}`}>
                        {getMarketLabel(insight.market)}
                      </span>
                      {insight.isStreak && insight.streakLength && (
                        <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs font-semibold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {insight.streakLength} match streak
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3">
                {/* Hit Rate Badge */}
                <div className="flex items-center justify-between">
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-green-600 font-medium uppercase mb-1">Hit Rate</p>
                    <p className="text-2xl font-bold text-green-800">{insight.hitRate}%</p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase">Sample Size</p>
                    <p className="text-lg font-bold text-gray-900">{insight.matchesAnalyzed} matches</p>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Threshold</p>
                    <p className="text-lg font-bold text-gray-900">{insight.threshold}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Average</p>
                    <p className="text-lg font-bold text-gray-900">{insight.averageValue}</p>
                  </div>
                </div>

                {/* Recent Matches Preview */}
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase mb-2">Last 3 Matches</p>
                  <div className="space-y-1">
                    {insight.recentMatches.slice(0, 3).map((match: RecentMatch, matchIdx: number) => (
                      <div
                        key={matchIdx}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            match.hit ? 'bg-green-500' : 'bg-red-500'
                          }`}></div>
                          <span className="text-gray-700 font-medium">vs {match.opponent}</span>
                        </div>
                        <span className="text-gray-900 font-bold">{match.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Home Team Patterns */}
      <TeamInsightsSection 
        teamName={homeTeam}
        teamInsights={homeTeamInsights}
        colorClass="bg-green-500"
      />

      {/* Away Team Patterns */}
      <TeamInsightsSection 
        teamName={awayTeam}
        teamInsights={awayTeamInsights}
        colorClass="bg-orange-500"
      />

      {/* If no patterns for either team */}
      {insights.length === 0 && (
        <div className="text-center py-8">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No patterns detected</p>
          <p className="text-sm text-gray-500 mt-1">
            No 100% hit rate patterns found for either team
          </p>
        </div>
      )}
    </div>
  );
};

export default MatchBettingPatterns;