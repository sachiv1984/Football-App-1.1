// src/components/insights/BettingPatterns/MatchBettingPatterns.tsx
import React, { useState } from 'react';
import { TrendingUp, Target, Home, Plane, Award, Info, Zap } from 'lucide-react';

// Import the correct types from the service
import { BettingInsight, HomeAwaySupport } from '../../../services/ai/bettingInsightsService';
import { MatchContextInsight } from '../../../services/ai/matchContextService';

interface MatchBettingPatternsProps {
  insights: (BettingInsight | MatchContextInsight)[]; // Accept both types
  homeTeam: string;
  awayTeam: string;
}

// *** FIX: Utility function to parse the recommendation text and handle **bold** syntax ***
const renderRecommendationText = (text: string) => {
  const parts: React.ReactNode[] = [];
  // Regex to split the text by the bold markdown syntax (**...**)
  const regex = /(\*\*.*?\*\*)/g;
  let lastIndex = 0;
  
  text.replace(regex, (match, p1, offset) => {
    // Add plain text before the bold part
    parts.push(text.substring(lastIndex, offset));
    
    // Add the bold text, stripping the asterisks
    parts.push(
      <strong key={offset} className="font-extrabold text-blue-900">
        {p1.replace(/\*\*/g, '')}
      </strong>
    );
    lastIndex = offset + match.length;
    return match;
  });
  
  // Add remaining plain text
  parts.push(text.substring(lastIndex));
  
  return parts;
};

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
        return 'bg-emerald-50 text-emerald-800 border-emerald-300';
      case 'High':
      case 'Excellent': // If we want to map "Excellent" descriptor color to High confidence
        return 'bg-green-50 text-green-800 border-green-300';
      case 'Medium':
      case 'Good':
        return 'bg-blue-50 text-blue-800 border-blue-300';
      case 'Low':
      case 'Fair':
        return 'bg-yellow-50 text-yellow-800 border-yellow-300';
      case 'Poor':
        return 'bg-red-50 text-red-800 border-red-300';
      default:
        return 'bg-gray-50 text-gray-800 border-gray-300';
    }
  };

  const getMatchStrengthStyle = (strength: string) => {
    switch (strength) {
      case 'Excellent':
        return { bg: 'bg-emerald-50 border-emerald-400', text: 'text-emerald-800', icon: <Zap className="w-4 h-4 text-emerald-600" />, border: 'border-emerald-600', hoverBg: 'bg-emerald-100' };
      case 'Good':
        return { bg: 'bg-blue-50 border-blue-400', text: 'text-blue-800', icon: <Award className="w-4 h-4 text-blue-600" />, border: 'border-blue-600', hoverBg: 'bg-blue-100' };
      case 'Fair':
        return { bg: 'bg-yellow-50 border-yellow-400', text: 'text-yellow-800', icon: <Info className="w-4 h-4 text-yellow-600" />, border: 'border-yellow-600', hoverBg: 'bg-yellow-100' };
      case 'Poor':
        return { bg: 'bg-red-50 border-red-400', text: 'text-red-800', icon: <Info className="w-4 h-4 text-red-600" />, border: 'border-red-600', hoverBg: 'bg-red-100' };
      default:
        return { bg: 'bg-gray-50 border-gray-400', text: 'text-gray-800', icon: <Info className="w-4 h-4 text-gray-600" />, border: 'border-gray-600', hoverBg: 'bg-gray-100' };
    }
  };

  // Group insights by team
  const homeTeamInsights = insights.filter(
    i => i.team.toLowerCase() === homeTeam.toLowerCase()
  );
  const awayTeamInsights = insights.filter(
    i => i.team.toLowerCase() === awayTeam.toLowerCase()
  );

  // Type guard to check if insight has matchContext
  const hasMatchContext = (insight: BettingInsight | MatchContextInsight): insight is MatchContextInsight => {
    return 'matchContext' in insight;
  };

  const TeamInsightsSection = ({ 
    teamName, 
    teamInsights, 
    colorClass,
    isHome
  }: { 
    teamName: string; 
    teamInsights: (BettingInsight | MatchContextInsight)[];
    colorClass: string;
    isHome: boolean;
  }) => {
    if (teamInsights.length === 0) return null;

    // FIX: State for venue consistency toggle (applied per TeamInsightsSection)
    const [venueView, setVenueView] = useState<'sample' | 'overall'>('sample');

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pt-6 border-t border-gray-200">
          <div className={`w-3 h-3 rounded-full ${colorClass}`}></div>
          <h3 className="text-xl font-bold text-gray-900">{teamName} Patterns</h3>
          {isHome ? (
            <Home className="w-5 h-5 text-gray-500" />
          ) : (
            <Plane className="w-5 h-5 text-gray-500" />
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {teamInsights.map((insight, idx) => {
            
            const confidence = insight.context?.confidence; 
            
            // FIX: Access the NEW home/away properties
            const homeAwaySupportForSample = insight.context?.homeAwaySupportForSample;
            const homeAwaySupportOverall = insight.context?.homeAwaySupportOverall;

            // FIX: Select the currently displayed data based on the toggle state
            const selectedHomeAwaySplit = venueView === 'sample' 
                ? homeAwaySupportForSample 
                : homeAwaySupportOverall;

            const matchContext = hasMatchContext(insight) ? insight.matchContext : undefined;
            
            // The logic below still uses the SAMPLE split for decision-making (as it should)
            const upcomingVenueIsHome = matchContext?.isHome; 
            const venueDataForSample = upcomingVenueIsHome ? homeAwaySupportForSample?.home : homeAwaySupportForSample?.away;
            const showDependencyWarning = venueDataForSample && venueDataForSample.hitRate < insight.hitRate; 
            
            const marginRatio = (insight.averageValue - insight.threshold) / insight.threshold; 
            const strengthStyle = matchContext ? getMatchStrengthStyle(matchContext.strengthOfMatch) : null;

            // *** FIX: Extract the core recommendation part (after the initial header and before the confidence text) ***
            let recommendationBody: React.ReactNode = null;
            if (matchContext) {
                // Remove the confidence score text from the end
                const recommendation = matchContext.recommendation;
                const bodyWithHeader = recommendation.includes('Confidence Score:') 
                    ? recommendation.substring(0, recommendation.lastIndexOf('Confidence Score:')).trim()
                    : recommendation;
                
                // Now, safely split off the initial header (e.g., "✅ **STRONG SELECTION**:")
                const bodyParts = bodyWithHeader.split(':');
                const mainBody = bodyParts.slice(1).join(':').trim(); // Take everything after the first colon
                
                recommendationBody = renderRecommendationText(mainBody);
            }
            // *********************************************************************************************************

            return (
              <div 
                key={idx}
                className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden transition-shadow duration-200 hover:shadow-xl"
              >
                {/* Card Header */}
                <div className={`p-4 border-b relative ${
                  insight.isStreak 
                    ? 'bg-gradient-to-r from-purple-50 to-purple-100' 
                    : 'bg-gray-50'
                }`}>
                  <div className="flex items-start justify-between">
                    <p className="text-2xl font-extrabold text-gray-900 leading-tight">
                        {insight.outcome}
                    </p>
                    {confidence && (
                      <div className={`px-3 py-1 rounded-full text-xs font-bold border shadow-sm flex-shrink-0 ${getConfidenceColor(confidence.level)}`}>
                        {confidence.level}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-3"> 
                    <span className={`px-2 py-1 rounded text-xs font-semibold border ${getMarketColor(insight.market)}`}>
                      {getMarketLabel(insight.market)}
                    </span>
                    {insight.isStreak && insight.streakLength && (
                      <span className="px-2 py-1 rounded bg-purple-100 text-purple-800 text-xs font-semibold flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {insight.streakLength} Match Streak
                      </span>
                    )}
                  </div>
                </div>

                {/* Match Context & Recommendation */}
                {matchContext && (
                    <div className={`p-4 border-b border-dashed ${strengthStyle?.bg}`}>
                        <div className="flex items-center gap-2 mb-3">
                            {strengthStyle?.icon}
                            <span className={`text-md font-bold uppercase ${strengthStyle?.text}`}>
                                Matchup Strength: {matchContext.strengthOfMatch}
                            </span>
                            {matchContext.strengthOfMatch === 'Poor' && <span className="text-red-600 font-bold">🛑</span>}
                        </div>
                        <div className={`p-3 rounded-lg border-l-4 ${strengthStyle?.hoverBg} ${strengthStyle?.text} ${strengthStyle?.border}`}>
                            <p className="text-sm font-semibold italic">
                                {/* FIX: Render the main body of the recommendation with bolding */}
                                {recommendationBody}
                            </p>
                            {/* Display Confidence Score text separately below the main body */}
                            <p className="text-xs font-bold mt-2 pt-2 border-t border-dashed border-gray-200">
                                Confidence Score: {confidence?.score ?? 0}/100
                            </p>
                        </div>
                        <div className="mt-3 text-xs font-medium text-gray-600 flex justify-between">
                            <span>Opponent Allows: {matchContext.oppositionAllows}</span>
                        </div>
                    </div>
                )}

                {/* Card Body */}
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-green-600 font-medium uppercase mb-1">Hit Rate</p>
                      <p className="text-2xl font-bold text-green-800">{insight.hitRate}%</p>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-center">
                      <p className="text-xs text-gray-500 uppercase mb-1">Average</p> 
                      <p className="text-2xl font-bold text-gray-900">{insight.averageValue}</p>
                      {marginRatio > 0.05 && (
                        <p className="text-xs text-green-600 font-medium mt-0.5">
                          +{Math.round(marginRatio * 100)}% above Threshold
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Home/Away Performance Toggle Section */}
                  {(homeAwaySupportForSample || homeAwaySupportOverall) && (
                    <div className="pt-2 border-t border-gray-100">
                      
                      {/* Toggle UI */}
                      <div className="flex justify-start mb-3 bg-gray-100 rounded-lg p-1">
                          <button
                              onClick={() => setVenueView('sample')}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors w-1/2 ${
                                  venueView === 'sample' 
                                      ? 'bg-white text-blue-700 shadow-md' 
                                      : 'text-gray-600 hover:bg-gray-200'
                              }`}
                          >
                              Pattern Sample ({homeAwaySupportForSample?.home.matches ?? 0 + homeAwaySupportForSample?.away.matches ?? 0}m)
                          </button>
                          <button
                              onClick={() => setVenueView('overall')}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-colors w-1/2 ${
                                  venueView === 'overall' 
                                      ? 'bg-white text-blue-700 shadow-md' 
                                      : 'text-gray-600 hover:bg-gray-200'
                              }`}
                          >
                              Overall Season ({homeAwaySupportOverall?.home.matches ?? 0 + homeAwaySupportOverall?.away.matches ?? 0}m)
                          </button>
                      </div>

                      <p className="text-xs text-gray-500 uppercase mb-2 font-semibold flex items-center gap-1">
                          VENUE CONSISTENCY 
                          {venueView === 'overall' && <span className="text-blue-500">(Overall Season)</span>}
                      </p>
                      
                      {selectedHomeAwaySplit && (
                        <div className="grid grid-cols-2 gap-2">
                          {selectedHomeAwaySplit.home.matches > 0 && (
                            <div className={`p-2 rounded border ${
                              upcomingVenueIsHome ? 'border-blue-500 bg-blue-50 border-2' : 'border-gray-200 bg-gray-50'
                            }`}>
                              <div className="flex items-center gap-1 mb-1">
                                <Home className={`w-3 h-3 ${upcomingVenueIsHome ? 'text-blue-600' : 'text-gray-500'}`} />
                                <span className="text-xs font-bold text-gray-700">HOME ({selectedHomeAwaySplit.home.matches}m)</span>
                              </div>
                              <p className="text-xl font-bold text-gray-900">{selectedHomeAwaySplit.home.hitRate}%</p> 
                              <p className="text-xs text-gray-600">Avg: {selectedHomeAwaySplit.home.average}</p>
                            </div>
                          )}
                          {selectedHomeAwaySplit.away.matches > 0 && (
                            <div className={`p-2 rounded border ${
                              upcomingVenueIsHome === false ? 'border-blue-500 bg-blue-50 border-2' : 'border-gray-200 bg-gray-50'
                            }`}>
                              <div className="flex items-center gap-1 mb-1">
                                <Plane className={`w-3 h-3 ${upcomingVenueIsHome === false ? 'text-blue-600' : 'text-gray-500'}`} />
                                <span className="text-xs font-bold text-gray-700">AWAY ({selectedHomeAwaySplit.away.matches}m)</span>
                              </div>
                              <p className="text-xl font-bold text-gray-900">{selectedHomeAwaySplit.away.hitRate}%</p>
                              <p className="text-xs text-gray-600">Avg: {selectedHomeAwaySplit.away.average}</p>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Dependency Warning (Only show for SAMPLE view, as it relates to pattern confidence) */}
                      {venueView === 'sample' && showDependencyWarning && venueDataForSample && (
                        <p className="text-xs text-yellow-700 mt-2 flex items-start gap-1 p-2 bg-yellow-50 rounded">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          <span>VENUE DEPENDENCY: Hit rate at this venue ({venueDataForSample.hitRate}%) is lower than overall ({insight.hitRate}%).</span>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Confidence Factors */}
                  {confidence && confidence.factors.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 uppercase mb-2 font-semibold">Confidence Drivers</p>
                      <div className="space-y-1">
                        {confidence.factors.slice(0, 3).map((factor: string, i: number) => (
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
                    <p className="text-xs text-gray-500 uppercase mb-2 font-semibold">Last {insight.recentMatches.length} Matches ({insight.matchesAnalyzed} Sample)</p>
                    <div className="space-y-1">
                      {insight.recentMatches.slice(0, 5).map((match: any, matchIdx: number) => (
                        <div
                          key={matchIdx}
                          className={`flex items-center justify-between p-2 rounded text-sm transition-colors ${match.hit ? 'bg-green-50 hover:bg-green-100' : 'bg-red-50 hover:bg-red-100'}`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              match.hit ? 'bg-green-500' : 'bg-red-500'
                            }`}></div>
                            <span className="text-gray-700 font-medium">vs {match.opponent}</span>
                            
                            {/* Home/Away Icon */}
                            {match.isHome !== undefined && (
                              <div title={match.isHome ? "Home Game" : "Away Game"}>
                                {match.isHome ? (
                                  <Home className="w-3 h-3 text-gray-400" />
                                ) : (
                                  <Plane className="w-3 h-3 text-gray-400" />
                                )}
                              </div>
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
    <div className="space-y-8 p-6 bg-gray-50 rounded-xl shadow-2xl">
      <h2 className="text-3xl font-extrabold text-gray-800 border-b pb-3 mb-6">
        Match Betting Patterns Analysis
      </h2>
      
      <TeamInsightsSection 
        teamName={homeTeam}
        teamInsights={homeTeamInsights}
        colorClass="bg-green-600"
        isHome={true}
      />
      
      <hr className="border-gray-300 my-8" />

      <TeamInsightsSection 
        teamName={awayTeam}
        teamInsights={awayTeamInsights}
        colorClass="bg-orange-600"
        isHome={false}
      />

      {insights.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 shadow-inner">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-600 font-bold">No High-Confidence Patterns Detected</p>
          <p className="text-md text-gray-500 mt-2">
            Neither {homeTeam} nor {awayTeam} currently show a strong, 100% hit rate pattern in recent form.
          </p>
        </div>
      )}
    </div>
  );
};

export default MatchBettingPatterns;
