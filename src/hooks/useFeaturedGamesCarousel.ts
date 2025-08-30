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

  useEffect(() => {
    if (!autoRotate) return;
    autoRotateRef.current = window.setInterval(goToNext, rotateInterval);
    return () => {
      if (autoRotateRef.current) clearInterval(autoRotateRef.current);
    };
  }, [goToNext, autoRotate, rotateInterval]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const handleScrollEnd = () => {
      setIsAnimating(false);
      if (currentIndex >= realCount) setCurrentIndex(0);
      if (currentIndex < 0) setCurrentIndex(realCount - 1);
    };

    scrollToIndex(currentIndex);
    container.addEventListener('scroll', handleScrollEnd);
    return () => container.removeEventListener('scroll', handleScrollEnd);
  }, [currentIndex, realCount, scrollToIndex]);

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

