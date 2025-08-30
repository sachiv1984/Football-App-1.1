import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  FeaturedFixture, 
  FeaturedFixtureWithImportance,
  GameSelectionConfig,
  CarouselState,
  UseCarouselReturn,
  DataFetchConfig
} from '../types';

interface FeaturedGamesCarouselConfig {
  selection?: GameSelectionConfig;
  data?: DataFetchConfig;
}

interface UseFeaturedGamesCarouselProps {
  fixtures?: FeaturedFixture[];
  config?: FeaturedGamesCarouselConfig;
  autoRefresh?: boolean;
  rotateInterval?: number;
}

export const useFeaturedGamesCarousel = ({
  fixtures = [],
  config = {},
  autoRefresh = false,
  rotateInterval = 5000
}: UseFeaturedGamesCarouselProps): UseCarouselReturn & { scrollRef: React.RefObject<HTMLDivElement> } => {

  const [featuredGames, setFeaturedGames] = useState<FeaturedFixtureWithImportance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 0,
    canScrollLeft: false,
    canScrollRight: true,
    isAutoRotating: true,
    isDragging: false
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const autoRotateRef = useRef<NodeJS.Timeout>();

  // --- Configuration ---
  const selectionConfig: GameSelectionConfig = useMemo(() => ({
    prioritizeLiveGames: true,
    includeNextWeekIfFew: true,
    minImportanceScore: 0,
    maxGames: 4,
    boostBigSixTeams: true,
    topTeamIds: ['liverpool', 'man-city', 'arsenal', 'chelsea', 'man-utd', 'tottenham'],
    ...config.selection
  }), [config.selection]);

  const dataConfig: DataFetchConfig = useMemo(() => ({
    refreshInterval: 30000,
    realTimeUpdates: false,
    cacheDuration: 300000,
    ...config.data
  }), [config.data]);

  // --- Utility functions omitted for brevity (getMatchWeek, getCurrentMatchWeek, getMatchTags, calculateImportance, selectFeaturedGames) ---
  // Keep your existing logic here exactly as before

  const refreshData = useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      let data = fixtures;

      if (!fixtures.length && dataConfig.fixturesEndpoint) {
        const res = await fetch(dataConfig.fixturesEndpoint);
        if (!res.ok) throw new Error(`Failed to fetch fixtures: ${res.statusText}`);
        data = await res.json();
      }

      setFeaturedGames(selectFeaturedGames(data));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally { setIsLoading(false); }
  }, [fixtures, dataConfig.fixturesEndpoint, selectFeaturedGames]);

  // --- Scrolling (infinite loop) ---
  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.children[0] as HTMLElement;
    const gap = 16;
    const width = card?.offsetWidth + gap || 300;
    scrollRef.current.scrollTo({ left: index * width, behavior: 'smooth' });

    setCarouselState(prev => ({
      ...prev,
      currentIndex: index,
    }));
  }, []);

  const scrollRight = useCallback(() => {
    setCarouselState(prev => {
      const nextIndex = (prev.currentIndex + 1) % featuredGames.length; // wrap-around
      scrollToIndex(nextIndex);
      return prev;
    });
  }, [featuredGames.length, scrollToIndex]);

  const toggleAutoRotate = useCallback(() => {
    setCarouselState(prev => ({ ...prev, isAutoRotating: !prev.isAutoRotating }));
  }, []);

  // --- Auto-rotation ---
  useEffect(() => {
    if (!carouselState.isAutoRotating || featuredGames.length <= 1) return;

    autoRotateRef.current = setInterval(() => {
      scrollRight();
    }, rotateInterval);

    return () => clearInterval(autoRotateRef.current);
  }, [carouselState.isAutoRotating, featuredGames.length, scrollRight, rotateInterval]);

  // --- Initial load ---
  useEffect(() => { refreshData(); }, [refreshData]);

  // --- Auto-refresh ---
  useEffect(() => {
    if (!autoRefresh) return;
    refreshIntervalRef.current = setInterval(refreshData, dataConfig.refreshInterval || 30000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [autoRefresh, dataConfig.refreshInterval, refreshData]);

  return { 
    featuredGames, 
    isLoading, 
    error, 
    carouselState, 
    scrollToIndex, 
    toggleAutoRotate, 
    refreshData, 
    scrollRef 
  };
};
