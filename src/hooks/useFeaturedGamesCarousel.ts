// src/hooks/useFeaturedGamesCarousel.ts
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

  // Cloned slides for infinite looping
  const slides = [
    fixtures[realCount - 1], // clone last
    ...fixtures,
    fixtures[0], // clone first
  ];

  const containerRef = useRef<HTMLDivElement>(null);
  const autoRotateRef = useRef<number | null>(null);

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

  // Auto-rotate effect
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
    const slideWidth = containerRef.current.clientWidth;
    containerRef.current.scrollTo({
      left: (currentIndex + 1) * slideWidth, // +1 due to cloned first slide
      behavior: 'smooth',
    });

    const handleTransitionEnd = () => {
      setIsAnimating(false);
      if (currentIndex >= realCount) setCurrentIndex(0);
      if (currentIndex < 0) setCurrentIndex(realCount - 1);
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleTransitionEnd);
    return () => container.removeEventListener('scroll', handleTransitionEnd);
  }, [currentIndex, realCount]);

  return {
    containerRef,
    slides,
    currentIndex,
    realCount,
    goToNext,
    goToPrev,
    setIndex: setCurrentIndex,
  };
};
