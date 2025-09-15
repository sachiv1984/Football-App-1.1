// src/hooks/useGameWeekFixtures.ts
import { useState, useEffect } from 'react';
import { FeaturedFixtureWithImportance } from '../types';
import { FixtureService } from '../services/fixtures/fixtureService';

const fixtureService = new FixtureService();

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

      const [weekFixtures, weekInfo] = await Promise.all([
        fixtureService.getCurrentGameWeekFixtures(),
        fixtureService.getGameWeekInfo()
      ]);

      setFixtures(weekFixtures);
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
    fixtureService.clearCache(); // Clear cache before refetching
    await loadGameWeekFixtures();
  };

  return {
    fixtures,
    isLoading,
    error,
    gameWeekInfo,
    refetch
  };
};
