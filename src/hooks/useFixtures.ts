// src/hooks/useFixtures.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { FixtureService } from '../services/fixtures/fixtureService';
import type { FeaturedFixtureWithImportance } from '../types';

interface UseFixturesReturn {
  featuredFixtures: FeaturedFixtureWithImportance[];
  allFixtures: FeaturedFixtureWithImportance[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useFixtures = (): UseFixturesReturn => {
  const [featuredFixtures, setFeaturedFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [allFixtures, setAllFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the fixtureService instance
  const fixtureService = useMemo(() => new FixtureService(), []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [featured, all] = await Promise.all([
        fixtureService.getFeaturedFixtures(8),
        fixtureService.getAllUpcomingFixtures()
      ]);

      setFeaturedFixtures(featured);
      setAllFixtures(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [fixtureService]); // Include memoized fixtureService in the dependency array

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    featuredFixtures,
    allFixtures,
    loading,
    error,
    refetch: fetchData
  };
};
