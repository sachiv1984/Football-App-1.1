import { useState, useEffect, useRef, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';

export interface CarouselState {
  currentIndex: number;
}

export interface UseFeaturedGamesCarouselReturn {
  featuredGames: FeaturedFixtureWithImportance[];
  carouselState: CarouselState;
  scrollToIndex: (index: number, smooth?: boolean) => void;
  toggleAutoRotate: () => void;
  refreshData: () => Promise<void>;
}

export const useFeaturedGamesCarousel = (
  fixtures: FeaturedFixtureWithImportance[],
  rotateInterval: number
): UseFeaturedGamesCarouselReturn => {
  const [carouselState, setCarouselState] = useState<CarouselState>({ currentIndex: 0 });
  const [autoRotate, setAutoRotate] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToIndex = useCallback((index: number, smooth = true) => {
    setCarouselState({ currentIndex: index });
    // Reset auto-rotate when user manually changes index
    if (autoRotate) {
      clearTimeout(timeoutRef.current!);
      timeoutRef.current = setTimeout(() => nextSlide(), rotateInterval);
    }
  }, [autoRotate, rotateInterval]);

  const nextSlide = useCallback(() => {
    setCarouselState((prev) => ({
      currentIndex: (prev.currentIndex + 1) % fixtures.length,
    }));
  }, [fixtures.length]);

  const toggleAutoRotate = () => setAutoRotate(!autoRotate);

  const refreshData = async () => {
    // Placeholder for actual data refresh logic
    return Promise.resolve();
  };

  // Auto-rotate effect
  useEffect(() => {
    if (!autoRotate) return;
    timeoutRef.current = setTimeout(() => nextSlide(), rotateInterval);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [carouselState.currentIndex, autoRotate, rotateInterval, nextSlide]);

  return {
    featuredGames: fixtures,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
  };
};
