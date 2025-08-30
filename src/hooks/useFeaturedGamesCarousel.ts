import { useEffect, useRef, useState, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';
import { FeaturedGamesCarouselConfig } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarouselConfig.types';
import { GameSelectionConfig } from '../types';

interface UseFeaturedGamesCarouselProps {
  fixtures?: FeaturedFixtureWithImportance[];
  config?: { selection?: GameSelectionConfig };
  autoRefresh?: boolean;
  rotateInterval?: number;
  maxFeaturedGames?: number;
}

interface CarouselState {
  currentIndex: number;
}

export const useFeaturedGamesCarousel = ({
  fixtures = [],
  config,
  autoRefresh = false,
  rotateInterval = 5000,
  maxFeaturedGames,
}: UseFeaturedGamesCarouselProps) => {
  const [featuredGames, setFeaturedGames] = useState<FeaturedFixtureWithImportance[]>(fixtures);
  const [carouselState, setCarouselState] = useState<CarouselState>({ currentIndex: 0 });
  const [isAutoRotating, setIsAutoRotating] = useState<boolean>(autoRefresh);
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const nextSlide = useCallback(() => {
    setCarouselState((prev) => ({
      currentIndex: (prev.currentIndex + 1) % featuredGames.length,
    }));
  }, [featuredGames.length]);

  const scrollToIndex = useCallback(
    (index: number) => {
      setCarouselState({ currentIndex: index });
      if (scrollRef.current) {
        scrollRef.current.scrollTo({
          left: scrollRef.current.clientWidth * index,
          behavior: 'smooth',
        });
      }

      // Reset auto-rotation after manual scroll
      if (isAutoRotating) {
        clearInterval(intervalRef.current!);
        intervalRef.current = setInterval(nextSlide, rotateInterval);
      }
    },
    [isAutoRotating, nextSlide, rotateInterval]
  );

  const toggleAutoRotate = useCallback(() => {
    setIsAutoRotating((prev) => !prev);
  }, []);

  const refreshData = useCallback(() => {
    setFeaturedGames([...fixtures]);
    setCarouselState({ currentIndex: 0 });
  }, [fixtures]);

  // Auto-rotate effect
  useEffect(() => {
    if (isAutoRotating) {
      intervalRef.current = setInterval(nextSlide, rotateInterval);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAutoRotating, nextSlide, rotateInterval]);

  return {
    featuredGames: maxFeaturedGames ? featuredGames.slice(0, maxFeaturedGames) : featuredGames,
    carouselState,
    scrollRef,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
    isAutoRotating,
  };
};
