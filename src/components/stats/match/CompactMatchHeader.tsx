// src/components/match/MatchHeader/CompactMatchHeader.tsx
import React from 'react';
import type { Fixture } from '../../../types';

interface CompactMatchHeaderProps {
  fixture: Fixture;
  className?: string;
}

const CompactMatchHeader: React.FC<CompactMatchHeaderProps> = ({ fixture, className = '' }) => {
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
      return `Today, ${time}`;
    } else if (matchDateOnly.getTime() === tomorrowOnly.getTime()) {
      return `Tomorrow, ${time}`;
    } else {
      const date = matchDate.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
      return `${date}, ${time}`;
    }
  };

  const dateTimeDisplay = getDateDisplay(dateTime);
  const isFinished = ['finished', 'live'].includes(status ?? '');
  const isLive = status === 'live';

  return (
    <div className={`bg-white border-b border-gray-200 shadow-sm ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4 lg:py-6">
          <div className="flex items-center justify-between">
            {/* Home Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="mb-2">
                {homeTeam.logo ? (
                  <img 
                    src={homeTeam.logo} 
                    alt={homeTeam.name} 
                    className="w-12 h-12 lg:w-16 lg:h-16 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-lg lg:text-xl font-bold text-gray-600">
                      {homeTeam.name[0]}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 text-center max-w-[100px] lg:max-w-[120px] leading-tight">
                {homeTeam.shortName || homeTeam.name}
              </h3>
              {isFinished && (
                <div className="mt-1 text-xl lg:text-2xl font-bold text-gray-800">
                  {homeScore}
                </div>
              )}
            </div>

            {/* Center - Date/Time/Venue */}
            <div className="flex-shrink-0 px-4 lg:px-6 text-center min-w-[180px] lg:min-w-[200px]">
              <div className="text-sm lg:text-base font-medium text-gray-900 mb-1">
                {dateTimeDisplay}
                {isLive && (
                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    LIVE
                  </span>
                )}
              </div>
              
              {/* Score or VS */}
              {isFinished ? (
                <div className="text-lg lg:text-xl font-bold text-gray-800 mb-1">
                  {homeScore} - {awayScore}
                </div>
              ) : (
                <div className="text-lg lg:text-xl font-medium text-gray-500 mb-1">
                  VS
                </div>
              )}

              {/* Venue */}
              {venue && (
                <div className="text-xs lg:text-sm text-gray-600 max-w-[160px] lg:max-w-[180px] mx-auto leading-tight">
                  {venue}
                </div>
              )}
            </div>

            {/* Away Team */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="mb-2">
                {awayTeam.logo ? (
                  <img 
                    src={awayTeam.logo} 
                    alt={awayTeam.name} 
                    className="w-12 h-12 lg:w-16 lg:h-16 object-contain mx-auto"
                  />
                ) : (
                  <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto">
                    <span className="text-lg lg:text-xl font-bold text-gray-600">
                      {awayTeam.name[0]}
                    </span>
                  </div>
                )}
              </div>
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 text-center max-w-[100px] lg:max-w-[120px] leading-tight">
                {awayTeam.shortName || awayTeam.name}
              </h3>
              {isFinished && (
                <div className="mt-1 text-xl lg:text-2xl font-bold text-gray-800">
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

export default CompactMatchHeader;
