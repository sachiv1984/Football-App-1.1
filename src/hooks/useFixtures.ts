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
  rawError?: any; // full error object for debugging
}

export const useFixtures = (): UseFixturesReturn => {
  const [featuredFixtures, setFeaturedFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [allFixtures, setAllFixtures] = useState<FeaturedFixtureWithImportance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawError, setRawError] = useState<any>(null);

  // Memoize the FixtureService instance
  const fixtureService = useMemo(() => new FixtureService(), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRawError(null);

    try {
      const [featured, all] = await Promise.all([
        fixtureService.getFeaturedFixtures(8),
        fixtureService.getAllFixtures()
      ]);

      setFeaturedFixtures(featured);
      setAllFixtures(all);
    } catch (err: any) {
      console.error('Fixtures API error:', err); // Log full error to console
      setRawError(err);
      setError(err instanceof Error ? err.message : JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  }, [fixtureService]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    featuredFixtures,
    allFixtures,
    loading,
    error,
    refetch: fetchData,
    rawError,
  };
};
