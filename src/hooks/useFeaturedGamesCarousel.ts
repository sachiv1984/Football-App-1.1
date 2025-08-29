import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  FeaturedFixture, 
  FeaturedFixtureWithImportance,
  GameSelectionConfig,
  CarouselState,
  UseCarouselReturn,
  MatchTag,
  DataFetchConfig,
  Competition
} from '../types';

interface UseFeaturedGamesCarouselProps {
  fixtures?: FeaturedFixture[];
  config?: {
    selection?: GameSelectionConfig;
    data?: DataFetchConfig;
  };
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
  const [error, setError] = useState<string | null>(null);

  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 0,
    canScrollLeft: false,
    canScrollRight: true,
    isAutoRotating: false,
    isDragging: false
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval>>();
  const autoRotateRef = useRef<ReturnType<typeof setInterval>>();

  // --- Configuration ---
  const selectionConfig: GameSelectionConfig = useMemo(() => ({
    prioritizeLiveGames: true,
    includeNextWeekIfFew: true,
    minImportanceScore: 0,
    maxGames: 4,
    boostBigSixTeams: true,
    topTeamIds: [1, 2, 3, 4, 5, 6], // numbers only; convert strings to numbers before passing
    ...config.selection
  }), [config.selection]);

  const dataConfig: DataFetchConfig = useMemo(() => ({
    refreshInterval: 30000,
    realTimeUpdates: false,
    cacheDuration: 300000,
    ...config.data
  }), [config.data]);

  // --- Utility functions for competition fields ---
  const getCompetitionName = (comp?: Competition | string): string =>
    typeof comp !== 'string' && comp?.name ? comp.name : '';

  const getCompetitionLogo = (comp?: Competition | string): string =>
    typeof comp !== 'string' && comp?.logo ? comp.logo : '';

  const getCompetitionShortName = (comp?: Competition | string): string =>
    typeof comp !== 'string' && comp?.shortName ? comp.shortName : '';

