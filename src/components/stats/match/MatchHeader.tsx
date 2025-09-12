// src/components/match/MatchHeader/MatchHeader.tsx
import React from 'react';
import type { Fixture } from '../../../types';

interface MatchHeaderProps {
  fixture: Fixture;
  className?: string;
}

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

  // Date logic for today/tomorrow
  const getDateDisplay = (matchDateTime: string) => {
    const matchDate = new Date(matchDateTime);
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    // Reset time to compare dates only
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
    <div className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
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
                    className="w-16 h-16 lg:w-20 lg:h-20 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl lg:text-3xl font-bold text-gray-600">
                      {homeTeam.name[0]}
                    </span>
                  </div>
                )}
              </div>
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 text-center max-w-[120px] lg:max-w-[150px]">
                {homeTeam.shortName || homeTeam.name}
              </h2>
              {isFinished && (
                <div className="mt-2 text-3xl lg:text-4xl font-bold text-gray-800">
                  {homeScore}
                </div>
              )}
            </div>

            {/* Center - Date/Time/Score/Venue */}
            <div className="flex-shrink-0 px-6 lg:px-8 text-center min-w-[200px] lg:min-w-[250px]">
              {/* Date and Time */}
              <div className="mb-2">
                <div className="text-lg lg:text-xl font-semibold text-gray-900">
                  {date}
                </div>
                <div className="text-base lg:text-lg text-gray-600">
                  {time}
                  {isLive && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      LIVE
                    </span>
                  )}
                </div>
              </div>

              {/* Score (if finished) or VS */}
              {isFinished ? (
                <div className="text-2xl lg:text-3xl font-bold text-gray-800 mb-2">
                  {homeScore} - {awayScore}
                </div>
              ) : (
                <div className="text-xl lg:text-2xl font-semibold text-gray-500 mb-2">
                  VS
                </div>
              )}

              {/* Venue */}
              {venue && (
                <div className="text-sm lg:text-base text-gray-600 max-w-[180px] lg:max-w-[220px] mx-auto">
                  {venue}
                </div>
              )}

              {/* Match Status */}
              {status && status !== 'upcoming' && !isLive && (
                <div className="mt-2 text-xs lg:text-sm text-gray-500 font-medium uppercase">
                  {status === 'finished' ? 'Full Time' : status}
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
                    className="w-16 h-16 lg:w-20 lg:h-20 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-2xl lg:text-3xl font-bold text-gray-600">
                      {awayTeam.name[0]}
                    </span>
                  </div>
                )}
              </div>
              <h2 className="text-lg lg:text-xl font-semibold text-gray-900 text-center max-w-[120px] lg:max-w-[150px]">
                {awayTeam.shortName || awayTeam.name}
              </h2>
              {isFinished && (
                <div className="mt-2 text-3xl lg:text-4xl font-bold text-gray-800">
                  {awayScore}
                </div>
              )}
            </div>
          </div>

          {/* Additional Info Row (Optional) */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-center items-center space-x-6 text-sm text-gray-600">
              {fixture.competition && (
                <span className="font-medium">{fixture.competition}</span>
              )}
              {fixture.round && (
                <span>Matchday {fixture.round}</span>
              )}
              {fixture.referee && (
                <span>Referee: {fixture.referee}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchHeader;
