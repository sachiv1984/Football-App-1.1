// src/hooks/useSupabaseFixtures.ts
import { useState, useEffect, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from '../types';
import { fbrefFixtureService, TeamSeasonStats } from '../services/fixtures/fbrefFixtureService';

interface UseSupabaseFixturesReturn {
  // Featured fixtures
  featuredFixtures: FeaturedFixtureWithImportance[];
  featuredLoading: boolean;
  featuredError: string | null;
  
  // Game week fixtures
  gameWeekFixtures: FeaturedFixtureWithImportance[];
  gameWeekLoading: boolean;
  gameWeekError: string | null;
  
  // All fixtures
  allFixtures: FeaturedFixtureWithImportance[];
  allFixturesLoading: boolean;
  allFixturesError: string | null;
  
  // Actions
  refetchFeatured: () => Promise<void>;
  refetchGameWeek: () => Promise<void>;
  refetchAll: () => Promise<void>;
  clearCache: () => void;
  
  // League management
  switchLeague: (league: string) => Promise<void>;
  getCurrentLeague: () => { name: string; urls: {} };
  
  // Team stats
  getTeamStats: (teamName: string) => Promise<TeamSeasonStats | null>;
  getAllTeamStats: () => Promise<Map<string, TeamSeasonStats>>;
  
  // Game week info
  getGameWeekInfo: () => Promise<{
    currentWeek: number;
    isComplete: boolean;
    totalGames: number;
    finishedGames: number;
    upcomingGames: number;
  }>;
}

export const useSupabaseFixtures = (featuredLimit = 8): UseSupabaseFixturesReturn => {
  // Featured fixtures state
  const [featuredFixtures, setFeaturedFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState<string | null>(null);
  
  // Game week fixtures state
  const [gameWeekFixtures, setGameWeekFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [gameWeekLoading, setGameWeekLoading] = useState(true);
  const [gameWeekError, setGameWeekError] = useState<string | null>(null);
  
  // All fixtures state
  const [allFixtures, setAllFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [allFixturesLoading, setAllFixturesLoading] = useState(false);
  const [allFixturesError, setAllFixturesError] = useState<string | null>(null);

  // Load featured fixtures
  const loadFeaturedFixtures = useCallback(async () => {
    try {
      setFeaturedLoading(true);
      setFeaturedError(null);
      
      const fixtures = await fbrefFixtureService.getFeaturedFixtures(featuredLimit);
      setFeaturedFixtures(fixtures);
    } catch (err) {
      console.error('Error loading featured fixtures:', err);
      setFeaturedError(err instanceof Error ? err.message : 'Failed to load featured fixtures');
      setFeaturedFixtures([]);
    } finally {
      setFeaturedLoading(false);
    }
  }, [featuredLimit]);

  // Load game week fixtures
  const loadGameWeekFixtures = useCallback(async () => {
    try {
      setGameWeekLoading(true);
      setGameWeekError(null);
      
      const fixtures = await fbrefFixtureService.getCurrentGameWeekFixtures();
      setGameWeekFixtures(fixtures);
    } catch (err) {
      console.error('Error loading game week fixtures:', err);
      setGameWeekError(err instanceof Error ? err.message : 'Failed to load game week fixtures');
      setGameWeekFixtures([]);
    } finally {
      setGameWeekLoading(false);
    }
  }, []);

  // Load all fixtures
  const loadAllFixtures = useCallback(async () => {
    try {
      setAllFixturesLoading(true);
      setAllFixturesError(null);
      
      const fixtures = await fbrefFixtureService.getAllFixtures();
      setAllFixtures(fixtures);
    } catch (err) {
      console.error('Error loading all fixtures:', err);
      setAllFixturesError(err instanceof Error ? err.message : 'Failed to load all fixtures');
      setAllFixtures([]);
    } finally {
      setAllFixturesLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFeaturedFixtures();
    loadGameWeekFixtures();
  }, [loadFeaturedFixtures, loadGameWeekFixtures]);

  // Refetch methods
  const refetchFeatured = useCallback(async () => {
    fbrefFixtureService.clearCache();
    await loadFeaturedFixtures();
  }, [loadFeaturedFixtures]);

  const refetchGameWeek = useCallback(async () => {
    fbrefFixtureService.clearCache();
    await loadGameWeekFixtures();
  }, [loadGameWeekFixtures]);

  const refetchAll = useCallback(async () => {
    fbrefFixtureService.clearCache();
    await loadAllFixtures();
  }, [loadAllFixtures]);

  // Clear cache
  const clearCache = useCallback(() => {
    fbrefFixtureService.clearCache();
  }, []);

  // League management
  const switchLeague = useCallback(async (league: string) => {
    try {
      setFeaturedLoading(true);
      setGameWeekLoading(true);
      setFeaturedError(null);
      setGameWeekError(null);
      
      fbrefFixtureService.setLeague(league);
      
      // Reload both featured and game week fixtures
      await Promise.all([loadFeaturedFixtures(), loadGameWeekFixtures()]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch league';
      setFeaturedError(errorMessage);
      setGameWeekError(errorMessage);
    }
  }, [loadFeaturedFixtures, loadGameWeekFixtures]);

  const getCurrentLeague = useCallback(() => {
    return fbrefFixtureService.getCurrentLeague();
  }, []);

  // Team stats methods
  const getTeamStats = useCallback(async (teamName: string) => {
    return fbrefFixtureService.getTeamStats(teamName);
  }, []);

  const getAllTeamStats = useCallback(async () => {
    return fbrefFixtureService.getAllTeamStats();
  }, []);

  // Game week info
  const getGameWeekInfo = useCallback(async () => {
    return fbrefFixtureService.getGameWeekInfo();
  }, []);

  return {
    // Featured fixtures
    featuredFixtures,
    featuredLoading,
    featuredError,
    
    // Game week fixtures
    gameWeekFixtures,
    gameWeekLoading,
    gameWeekError,
    
    // All fixtures
    allFixtures,
    allFixturesLoading,
    allFixturesError,
    
    // Actions
    refetchFeatured,
    refetchGameWeek,
    refetchAll,
    clearCache,
    
    // League management
    switchLeague,
    getCurrentLeague,
    
    // Team stats
    getTeamStats,
    getAllTeamStats,
    
    // Game week info
    getGameWeekInfo
  };
};
