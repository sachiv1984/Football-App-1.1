// src/components/fixtures/FixtureCard/FixtureCard.tsx
import React from 'react';
import type { Fixture } from '../../../types';

interface FixtureCardProps {
  fixture: Fixture;
  onClick?: (fixture: Fixture) => void;
  className?: string;
}

const FixtureCard: React.FC<FixtureCardProps> = ({
  fixture,
  onClick,
  className = '',
}) => {
  const {
    homeTeam,
    awayTeam,
    dateTime,
    status,
    homeScore,
    awayScore
  } = fixture;

  const handleClick = () => {
    if (onClick) onClick(fixture);
  };

  const isFinished = status === 'finished' || status === 'live';
  const showScore = isFinished && (homeScore !== undefined && awayScore !== undefined);

  // Format date and time
  const matchDate = new Date(dateTime);
  const formattedDate = matchDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  const formattedTime = matchDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  const cardClasses = `
    bg-white rounded-2xl p-6 shadow-sm border border-gray-100
    transition-all duration-200 hover:shadow-md hover:border-gray-200
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim();

  return (
    <div className={cardClasses} onClick={handleClick}>
      <div className="flex items-center justify-between">
        {/* Home Team */}
        <div className="flex items-center space-x-3 flex-1">
          {homeTeam.logo ? (
            <img 
              src={homeTeam.logo} 
              alt={homeTeam.name} 
              className="w-8 h-8 object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-gray-600">
                {homeTeam.name[0]}
              </span>
            </div>
          )}
          <span className="font-medium text-gray-900 text-base truncate">
            {homeTeam.name}
          </span>
        </div>

        {/* Score or Time */}
        <div className="flex items-center justify-center min-w-0 px-4">
          {showScore ? (
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {homeScore} - {awayScore}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {status === 'live' ? 'LIVE' : 'Full time'}
              </div>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 mb-1">
                {formattedTime}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {formattedDate}
              </div>
            </div>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center space-x-3 flex-1 justify-end">
          <span className="font-medium text-gray-900 text-base truncate text-right">
            {awayTeam.name}
          </span>
          {awayTeam.logo ? (
            <img 
              src={awayTeam.logo} 
              alt={awayTeam.name} 
              className="w-8 h-8 object-contain flex-shrink-0"
            />
          ) : (
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-gray-600">
                {awayTeam.name[0]}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Status indicator for live matches */}
      {status === 'live' && (
        <div className="flex justify-center mt-3">
          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium animate-pulse">
            LIVE
          </div>
        </div>
      )}
    </div>
  );
};

export default FixtureCard;