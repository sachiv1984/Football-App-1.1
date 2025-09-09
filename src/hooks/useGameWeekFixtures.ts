// src/hooks/useGameWeekFixtures.ts
import { useState, useEffect, useCallback } from 'react';
import { FixtureService } from '../services/fixtures/fixtureService';
import type { FeaturedFixtureWithImportance } from '../types';

interface GameWeekInfo {
  currentWeek: number;
  isComplete: boolean;
  totalGames: number;
  finishedGames: number;
  upcomingGames: number;
}

interface UseGameWeekFixturesReturn {
  fixtures: FeaturedFixtureWithImportance[];
  gameWeekInfo: GameWeekInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const fixtureService = new FixtureService();

export const useGameWeekFixtures = (
  refreshInterval: number = 5 * 60 * 1000 // 5 minutes default
): UseGameWeekFixturesReturn => {
  const [fixtures, setFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [gameWeekInfo, setGameWeekInfo] = useState<GameWeekInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      const [weekFixtures, weekInfo] = await Promise.all([
        fixtureService.getCurrentGameWeekFixtures(),
        fixtureService.getGameWeekInfo()
      ]);

      setFixtures(weekFixtures);
      setGameWeekInfo(weekInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch fixtures');
      console.error('Error fetching game week fixtures:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    fetchData();

    // Set up interval for live updates
    const interval = setInterval(fetchData, refreshInterval);

    return () => {
      clearInterval(interval);
    };
  }, [fetchData, refreshInterval]);

  return {
    fixtures,
    gameWeekInfo,
    isLoading,
    error,
    refetch
  };
};
