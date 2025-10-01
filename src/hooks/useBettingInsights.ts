// src/hooks/useBettingInsights.ts
import { useState, useEffect, useCallback } from 'react';
import { 
  bettingInsightsService, 
  BettingInsight, 
  InsightsResponse,
  BettingMarket 
} from '../services/stats/bettingInsightsService';

export interface UseBettingInsightsOptions {
  teamName?: string;              // Filter by specific team
  market?: BettingMarket;         // Filter by specific market
  minStreak?: number;             // Only show streaks of X+ matches
  autoRefresh?: boolean;          // Auto-refresh on mount
  sortByStreak?: boolean;         // Sort by longest streaks first
}

export interface UseBettingInsightsReturn {
  insights: BettingInsight[];
  allInsights: InsightsResponse | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  filterByTeam: (teamName: string) => void;
  filterByMarket: (market: BettingMarket) => void;
  filterByStreak: (minStreak: number) => void;
  clearFilters: () => void;
  stats: {
    totalPatterns: number;
    teamsAnalyzed: number;
    streakCount: number;
    rollingCount: number;
  };
}

export function useBettingInsights(
  options: UseBettingInsightsOptions = {}
): UseBettingInsightsReturn {
  const {
    teamName,
    market,
    minStreak,
    autoRefresh = true,
    sortByStreak = false
  } = options;

  const [allInsights, setAllInsights] = useState<InsightsResponse | null>(null);
  const [filteredInsights, setFilteredInsights] = useState<BettingInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Active filters state
  const [activeFilters, setActiveFilters] = useState({
    teamName: teamName || null,
    market: market || null,
    minStreak: minStreak || null
  });

  /**
   * Apply filters to insights
   */
  const applyFilters = useCallback((insights: BettingInsight[]) => {
    let filtered = [...insights];

    // Filter by team
    if (activeFilters.teamName) {
      filtered = filtered.filter(
        i => i.team.toLowerCase() === activeFilters.teamName!.toLowerCase()
      );
    }

    // Filter by market
    if (activeFilters.market) {
      filtered = filtered.filter(i => i.market === activeFilters.market);
    }

    // Filter by minimum streak
    if (activeFilters.minStreak) {
      filtered = filtered.filter(
        i => i.isStreak && (i.streakLength ?? 0) >= activeFilters.minStreak!
      );
    }

    // Sort if requested
    if (sortByStreak) {
      filtered.sort((a, b) => {
        const aStreak = a.streakLength ?? 0;
        const bStreak = b.streakLength ?? 0;
        return bStreak - aStreak;
      });
    }

    return filtered;
  }, [activeFilters, sortByStreak]);

  /**
   * Fetch insights from service
   */
  const fetchInsights = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await bettingInsightsService.getAllInsights();
      setAllInsights(response);
      
      const filtered = applyFilters(response.insights);
      setFilteredInsights(filtered);
    } catch (err) {
      console.error('[useBettingInsights] Error fetching insights:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch insights'));
    } finally {
      setLoading(false);
    }
  }, [applyFilters]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(async () => {
    await fetchInsights();
  }, [fetchInsights]);

  /**
   * Filter handlers
   */
  const filterByTeam = useCallback((teamName: string) => {
    setActiveFilters(prev => ({ ...prev, teamName }));
  }, []);

  const filterByMarket = useCallback((market: BettingMarket) => {
    setActiveFilters(prev => ({ ...prev, market }));
  }, []);

  const filterByStreak = useCallback((minStreak: number) => {
    setActiveFilters(prev => ({ ...prev, minStreak }));
  }, []);

  const clearFilters = useCallback(() => {
    setActiveFilters({
      teamName: null,
      market: null,
      minStreak: null
    });
  }, []);

  /**
   * Re-apply filters when they change
   */
  useEffect(() => {
    if (allInsights) {
      const filtered = applyFilters(allInsights.insights);
      setFilteredInsights(filtered);
    }
  }, [activeFilters, allInsights, applyFilters]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    if (autoRefresh) {
      fetchInsights();
    }
  }, [autoRefresh, fetchInsights]);

  /**
   * Calculate stats
   */
  const stats = {
    totalPatterns: allInsights?.totalPatterns ?? 0,
    teamsAnalyzed: allInsights?.teamsAnalyzed ?? 0,
    streakCount: filteredInsights.filter(i => i.isStreak).length,
    rollingCount: filteredInsights.filter(i => !i.isStreak).length
  };

  return {
    insights: filteredInsights,
    allInsights,
    loading,
    error,
    refresh,
    filterByTeam,
    filterByMarket,
    filterByStreak,
    clearFilters,
    stats
  };
}

/**
 * Hook for single team insights
 */
export function useTeamBettingInsights(teamName: string) {
  return useBettingInsights({ 
    teamName, 
    autoRefresh: true,
    sortByStreak: true 
  });
}

/**
 * Hook for single market insights
 */
export function useMarketBettingInsights(market: BettingMarket) {
  return useBettingInsights({ 
    market, 
    autoRefresh: true,
    sortByStreak: true 
  });
}

/**
 * Hook for only streak insights (7+ matches)
 */
export function useStreakInsights(minStreak: number = 7) {
  return useBettingInsights({ 
    minStreak, 
    autoRefresh: true,
    sortByStreak: true 
  });
}
