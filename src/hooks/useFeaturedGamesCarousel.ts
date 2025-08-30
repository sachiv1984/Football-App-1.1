import { useState, useRef, useEffect, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';

interface UseFeaturedGamesCarouselParams {
  fixtures?: FeaturedFixtureWithImportance[];
  rotateInterval?: number;
}

interface CarouselState {
  currentIndex: number;
  isAutoRotating: boolean;
  isDragging: boolean;
}

export const useFeaturedGamesCarousel = ({
  fixtures = [],
  rotateInterval = 5000,
}: UseFeaturedGamesCarouselParams) => {
  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 0,
    isAutoRotating: true,
    isDragging: false,
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const autoRotateTimeout = useRef<number | null>(null);

  const totalSlides = fixtures.length;

  // Scroll to given index
  const scrollToIndex = useCallback(
    (index: number) => {
      if (!scrollRef.current) return;
      const width = scrollRef.current.clientWidth;
      scrollRef.current.scrollTo({
        left: width * index,
        behavior: 'smooth',
      });
      setCarouselState((prev) => ({ ...prev, currentIndex: index }));
    },
    []
  );

  // Auto-rotate logic
  const nextSlide = useCallback(() => {
    const nextIndex = (carouselState.currentIndex + 1) % totalSlides;
    scrollToIndex(nextIndex);
  }, [carouselState.currentIndex, scrollToIndex, totalSlides]);

  // Toggle auto-rotate
  const toggleAutoRotate = useCallback(() => {
    setCarouselState((prev) => ({ ...prev, isAutoRotating: !prev.isAutoRotating }));
  }, []);

  // Handle auto-rotation timer
  useEffect(() => {
    if (!carouselState.isAutoRotating || totalSlides <= 1) return;

    autoRotateTimeout.current = window.setTimeout(() => {
      nextSlide();
    }, rotateInterval);

    return () => {
      if (autoRotateTimeout.current) clearTimeout(autoRotateTimeout.current);
    };
  }, [carouselState.isAutoRotating, carouselState.currentIndex, nextSlide, rotateInterval, totalSlides]);

  // Swipe handling
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging.current || startX.current === null) return;
    const deltaX = e.touches[0].clientX - startX.current;
    if (Math.abs(deltaX) > 50) {
      if (deltaX > 0) scrollToIndex((carouselState.currentIndex - 1 + totalSlides) % totalSlides);
      else scrollToIndex((carouselState.currentIndex + 1) % totalSlides);
      isDragging.current = false;
    }
  };

  const handleTouchEnd = () => {
    isDragging.current = false;
    startX.current = null;
  };

  return {
    featuredGames: fixtures,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    scrollRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };
};
