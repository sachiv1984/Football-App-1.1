// src/components/match/MatchHeader/MatchHeader.tsx
import React from 'react';
import type { Fixture } from '../../../types';

interface MatchHeaderProps {
  fixture: Fixture;
  className?: string;
}

// Live badge component
const LiveStatusBadge: React.FC = () => (
  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-full shadow-lg">
    <div className="w-2 h-2 bg-white rounded-full live-pulse" />
    <span className="text-xs font-bold uppercase tracking-wider">
      Live
    </span>
  </div>
);

// Enhanced score display component
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
              <div className="mb-3">
                {homeTeam.logo ? (
                  <img 
                    src={homeTeam.logo} 
                    alt={homeTeam.name} 
                    className="w-16 h-16 lg:w-20 lg:h-20 team-logo"
                  />
                ) : (
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-neutral-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl lg:text-3xl font-bold text-neutral-600">
                      {homeTeam.name[0]}
                    </span>
                  </div>
                )}
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

            {/* Center - Date/Time/Score/Venue */}
            <div className="flex-shrink-0 px-6 lg:px-8 text-center min-w-[200px] lg:min-w-[250px]">
              {/* Date and Time */}
              <div className="mb-3">
                <div className="text-lg lg:text-xl font-semibold text-neutral-900">
                  {date}
                </div>
                <div className="text-base lg:text-lg text-neutral-600 flex items-center justify-center gap-2">
                  {time}
                  {isLive && <LiveStatusBadge />}
                </div>
              </div>

              {/* Score / VS */}
              <EnhancedScoreDisplay 
                homeScore={homeScore} 
                awayScore={awayScore} 
                isFinished={isFinished} 
              />

              {/* Venue */}
              {venue && (
                <div className="text-sm lg:text-base text-neutral-600 max-w-[180px] lg:max-w-[220px] mx-auto leading-tight">
                  {venue}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="mb-3">
                {awayTeam.logo ? (
                  <img 
                    src={awayTeam.logo} 
                    alt={awayTeam.name} 
                    className="w-16 h-16 lg:w-20 lg:h-20 team-logo"
                  />
                ) : (
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-neutral-200 rounded-full flex items-center justify-center">
                    <span className="text-2xl lg:text-3xl font-bold text-neutral-600">
                      {awayTeam.name[0]}
                    </span>
                  </div>
                )}
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
