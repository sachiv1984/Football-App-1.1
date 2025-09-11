// src/components/fixtures/FixtureCard/FixtureCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FixtureService } from '../../../services/fixtures/fixtureService';
import type { Fixture, FeaturedFixtureWithImportance } from '../../../types';

interface FixtureCardProps {
  fixture?: Fixture | FeaturedFixtureWithImportance;
  size?: 'sm' | 'md' | 'lg';
  showCompetition?: boolean;
  onClick,
  showAIInsight?: boolean;
  showVenue?: boolean;
  className?: string;
  useGameWeekMode?: boolean;
  refreshInterval?: number;
  isSkeleton?: boolean; // NEW
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
  fixture,
  size = 'md',
  showCompetition = false,
  onClick?: (fixture: Fixture | FeaturedFixtureWithImportance | Game) => void;
  className = '',
  useGameWeekMode = false,
  refreshInterval = 5 * 60 * 1000,
  isSkeleton = false,
}) => {
  const [gameWeekFixtures, setGameWeekFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [gameWeekInfo, setGameWeekInfo] = useState<GameWeekInfo | null>(null);
  const [isLoading, setIsLoading] = useState(useGameWeekMode && !isSkeleton);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    if (useGameWeekMode && !isSkeleton) {
      fetchGameWeekData();
      const interval = setInterval(fetchGameWeekData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchGameWeekData, refreshInterval, useGameWeekMode, isSkeleton]);

  if (isSkeleton) {
    // Skeleton card layout
    const padding = size === 'sm' ? 'p-3' : size === 'lg' ? 'p-8' : 'p-6';
    return (
      <div className={`carousel-card ${padding} space-y-3 ${className}`}>
        <div className="h-6 bg-neutral-300 rounded w-1/2 animate-pulse" />
        <div className="flex justify-between items-center">
          <div className="h-10 w-10 bg-neutral-300 rounded-full animate-pulse" />
          <div className="h-10 w-10 bg-neutral-300 rounded-full animate-pulse" />
          <div className="h-6 w-12 bg-neutral-300 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const fixturesToRender = useGameWeekMode
    ? gameWeekFixtures.filter(f => ['live', 'finished', 'upcoming'].includes(f.status))
    : fixture
    ? [fixture]
    : [];

  if (useGameWeekMode && isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        {[...Array(6)].map((_, idx) => (
          <FixtureCard key={idx} isSkeleton size={size} />
        ))}
      </div>
    );
  }

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

  if (fixturesToRender.length === 0) {
    return useGameWeekMode ? (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-neutral-600">No fixtures available</p>
      </div>
    ) : null;
  }

  const renderFixtureCard = (f: Fixture, index?: number) => {
    const {
      homeTeam,
      awayTeam,
      dateTime,
      homeScore = f.homeScore ?? f.score?.fullTime?.home ?? 0,
      awayScore = f.awayScore ?? f.score?.fullTime?.away ?? 0,
    } = f;

    const handleClick = () => onClick?.(f);
    const isFinished = ['finished', 'live'].includes(f.status ?? '');
    const homeShort = f.homeTeam.shortName;
    const awayShort = f.awayTeam.shortName;
    const matchDate = new Date(dateTime);
    const formattedTime = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

    const logoSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
    const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
    const cardPadding = size === 'sm' ? 'p-3' : size === 'lg' ? 'p-8' : 'p-6';
    const scoreSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';

    return (
      <div key={f.id || index} className={`carousel-card ${cardPadding} ${onClick ? 'cursor-pointer' : ''} ${className}`} onClick={handleClick}>
        <div className="flex items-center justify-between">
          <div className="flex flex-col space-y-4 flex-1">
            {/* Home */}
            <div className="flex items-center space-x-3">
              {homeTeam.logo ? (
                <img src={homeTeam.logo} alt={homeTeam.name} className={`${logoSize} object-contain flex-shrink-0 team-logo`} />
              ) : (
                <div className={`${logoSize} bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-bold text-neutral-600">{homeTeam.name[0]}</span>
                </div>
              )}
              <span className={`font-medium text-neutral-800 ${textSize}`}>{homeShort}</span>
            </div>

            {/* Away */}
            <div className="flex items-center space-x-3">
              {awayTeam.logo ? (
                <img src={awayTeam.logo} alt={awayTeam.name} className={`${logoSize} object-contain flex-shrink-0 team-logo`} />
              ) : (
                <div className={`${logoSize} bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-bold text-neutral-600">{awayTeam.name[0]}</span>
                </div>
              )}
              <span className={`font-medium text-neutral-800 ${textSize}`}>{awayShort}</span>
            </div>
          </div>

          {/* Score / Time */}
          <div className="flex items-center justify-center ml-6 pl-6 border-l border-neutral-200">
            {isFinished ? (
              <div className="text-center min-w-[70px]">
                <div className={`${scoreSize} font-bold text-neutral-800 mb-1`}>{homeScore}</div>
                <div className={`${scoreSize} font-bold text-neutral-800 mb-1`}>{awayScore}</div>
                <div className="text-xs text-neutral-500 font-medium">
                  {f.status === 'live' ? <span className="status-live">LIVE</span> : 'Full time'}
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

  if (useGameWeekMode) {
    return (
      <div className={`space-y-4 ${className}`}>
        {gameWeekInfo && (
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">Matchday {gameWeekInfo.currentWeek}</h2>
            <div className="text-sm text-gray-600">
              {gameWeekInfo.isComplete
                ? <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">Complete</span>
                : <span>{gameWeekInfo.finishedGames}/{gameWeekInfo.totalGames} played</span>}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4">
          {fixturesToRender.map((f, idx) => renderFixtureCard(f, idx))}
        </div>
      </div>
    );
  }

  return renderFixtureCard(fixturesToRender[0]);
};

export default FixtureCard;
