src/components/fixtures/FixtureCard/FixtureCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { FixtureService } from '../../../services/fixtures/fixtureService';
import type { Fixture, FeaturedFixtureWithImportance } from '../../../types';
import UnifiedFixtureCard from './UnifiedFixtureCard';

interface FixtureCardProps {
  fixture?: Fixture;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'list' | 'compact';
  showCompetition?: boolean;
  onClick?: (fixture: Fixture) => void;
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
  variant = 'list',
  showCompetition = false,
  onClick,
  showVenue = true,
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
        <div className="w-12 h-12 bg-error-light rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-error mb-4">Failed to load fixtures</p>
        <p className="text-neutral-500 text-sm mb-6">{error}</p>
        <button
          onClick={fetchGameWeekData}
          className="btn-secondary px-4 py-2 text-sm"
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
        <div className="w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 002 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-700 mb-2">No Fixtures Available</h3>
        <p className="text-neutral-500">Check back later for upcoming matches.</p>
      </div>
    ) : null;
  }

  // Game week mode: render multiple fixtures with header
  if (useGameWeekMode) {
    // Group fixtures by status for better organization
    const liveFixtures = fixturesToRender.filter(f => f.status === 'live');
    const upcomingFixtures = fixturesToRender.filter(f => f.status === 'upcoming');
    const finishedFixtures = fixturesToRender.filter(f => f.status === 'finished');

    return (
      <div className={`space-y-6 ${className}`}>
        {/* Game Week Header */}
        {gameWeekInfo && (
          <div className="flex justify-between items-center pb-4 border-b border-neutral-200">
            <div>
              <h2 className="text-2xl font-bold text-neutral-800">
                Matchday {gameWeekInfo.currentWeek}
              </h2>
              <p className="text-neutral-600 text-sm mt-1">
                {gameWeekInfo.totalGames} matches this week
              </p>
            </div>
            <div className="text-right">
              {gameWeekInfo.isComplete ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-success-light text-success">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Complete
                </span>
              ) : (
                <div className="text-sm text-neutral-600">
                  <div className="font-medium">
                    {gameWeekInfo.finishedGames}/{gameWeekInfo.totalGames} played
                  </div>
                  {gameWeekInfo.upcomingGames > 0 && (
                    <div className="text-xs text-neutral-500">
                      {gameWeekInfo.upcomingGames} upcoming
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Live Fixtures */}
        {liveFixtures.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-success rounded-full animate-live-pulse"></div>
              <h3 className="text-lg font-semibold text-neutral-800">Live Now</h3>
              <span className="text-xs bg-success-light text-success px-2 py-1 rounded-full font-medium">
                {liveFixtures.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {liveFixtures.map((fixture) => (
                <UnifiedFixtureCard
                  key={fixture.id}
                  fixture={fixture}
                  variant={variant}
                  size={size}
                  showCompetition={showCompetition}
                  showVenue={showVenue}
                  onClick={onClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Fixtures */}
        {upcomingFixtures.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-warning rounded-full"></div>
              <h3 className="text-lg font-semibold text-neutral-800">Upcoming</h3>
              <span className="text-xs bg-warning-light text-warning px-2 py-1 rounded-full font-medium">
                {upcomingFixtures.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {upcomingFixtures.map((fixture) => (
                <UnifiedFixtureCard
                  key={fixture.id}
                  fixture={fixture}
                  variant={variant}
                  size={size}
                  showCompetition={showCompetition}
                  showVenue={showVenue}
                  onClick={onClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Finished Fixtures */}
        {finishedFixtures.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-neutral-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-neutral-800">Results</h3>
              <span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-1 rounded-full font-medium">
                {finishedFixtures.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {finishedFixtures.map((fixture) => (
                <UnifiedFixtureCard
                  key={fixture.id}
                  fixture={fixture}
                  variant={variant}
                  size={size}
                  showCompetition={showCompetition}
                  showVenue={showVenue}
                  onClick={onClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Refresh indicator */}
        <div className="text-center pt-4 border-t border-neutral-100">
          <p className="text-xs text-neutral-500">
            Last updated: {new Date().toLocaleTimeString('en-GB', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        </div>
      </div>
    );
  }

  // Single fixture mode: render just the fixture card
  return (
    <UnifiedFixtureCard
      fixture={fixturesToRender[0]}
      variant={variant}
      size={size}
      showCompetition={showCompetition}
      showVenue={showVenue}
      onClick={onClick}
      className={className}
    />
  );
};

export default FixtureCard;
