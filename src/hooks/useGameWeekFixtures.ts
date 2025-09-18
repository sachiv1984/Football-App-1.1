import { useState, useEffect } from 'react';
import { fbrefFixtureService } from '../services/fixtures/fbrefFixtureService';
import type { FeaturedFixtureWithImportance, Game } from '../types';

// Utility to convert Game → FeaturedFixtureWithImportance
const toFeaturedFixtureWithImportance = (
  fixture: Game | FeaturedFixtureWithImportance
): FeaturedFixtureWithImportance => {
  if ('importanceScore' in fixture && 'tags' in fixture && 'isBigMatch' in fixture) {
    return fixture;
  }

  return {
    ...fixture,
    importanceScore: fixture.importance ?? 0,
    tags: [],
    isBigMatch: false,
    matchWeek: fixture.matchWeek ?? 1,
    importance: fixture.importance ?? 0,
  };
};

export const useGameWeekFixtures = () => {
  const [fixtures, setFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gameWeekInfo, setGameWeekInfo] = useState<{
    currentWeek: number;
    isComplete: boolean;
    totalGames: number;
    finishedGames: number;
    upcomingGames: number;
  } | null>(null);

  const loadGameWeekFixtures = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [rawFixtures, weekInfo] = await Promise.all([
        fbrefFixtureService.getCurrentGameWeekFixtures(),
        fbrefFixtureService.getGameWeekInfo(),
      ]);

      // Convert all fixtures to FeaturedFixtureWithImportance
      const typedFixtures: FeaturedFixtureWithImportance[] = rawFixtures.map(f =>
        toFeaturedFixtureWithImportance(f)
      );

      setFixtures(typedFixtures);
      setGameWeekInfo(weekInfo);
    } catch (err) {
      console.error('Error loading game week fixtures:', err);
      setError(err instanceof Error ? err.message : 'Failed to load game week fixtures');
      setFixtures([]);
      setGameWeekInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGameWeekFixtures();
  }, []);

  const refetch = async () => {
    fbrefFixtureService.clearCache(); // Clear cache before refetching
    await loadGameWeekFixtures();
  };

  const switchLeague = async (
    league: 'premierLeague' | 'laLiga' | 'bundesliga' | 'serieA' | 'ligue1'
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      fbrefFixtureService.setLeague(league);
      await loadGameWeekFixtures();
    } catch (err) {
      console.error('Error switching league for game week:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch league');
      setIsLoading(false);
    }
  };

  const getCurrentLeague = () => fbrefFixtureService.getCurrentLeague();

  return {
    fixtures,
    isLoading,
    error,
    gameWeekInfo,
    refetch,
    switchLeague,
    getCurrentLeague,
  };
};
