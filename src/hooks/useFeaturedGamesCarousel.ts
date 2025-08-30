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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef<number | null>(null);

  // Cloned slides for infinite loop
  const slides = [fixtures[realCount - 1], ...fixtures, fixtures[0]];

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

  const goToNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex(prev => prev + 1);
  }, [isAnimating]);

  const goToPrev = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex(prev => prev - 1);
  }, [isAnimating]);

  const goToIndex = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate) return;
    autoRotateRef.current = window.setInterval(goToNext, rotateInterval);
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    };
  }, [goToNext, autoRotate, rotateInterval]);

  // Scroll effect + loop reset
  useEffect(() => {
    if (!containerRef.current) return;
    scrollToIndex(currentIndex);

    const handleTransitionEnd = () => {
      setIsAnimating(false);
      if (currentIndex >= realCount) setCurrentIndex(0);
      if (currentIndex < 0) setCurrentIndex(realCount - 1);
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleTransitionEnd);
    return () => {
      container.removeEventListener('scroll', handleTransitionEnd);
    };
  }, [currentIndex, realCount, scrollToIndex]);

  return {
    containerRef,
    slides,
    currentIndex,
    realCount,
    goToNext,
    goToPrev,
    goToIndex,
    scrollToIndex,
  };
};
