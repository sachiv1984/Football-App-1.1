// src/hooks/useFixtures.ts
import { useState, useEffect } from 'react';
import { FeaturedFixtureWithImportance } from '../types';
import { FixtureService } from '../services/fixtures/fixtureService';

const fixtureService = new FixtureService();

export const useFixtures = () => {
  const [featuredFixtures, setFeaturedFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadFixtures = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fixtures = await fixtureService.getFeaturedFixtures(8);
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
    fixtureService.clearCache(); // Clear cache before refetching
    const loadFixtures = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const fixtures = await fixtureService.getFeaturedFixtures(8);
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

  return {
    featuredFixtures,
    loading,
    error,
    refetch
  };
};
