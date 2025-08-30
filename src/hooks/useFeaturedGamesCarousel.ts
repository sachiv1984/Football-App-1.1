// src/hooks/useFeaturedGamesCarousel.ts
import { useState, useRef, useEffect, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';
import { GameSelectionConfig } from '../types';

interface UseFeaturedGamesCarouselParams {
  fixtures?: FeaturedFixtureWithImportance[];
  config?: {
    selection?: GameSelectionConfig;
    visibleCards?: number;
  };
  autoRefresh?: boolean;
  rotateInterval?: number;
}

interface CarouselState {
  currentIndex: number;
  visibleCards: number;
}

export const useFeaturedGamesCarousel = ({
  fixtures = [],
  config,
  autoRefresh = false,
  rotateInterval = 5000,
}: UseFeaturedGamesCarouselParams) => {
  const [featuredGames, setFeaturedGames] = useState<FeaturedFixtureWithImportance[]>(fixtures);

  // Initialize visibleCards based on window width
  const getVisibleCards = () => (window.innerWidth < 768 ? 1 : config?.visibleCards || 4);

  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 0,
    visibleCards: getVisibleCards(),
  });

  const autoRotateTimeout = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCarouselState((prev) => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % featuredGames.length,
    }));
  }, [featuredGames.length]);

  const scrollToIndex = useCallback((index: number) => {
    setCarouselState((prev) => ({ ...prev, currentIndex: index }));
  }, []);

  const toggleAutoRotate = useCallback(() => {
    if (autoRotateTimeout.current) {
      clearTimeout(autoRotateTimeout.current);
      autoRotateTimeout.current = null;
    } else {
      autoRotateTimeout.current = window.setTimeout(nextSlide, rotateInterval);
    }
  }, [nextSlide, rotateInterval]);

  const refreshData = useCallback(() => {
    setFeaturedGames(fixtures);
  }, [fixtures]);

  // Auto-rotate effect
  useEffect(() => {
    if (!autoRefresh) return;

    autoRotateTimeout.current = window.setTimeout(nextSlide, rotateInterval);

    return () => {
      if (autoRotateTimeout.current !== null) {
        clearTimeout(autoRotateTimeout.current);
        autoRotateTimeout.current = null;
      }
    };
  }, [nextSlide, autoRefresh, rotateInterval]);

  // Update visibleCards on window resize
  useEffect(() => {
    const handleResize = () => {
      setCarouselState((prev) => ({ ...prev, visibleCards: getVisibleCards() }));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [config?.visibleCards]);

  return {
    featuredGames,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
  };
};
