// src/components/insights/BettingPatterns/MatchBettingPatterns.tsx
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
      shots_on_target: 'Shots',
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
