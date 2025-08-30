import { useState, useRef, useCallback, useEffect } from 'react';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';
import { GameSelectionConfig } from '../types';

interface UseFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  config?: { selection?: GameSelectionConfig };
  autoRefresh?: boolean;
  rotateInterval?: number;
}

interface CarouselState {
  currentIndex: number;
}

export const useFeaturedGamesCarousel = ({
  fixtures,
  config,
  autoRefresh = false,
  rotateInterval = 5000,
}: UseFeaturedGamesCarouselProps) => {
  const [carouselState, setCarouselState] = useState<CarouselState>({ currentIndex: 0 });
  const autoRotateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const nextSlide = useCallback(() => {
    setCarouselState(prev => ({
      currentIndex: (prev.currentIndex + 1) % fixtures.length,
    }));
  }, [fixtures.length]);

  const scrollToIndex = useCallback((index: number) => {
    setCarouselState({ currentIndex: index });
    if (scrollRef.current) {
      const child = scrollRef.current.children[index] as HTMLElement;
      child?.scrollIntoView({ behavior: 'smooth', inline: 'center' });
    }
    if (autoRefresh) {
      if (autoRotateTimeout.current) clearTimeout(autoRotateTimeout.current);
      autoRotateTimeout.current = setTimeout(nextSlide, rotateInterval);
    }
  }, [fixtures.length, autoRefresh, nextSlide, rotateInterval]);

  useEffect(() => {
    if (autoRefresh) {
      autoRotateTimeout.current = setTimeout(nextSlide, rotateInterval);
      return () => autoRotateTimeout.current && clearTimeout(autoRotateTimeout.current);
    }
  }, [nextSlide, autoRefresh, rotateInterval]);

  return {
    featuredGames: fixtures,
    carouselState,
    scrollToIndex,
    scrollRef,
  };
};
