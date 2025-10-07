import React, { useState, useMemo } from 'react';
import { Trophy, TrendingUp, AlertTriangle, CheckCircle, XCircle, Target, Home, Plane, Info, Zap, Award, ChevronDown } from 'lucide-react';

// NOTE: You must ensure 'betRankingService' and 'MatchContextInsight' 
// are correctly imported from their respective paths in your project.
import { betRankingService, BetTier, RankedBet } from '../../services/ai/betRankingService';
import { MatchContextInsight } from '../../services/ai/matchContextService';

// --- TYPE DEFINITIONS ---

// Define the Team interface required for the logo. 
interface Team {
  name: string; // The canonical name (e.g., 'Manchester United')
  shortName?: string;
  logo?: string; // The image URL
}

interface UnifiedBettingInsightsProps {
  insights: MatchContextInsight[];
  // UPDATED: Now accepts full Team objects
  homeTeam: Team; 
  awayTeam: Team;
}

// Define the content and key for the new tab structure
type BetTab = 'all' | BetTier.EXCELLENT | BetTier.GOOD | BetTier.FAIR;


// --- UTILITY TO RENDER MARKDOWN BOLDING ---
// Since the analysis string uses Markdown **bold**, we need a simple converter.
// This handles **bolding** but assumes emojis are already rendered correctly.
const renderMarkdown = (text: string | undefined): string => {
  if (!text) return '';
  // Convert **text** to <strong>text</strong>
  let html = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  return html;
};

// ----------------------------------------------------------------------
// STATS TEAM LOGO COMPONENT
// ----------------------------------------------------------------------

const StatsTeamLogo: React.FC<{ team: Team, size?: 'sm' | 'md' }> = ({ team, size = 'sm' }) => {
  const sizeClasses = {
    sm: "w-6 h-6 sm:w-8 sm:h-8",
    md: "w-10 h-10 sm:w-12 sm:h-12"
  };

  if (team.logo) {
    return (
      <img 
        src={team.logo} 
        alt={team.name} 
        className={`${sizeClasses[size]} object-contain flex-shrink-0`} 
      />
    );
  }

  // Fallback for missing logo
  // Use a neutral color for the dummy 'Fixture' team
  const isFixture = team.name === 'Fixture';
  const bgColor = isFixture ? 'from-purple-500 to-purple-700' : 'from-blue-500 to-blue-700';

  return (
    <div className={`
      ${sizeClasses[size]} rounded-full 
      bg-gradient-to-br ${bgColor}
      text-white font-semibold shadow-sm
      flex items-center justify-center flex-shrink-0
    `}>
      <span className="text-xs">
        {team.shortName?.substring(0, 2) || team.name.substring(0, 2)}
      </span>
    </div>
  );
};


// ----------------------------------------------------------------------
// UNIFIED BETTING INSIGHTS COMPONENT (Main Component)
// ----------------------------------------------------------------------

