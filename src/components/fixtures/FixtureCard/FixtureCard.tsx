import React, { useState, useEffect, useCallback } from 'react';
import { FixtureService } from '../../../services/fixtures/fixtureService';
import { useFixtureNavigation } from '../../../hooks/useNavigation';
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
  // New prop to enable navigation to stats page
  enableNavigation?: boolean;
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
  enableNavigation = false, // Default to false to preserve existing behavior
}) => {
  // Navigation hook
  const { goToStats } = useFixtureNavigation();

  // Game week mode states
  const [gameWeekFixtures, setGameWeekFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [gameWeekInfo, setGameWeekInfo] = useState<GameWeekInfo | null>(null);
  const [isLoading, setIsLoading] = useState(useGameWeekMode);
  const [error, setError] = useState<string | null>(null);

  // ... [keep all your existing fetchGameWeekData and useEffect logic] ...
  
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

  // ... [keep all your existing logic for determining fixtures to render, loading states, etc.] ...

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
        {/* Loading skeleton with same flex layout */}
        <div 
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          {[...Array(6)].map((_, idx) => (
            <div 
              key={idx}
              style={{
                flex: '1 1 calc(33.333% - 0.75rem)',
                minWidth: '280px',
                maxWidth: '100%'
              }}
            >
              <div className="skeleton rounded-xl h-24 md:h-28" />
            </div>
          ))}
        </div>
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
      homeScore = fixture.homeScore ?? fixture.score?.fullTime?.home ?? 0,
      awayScore = fixture.awayScore ?? fixture.score?.fullTime?.away ?? 0,
    } = fixture;

    const handleClick = () => {
      if (enableNavigation) {
        // Use the navigation utility
        goToStats(fixture);
      } else if (onClick) {
        // Use the existing onClick prop
        onClick(fixture);
      }
    };

    // ... [keep all your existing styling and rendering logic] ...
    const isFinished = ['finished', 'live'].includes(fixture.status ?? '');

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

    // Responsive size-based styling
    const getResponsiveSizes = () => {
      if (useGameWeekMode) {
        // Game week mode: smaller on mobile, larger on desktop
        return {
          logoSize: 'w-5 h-5 md:w-7 md:h-7',
          textSize: 'text-sm md:text-base',
          cardPadding: 'p-3 md:p-4',
          scoreSize: 'text-base md:text-xl',
          timeSize: 'text-sm md:text-lg'
        };
      } else {
        // Single fixture mode: use size prop
        const logoSize = size === 'sm' ? 'w-5 h-5 md:w-6 md:h-6' : 
                         size === 'lg' ? 'w-8 h-8 md:w-10 md:h-10' : 
                         'w-6 h-6 md:w-8 md:h-8';
        const textSize = size === 'sm' ? 'text-sm md:text-base' : 
                        size === 'lg' ? 'text-lg md:text-xl' : 
                        'text-base md:text-lg';
        const cardPadding = size === 'sm' ? 'p-3 md:p-4' : 
                           size === 'lg' ? 'p-6 md:p-8' : 
                           'p-4 md:p-6';
        const scoreSize = size === 'sm' ? 'text-lg md:text-xl' : 
                         size === 'lg' ? 'text-2xl md:text-3xl' : 
                         'text-xl md:text-2xl';
        const timeSize = size === 'sm' ? 'text-base md:text-lg' : 
                        size === 'lg' ? 'text-xl md:text-2xl' : 
                        'text-lg md:text-xl';
        return { logoSize, textSize, cardPadding, scoreSize, timeSize };
      }
    };

    const { logoSize, textSize, cardPadding, scoreSize, timeSize } = getResponsiveSizes();

    const cardClasses = `
      carousel-card
      ${cardPadding}
      ${(enableNavigation || onClick) ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : ''}
      ${useGameWeekMode ? 'h-full' : className}
      min-h-[100px] md:min-h-[120px]
    `.trim();

    return (
      <div key={fixture.id || index} className={cardClasses} onClick={handleClick}>
        <div className="flex items-center justify-between h-full">
          {/* Left Side - Teams Stacked */}
          <div className="flex flex-col justify-center space-y-2 md:space-y-3 flex-1">
            {/* Home Team */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {homeTeam.logo ? (
                <img 
                  src={homeTeam.logo} 
                  alt={homeTeam.name} 
                  className={`${logoSize} object-contain flex-shrink-0 team-logo`}
                />
              ) : (
                <div className={`${logoSize} bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-xs md:text-sm font-bold text-neutral-600">
                    {homeTeam.name[0]}
                  </span>
                </div>
              )}
              <span className={`font-medium text-neutral-800 ${textSize} truncate`}>
                {homeShort}
              </span>
            </div>

            {/* Away Team */}
            <div className="flex items-center space-x-2 md:space-x-3">
              {awayTeam.logo ? (
                <img 
                  src={awayTeam.logo} 
                  alt={awayTeam.name} 
                  className={`${logoSize} object-contain flex-shrink-0 team-logo`}
                />
              ) : (
                <div className={`${logoSize} bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-xs md:text-sm font-bold text-neutral-600">
                    {awayTeam.name[0]}
                  </span>
                </div>
              )}
              <span className={`font-medium text-neutral-800 ${textSize} truncate`}>
                {awayShort}
              </span>
            </div>
          </div>

          {/* Right Side - Time/Score */}
          <div className="flex items-center justify-center ml-4 md:ml-6 pl-3 md:pl-6 border-l border-neutral-200">
            {isFinished ? (
              <div className="text-center min-w-[50px] md:min-w-[70px]">
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
              <div className="text-center min-w-[50px] md:min-w-[70px]">
                <div className={`${timeSize} font-semibold text-neutral-800`}>
                  {formattedTime}
                </div>
                {enableNavigation && (
                  <div className="text-xs text-blue-600 mt-1">
                    View Stats →
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ... [keep all your existing rendering logic for game week mode and single fixture mode] ...

  // Game week mode: render multiple fixtures with header
  if (useGameWeekMode) {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Game Week Header */}
        {gameWeekInfo && (
          <div className="flex justify-between items-center">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">
              Matchday {gameWeekInfo.currentWeek}
            </h2>
            <div className="text-xs md:text-sm text-gray-600">
              {gameWeekInfo.isComplete ? (
                <span className="px-2 md:px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium text-xs md:text-sm">
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

        {/* Fixtures Grid - Responsive: 1 col mobile, 2 col tablet, 3 col desktop */}
        <div className="!grid !grid-cols-1 md:!grid-cols-2 lg:!grid-cols-3 !gap-3 md:!gap-4" style={{ display: 'grid' }}>
          {fixturesToRender.map((fixture, index) => renderFixtureCard(fixture, index))}
        </div>
      </div>
    );
  }

  // Single fixture mode: render just the fixture card
  return renderFixtureCard(fixturesToRender[0]);
};

export default FixtureCard;
