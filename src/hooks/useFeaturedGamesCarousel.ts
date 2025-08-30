import { useEffect, useRef, useState, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from '../components/GamesCarousel/FeaturedGamesCarousel/FeaturedGamesCarousel.types';

interface UseFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  rotateInterval?: number;
  autoRefresh?: boolean;
}

interface CarouselState {
  currentIndex: number;
  isTransitioning: boolean;
}

export const useFeaturedGamesCarousel = ({
  fixtures,
  rotateInterval = 5000,
  autoRefresh = false,
}: UseFeaturedGamesCarouselProps) => {
  // add importance to fixtures
  const baseGames = fixtures.map(fixture => ({
    ...fixture,
    importance: fixture.importance ?? 1,
  }));

  // clone first & last for infinite loop illusion
  const featuredGames = [
    baseGames[baseGames.length - 1], // clone last at start
    ...baseGames,
    baseGames[0], // clone first at end
  ];

  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 1, // start at "real" first item
    isTransitioning: false,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number, smooth: boolean = true) => {
      if (!scrollRef.current) return;
      scrollRef.current.scrollTo({
        left: index * scrollRef.current.clientWidth,
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    []
  );

  // Next slide
  const nextSlide = useCallback(() => {
    setCarouselState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
      isTransitioning: true,
    }));
  }, []);

  // Prev slide
  const prevSlide = useCallback(() => {
    setCarouselState(prev => ({
      ...prev,
      currentIndex: prev.currentIndex - 1,
      isTransitioning: true,
    }));
  }, []);

  // Auto rotate
  useEffect(() => {
    if (!autoRefresh || baseGames.length <= 1) return;

    const interval = setInterval(() => {
      nextSlide();
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, rotateInterval, nextSlide, baseGames.length]);

  // Sync scroll position on index change
  useEffect(() => {
    scrollToIndex(carouselState.currentIndex, true);
  }, [carouselState.currentIndex, scrollToIndex]);

  // Handle "snap back" after reaching clones
  const handleTransitionEnd = useCallback(() => {
    setCarouselState(prev => {
      if (prev.currentIndex === 0) {
        // jumped to the cloned last → snap to real last
        scrollToIndex(baseGames.length, false);
        return { currentIndex: baseGames.length, isTransitioning: false };
      }
      if (prev.currentIndex === baseGames.length + 1) {
        // jumped to the cloned first → snap to real first
        scrollToIndex(1, false);
        return { currentIndex: 1, isTransitioning: false };
      }
      return { ...prev, isTransitioning: false };
    });
  }, [baseGames.length, scrollToIndex]);

  return {
    featuredGames,
    baseGames,
    carouselState,
    setCarouselState,
    scrollRef,
    scrollToIndex,
    nextSlide,
    prevSlide,
    handleTransitionEnd,
  };
};