const UnifiedBettingInsights: React.FC<UnifiedBettingInsightsProps> = ({ 
  insights, 
  homeTeam, 
  awayTeam 
}) => {
  const [selectedTab, setSelectedTab] = useState<BetTab>('all');
  const [showAccasOnly, setShowAccasOnly] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<'all' | 'home' | 'away'>('all');
  
  // Use canonical names from the Team objects for filtering
  const homeTeamName = homeTeam.name;
  const awayTeamName = awayTeam.name;
  
  // Rank all bets
  const rankedBets = useMemo(() => {
    return showAccasOnly 
      ? betRankingService.getAccumulatorBets(insights)
      : betRankingService.rankBets(insights);
  }, [insights, showAccasOnly]);
  
  // Filter logic now uses selectedTab
  const tabFiltered = selectedTab === 'all' 
    ? rankedBets 
    : rankedBets.filter(bet => bet.tier === selectedTab);
  
  // Filtering uses the canonical names, allowing 'Fixture' bets to always show unless filtered by a specific team
  const finalFiltered = selectedTeam === 'all'
    ? tabFiltered
    : tabFiltered.filter(bet => {
        // Fixture bets do not belong to a team and are filtered out when a specific team is selected
        if (bet.team === 'Fixture') return false; 
        
        const isHomeTeam = bet.team === homeTeamName;
        return selectedTeam === 'home' ? isHomeTeam : !isHomeTeam;
      });
  
  // Memoize counts 
  const { tierCounts, accumulatorBets } = useMemo(() => {
    const accumulatorBets = rankedBets.filter(b => b.accumulatorSafe);

    return {
        tierCounts: {
            [BetTier.EXCELLENT]: rankedBets.filter(b => b.tier === BetTier.EXCELLENT).length,
            [BetTier.GOOD]: rankedBets.filter(b => b.tier === BetTier.GOOD).length,
            [BetTier.FAIR]: rankedBets.filter(b => b.tier === BetTier.FAIR).length,
            [BetTier.POOR]: rankedBets.filter(b => b.tier === BetTier.POOR).length,
            [BetTier.AVOID]: rankedBets.filter(b => b.tier === BetTier.AVOID).length,
        },
        accumulatorBets,
        // Removed bestBet, homeCount, awayCount as they are not used in the final display/logic
    };
  }, [rankedBets, homeTeamName, awayTeamName]);
  
  const tabs: { key: BetTab; label: string; color?: string }[] = [
    { key: 'all', label: 'All Bets' },
    { key: BetTier.EXCELLENT, label: 'Excellent', color: 'emerald' },
    { key: BetTier.GOOD, label: 'Good', color: 'blue' },
    { key: BetTier.FAIR, label: 'Fair', color: 'yellow' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-0">
      
      {/* HEADER BLOCK (Tabs and Secondary Filter) */}
      <div className="w-full">
        {/* TABS */}
        <div className="bg-gray-50 border-b border-gray-200 w-full flex">
          {tabs.map((tab) => {
            const isActive = selectedTab === tab.key;
            
            // Define active colors 
            const activeClass = isActive
              ? 'text-purple-800 border-purple-600 bg-white shadow-sm transform -translate-y-0.5 z-10'
              : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50';
              
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedTab(tab.key)}
                className={`
                  flex-1 px-2 py-4 text-sm font-medium border-b-2 
                  transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) text-center min-w-0 relative
                  ${activeClass}
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-t from-purple-50 to-transparent opacity-60 rounded-t-md pointer-events-none" />
                )}
                <span className="block truncate relative z-10">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* SECONDARY FILTER (Team/Acca Toggle) */}
        <div className="p-4 sm:p-6 bg-gray-50 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4">
          
          {/* Team Filter Buttons */}
          <div className="flex flex-wrap gap-2">
             <span className="text-sm font-semibold text-gray-700 hidden sm:block">Filter by Team:</span>
            <button
              onClick={() => setSelectedTeam('all')}
              className={`px-3 py-1 rounded-full font-semibold transition-all text-xs ${
                selectedTeam === 'all'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedTeam('home')}
              className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1 text-xs ${
                selectedTeam === 'home'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-green-100 text-green-700 hover:bg-green-200'
              }`}
            >
              {/* LOGO INTEGRATION */}
              <StatsTeamLogo team={homeTeam} size="sm" /> 
              {homeTeam.shortName || homeTeam.name}
            </button>
            <button
              onClick={() => setSelectedTeam('away')}
              className={`px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1 text-xs ${
                selectedTeam === 'away'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
              }`}
            >
              {/* LOGO INTEGRATION */}
              <StatsTeamLogo team={awayTeam} size="sm" />
              {awayTeam.shortName || awayTeam.name}
            </button>
          </div>
          
          {/* Acca Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showAccasOnly}
              onChange={(e) => setShowAccasOnly(e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
            />
            <span className="font-medium">
              Acca-Safe Only ({accumulatorBets.length})
            </span>
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 space-y-6">
        
        {/* REMOVED: Best Bet Highlight (Top Pick) */}
        
        {/* Bet List: RESPONSIVE GRID */}
        <div>
          {finalFiltered.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 text-center shadow-inner border border-gray-200">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-xl font-bold text-gray-600">No bets match your filters</p>
              <p className="text-sm text-gray-500 mt-2">Try adjusting your filter settings</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {finalFiltered.map((bet, idx) => (
                <BetCard 
                  key={idx} 
                  bet={bet} 
                  rank={undefined} 
                  homeTeam={homeTeam}
                  awayTeam={awayTeam}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Summary Footer */}
        <div className="bg-gray-50 rounded-xl p-4 shadow-inner border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-blue-500" />
              Betting Strategy Summary
            </h3>
            <div className="space-y-1 text-xs text-gray-700">
              <p>• Focus on **Excellent ({tierCounts[BetTier.EXCELLENT]})** and **Good ({tierCounts[BetTier.GOOD]})** tiers for staking.</p>
              <p>• Use **Acca-Safe ({accumulatorBets.length})** bets for combinations.</p>
              <p className="text-xs text-gray-500 mt-2">
                Tip: Betting on Poor/Avoid tiers carries significant risk and is not recommended by the AI model.
              </p>
            </div>
          </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// BETCARD COMPONENT (Updated compact rendering)
// ----------------------------------------------------------------------

const BetCard: React.FC<{ 
  bet: RankedBet; 
  rank?: number; 
  isHighlight?: boolean;
  homeTeam: Team; 
  awayTeam: Team;
}> = ({ bet, rank, isHighlight = false, homeTeam, awayTeam }) => {
  
  // NOTE: isHighlight will always be false now since the 'Top Pick' card was removed from the parent.
  const isCompactGridItem = !isHighlight && rank === undefined; 
  const [expanded, setExpanded] = useState(isHighlight);
  const [formExpanded, setFormExpanded] = useState(false); 

  // Helper functions (Light Mode Colors - UNCHANGED)
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
  
  // --- LOGIC FOR FIXTURE BETS ---
  const isFixtureBet = bet.team === 'Fixture';
  
  // Determine the team object for display
  const teamObject = isFixtureBet 
    ? { name: 'Fixture', shortName: 'M', logo: undefined } // Neutral/Dummy team for display
    : (bet.team === homeTeam.name ? homeTeam : awayTeam);
    
  const isHomeTeam = teamObject.name === homeTeam.name;

  // Neutral colors for Fixture Bet, or team colors otherwise
  const teamColor = isFixtureBet ? 'text-purple-700' : (isHomeTeam ? 'text-green-700' : 'text-orange-700'); 
  const teamBg = isFixtureBet ? 'bg-purple-50' : (isHomeTeam ? 'bg-green-50' : 'bg-orange-50'); 

  // Renders the simplified view for grid items
  const renderCompactGridCard = () => {
      
      const showStreakBadge = bet.isStreak && (bet.streakLength ?? 0) >= 7;
      const homeVenueData = bet.context?.homeAwaySupportForSample?.home;
      const awayVenueData = bet.context?.homeAwaySupportForSample?.away;
      
      const showVenueSplit = !isFixtureBet && homeVenueData && awayVenueData && (homeVenueData.matches > 0 || awayVenueData.matches > 0);

      return (
        <div className="p-3">
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    {/* Team Badge and Outcome */}
                    <div className="flex items-center gap-2 mb-1">
                        <StatsTeamLogo team={teamObject} size="sm" /> 

                        <div className={`px-2 py-0.5 rounded-full ${teamBg} ${teamColor} font-bold text-xs flex items-center gap-1`}>
                            {/* Display 'FIXTURE' or the team's name */}
                            {isFixtureBet ? 'FIXTURE' : (teamObject.shortName || teamObject.name)}
                        </div>
                        
                    </div>
                    
                    <h4 className="text-base font-extrabold text-gray-900 truncate mt-1">{bet.outcome}</h4>
                </div>

                {/* Score Circle (smaller for grid view) */}
                <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getScoreGradient(bet.betScore)} flex items-center justify-center shadow-md flex-shrink-0`}>
                    <div className="text-center text-white">
                        <p className="text-xl font-extrabold leading-none">{bet.betScore}</p>
                        <p className="text-xs font-semibold leading-none">SCORE</p>
                    </div>
                </div>
            </div>
            
            {/* UPDATED FOOTER ROW */}
            <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between items-center text-xs text-gray-600">
                
                {/* LEFT SIDE: Hit Rate, Streak, and Acca Safe Badges */}
                <div className="flex items-center gap-3">
                    <p className="flex items-center gap-1 font-semibold text-gray-700">
                        <TrendingUp className="w-3 h-3 text-purple-500" /> {bet.hitRate}% Hit
                    </p>
                    
                    {/* 7+ STREAK BADGE */}
                    {showStreakBadge && (
                        <span className="text-red-700 font-bold flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {bet.streakLength}+ Streak
                        </span>
                    )}
                    
                    {/* Acca Safe Badge */}
                    {bet.accumulatorSafe && (
                        <p className="text-purple-700 font-bold flex items-center gap-1 ml-auto">
                            <CheckCircle className="w-3 h-3" /> Acca Safe
                        </p>
                    )}
                </div>


                {/* RIGHT SIDE: VENUE CONSISTENCY - HIDDEN FOR FIXTURE BETS */}
                {showVenueSplit && (
                    <div className="flex items-center gap-2">
                        
                        {/* Home Venue Consistency */}
                        {homeVenueData && homeVenueData.matches > 0 && (
                            <div className={`flex items-center gap-1 px-1 rounded`}>
                                <Home className={`w-3 h-3 ${isHomeTeam ? 'text-green-600' : 'text-gray-500'}`} />
                                <span className={`font-bold ${isHomeTeam ? 'text-green-700' : 'text-gray-800'}`}>{homeVenueData.hitRate}%</span>
                            </div>
                        )}
                        
                        {/* Away Venue Consistency */}
                        {awayVenueData && awayVenueData.matches > 0 && (
                            <div className={`flex items-center gap-1 px-1 rounded`}>
                                <Plane className={`w-3 h-3 ${!isHomeTeam ? 'text-orange-600' : 'text-gray-500'}`} />
                                <span className={`font-bold ${!isHomeTeam ? 'text-orange-700' : 'text-gray-800'}`}>{awayVenueData.hitRate}%</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
      );
  };
  
  // Main Render (Full/Highlight View)
  return (
    <div 
      className={`
        bg-white rounded-xl border-2 ${getTierBorderColor(bet.tier)} border-opacity-30 shadow-sm overflow-hidden transition-all 
        ${isHighlight ? 'ring-4 ring-yellow-200' : 'hover:shadow-md'}
        ${isCompactGridItem ? 'hover:scale-[1.01] transition-transform duration-150 cursor-pointer' : ''} 
        ${expanded ? 'shadow-lg border-opacity-70' : ''}
      `}
      // Click handler for the whole card when it's a compact grid item
      onClick={isCompactGridItem ? () => setExpanded(!expanded) : undefined} 
    >
      {isCompactGridItem && !expanded ? ( // Only render compact if it's a grid item AND not expanded
        // Render the compact version for the grid
        renderCompactGridCard()
      ) : (
        // Render the full, expandable version
        <>
          <div 
            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
            // Clicking the header collapses the card.
            onClick={() => setExpanded(false)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                {rank && (
                  <div className={`w-12 h-12 rounded-full ${bet.betScore >= 80 ? 'bg-gradient-to-br from-yellow-400 to-yellow-500' : 'bg-gray-200'} flex items-center justify-center font-bold text-xl ${bet.betScore >= 80 ? 'text-white' : 'text-gray-700'} shadow-sm flex-shrink-0`}>
                    #{rank}
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    {/* LOGO INTEGRATION (Full View) */}
                    <StatsTeamLogo team={teamObject} size="sm" /> 
                    
                    <div className={`px-3 py-1 rounded-full ${teamBg} ${teamColor} font-bold text-sm flex items-center gap-1`}>
                      {isFixtureBet ? 'FIXTURE' : (teamObject.shortName || teamObject.name)}
                    </div>
                    {/* REMOVED: Market Badge (e.g., TOTAL SHOTS) */}
                    
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
                
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getScoreGradient(bet.betScore)} flex items-center justify-center shadow-md flex-shrink-0`}>
                  <div className="text-center text-white">
                    <p className="text-2xl font-extrabold">{bet.betScore}</p>
                    <p className="text-xs font-semibold">SCORE</p>
                  </div>
                </div>
                
                <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>
          
          {/* Expanded Details */}
          {expanded && (
            <div className="border-t-2 border-gray-100 p-6 space-y-6 bg-gray-50">
              
              {/* 🆕 NEW: Unified Stylized Analysis (Match Analysis & Recommendation) */}
              {bet.stylizedAnalysis && (
                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <h5 className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-base">
                    <Award className="w-5 h-5 text-purple-600" />
                    AI Insight
                  </h5>
                  
                  {/* CRITICAL: Use dangerouslySetInnerHTML with Markdown converter */}
                  <p 
                    className="text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(bet.stylizedAnalysis) }} 
                  />
                  
                </div>
              )}
              {/* END NEW BLOCK */}
              
              {/* Why This Tier */}
              <div>
                <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Why This Bet is Ranked "{bet.tier}"
                </h5>
                <ul className="space-y-2">
                  {bet.reasoning.map((reason, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 bg-white p-2 rounded border border-gray-100">
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
              
              {/* Home/Away Venue Split - HIDDEN FOR FIXTURE BETS */}
              {bet.context?.homeAwaySupportForSample && !isFixtureBet && (
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
              
              {/* COLLAPSIBLE RECENT FORM SECTION */}
              <div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent card from collapsing when clicking form button
                    setFormExpanded(!formExpanded);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-lg bg-white hover:bg-gray-100 transition-colors border border-gray-200"
                >
                  <h5 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    Recent Form (Last {Math.min(5, bet.recentMatches.length)} Matches)
                  </h5>
                  <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${formExpanded ? 'rotate-180' : ''}`} />
                </button>
                
                {/* Collapsible Content */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${formExpanded ? 'max-h-[500px] mt-3' : 'max-h-0'}`}>
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
              
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UnifiedBettingInsights;
