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

  // --- Utility Functions ---
  const getMatchWeek = useCallback((dateString: string): number => {
    const matchDate = new Date(dateString);
    const startOfSeason = new Date('2024-08-01T00:00:00Z');
    const weeksSinceStart = Math.floor((matchDate.getTime() - startOfSeason.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(38, weeksSinceStart + 1));
  }, []);

  const getCurrentMatchWeek = useCallback(() => getMatchWeek(new Date().toISOString()), [getMatchWeek]);

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

    const homePos = homeTeam.position ?? 10;
    const awayPos = awayTeam.position ?? 10;
    
    if (homePos <= 4 && awayPos <= 4) tags.push('title-race');
    if ((homePos >= 5 && homePos <= 7) || (awayPos >= 5 && awayPos <= 7)) tags.push('european-qualification');
    if (homePos >= 15 && awayPos >= 15) tags.push('relegation-battle');

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

    const avgPosition = ((fixture.homeTeam?.position ?? 10) + (fixture.awayTeam?.position ?? 10)) / 2;
    if (avgPosition <= 3) importance += 3;
    else if (avgPosition <= 6) importance += 2;
    else if (avgPosition <= 10) importance += 1;

    const homeForm = fixture.homeTeam?.form?.slice(-3).filter(r => r === 'W').length || 0;
    const awayForm = fixture.awayTeam?.form?.slice(-3).filter(r => r === 'W').length || 0;
    if (homeForm >= 2 || awayForm >= 2) importance += 1;

    if (fixture.aiInsight?.confidence === 'high') importance += 1;
    if (fixture.aiInsight?.probability && fixture.aiInsight.probability > 0.8) importance += 1;

    const daysUntilMatch = Math.ceil((new Date(fixture.dateTime).getTime() - new Date().getTime()) / (24*60*60*1000));
    if (daysUntilMatch <= 1) importance += 2;
    else if (daysUntilMatch <= 3) importance += 1;

    return Math.min(10, Math.max(1, importance));
  }, [getMatchTags, selectionConfig]);

  const selectFeaturedGames = useCallback((allFixtures: FeaturedFixture[]): FeaturedFixtureWithImportance[] => {
    if (!allFixtures.length) return [];
    const fixturesWithImportance = allFixtures.map(f => ({
      ...f,
      importanceScore: calculateImportance(f),
      matchWeek: getMatchWeek(f.dateTime),
      isBigMatch: getMatchTags(f).length > 0,
      tags: getMatchTags(f)
    }));

    const currentWeek = getCurrentMatchWeek();
    const liveGames = fixturesWithImportance.filter(f => f.status === 'live');
    let selected: FeaturedFixtureWithImportance[] = [];

    if (selectionConfig.prioritizeLiveGames && liveGames.length) {
      selected.push(...liveGames.sort((a,b) => (b.importanceScore||0)-(a.importanceScore||0)));
    }

    const currentWeekGames = fixturesWithImportance.filter(f => f.matchWeek === currentWeek && !selected.includes(f));
    const remainingSlots = (selectionConfig.maxGames ?? 4) - selected.length;
    selected.push(...currentWeekGames.sort((a,b) => (b.importanceScore||0)-(a.importanceScore||0)).slice(0, remainingSlots));

    while (selected.length < (selectionConfig.maxGames ?? 4)) {
      const remaining = fixturesWithImportance.filter(f => !selected.includes(f))
        .sort((a,b) => (b.importanceScore||0)-(a.importanceScore||0));
      if (!remaining.length) break;
      selected.push(remaining[0]);
    }

    return selected.slice(0, selectionConfig.maxGames ?? 4)
      .sort((a,b) => (a.status === 'live' ? -1 : 0) - (b.status === 'live' ? -1 : 0) || (b.importanceScore||0)-(a.importanceScore||0));
  }, [calculateImportance, getMatchWeek, getCurrentMatchWeek, getMatchTags, selectionConfig]);

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

  const scrollLeft = useCallback(() => {
    setCarouselState(prev => {
      const nextIndex = Math.max(0, prev.currentIndex - 1);
      scrollToIndex(nextIndex);
      return prev;
    });
  }, [scrollToIndex]);

  const scrollRight = useCallback(() => {
    setCarouselState(prev => {
      const nextIndex = Math.min(featuredGames.length - 1, prev.currentIndex + 1);
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
    scrollLeft, 
    scrollRight, 
    toggleAutoRotate, 
    refreshData, 
    scrollRef 
  };
};
