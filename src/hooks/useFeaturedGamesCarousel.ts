import { useState, useRef, useEffect, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';
import { GameSelectionConfig } from '../types';

interface UseFeaturedGamesCarouselParams {
  fixtures?: FeaturedFixtureWithImportance[];
  config?: {
    selection?: GameSelectionConfig;
  };
  autoRefresh?: boolean;
  rotateInterval?: number;
}

interface CarouselState {
  currentIndex: number;
}

export const useFeaturedGamesCarousel = ({
  fixtures = [],
  config,
  autoRefresh = false,
  rotateInterval = 5000,
}: UseFeaturedGamesCarouselParams) => {
  const [featuredGames, setFeaturedGames] = useState<FeaturedFixtureWithImportance[]>(fixtures);
  const [carouselState, setCarouselState] = useState<CarouselState>({ currentIndex: 0 });
  const autoRotateTimeout = useRef<number | null>(null);

  const nextSlide = useCallback(() => {
    setCarouselState((prev) => ({
      currentIndex: (prev.currentIndex + 1) % featuredGames.length,
    }));
  }, [featuredGames.length]);

  const scrollToIndex = useCallback((index: number) => {
    setCarouselState({ currentIndex: index });
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

  return {
    featuredGames,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
  };
};
