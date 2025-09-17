// src/hooks/useGameWeekFixtures.ts
import { useState, useEffect } from 'react';
import { FeaturedFixtureWithImportance } from '../types';
import { fbrefFixtureService } from '../services/fixtures/fbrefFixtureService';

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

      // Use the service methods (same as original)
      const [weekFixtures, weekInfo] = await Promise.all([
        fbrefFixtureService.getCurrentGameWeekFixtures(),
        fbrefFixtureService.getGameWeekInfo()
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
    fbrefFixtureService.clearCache(); // Clear cache before refetching
    await loadGameWeekFixtures();
  };

  // Additional methods for the new service
  const switchLeague = async (league: 'premierLeague' | 'laLiga' | 'bundesliga' | 'serieA' | 'ligue1') => {
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

  const getCurrentLeague = () => {
    return fbrefFixtureService.getCurrentLeague();
  };

  return {
    fixtures,
    isLoading,
    error,
    gameWeekInfo,
    refetch,
    switchLeague,
    getCurrentLeague
  };
};