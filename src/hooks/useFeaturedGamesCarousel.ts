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
    isAutoRotating: false,
    isDragging: false
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const autoRotateRef = useRef<NodeJS.Timeout>();

  const selectionConfig: GameSelectionConfig = useMemo(() => ({
    prioritizeLiveGames: true,
    includeNextWeekIfFew: true,
    minImportanceScore: 0,
    maxGames: 4,
    boostBigSixTeams: true,
    topTeamIds: ['liverpool','man-city','arsenal','chelsea','man-utd','tottenham'],
    ...config.selection
  }), [config.selection]);

  const dataConfig: DataFetchConfig = useMemo(() => ({
    refreshInterval: 30000,
    realTimeUpdates: false,
    cacheDuration: 300000,
    ...config.data
  }), [config.data]);

  const calculateImportance = useCallback((fixture: FeaturedFixture): number => {
    let importance = 5;
    // Simple scoring logic for demo
    if (fixture.status === 'live') importance += 5;
    return importance;
  }, []);

  const selectFeaturedGames = useCallback((allFixtures: FeaturedFixture[]): FeaturedFixtureWithImportance[] => {
    const fixturesWithImportance = allFixtures.map(f => ({
      ...f,
      importanceScore: calculateImportance(f)
    }));
    return fixturesWithImportance.slice(0, selectionConfig.maxGames ?? 4);
  }, [calculateImportance, selectionConfig.maxGames]);

  const refreshData = useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      setFeaturedGames(selectFeaturedGames(fixtures));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fixtures, selectFeaturedGames]);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.children[0] as HTMLElement;
    const gap = 16;
    const width = card?.offsetWidth + gap || 300;
    scrollRef.current.scrollTo({ left: index * width, behavior: smooth ? 'smooth' : 'auto' });
    setCarouselState(prev => ({
      ...prev,
      currentIndex: index
    }));
  }, []);

  const toggleAutoRotate = useCallback(() => {
    setCarouselState(prev => ({ ...prev, isAutoRotating: !prev.isAutoRotating }));
  }, []);

  // Auto-rotation
  useEffect(() => {
    if (!carouselState.isAutoRotating || featuredGames.length <= 1) return;
    autoRotateRef.current = setInterval(() => {
      scrollToIndex((carouselState.currentIndex + 1) % featuredGames.length);
    }, rotateInterval);
    return () => clearInterval(autoRotateRef.current);
  }, [carouselState.isAutoRotating, carouselState.currentIndex, featuredGames.length, rotateInterval, scrollToIndex]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    refreshIntervalRef.current = setInterval(refreshData, dataConfig.refreshInterval || 30000);
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current); };
  }, [autoRefresh, dataConfig.refreshInterval, refreshData]);

  // Initial load
  useEffect(() => { refreshData(); }, [refreshData]);

  return { featuredGames, isLoading, error, carouselState, scrollToIndex, toggleAutoRotate, refreshData, scrollRef };
};
