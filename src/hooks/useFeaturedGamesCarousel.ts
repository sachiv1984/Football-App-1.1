// src/hooks/useFeaturedGamesCarousel.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';

export interface CarouselState {
  currentIndex: number;
}

export interface UseCarouselReturn {
  featuredGames: FeaturedFixtureWithImportance[];
  isLoading: boolean;
  error?: string;
  carouselState: CarouselState;
  scrollToIndex: (index: number, smooth?: boolean) => void;
  toggleAutoRotate: () => void;
  refreshData: () => Promise<void>;
  scrollRef: React.RefObject<HTMLDivElement>;
}

export const useFeaturedGamesCarousel = (
  featuredGames: FeaturedFixtureWithImportance[],
  rotateInterval = 5000
): UseCarouselReturn => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [carouselState, setCarouselState] = useState<CarouselState>({ currentIndex: 0 });
  const [isAutoRotate, setIsAutoRotate] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const autoRotateTimer = useRef<NodeJS.Timeout>();

  // Scroll to index
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: scrollRef.current.clientWidth * index,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setCarouselState({ currentIndex: index });
    }
  }, []);

  // Auto-rotate handler
  const startAutoRotate = useCallback(() => {
    if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);

    autoRotateTimer.current = setTimeout(() => {
      if (!isAutoRotate) return;
      const nextIndex = (carouselState.currentIndex + 1) % featuredGames.length;
      scrollToIndex(nextIndex);
    }, rotateInterval);
  }, [carouselState.currentIndex, isAutoRotate, featuredGames.length, rotateInterval, scrollToIndex]);

  // Toggle auto-rotate
  const toggleAutoRotate = useCallback(() => setIsAutoRotate(prev => !prev), []);

  // Refresh data
  const refreshData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // Simulate refresh
      await new Promise<void>(resolve => setTimeout(resolve, 500));
      setError(undefined);
    } catch (err) {
      setError((err as Error)?.message || 'Error refreshing data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start auto-rotate effect
  useEffect(() => {
    startAutoRotate();
    return () => {
      if (autoRotateTimer.current) clearTimeout(autoRotateTimer.current);
    };
  }, [startAutoRotate]);

  return {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
    scrollRef,
  };
};
