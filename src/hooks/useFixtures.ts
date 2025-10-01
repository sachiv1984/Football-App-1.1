// src/hooks/useFixtures.ts
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- ADDED: Needed for navigation hook
import { FeaturedFixtureWithImportance } from '../types';
import { fbrefFixtureService } from '../services/fixtures/fbrefFixtureService';

export const useFixtures = (limit = 8) => {
  const [featuredFixtures, setFeaturedFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFixtures = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching featured fixtures...');
      const fixtures = await fbrefFixtureService.getFeaturedFixtures(limit);
      console.log('Fetched Fixtures:', fixtures);

      setFeaturedFixtures(fixtures);
    } catch (err) {
      console.error('Error loading featured fixtures:', err);
      setError(err instanceof Error ? err.message : 'Failed to load fixtures');
      setFeaturedFixtures([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  const refetch = useCallback(async () => {
    fbrefFixtureService.clearCache(); // Clear cache before refetching
    await loadFixtures();
  }, [loadFixtures]);

  // Additional methods for the service
  const switchLeague = useCallback(async (league: 'premierLeague' | 'laLiga' | 'bundesliga' | 'serieA' | 'ligue1') => {
    try {
      setLoading(true);
      setError(null);
      
      fbrefFixtureService.setLeague(league);
      const fixtures = await fbrefFixtureService.getFeaturedFixtures(limit);
      setFeaturedFixtures(fixtures);
    } catch (err) {
      console.error('Error switching league:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch league');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  const getCurrentLeague = useCallback(() => {
    return fbrefFixtureService.getCurrentLeague();
  }, []);

  return {
    featuredFixtures,
    loading,
    error,
    refetch,
    switchLeague,
    getCurrentLeague
  };
};

// --- NEW EXPORT: Fixes TS2305 error in StatsPage.tsx ---
export const useFixtureNavigation = () => {
  const navigate = useNavigate();

  const goBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const goHome = useCallback(() => {
    // Navigate to the main fixture list or dashboard
    navigate('/'); 
  }, [navigate]);

  return {
    goBack,
    goHome,
  };
};
