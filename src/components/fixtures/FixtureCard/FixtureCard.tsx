import React, { useState, useEffect, useCallback } from 'react';
import { FixtureService } from '../../../services/fixtures/fixtureService';
import type { Fixture, FeaturedFixtureWithImportance } from '../../../types';

interface FixtureCardProps {
  fixture?: Fixture;
  size?: 'sm' | 'md' | 'lg';
  showCompetition?: boolean;
  onClick?: (fixture: Fixture) => void;
  className?: string;
  // New prop to enable game week mode
  useGameWeekMode?: boolean;
  refreshInterval?: number;
}

interface GameWeekInfo {
  currentWeek: number;
  isComplete: boolean;
  totalGames: number;
  finishedGames: number;
  upcomingGames: number;
}

const fixtureService = new FixtureService();

const FixtureCard: React.FC<FixtureCardProps> = ({
  fixture: singleFixture,
  size = 'md',
  showCompetition = false,
  onClick,
  className = '',
  useGameWeekMode = false,
  refreshInterval = 5 * 60 * 1000, // 5 minutes
}) => {
  // Game week mode states
  const [gameWeekFixtures, setGameWeekFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [gameWeekInfo, setGameWeekInfo] = useState<GameWeekInfo | null>(null);
  const [isLoading, setIsLoading] = useState(useGameWeekMode);
  const [error, setError] = useState<string | null>(null);

  // Fetch game week data
  const fetchGameWeekData = useCallback(async () => {
    if (!useGameWeekMode) return;
    
    try {
      setError(null);
      
      const [weekFixtures, weekInfo] = await Promise.all([
        fixtureService.getCurrentGameWeekFixtures(),
        fixtureService.getGameWeekInfo()
      ]);

      setGameWeekFixtures(weekFixtures);
      setGameWeekInfo(weekInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fixtures');
      console.error('Error fetching game week fixtures:', err);
    } finally {
      setIsLoading(false);
    }
  }, [useGameWeekMode]);

  // Set up game week data fetching and refresh interval
  useEffect(() => {
    if (useGameWeekMode) {
      fetchGameWeekData();

      // Set up interval for live updates
      const interval = setInterval(fetchGameWeekData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchGameWeekData, refreshInterval, useGameWeekMode]);

  // Determine which fixtures to render
  const fixturesToRender = useGameWeekMode
  ? gameWeekFixtures.filter(f => f.status === 'live' || f.status === 'finished' || f.status === 'upcoming')
  : singleFixture
  ? [singleFixture]
  : [];

  // Loading state for game week mode
  if (useGameWeekMode && isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
        </div>
        {[...Array(6)].map((_, idx) => (
          <div key={idx} className="bg-gray-200 animate-pulse rounded-2xl h-20" />
        ))}
      </div>
    );
  }

  // Error state for game week mode
  if (useGameWeekMode && error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-600 mb-4">Failed to load fixtures: {error}</p>
        <button
          onClick={fetchGameWeekData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // No fixtures to show
  if (fixturesToRender.length === 0) {
    return useGameWeekMode ? (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-gray-600">No fixtures available</p>
      </div>
    ) : null;
  }

  // Single fixture card renderer
  const renderFixtureCard = (fixture: Fixture, index?: number) => {
    const {
      homeTeam,
      awayTeam,
      dateTime,
      status,
      homeScore,
      awayScore,
    } = fixture;

    const handleClick = () => {
      if (onClick) onClick(fixture);
    };

    const isFinished = status === 'finished' || status === 'live';
    // const showScore = isFinished && (homeScore !== undefined && awayScore !== undefined);

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
      ${useGameWeekMode ? '' : className}
    `.trim();

    return (
      <div key={fixture.id || index} className={cardClasses} onClick={handleClick}>
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
  {isFinished ? (
    <div className="text-center min-w-[60px]">
      <div className={`${scoreSize} font-bold text-gray-900 mb-1`}>
        {homeScore ?? 0}
      </div>
      <div className={`${scoreSize} font-bold text-gray-900 mb-1`}>
        {awayScore ?? 0}
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

        {/* Optional sections */}
        {showCompetition && fixture.competition && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-500 font-medium">
              {fixture.competition.name}
            </span>
          </div>
        )}
      </div>
    );
  };

  // Game week mode: render multiple fixtures with header
  if (useGameWeekMode) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Game Week Header */}
        {gameWeekInfo && (
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              Matchday {gameWeekInfo.currentWeek}
            </h2>
            <div className="text-sm text-gray-600">
              {gameWeekInfo.isComplete ? (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
                  Complete
                </span>
              ) : (
                <span className="text-gray-600">
                  {gameWeekInfo.finishedGames}/{gameWeekInfo.totalGames} played
                </span>
              )}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {gameWeekInfo && !gameWeekInfo.isComplete && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(gameWeekInfo.finishedGames / gameWeekInfo.totalGames) * 100}%`
              }}
            />
          </div>
        )}

        {/* Fixtures Grid */}
        <div className="grid grid-cols-1 gap-4">
          {fixturesToRender.map((fixture, index) => renderFixtureCard(fixture, index))}
        </div>
      </div>
    );
  }

  // Single fixture mode: render just the fixture card
  return renderFixtureCard(fixturesToRender[0]);
};

export default FixtureCard;