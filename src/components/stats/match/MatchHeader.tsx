// src/components/match/MatchHeader/MatchHeader.tsx
import React, { useState } from 'react'; // <-- ADDED useState
import type { Fixture } from '../../../types';

interface MatchHeaderProps {
  fixture: Fixture;
  className?: string;
}

// Add this enhanced logo component:
const EnhancedTeamLogo: React.FC<{
  team: { name: string; logo?: string; shortName?: string };
  size?: 'md' | 'lg';
}> = ({ team, size = 'lg' }) => {
  const sizeClasses = {
    md: "w-12 h-12",
    lg: "w-16 h-16 lg:w-20 lg:h-20"
  };

  const [imageError, setImageError] = useState(false);

  const LogoFallback = () => (
    <div className={`
      ${sizeClasses[size]} rounded-full 
      bg-gradient-to-br from-blue-500 to-blue-700 
      text-white font-bold shadow-lg
      border-4 border-white border-opacity-80
      flex items-center justify-center
      transition-transform duration-200 hover:scale-105
    `}>
      <span className="text-sm lg:text-base">
        {team.shortName?.substring(0, 2) || team.name.substring(0, 2)}
      </span>
    </div>
  );

  if (!team.logo || imageError) {
    return <LogoFallback />;
  }

  return (
    <div className={`
      ${sizeClasses[size]} relative rounded-full overflow-hidden 
      bg-white shadow-lg border-4 border-white border-opacity-80
      transition-transform duration-200 hover:scale-105 group
    `}>
      <img
        src={team.logo}
        alt={`${team.name} logo`}
        className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
        onError={() => setImageError(true)}
        loading="lazy"
      />
    </div>
  );
};

// Enhanced score display component (UNCHANGED)
const EnhancedScoreDisplay: React.FC<{
  homeScore: number | undefined;
  awayScore: number | undefined;
  isFinished: boolean;
}> = ({ homeScore, awayScore, isFinished }) => {
  if (!isFinished || homeScore === undefined || awayScore === undefined) {
    return (
      <div className="text-xl lg:text-2xl font-semibold text-neutral-500 mb-3">
        VS
      </div>
    );
  }

  const isHomeWin = homeScore > awayScore;
  const isAwayWin = awayScore > homeScore;
  const isDraw = homeScore === awayScore;

  const getScoreStyle = (isWinner: boolean, isLoser: boolean) => {
    if (isWinner) return "text-green-600"; // Winner contrast
    if (isLoser) return "text-gray-500";   // Loser contrast
    return "text-neutral-800";             // Draw
  };

  return (
    <div className="mb-3 bg-gradient-to-r from-gray-50 via-white to-gray-50 rounded-xl p-4 shadow-inner border border-gray-200">
      <div className="flex items-center justify-center gap-4">
        <div className={`text-4xl lg:text-5xl font-black transition-colors duration-200 ${getScoreStyle(isHomeWin, isAwayWin)}`}>
          {homeScore}
        </div>
        <div className="text-2xl lg:text-3xl text-gray-400 font-light">
          −
        </div>
        <div className={`text-4xl lg:text-5xl font-black transition-colors duration-200 ${getScoreStyle(isAwayWin, isHomeWin)}`}>
          {awayScore}
        </div>
      </div>
      {!isDraw && (
        <div className="text-center mt-2 text-xs lg:text-sm text-gray-600 font-medium">
          {isHomeWin ? "Home Win" : "Away Win"}
        </div>
      )}
    </div>
  );
};

// Enhanced Date/Time + Venue component (UNCHANGED)
const EnhancedMatchDateTime: React.FC<{
  date: string;
  time: string;
  venue?: string;
  isLive: boolean;
}> = ({ date, time, venue, isLive }) => (
  <div className="text-center space-y-2">
    {/* Date */}
    <div className="text-xl lg:text-2xl font-bold text-gray-900 leading-tight">
      {date}
    </div>
    
    {/* Time with icon */}
    <div className="flex items-center justify-center gap-2 text-base lg:text-lg font-medium text-gray-600">
      <svg 
        className="w-4 h-4 lg:w-5 lg:h-5 text-gray-500" 
        fill="currentColor" 
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path 
          fillRule="evenodd" 
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z" 
          clipRule="evenodd" 
        />
      </svg>
      <span>{time}</span>
      {isLive && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full shadow-lg ml-2">
          <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">Live</span>
        </div>
      )}
    </div>
    
    {/* Venue */}
    {venue && (
      <div className="flex items-center justify-center gap-2 text-sm lg:text-base text-gray-500">
        <svg 
          className="w-4 h-4 text-gray-400" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path 
            fillRule="evenodd" 
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" 
            clipRule="evenodd" 
          />
        </svg>
        <span className="italic max-w-[200px] lg:max-w-[240px] truncate leading-tight">
          {venue}
        </span>
      </div>
    )}
  </div>
);

const MatchHeader: React.FC<MatchHeaderProps> = ({ fixture, className = '' }) => {
  const {
    homeTeam,
    awayTeam,
    dateTime,
    venue,
    homeScore = fixture.homeScore ?? fixture.score?.fullTime?.home,
    awayScore = fixture.awayScore ?? fixture.score?.fullTime?.away,
    status
  } = fixture;

  // Date logic
  const getDateDisplay = (matchDateTime: string) => {
    const matchDate = new Date(matchDateTime);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const matchDateOnly = new Date(matchDate.getFullYear(), matchDate.getMonth(), matchDate.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    const time = matchDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    if (matchDateOnly.getTime() === todayOnly.getTime()) {
      return { date: 'Today', time };
    } else if (matchDateOnly.getTime() === tomorrowOnly.getTime()) {
      return { date: 'Tomorrow', time };
    } else {
      const date = matchDate.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
      return { date, time };
    }
  };

  const { date, time } = getDateDisplay(dateTime);
  const isFinished = ['finished', 'live'].includes(status ?? '');
  const isLive = status === 'live';

  return (
    <div className={`bg-white border-b shadow-card ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6 lg:py-8">
          {/* Main Match Info */}
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              {/* Replaced old logo logic with EnhancedTeamLogo */}
              <div className="mb-3">
                <EnhancedTeamLogo team={homeTeam} size="lg" />
              </div>
              
              <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 text-center max-w-[120px] lg:max-w-[150px] leading-tight">
                {homeTeam.shortName || homeTeam.name}
              </h2>
              {isFinished && (
                <div className="mt-2 text-3xl lg:text-4xl font-bold text-neutral-800">
                  {homeScore}
                </div>
              )}
            </div>

            {/* Center - Enhanced Date/Time + Score + Venue */}
            <div className="flex-shrink-0 px-6 lg:px-8 text-center min-w-[200px] lg:min-w-[250px]">
              <EnhancedMatchDateTime 
                date={date} 
                time={time} 
                venue={venue} 
                isLive={isLive} 
              />

              <EnhancedScoreDisplay 
                homeScore={homeScore} 
                awayScore={awayScore} 
                isFinished={isFinished} 
              />
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              {/* Replaced old logo logic with EnhancedTeamLogo */}
              <div className="mb-3">
                <EnhancedTeamLogo team={awayTeam} size="lg" />
              </div>

              <h2 className="text-lg lg:text-xl font-semibold text-neutral-800 text-center max-w-[120px] lg:max-w-[150px] leading-tight">
                {awayTeam.shortName || awayTeam.name}
              </h2>
              {isFinished && (
                <div className="mt-2 text-3xl lg:text-4xl font-bold text-neutral-800">
                  {awayScore}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchHeader;
