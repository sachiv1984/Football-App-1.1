import React, { useState, useEffect, useCallback } from 'react';
import { fbrefFixtureService } from '../../../services/fixtures/fbrefFixtureService';
import { useFixtureNavigation } from '../../../hooks/useNavigation';
import type { FeaturedFixtureWithImportance } from '../../../types';

interface FixtureCardProps {
  fixture?: FeaturedFixtureWithImportance;
  size?: 'sm' | 'md' | 'lg';
  showCompetition?: boolean;
  onClick?: (fixture: FeaturedFixtureWithImportance) => void;
  showAIInsight?: boolean;
  showVenue?: boolean;
  className?: string;
  useGameWeekMode?: boolean;
  refreshInterval?: number;
  enableNavigation?: boolean;
}

interface GameWeekInfo {
  currentWeek: number;
  isComplete: boolean;
  totalGames: number;
  finishedGames: number;
  upcomingGames: number;
}

const FixtureCard: React.FC<FixtureCardProps> = ({
  fixture: singleFixture,
  size = 'md',
  showCompetition = false,
  onClick,
  className = '',
  useGameWeekMode = false,
  refreshInterval = 5 * 60 * 1000,
  enableNavigation = false,
}) => {
  const { goToStats } = useFixtureNavigation();

  const [gameWeekFixtures, setGameWeekFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [gameWeekInfo, setGameWeekInfo] = useState<GameWeekInfo | null>(null);
  const [isLoading, setIsLoading] = useState(useGameWeekMode);
  const [error, setError] = useState<string | null>(null);

  const fetchGameWeekData = useCallback(async () => {
    if (!useGameWeekMode) return;

    try {
      setError(null);
      setIsLoading(true);

      const [weekFixtures, weekInfo] = await Promise.all([
        fbrefFixtureService.getCurrentGameWeekFixtures(),
        fbrefFixtureService.getGameWeekInfo()
      ]);

      setGameWeekFixtures(weekFixtures);
      setGameWeekInfo(weekInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fixtures');
      console.error('Error fetching FBref game week fixtures:', err);
    } finally {
      setIsLoading(false);
    }
  }, [useGameWeekMode]);

  useEffect(() => {
    if (useGameWeekMode) {
      fetchGameWeekData();
      const interval = setInterval(fetchGameWeekData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchGameWeekData, refreshInterval, useGameWeekMode]);

  // Fix: ensure fixtures are fully typed as FeaturedFixtureWithImportance
  const fixturesToRender: FeaturedFixtureWithImportance[] = useGameWeekMode
    ? gameWeekFixtures
        .filter(f => f.status && ['live', 'finished', 'upcoming'].includes(f.status))
        .map(f => ({
          ...f,
          importanceScore: f.importanceScore ?? 0,
          tags: f.tags ?? [],
          isBigMatch: f.isBigMatch ?? false,
        }))
    : singleFixture
    ? [{
        ...singleFixture,
        importanceScore: singleFixture.importanceScore ?? 0,
        tags: singleFixture.tags ?? [],
        isBigMatch: singleFixture.isBigMatch ?? false,
      }]
    : [];

  if (useGameWeekMode && isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="flex justify-between items-center">
          <div className="h-6 skeleton rounded w-32"></div>
          <div className="h-4 skeleton rounded w-24"></div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          {[...Array(6)].map((_, idx) => (
            <div key={idx} style={{ flex: '1 1 calc(33.333% - 0.75rem)', minWidth: '280px' }}>
              <div className="skeleton rounded-xl h-24 md:h-28" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (useGameWeekMode && error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-error mb-4">Failed to load fixtures: {error}</p>
        <button onClick={fetchGameWeekData} className="btn btn-secondary px-4 py-2">
          Try Again
        </button>
      </div>
    );
  }

  if (fixturesToRender.length === 0) {
    return useGameWeekMode ? (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-neutral-600">No fixtures available</p>
      </div>
    ) : null;
  }

  const renderFixtureCard = (fixture: FeaturedFixtureWithImportance) => {
    const { homeTeam, awayTeam, dateTime, homeScore, awayScore } = fixture;

    const handleClick = () => {
      if (enableNavigation) goToStats(fixture);
      else if (onClick) onClick(fixture);
    };

    const isFinished = ['finished', 'live'].includes(fixture.status ?? '');
    const homeShort = homeTeam.shortName;
    const awayShort = awayTeam.shortName;

    const matchDate = new Date(dateTime);
    const formattedTime = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

    const getResponsiveSizes = () => {
      if (useGameWeekMode) return {
        logoSize: 'w-5 h-5 md:w-7 md:h-7',
        textSize: 'text-sm md:text-base',
        cardPadding: 'p-3 md:p-4',
        scoreSize: 'text-base md:text-xl',
        timeSize: 'text-sm md:text-lg'
      };

      const logoSize = size === 'sm' ? 'w-5 h-5 md:w-6 md:h-6' : size === 'lg' ? 'w-8 h-8 md:w-10 md:h-10' : 'w-6 h-6 md:w-8 md:h-8';
      const textSize = size === 'sm' ? 'text-sm md:text-base' : size === 'lg' ? 'text-lg md:text-xl' : 'text-base md:text-lg';
      const cardPadding = size === 'sm' ? 'p-3 md:p-4' : size === 'lg' ? 'p-6 md:p-8' : 'p-4 md:p-6';
      const scoreSize = size === 'sm' ? 'text-lg md:text-xl' : size === 'lg' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl';
      const timeSize = size === 'sm' ? 'text-base md:text-lg' : size === 'lg' ? 'text-xl md:text-2xl' : 'text-lg md:text-xl';

      return { logoSize, textSize, cardPadding, scoreSize, timeSize };
    };

    const { logoSize, textSize, cardPadding, scoreSize, timeSize } = getResponsiveSizes();

    return (
      <div key={fixture.id} className={`carousel-card ${cardPadding} ${enableNavigation ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : ''} min-h-[100px] md:min-h-[120px]`} onClick={handleClick}>
        <div className="flex items-center justify-between h-full">
          <div className="flex flex-col justify-center space-y-2 md:space-y-3 flex-1">
            <div className="flex items-center space-x-2 md:space-x-3">
              {homeTeam.logo ? (
                <img src={homeTeam.logo} alt={homeTeam.name} className={`${logoSize} object-contain flex-shrink-0 team-logo`} />
              ) : <div className={`${logoSize} bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0`}><span className="text-xs md:text-sm font-bold text-neutral-600">{homeTeam.name[0]}</span></div>}
              <span className={`font-medium text-neutral-800 ${textSize} truncate`}>{homeShort}</span>
            </div>
            <div className="flex items-center space-x-2 md:space-x-3">
              {awayTeam.logo ? (
                <img src={awayTeam.logo} alt={awayTeam.name} className={`${logoSize} object-contain flex-shrink-0 team-logo`} />
              ) : <div className={`${logoSize} bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0`}><span className="text-xs md:text-sm font-bold text-neutral-600">{awayTeam.name[0]}</span></div>}
              <span className={`font-medium text-neutral-800 ${textSize} truncate`}>{awayShort}</span>
            </div>
          </div>

          <div className="flex items-center justify-center ml-4 md:ml-6 pl-3 md:pl-6 border-l border-neutral-200">
            {isFinished ? (
              <div className="text-center min-w-[50px] md:min-w-[70px]">
                <div className={`${scoreSize} font-bold text-neutral-800 mb-1`}>{homeScore}</div>
                <div className={`${scoreSize} font-bold text-neutral-800 mb-1`}>{awayScore}</div>
                <div className="text-xs text-neutral-500 font-medium">{fixture.status === 'live' ? <span className="status-live">LIVE</span> : 'Full time'}</div>
              </div>
            ) : (
              <div className="text-center min-w-[50px] md:min-w-[70px]">
                <div className={`${timeSize} font-semibold text-neutral-800`}>{formattedTime}</div>
                {enableNavigation && <div className="text-xs text-blue-600 mt-1">View Stats →</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (useGameWeekMode) {
    return (
      <div className={`space-y-4 ${className}`}>
        {gameWeekInfo && (
          <div className="flex justify-between items-center">
            <h2 className="text-lg md:text-xl font-bold text-gray-800">Matchday {gameWeekInfo.currentWeek}</h2>
            <div className="text-xs md:text-sm text-gray-600">
              {gameWeekInfo.isComplete ? (
                <span className="px-2 md:px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium text-xs md:text-sm">Complete</span>
              ) : (
                <span className="text-gray-600">{gameWeekInfo.finishedGames}/{gameWeekInfo.totalGames} played</span>
              )}
            </div>
          </div>
        )}
        <div className="!grid !grid-cols-1 md:!grid-cols-2 lg:!grid-cols-3 !gap-3 md:!gap-4">
          {fixturesToRender.map(renderFixtureCard)}
        </div>
      </div>
    );
  }

  return renderFixtureCard(fixturesToRender[0]);
};

export default FixtureCard;
