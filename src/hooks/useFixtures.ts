// src/hooks/useFixtures.ts
import { useState, useEffect } from 'react';
import { FeaturedFixtureWithImportance } from '../types';
import { fbrefFixtureService } from '../services/fixtures/fbrefFixtureService';

export const useFixtures = () => {
  const [featuredFixtures, setFeaturedFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFixtures = async () => {
  try {
    setLoading(true);
    setError(null);

    console.log('Fetching featured fixtures...');
    const fixtures = await fbrefFixtureService.getFeaturedFixtures(8);
    console.log('Fetched Fixtures:', fixtures);

    setFeaturedFixtures(fixtures);
  } catch (err) {
    console.error('Error loading featured fixtures:', err);
    setError(err instanceof Error ? err.message : 'Failed to load fixtures');
    setFeaturedFixtures([]); // Set empty array on error
  } finally {
    setLoading(false);
  }
};


    loadFixtures();
  }, []);

  const refetch = async () => {
    fbrefFixtureService.clearCache(); // Clear cache before refetching
    const loadFixtures = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fixtures = await fbrefFixtureService.getFeaturedFixtures(8);
        setFeaturedFixtures(fixtures);
      } catch (err) {
        console.error('Error refetching featured fixtures:', err);
        setError(err instanceof Error ? err.message : 'Failed to load fixtures');
      } finally {
        setLoading(false);
      }
    };

    await loadFixtures();
  };

  // Additional methods for the new service
  const switchLeague = async (league: 'premierLeague' | 'laLiga' | 'bundesliga' | 'serieA' | 'ligue1') => {
    try {
      setLoading(true);
      setError(null);
      
      fbrefFixtureService.setLeague(league);
      const fixtures = await fbrefFixtureService.getFeaturedFixtures(8);
      setFeaturedFixtures(fixtures);
    } catch (err) {
      console.error('Error switching league:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch league');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLeague = () => {
    return fbrefFixtureService.getCurrentLeague();
  };

  return {
    featuredFixtures,
    loading,
    error,
    refetch,
    switchLeague,
    getCurrentLeague
  };
};
