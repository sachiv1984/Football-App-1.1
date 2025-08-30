import { useState, useEffect, useCallback, useRef } from 'react';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';

export type CarouselState = {
  currentIndex: number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isAutoRotating: boolean;
};

export type UseCarouselReturn = {
  featuredGames: FeaturedFixtureWithImportance[];
  isLoading: boolean;
  error?: string;
  carouselState: CarouselState;
  scrollToIndex: (index: number, smooth?: boolean) => void;
  toggleAutoRotate: () => void;
  refreshData: () => Promise<void>;
  scrollRef: React.RefObject<HTMLDivElement>;
};

export const useFeaturedGamesCarousel = (
  featuredGames: FeaturedFixtureWithImportance[],
  rotateInterval: number = 5000
): UseCarouselReturn => {
  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 0,
    canScrollLeft: false,
    canScrollRight: featuredGames.length > 1,
    isAutoRotating: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef<number | null>(null);

  const scrollRight = useCallback(() => {
    setCarouselState(prev => {
      const nextIndex = prev.currentIndex + 1 >= featuredGames.length ? 0 : prev.currentIndex + 1;
      scrollToIndex(nextIndex);
      return { ...prev, currentIndex: nextIndex };
    });
  }, [featuredGames.length]);

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!scrollRef.current) return;

      const card = scrollRef.current.children[0] as HTMLElement;
      const gap = 16;
      const width = card?.offsetWidth + gap || 300;

      scrollRef.current.scrollTo({ left: index * width, behavior: smooth ? 'smooth' : 'auto' });

      setCarouselState(prev => ({
        ...prev,
        currentIndex: index,
        canScrollLeft: true,
        canScrollRight: true,
      }));

      // reset auto-rotation after manual scroll
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
        autoRotateRef.current = window.setInterval(scrollRight, rotateInterval);
      }
    },
    [scrollRef, rotateInterval, scrollRight]
  );

  const toggleAutoRotate = useCallback(() => {
    setCarouselState(prev => ({ ...prev, isAutoRotating: !prev.isAutoRotating }));
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      // placeholder async refresh
    } catch {
      setError('Failed to refresh featured games.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (carouselState.isAutoRotating) {
      autoRotateRef.current = window.setInterval(scrollRight, rotateInterval);
      return () => {
        if (autoRotateRef.current) {
          clearInterval(autoRotateRef.current);
        }
      };
    }
  }, [carouselState.isAutoRotating, scrollRight, rotateInterval]);

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
