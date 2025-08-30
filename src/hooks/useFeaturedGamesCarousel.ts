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
  const [error, setError] = useState<string | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRefresh);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoRotateTimeout = useRef<number | null>(null);

  // Move to next slide
  const nextSlide = useCallback(() => {
    setCarouselState((prev) => ({
      currentIndex: (prev.currentIndex + 1) % featuredGames.length,
    }));
  }, [featuredGames.length]);

  // Scroll to specific index
  const scrollToIndex = useCallback((index: number) => {
    setCarouselState({ currentIndex: index });

    if (scrollRef.current) {
      const container = scrollRef.current;
      const child = container.children[index] as HTMLElement;
      if (child) container.scrollTo({ left: child.offsetLeft, behavior: 'smooth' });
    }
  }, []);

  // Toggle auto-rotation
  const toggleAutoRotate = useCallback(() => {
    setIsAutoRotating((prev) => !prev);
  }, []);

  // Refresh featured games
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setFeaturedGames(fixtures);
    } catch (err) {
      setError('Failed to refresh featured games');
    } finally {
      setIsLoading(false);
    }
  }, [fixtures]);

  // Auto-rotation effect
  useEffect(() => {
    if (!isAutoRotating) return;

    const tick = () => {
      nextSlide();
      autoRotateTimeout.current = window.setTimeout(tick, rotateInterval);
    };

    autoRotateTimeout.current = window.setTimeout(tick, rotateInterval);

    return () => {
      if (autoRotateTimeout.current !== null) {
        clearTimeout(autoRotateTimeout.current);
        autoRotateTimeout.current = null;
      }
    };
  }, [isAutoRotating, nextSlide, rotateInterval]);

  return {
    featuredGames,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
    scrollRef,
    isLoading,
    error,
    isAutoRotating,
  };
};