  // --- Match helpers ---
  const getMatchWeek = useCallback((dateString: string): number => {
    const matchDate = new Date(dateString);
    const startOfSeason = new Date('2024-08-01T00:00:00Z');
    const weeksSinceStart = Math.floor((matchDate.getTime() - startOfSeason.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(38, weeksSinceStart + 1));
  }, []);

  const getCurrentMatchWeek = useCallback(() => getMatchWeek(new Date().toISOString()), [getMatchWeek]);

  const getMatchTags = useCallback((fixture: FeaturedFixture): MatchTag[] => {
    const tags: MatchTag[] = [];
    const { homeTeam, awayTeam } = fixture;
    const topTeams = selectionConfig.topTeamIds || [];

    if (!homeTeam || !awayTeam) return tags;

    // Top six clash
    if (topTeams.includes(homeTeam.id) && topTeams.includes(awayTeam.id)) tags.push('top-six');

    // Derby logic
    const londonTeams = ['arsenal', 'chelsea', 'tottenham', 'west-ham', 'fulham', 'brentford', 'crystal-palace'];
    const manchesterTeams = ['man-city', 'man-utd'];
    const liverpoolTeams = ['liverpool', 'everton'];

    if (londonTeams.includes(homeTeam.id) && londonTeams.includes(awayTeam.id)) tags.push('derby');
    else if (manchesterTeams.includes(homeTeam.id) && manchesterTeams.includes(awayTeam.id)) tags.push('derby');
    else if (liverpoolTeams.includes(homeTeam.id) && liverpoolTeams.includes(awayTeam.id)) tags.push('derby');

    // Title race / European / Relegation
    if ((homeTeam.position ?? 99) <= 4 && (awayTeam.position ?? 99) <= 4) tags.push('title-race');
    if (((homeTeam.position ?? 99) >= 5 && (homeTeam.position ?? 99) <= 7) || 
        ((awayTeam.position ?? 99) >= 5 && (awayTeam.position ?? 99) <= 7)) tags.push('european-qualification');
    if ((homeTeam.position ?? 0) >= 15 && (awayTeam.position ?? 0) >= 15) tags.push('relegation-battle');

    return tags;
  }, [selectionConfig.topTeamIds]);

  const calculateImportance = useCallback((fixture: FeaturedFixture): number => {
    let importance = 5;
    const tags = getMatchTags(fixture);
    const topTeams = selectionConfig.topTeamIds || [];

    if (fixture.status === 'live') importance += 5;
    if (tags.includes('derby')) importance += 4;
    if (tags.includes('top-six')) importance += 4;
    if (tags.includes('title-race')) importance += 3;
    if (tags.includes('european-qualification')) importance += 2;
    if (tags.includes('relegation-battle')) importance += 2;

    if (selectionConfig.boostBigSixTeams) {
      if (fixture.homeTeam && topTeams.includes(fixture.homeTeam.id)) importance += 2;
      if (fixture.awayTeam && topTeams.includes(fixture.awayTeam.id)) importance += 2;
    }

    const avgPosition = (((fixture.homeTeam?.position ?? 10) + (fixture.awayTeam?.position ?? 10)) / 2);
    if (avgPosition <= 3) importance += 3;
    else if (avgPosition <= 6) importance += 2;
    else if (avgPosition <= 10) importance += 1;

    const homeForm = (fixture.homeTeam?.form ?? []).slice(-3).filter(r => r === 'W').length;
    const awayForm = (fixture.awayTeam?.form ?? []).slice(-3).filter(r => r === 'W').length;
    if (homeForm >= 2 || awayForm >= 2) importance += 1;

    if (fixture.aiInsight?.confidence === 'high') importance += 1;
    if (fixture.aiInsight?.probability && fixture.aiInsight.probability > 0.8) importance += 1;

    const matchDate = new Date(fixture.dateTime);
    const daysUntilMatch = Math.ceil((matchDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
    if (daysUntilMatch <= 1) importance += 2;
    else if (daysUntilMatch <= 3) importance += 1;

    return Math.min(10, Math.max(1, importance));
  }, [getMatchTags, selectionConfig]);

  const selectFeaturedGames = useCallback((allFixtures: FeaturedFixture[]): FeaturedFixtureWithImportance[] => {
    if (!allFixtures.length) return [];
    const fixturesWithImportance = allFixtures.map(f => ({
      ...f,
      importance: calculateImportance(f),
      matchWeek: getMatchWeek(f.dateTime),
      isBigMatch: getMatchTags(f).length > 0,
      tags: getMatchTags(f)
    }));

    const currentWeek = getCurrentMatchWeek();
    const liveGames = fixturesWithImportance.filter(f => f.status === 'live');
    let selected: FeaturedFixtureWithImportance[] = [];

    if (selectionConfig.prioritizeLiveGames && liveGames.length) {
      selected.push(...liveGames.sort((a,b) => (b.importance ?? 0) - (a.importance ?? 0)));
    }

    const currentWeekGames = fixturesWithImportance.filter(f => f.matchWeek === currentWeek && !selected.includes(f));
    const remainingSlots = selectionConfig.maxGames - selected.length;
    selected.push(...currentWeekGames.sort((a,b) => (b.importance ?? 0) - (a.importance ?? 0)).slice(0, remainingSlots));

    // Fill remaining slots
    while (selected.length < selectionConfig.maxGames) {
      const remaining = fixturesWithImportance.filter(f => !selected.includes(f))
        .sort((a,b) => (b.importance ?? 0) - (a.importance ?? 0));
      if (!remaining.length) break;
      selected.push(remaining[0]);
    }

    return selected.slice(0, selectionConfig.maxGames)
      .sort((a,b) => (a.status === 'live' ? -1 : 0) - (b.status === 'live' ? -1 : 0) || (b.importance ?? 0) - (a.importance ?? 0));
  }, [calculateImportance, getMatchWeek, getCurrentMatchWeek, getMatchTags, selectionConfig]);

  const refreshData = useCallback(async () => {
    try {
      setError(null);
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

  // --- Scrolling ---
  const scrollToIndex = useCallback((index: number) => {
    if (!scrollRef.current) return;
    const card = scrollRef.current.children[0] as HTMLElement;
    const gap = 16;
    const width = card?.offsetWidth + gap || 300;
    scrollRef.current.scrollTo({ left: index * width, behavior: 'smooth' });
    setCarouselState(prev => ({
      ...prev,
      currentIndex: index,
      canScrollLeft: index > 0,
      canScrollRight: index < (featuredGames.length - 1)
    }));
  }, [featuredGames.length]);

  const scrollLeft = useCallback(() => scrollToIndex(Math.max(0, carouselState.currentIndex - 1)), [carouselState.currentIndex, scrollToIndex]);
  const scrollRight = useCallback(() => scrollToIndex(Math.min(featuredGames.length - 1, carouselState.currentIndex + 1)), [carouselState.currentIndex, featuredGames.length, scrollToIndex]);
  const toggleAutoRotate = useCallback(() => setCarouselState(prev => ({ ...prev, isAutoRotating: !prev.isAutoRotating })), []);

  // --- Auto-rotation ---
  useEffect(() => {
    if (!carouselState.isAutoRotating || featuredGames.length <= 1) return;
    autoRotateRef.current = setInterval(() => scrollRight(), rotateInterval);
    return () => { if (autoRotateRef.current) clearInterval(autoRotateRef.current); };
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
    scrollRef 
  };
};
