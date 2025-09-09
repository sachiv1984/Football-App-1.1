import React from 'react';
import type { Fixture } from '../../../types';

interface FixtureCardProps {
  fixture: Fixture;
  size?: 'sm' | 'md' | 'lg';
  showAIInsight?: boolean;
  showCompetition?: boolean;
  showVenue?: boolean;
  onClick?: (fixture: Fixture) => void;
  className?: string;
}

const FixtureCard: React.FC<FixtureCardProps> = ({
  fixture,
  size = 'md',
  showAIInsight = false,
  showCompetition = false,
  showVenue = false,
  onClick,
  className = '',
}) => {
  const {
    homeTeam,
    awayTeam,
    dateTime,
    status,
    homeScore,
    awayScore,
    venue,
    aiInsight
  } = fixture;

  const handleClick = () => {
    if (onClick) onClick(fixture);
  };

  const isFinished = status === 'finished' || status === 'live';
  const showScore = isFinished && (homeScore !== undefined && awayScore !== undefined);

  // Use the shortName already set by FixtureService (same logic as carousel)
  const homeShort = fixture.homeTeam.shortName;
  const awayShort = fixture.awayTeam.shortName;

  // Format time only (no date since we have header date)
  const matchDate = new Date(dateTime);
  const formattedTime = matchDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });

  // Size-based styling
  const logoSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
  const cardPadding = size === 'sm' ? 'p-3' : size === 'lg' ? 'p-8' : 'p-6';
  const scoreSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';

  const cardClasses = `
    bg-white rounded-2xl shadow-sm border border-gray-100
    transition-all duration-200 hover:shadow-md hover:border-gray-200
    ${cardPadding}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `.trim();

  return (
    <div className={cardClasses} onClick={handleClick}>
      <div className="flex items-center justify-between">
        {/* Left Side - Teams Stacked */}
        <div className="flex flex-col space-y-3 flex-1">
          {/* Home Team */}
          <div className="flex items-center space-x-3">
            {homeTeam.logo ? (
              <img 
                src={homeTeam.logo} 
                alt={homeTeam.name} 
                className={`${logoSize} object-contain flex-shrink-0`}
              />
            ) : (
              <div className={`${logoSize} bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-sm font-bold text-gray-600">
                  {homeTeam.name[0]}
                </span>
              </div>
            )}
            <span className={`font-medium text-gray-900 ${textSize} truncate`}>
              {homeShort}
            </span>
          </div>

          {/* Away Team */}
          <div className="flex items-center space-x-3">
            {awayTeam.logo ? (
              <img 
                src={awayTeam.logo} 
                alt={awayTeam.name} 
                className={`${logoSize} object-contain flex-shrink-0`}
              />
            ) : (
              <div className={`${logoSize} bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-sm font-bold text-gray-600">
                  {awayTeam.name[0]}
                </span>
              </div>
            )}
            <span className={`font-medium text-gray-900 ${textSize} truncate`}>
              {awayShort}
            </span>
          </div>
        </div>

        {/* Right Side - Time/Score */}
        <div className="flex items-center justify-center ml-4 pl-4 border-l border-gray-100">
          {showScore ? (
            <div className="text-center min-w-[60px]">
              <div className={`${scoreSize} font-bold text-gray-900 mb-1`}>
                {homeScore}
              </div>
              <div className={`${scoreSize} font-bold text-gray-900 mb-1`}>
                {awayScore}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                {status === 'live' ? 'LIVE' : 'Full time'}
              </div>
            </div>
          ) : (
            <div className="text-center min-w-[60px]">
              <div className={`${size === 'sm' ? 'text-lg' : 'text-xl'} font-semibold text-gray-900`}>
                {formattedTime}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Venue */}
      {showVenue && venue && (
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500">📍 {venue}</span>
        </div>
      )}

      {/* Status indicator for live matches */}
      {status === 'live' && (
        <div className="flex justify-center mt-3">
          <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium animate-pulse">
            LIVE
          </div>
        </div>
      )}

      {/* AI Insight */}
      {showAIInsight && aiInsight && size !== 'sm' && (
        <div className="mt-4 p-3 bg-gradient-to-r from-teal-50 to-transparent border-l-4 border-teal-400 rounded-r-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
                  AI Insight
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  aiInsight.confidence === 'high' ? 'bg-green-100 text-green-800' :
                  aiInsight.confidence === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                }`}>
                  {aiInsight.confidence}
                </span>
              </div>
              <h5 className="text-sm font-semibold text-gray-900 mb-1">{aiInsight.title}</h5>
              <p className="text-xs text-gray-600 line-clamp-2">{aiInsight.description}</p>
            </div>
            {aiInsight.odds && (
              <div className="ml-3 text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Odds</div>
                <div className="text-sm font-bold text-teal-600">{aiInsight.odds}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FixtureCard;