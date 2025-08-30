import { useState, useEffect, useRef, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';

export interface CarouselState {
  currentIndex: number;
  isAutoRotating: boolean;
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
  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 0,
    isAutoRotating: true,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const autoRotateTimeout = useRef<NodeJS.Timeout | null>(null);
  const manualPauseTimeout = useRef<NodeJS.Timeout | null>(null);

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!scrollRef.current) return;

      const cardWidth = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: index * cardWidth,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setCarouselState((prev) => ({ ...prev, currentIndex: index }));
    },
    []
  );

  const handleAutoRotate = useCallback(() => {
    if (!carouselState.isAutoRotating) return;

    const nextIndex = (carouselState.currentIndex + 1) % featuredGames.length;
    scrollToIndex(nextIndex);
    autoRotateTimeout.current = setTimeout(handleAutoRotate, rotateInterval);
  }, [carouselState.currentIndex, carouselState.isAutoRotating, featuredGames.length, rotateInterval, scrollToIndex]);

  const resetAutoRotateAfterManual = () => {
    if (manualPauseTimeout.current) clearTimeout(manualPauseTimeout.current);
    setCarouselState((prev) => ({ ...prev, isAutoRotating: false }));

    manualPauseTimeout.current = setTimeout(() => {
      setCarouselState((prev) => ({ ...prev, isAutoRotating: true }));
    }, 10000); // pause for 10s after manual interaction
  };

  const toggleAutoRotate = () => {
    setCarouselState((prev) => ({ ...prev, isAutoRotating: !prev.isAutoRotating }));
  };

  const refreshData = async () => {
    setIsLoading(true);
    try {
      // Placeholder: could call API to refresh featuredGames
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      setError('Failed to refresh');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (carouselState.isAutoRotating) {
      autoRotateTimeout.current = setTimeout(handleAutoRotate, rotateInterval);
    }
    return () => {
      if (autoRotateTimeout.current) clearTimeout(autoRotateTimeout.current);
    };
  }, [carouselState.isAutoRotating, carouselState.currentIndex, handleAutoRotate, rotateInterval]);

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
