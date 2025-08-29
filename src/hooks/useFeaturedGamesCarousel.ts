// src/hooks/useFeaturedGamesCarousel.ts
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  FeaturedFixture, 
  FeaturedFixtureWithImportance,
  GameSelectionConfig,
  CarouselState,
  UseCarouselReturn,
  MatchTag,
  DataFetchConfig 
} from '../types';

interface UseFeaturedGamesCarouselProps {
  fixtures?: FeaturedFixture[];
  config?: {
    selection?: GameSelectionConfig;
    data?: DataFetchConfig;
  };
  autoRefresh?: boolean;
}

/**
 * Custom hook for managing featured games carousel logic
 */
export const useFeaturedGamesCarousel = ({
  fixtures = [],
  config = {},
  autoRefresh = false
}: UseFeaturedGamesCarouselProps): UseCarouselReturn => {
  
  // State management
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
  
  // Refs
  const refreshIntervalRef = useRef<NodeJS.Timeout>();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  
  // Configuration with defaults - wrapped in useMemo to prevent re-creation
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

  /**
   * Calculate match week from date
   */
  const getMatchWeek = useCallback((dateString: string): number => {
    const matchDate = new Date(dateString);
    const startOfSeason = new Date('2024-08-01T00:00:00Z');
    const weeksSinceStart = Math.floor((matchDate.getTime() - startOfSeason.getTime()) / (7 * 24 * 60 * 60 * 1000));
    return Math.max(1, Math.min(38, weeksSinceStart + 1));
  }, []);

  /**
   * Get current match week
   */
  const getCurrentMatchWeek = useCallback((): number => {
    return getMatchWeek(new Date().toISOString());
  }, [getMatchWeek]);

  /**
   * Determine match tags based on teams and context
   */
  const getMatchTags = useCallback((fixture: FeaturedFixture): MatchTag[] => {
    const tags: MatchTag[] = [];
    const { homeTeam, awayTeam } = fixture;
    const topTeams = selectionConfig.topTeamIds || [];
    
    // Top six clash
    if (topTeams.includes(homeTeam.id) && topTeams.includes(awayTeam.id)) {
      tags.push('top-six');
    }
    
    // Derby matches (simplified logic - you can expand this)
    const londonTeams = ['arsenal', 'chelsea', 'tottenham', 'west-ham', 'fulham', 'brentford', 'crystal-palace'];
    const manchesterTeams = ['man-city', 'man-utd'];
    const liverpoolTeams = ['liverpool', 'everton'];
    
    if (londonTeams.includes(homeTeam.id) && londonTeams.includes(awayTeam.id)) {
      tags.push('derby');
    } else if (manchesterTeams.includes(homeTeam.id) && manchesterTeams.includes(awayTeam.id)) {
      tags.push('derby');
    } else if (liverpoolTeams.includes(homeTeam.id) && liverpoolTeams.includes(awayTeam.id)) {
      tags.push('derby');
    }
    
    // Title race relevance (top 4 teams)
    if (homeTeam.position <= 4 && awayTeam.position <= 4) {
      tags.push('title-race');
    }
    
    // European qualification (positions 5-7)
    if ((homeTeam.position >= 5 && homeTeam.position <= 7) || 
        (awayTeam.position >= 5 && awayTeam.position <= 7)) {
      tags.push('european-qualification');
    }
    
    // Relegation battle (bottom 6)
    if (homeTeam.position >= 15 && awayTeam.position >= 15) {
      tags.push('relegation-battle');
    }
    
    return tags;
  }, [selectionConfig.topTeamIds]);

  /**
   * Calculate importance score for a fixture
   */
  const calculateImportance = useCallback((fixture: FeaturedFixture): number => {
    let importance = 5; // Base importance
    
    // Live games get highest priority
    if (fixture.status === 'live') importance += 5;
    
    const tags = getMatchTags(fixture);
    const topTeams = selectionConfig.topTeamIds || [];
    
    // Tag-based scoring
    if (tags.includes('derby')) importance += 4;
    if (tags.includes('top-six')) importance += 4;
    if (tags.includes('title-race')) importance += 3;
    if (tags.includes('european-qualification')) importance += 2;
    if (tags.includes('relegation-battle')) importance += 2;
    
    // Individual team importance
    if (selectionConfig.boostBigSixTeams) {
      if (topTeams.includes(fixture.homeTeam.id)) importance += 2;
      if (topTeams.includes(fixture.awayTeam.id)) importance += 2;
    }
    
    // Position-based importance (closer positions = more important)
    const avgPosition = (fixture.homeTeam.position + fixture.awayTeam.position) / 2;
    if (avgPosition <= 3) importance += 3;
    else if (avgPosition <= 6) importance += 2;
    else if (avgPosition <= 10) importance += 1;
    
    // Form-based importance (teams in good form)
    const homeForm = fixture.homeTeam.form.slice(-3).filter(result => result === 'W').length;
    const awayForm = fixture.awayTeam.form.slice(-3).filter(result => result === 'W').length;
    if (homeForm >= 2 || awayForm >= 2) importance += 1;
    
    // AI insight confidence bonus
    if (fixture.aiInsight?.confidence === 'high') importance += 1;
    if (fixture.aiInsight?.probability && fixture.aiInsight.probability > 0.8) importance += 1;
    
    // Time-based importance (upcoming games more important)
    const matchDate = new Date(fixture.dateTime);
    const now = new Date();
    const daysUntilMatch = Math.ceil((matchDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysUntilMatch <= 1) importance += 2; // Today/tomorrow
    else if (daysUntilMatch <= 3) importance += 1; // This week
    
    return Math.min(10, Math.max(1, importance)); // Clamp between 1-10
  }, [getMatchTags, selectionConfig]);

  /**
   * Select featured games based on configured logic
   */
  const selectFeaturedGames = useCallback((allFixtures: FeaturedFixture[]): FeaturedFixtureWithImportance[] => {
    if (!allFixtures.length) return [];
    
    // Add importance scores and additional metadata
    const fixturesWithImportance: FeaturedFixtureWithImportance[] = allFixtures.map(fixture => ({
      ...fixture,
      importanceScore: calculateImportance(fixture),
      matchWeek: getMatchWeek(fixture.dateTime),
      isBigMatch: getMatchTags(fixture).length > 0,
      tags: getMatchTags(fixture)
    }));
    
    const currentWeek = getCurrentMatchWeek();
    const currentWeekGames = fixturesWithImportance.filter(game => game.matchWeek === currentWeek);
    const nextWeekGames = fixturesWithImportance.filter(game => game.matchWeek === currentWeek + 1);
    const liveGames = fixturesWithImportance.filter(game => game.status === 'live');
    
    let selected: FeaturedFixtureWithImportance[] = [];

    // Step 1: Prioritize live games
    if (selectionConfig.prioritizeLiveGames && liveGames.length > 0) {
      selected.push(...liveGames.sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0)));
    }

    // Step 2: Handle current week games
    if (currentWeekGames.length === 1 && selectionConfig.includeNextWeekIfFew) {
      // Single current week game - add it and fill with next week
      const currentGame = currentWeekGames[0];
      if (!selected.find(g => g.id === currentGame.id)) {
        selected.unshift(currentGame);
      }
      
      const remainingSlots = selectionConfig.maxGames - selected.length;
      const nextWeekSorted = nextWeekGames
        .filter(g => !selected.find(s => s.id === g.id))
        .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0))
        .slice(0, remainingSlots);
      
      selected.push(...nextWeekSorted);
    } else if (currentWeekGames.length > 1) {
      // Multiple current week games - select by importance
      const currentWeekSorted = currentWeekGames
        .filter(g => !selected.find(s => s.id === g.id))
        .filter(g => (g.importanceScore || 0) >= selectionConfig.minImportanceScore)
        .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0));
      
      const remainingSlots = selectionConfig.maxGames - selected.length;
      selected.push(...currentWeekSorted.slice(0, remainingSlots));
    }

    // Step 3: Fill remaining slots with highest importance games
    while (selected.length < selectionConfig.maxGames) {
      const remaining = fixturesWithImportance
        .filter(game => !selected.find(s => s.id === game.id))
        .filter(game => (game.importanceScore || 0) >= selectionConfig.minImportanceScore)
        .sort((a, b) => (b.importanceScore || 0) - (a.importanceScore || 0));
      
      if (remaining.length === 0) break;
      selected.push(remaining[0]);
    }

    // Final sort by importance and live status
    return selected
      .sort((a, b) => {
        if (a.status === 'live' && b.status !== 'live') return -1;
        if (b.status === 'live' && a.status !== 'live') return 1;
        return (b.importanceScore || 0) - (a.importanceScore || 0);
      })
      .slice(0, selectionConfig.maxGames);
  }, [calculateImportance, getMatchWeek, getCurrentMatchWeek, getMatchTags, selectionConfig]);

  /**
   * Fetch and process fixture data
   */
  const refreshData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      setIsLoading(true);

      // If fixtures are provided as props, use them
      let fixtureData = fixtures;

      // Otherwise fetch from API (if configured)
      if (!fixtures.length && dataConfig.fixturesEndpoint) {
        const response = await fetch(dataConfig.fixturesEndpoint);
        if (!response.ok) {
          throw new Error(`Failed to fetch fixtures: ${response.statusText}`);
        }
        fixtureData = await response.json();
      }

      // Select and set featured games
      const selected = selectFeaturedGames(fixtureData);
      setFeaturedGames(selected);

    } catch (err) {
      console.error('Error refreshing fixture data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [fixtures, dataConfig.fixturesEndpoint, selectFeaturedGames]);

  /**
   * Scroll to specific index
   */
  const scrollToIndex = useCallback((index: number) => {
    if (!scrollContainerRef.current) return;
    
    const cardWidth = 300; // Should match your card width + gap
    const targetScroll = index * cardWidth;
    
    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    });
    
    setCarouselState(prev => ({
      ...prev,
      currentIndex: index
    }));
  }, []);

  /**
   * Scroll left
   */
  const scrollLeft = useCallback(() => {
    const newIndex = Math.max(0, carouselState.currentIndex - 1);
    scrollToIndex(newIndex);
  }, [carouselState.currentIndex, scrollToIndex]);

  /**
   * Scroll right
   */
  const scrollRight = useCallback(() => {
    const newIndex = Math.min(featuredGames.length - 1, carouselState.currentIndex + 1);
    scrollToIndex(newIndex);
  }, [carouselState.currentIndex, featuredGames.length, scrollToIndex]);

  /**
   * Toggle auto-rotation
   */
  const toggleAutoRotate = useCallback(() => {
    setCarouselState(prev => ({
      ...prev,
      isAutoRotating: !prev.isAutoRotating
    }));
  }, []);

  // Initial data loading
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || !dataConfig.refreshInterval) return;

    refreshIntervalRef.current = setInterval(() => {
      refreshData();
    }, dataConfig.refreshInterval);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, dataConfig.refreshInterval, refreshData]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  return {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollToIndex,
    scrollLeft,
    scrollRight,
    toggleAutoRotate,
    refreshData
  };
};
