// src/components/fixtures/FixtureCard/FixtureCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FixtureService } from '../../../services/fixtures/fixtureService';
import type { Fixture, FeaturedFixtureWithImportance } from '../../../types';

interface FixtureCardProps {
  fixture?: Fixture;
  size?: 'sm' | 'md' | 'lg';
  showCompetition?: boolean;
  onClick?: (fixture: Fixture) => void;
  showAIInsight?: boolean;
  showVenue?: boolean;
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
          <div className="h-6 skeleton rounded w-32"></div>
          <div className="h-4 skeleton rounded w-24"></div>
        </div>
        {[...Array(6)].map((_, idx) => (
          <div key={idx} className="skeleton rounded-xl h-20" />
        ))}
      </div>
    );
  }

  // Error state for game week mode
  if (useGameWeekMode && error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-error mb-4">Failed to load fixtures: {error}</p>
        <button
          onClick={fetchGameWeekData}
          className="btn btn-secondary px-4 py-2"
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
        <p className="text-neutral-600">No fixtures available</p>
      </div>
    ) : null;
  }

  // Single fixture card renderer
  const renderFixtureCard = (fixture: Fixture, index?: number) => {
    const {
      homeTeam,
      awayTeam,
      dateTime,
      //status,
      homeScore = fixture.homeScore ?? fixture.score?.fullTime?.home ?? 0,
      awayScore = fixture.awayScore ?? fixture.score?.fullTime?.away ?? 0,
    } = fixture;

    const handleClick = () => {
      if (onClick) onClick(fixture);
    };

    const isFinished = ['finished', 'live'].includes(fixture.status ?? '');
    //const homeScoreValue = fixture.homeScore ?? fixture.score?.fullTime?.home ?? 0;
    //const awayScoreValue = fixture.awayScore ?? fixture.score?.fullTime?.away ?? 0;

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
      carousel-card
      ${cardPadding}
      ${onClick ? 'cursor-pointer' : ''}
      ${useGameWeekMode ? '' : className}
    `.trim();

    return (
      <div key={fixture.id || index} className={cardClasses} onClick={handleClick}>
        <div className="flex items-center justify-between">
          {/* Left Side - Teams Stacked */}
          <div className="flex flex-col space-y-4 flex-1">
            {/* Home Team */}
            <div className="flex items-center space-x-3">
              {homeTeam.logo ? (
                <img 
                  src={homeTeam.logo} 
                  alt={homeTeam.name} 
                  className={`${logoSize} object-contain flex-shrink-0 team-logo`}
                />
              ) : (
                <div className={`${logoSize} bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-bold text-neutral-600">
                    {homeTeam.name[0]}
                  </span>
                </div>
              )}
              <span className={`font-medium text-neutral-800 ${textSize}`}>
                {homeShort}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex items-center space-x-3">
              {awayTeam.logo ? (
                <img 
                  src={awayTeam.logo} 
                  alt={awayTeam.name} 
                  className={`${logoSize} object-contain flex-shrink-0 team-logo`}
                />
              ) : (
                <div className={`${logoSize} bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-bold text-neutral-600">
                    {awayTeam.name[0]}
                  </span>
                </div>
              )}
              <span className={`font-medium text-neutral-800 ${textSize}`}>
                {awayShort}
              </span>
            </div>
          </div>

          {/* Right Side - Time/Score */}
          <div className="flex items-center justify-center ml-6 pl-6 border-l border-neutral-200">
            {isFinished ? (
            <div className="text-center min-w-[70px]">
              <div className={`${scoreSize} font-bold text-neutral-800 mb-1`}>
                {homeScore}
              </div>
              <div className={`${scoreSize} font-bold text-neutral-800 mb-1`}>
                {awayScore}
              </div>
              <div className="text-xs text-neutral-500 font-medium">
                {fixture.status === 'live' ? (
                  <span className="status-live">LIVE</span>
                ) : (
                  'Full time'
                )}
              </div>
            </div>
          ) : (
            <div className="text-center min-w-[70px]">
              <div className={`${size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'} font-semibold text-neutral-800`}>
                {formattedTime}
              </div>
            </div>
          )}
          </div>
        </div>
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
            <h2 className="text-xl font-bold text-gray-800">
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