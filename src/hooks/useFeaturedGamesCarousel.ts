import { useState, useRef, useEffect, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types';

interface UseFeaturedGamesCarouselParams {
  fixtures: FeaturedFixtureWithImportance[];
  autoRotate?: boolean;
  rotateInterval?: number;
}

export const useFeaturedGamesCarousel = ({
  fixtures,
  autoRotate = true,
  rotateInterval = 5000,
}: UseFeaturedGamesCarouselParams) => {
  const realCount = fixtures.length;
  const [currentIndex, setCurrentIndex] = useState(0); // real slide index
  const [isAnimating, setIsAnimating] = useState(false);

  // Cloned slides for infinite loop
  const slides = [
    fixtures[realCount - 1], // clone last
    ...fixtures,
    fixtures[0], // clone first
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef<number | null>(null);

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!containerRef.current) return;
      const slideWidth = containerRef.current.clientWidth;
      containerRef.current.scrollTo({
        left: (index + 1) * slideWidth,
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    []
  );

  const goToIndex = useCallback(
    (index: number) => {
      if (isAnimating) return;
      setIsAnimating(true);
      setCurrentIndex(index);
    },
    [isAnimating]
  );

  const goToNext = useCallback(() => goToIndex(currentIndex + 1), [currentIndex, goToIndex]);
  const goToPrev = useCallback(() => goToIndex(currentIndex - 1), [currentIndex, goToIndex]);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate) return;
    autoRotateRef.current = window.setInterval(goToNext, rotateInterval);
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    };
  }, [goToNext, autoRotate, rotateInterval]);

  // Scroll effect
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const handleTransitionEnd = () => {
      setIsAnimating(false);
      if (currentIndex >= realCount) setCurrentIndex(0);
      if (currentIndex < 0) setCurrentIndex(realCount - 1);
    };

    scrollToIndex(currentIndex);

    container.addEventListener('scroll', handleTransitionEnd);
    return () => container.removeEventListener('scroll', handleTransitionEnd);
  }, [currentIndex, realCount, scrollToIndex]);

  // Real slide index for dots
  const visibleIndex = currentIndex >= realCount
    ? 0
    : currentIndex < 0
    ? realCount - 1
    : currentIndex;

  return {
    containerRef,
    slides,
    currentIndex: visibleIndex,
    realCount,
    goToNext,
    goToPrev,
    goToIndex,
  };
};
