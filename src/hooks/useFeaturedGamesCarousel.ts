import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FeaturedFixture,
  FeaturedFixtureWithImportance,
  GameSelectionConfig,
  CarouselState,
  UseCarouselReturn,
  DataFetchConfig,
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
  rotateInterval = 5000,
}: UseFeaturedGamesCarouselProps): UseCarouselReturn & { scrollRef: React.RefObject<HTMLDivElement> } => {
  const [featuredGames, setFeaturedGames] = useState<FeaturedFixtureWithImportance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 0,
    canScrollLeft: false,
    canScrollRight: true,
    isAutoRotating: false,
    isDragging: false,
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
    topTeamIds: ['liverpool','man-city','arsenal','chelsea','man-utd','tottenham'],
    ...config.selection,
  }), [config.selection]);

  const dataConfig: DataFetchConfig = useMemo(() => ({
    refreshInterval: 30000,
    realTimeUpdates: false,
    cacheDuration: 300000,
    ...config.data,
  }), [config.data]);

  // --- Utility functions ---
  const getMatchWeek = useCallback((dateString: string): number => {
    const matchDate = new Date(dateString);
    const startOfSeason = new Date('2024-08-01T00:00:00Z');
    const weeksSinceStart = Math.floor((matchDate.getTime() - startOfSeason.getTime()) / (7*24*60*60*1000));
    return Math.max(1, Math.min(38, weeksSinceStart + 1));
  }, []);

  const getMatchTags = useCallback((fixture: FeaturedFixture) => {
    const tags: string[] = [];
    const topTeams = selectionConfig.topTeamIds || [];
    const { homeTeam, awayTeam } = fixture;
    if (!homeTeam || !awayTeam) return tags;

    if (topTeams.includes(homeTeam.id) && topTeams.includes(awayTeam.id)) tags.push('top-six');

    const londonTeams = ['arsenal','chelsea','tottenham','west-ham','fulham','brentford','crystal-palace'];
    const manchesterTeams = ['man-city','man-utd'];
    const liverpoolTeams = ['liverpool','everton'];

    if (londonTeams.includes(homeTeam.id) && londonTeams.includes(awayTeam.id)) tags.push('derby');
    else if (manchesterTeams.includes(homeTeam.id) && manchesterTeams.includes(awayTeam.id)) tags.push('derby');
    else if (liverpoolTeams.includes(homeTeam.id) && liverpoolTeams.includes(awayTeam.id)) tags.push('derby');

    return tags;
  }, [selectionConfig.topTeamIds]);

  const calculateImportance = useCallback((fixture: FeaturedFixture) => {
    let importance = 5;
    const tags = getMatchTags(fixture);
    if (fixture.status === 'live') importance += 5;
    if (tags.includes('derby')) importance += 4;
    if (tags.includes('top-six')) importance += 4;
    return Math.min(10, Math.max(1, importance));
  }, [getMatchTags]);

  const selectFeaturedGames = useCallback((allFixtures: FeaturedFixture[]): FeaturedFixtureWithImportance[] => {
    if (!allFixtures.length) return [];
    return allFixtures.slice(0, selectionConfig.maxGames ?? 4).map(f => ({
      ...f,
      importanceScore: calculateImportance(f),
      matchWeek: getMatchWeek(f.dateTime),
      isBigMatch: getMatchTags(f).length > 0,
      tags: getMatchTags(f),
    }));
  }, [calculateImportance, getMatchTags, getMatchWeek, selectionConfig.maxGames]);

  const refreshData = useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);
      let data = fixtures;
      setFeaturedGames(selectFeaturedGames(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [fixtures, selectFeaturedGames]);

  // --- Scroll functions ---
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.children[0] as HTMLElement;
    const gap = 16;
    const width = card?.offsetWidth + gap || 300;

    scrollRef.current.scrollTo({ left: index * width, behavior: smooth ? 'smooth' : 'auto' });
    setCarouselState(prev => ({ ...prev, currentIndex: index }));
  }, []);

  const scrollLeft = useCallback(() => scrollToIndex(carouselState.currentIndex - 1), [carouselState.currentIndex, scrollToIndex]);
  const scrollRight = useCallback(() => scrollToIndex(carouselState.currentIndex + 1), [carouselState.currentIndex, scrollToIndex]);

  const toggleAutoRotate = useCallback(() => setCarouselState(prev => ({ ...prev, isAutoRotating: !prev.isAutoRotating })), []);

  // --- Auto-rotation ---
  useEffect(() => {
    if (!carouselState.isAutoRotating || featuredGames.length <= 1) return;
    autoRotateRef.current = setInterval(scrollRight, rotateInterval);
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
    scrollLeft,
    scrollRight,
    toggleAutoRotate,
    refreshData,
    scrollRef,
  };
};
