// src/components/fixtures/FixtureCard/FixtureCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FixtureService } from '../../../services/fixtures/fixtureService';
import type { Fixture, FeaturedFixtureWithImportance } from '../../../types';

interface FixtureCardProps {
  fixture?: Fixture;
  size?: 'sm' | 'md' | 'lg';
  showCompetition?: boolean;
  showVenue?: boolean;
  showAIInsight?: boolean;
  onClick?: (fixture: Fixture) => void;
  className?: string;
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
  showVenue = false,
  showAIInsight = false,
  onClick,
  className = '',
  useGameWeekMode = false,
  refreshInterval = 5 * 60 * 1000, // default 5 mins
}) => {
  // Game week states
  const [gameWeekFixtures, setGameWeekFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [gameWeekInfo, setGameWeekInfo] = useState<GameWeekInfo | null>(null);
  const [isLoading, setIsLoading] = useState(useGameWeekMode);
  const [error, setError] = useState<string | null>(null);

  const fetchGameWeekData = useCallback(async () => {
    if (!useGameWeekMode) return;

    try {
      setError(null);
      const [weekFixtures, weekInfo] = await Promise.all([
        fixtureService.getCurrentGameWeekFixtures(),
        fixtureService.getGameWeekInfo(),
      ]);
      setGameWeekFixtures(weekFixtures);
      setGameWeekInfo(weekInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch game week fixtures');
      console.error(err);
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

  const fixturesToRender = useGameWeekMode
    ? gameWeekFixtures.filter(f => ['live', 'finished', 'upcoming'].includes(f.status))
    : singleFixture
    ? [singleFixture]
    : [];

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

  const renderFixtureCard = (fixture: Fixture, index?: number) => {
    const { homeTeam, awayTeam, dateTime, homeScore = 0, awayScore = 0, competition, status } = fixture;

    const handleClick = () => onClick?.(fixture);

    const isFinished = ['finished', 'live'].includes(status ?? '');
    const homeShort = homeTeam.shortName;
    const awayShort = awayTeam.shortName;

    const matchDate = new Date(dateTime);
    const formattedTime = matchDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

    // Sizes
    const logoSize = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-10 h-10' : 'w-8 h-8';
    const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
    const cardPadding = size === 'sm' ? 'p-3' : size === 'lg' ? 'p-8' : 'p-6';
    const scoreSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';

    return (
      <div
        key={fixture.id || index}
        className={`carousel-card ${cardPadding} ${onClick ? 'cursor-pointer' : ''} ${className}`}
        onClick={handleClick}
      >
        {showCompetition && competition && (
          <div className="flex items-center mb-2">
            {competition.logo && <img src={competition.logo} alt={competition.name} className="w-6 h-6 object-contain mr-2" />}
            <span className="text-xs text-gray-500">{competition.name}</span>
          </div>
        )}

        <div className="flex justify-between items-center">
          {/* Teams */}
          <div className="flex flex-col space-y-2 flex-1">
            {[{ team: homeTeam, short: homeShort }, { team: awayTeam, short: awayShort }].map(({ team, short }, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                {team.logo ? (
                  <img src={team.logo} alt={team.name} className={`${logoSize} object-contain flex-shrink-0 team-logo`} />
                ) : (
                  <div className={`${logoSize} bg-neutral-200 rounded-full flex items-center justify-center flex-shrink-0`}>
                    <span className="text-sm font-bold text-neutral-600">{team.name[0]}</span>
                  </div>
                )}
                <span className={`font-medium text-neutral-800 ${textSize}`}>{short}</span>
              </div>
            ))}
          </div>

          {/* Time/Score */}
          <div className="flex items-center justify-center ml-4 pl-4 border-l border-gray-200 min-w-[70px] text-center">
            {isFinished ? (
              <div>
                <div className={`${scoreSize} font-bold text-neutral-800`}>{homeScore}</div>
                <div className={`${scoreSize} font-bold text-neutral-800`}>{awayScore}</div>
                <div className="text-xs text-gray-500 font-medium">
                  {status === 'live' ? <span className="status-live">LIVE</span> : 'Full time'}
                </div>
              </div>
            ) : (
              <div className={`${size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-xl'} font-semibold text-neutral-800`}>
                {formattedTime}
              </div>
            )}
          </div>
        </div>

        {showVenue && fixture.venue && (
          <div className="text-xs text-gray-500 mt-2 truncate">{fixture.venue}</div>
        )}

        {showAIInsight && fixture.aiInsight && (
          <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded">{fixture.aiInsight}</div>
        )}
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
