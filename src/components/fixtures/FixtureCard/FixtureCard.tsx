import React from 'react';
import type { Fixture } from '../../../types';

interface FixtureCardProps {
  fixture: Fixture;
  size?: 'sm' | 'md' | 'lg';
  showVenue?: boolean;
  onClick?: (fixture: Fixture) => void;
  className?: string;
  isSkeleton?: boolean; // Loading state
}

const FixtureCard: React.FC<FixtureCardProps> = ({
  fixture,
  size = 'md',
  showVenue = false,
  onClick,
  className = '',
  isSkeleton = false,
}) => {
  const handleClick = () => {
    if (onClick) onClick(fixture);
  };

  // Sizes
  const logoSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
  const scoreSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';
  const cardPadding = size === 'sm' ? 'p-3' : size === 'lg' ? 'p-6 md:p-8' : 'p-4 md:p-6';

  // Skeleton
  if (isSkeleton) {
    return (
      <div className={`skeleton rounded-xl ${cardPadding} ${className} h-32 md:h-40`} />
    );
  }

  const { homeTeam, awayTeam, dateTime, homeScore = fixture.score?.fullTime?.home, awayScore = fixture.score?.fullTime?.away, status } = fixture;
  const isFinished = ['finished', 'live'].includes(status ?? '');

  const homeShort = homeTeam.shortName || homeTeam.name;
  const awayShort = awayTeam.shortName || awayTeam.name;

  const matchDate = new Date(dateTime);
  const formattedTime = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <button
      onClick={handleClick}
      className={`bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl ${cardPadding} w-full flex justify-between items-center hover:scale-[1.02] transition-transform duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      aria-label={`Fixture: ${homeTeam.name} vs ${awayTeam.name}`}
    >
      {/* Teams */}
      <div className="flex flex-col space-y-2 flex-1">
        {/* Home */}
        <div className="flex items-center space-x-2">
          {homeTeam.logo ? (
            <img src={homeTeam.logo} alt={homeTeam.name} className={`${logoSize} object-contain flex-shrink-0 rounded-full`} />
          ) : (
            <div className={`${logoSize} bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0`}>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-200">{homeTeam.name[0]}</span>
            </div>
          )}
          <span className={`font-medium text-gray-800 dark:text-gray-200 ${textSize} truncate`}>{homeShort}</span>
        </div>

        {/* Away */}
        <div className="flex items-center space-x-2">
          {awayTeam.logo ? (
            <img src={awayTeam.logo} alt={awayTeam.name} className={`${logoSize} object-contain flex-shrink-0 rounded-full`} />
          ) : (
            <div className={`${logoSize} bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0`}>
              <span className="text-sm font-bold text-gray-600 dark:text-gray-200">{awayTeam.name[0]}</span>
            </div>
          )}
          <span className={`font-medium text-gray-800 dark:text-gray-200 ${textSize} truncate`}>{awayShort}</span>
        </div>
      </div>

      {/* Time / Score */}
      <div className="flex flex-col items-center justify-center ml-4 pl-4 border-l border-gray-200 dark:border-slate-700">
        {isFinished ? (
          <>
            <div className={`${scoreSize} font-bold text-gray-800 dark:text-gray-200`}>{homeScore}</div>
            <div className={`${scoreSize} font-bold text-gray-800 dark:text-gray-200`}>{awayScore}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {status === 'live' ? <span className="text-red-500 font-semibold">LIVE</span> : 'FT'}
            </div>
          </>
        ) : (
          <div className={`${size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'} font-semibold text-gray-800 dark:text-gray-200`}>
            {formattedTime}
          </div>
        )}
      </div>

      {/* Venue */}
      {showVenue && fixture.venue && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400">
          {fixture.venue}
        </div>
      )}
    </button>
  );
};

export default FixtureCard;
