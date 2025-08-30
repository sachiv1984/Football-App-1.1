// src/hooks/useFeaturedGamesCarousel.ts
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
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
    if (isAutoRotating) {
      if (autoRotateTimeout.current !== null) {
        clearTimeout(autoRotateTimeout.current);
        autoRotateTimeout.current = null;
      }
      setIsAutoRotating(false);
    } else {
      autoRotateTimeout.current = window.setTimeout(nextSlide, rotateInterval);
      setIsAutoRotating(true);
    }
  }, [isAutoRotating, nextSlide, rotateInterval]);

  const refreshData = useCallback(() => {
    try {
      setIsLoading(true);
      setFeaturedGames(fixtures);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [fixtures]);

  useEffect(() => {
    if (!autoRefresh) return;

    autoRotateTimeout.current = window.setTimeout(nextSlide, rotateInterval);
    setIsAutoRotating(true);

    return () => {
      if (autoRotateTimeout.current !== null) {
        clearTimeout(autoRotateTimeout.current);
        autoRotateTimeout.current = null;
      }
      setIsAutoRotating(false);
    };
  }, [nextSlide, autoRefresh, rotateInterval]);

  return {
    featuredGames,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
    isLoading,
    error,
    scrollRef,
    isAutoRotating,
  };
};
