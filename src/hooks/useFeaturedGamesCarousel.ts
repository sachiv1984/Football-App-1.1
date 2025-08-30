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
  const [currentIndex, setCurrentIndex] = useState(0); // Real slide index
  const [isAnimating, setIsAnimating] = useState(false);

  // Cloned slides
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
        left: (index + 1) * slideWidth, // +1 because of prepended clone
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    []
  );

  const goToNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev + 1);
  }, [isAnimating]);

  const goToPrev = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev - 1);
  }, [isAnimating]);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate) return;
    autoRotateRef.current = window.setInterval(() => goToNext(), rotateInterval);
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    };
  }, [goToNext, autoRotate, rotateInterval]);

  // Scroll effect
  useEffect(() => {
    scrollToIndex(currentIndex);

    const handleTransitionEnd = () => {
      setIsAnimating(false);
      if (currentIndex >= realCount) setCurrentIndex(0);
      if (currentIndex < 0) setCurrentIndex(realCount - 1);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleTransitionEnd);
    }

    return () => {
      if (container) container.removeEventListener('scroll', handleTransitionEnd);
    };
  }, [currentIndex, realCount, scrollToIndex]);

  return {
    containerRef,
    slides,
    currentIndex,
    realCount,
    goToNext,
    goToPrev,
    scrollToIndex,
    setCurrentIndex,
  };
};
