// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  autoRotate = true,
  rotateInterval = 5000,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const realCount = fixtures.length;

  // Cloned slides for infinite scroll
  const slides = [
    fixtures[realCount - 1], // last item clone at start
    ...fixtures,
    fixtures[0], // first item clone at end
  ];

  // Scroll to a specific index
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

  // Next / Previous
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

  // Auto rotate
  useEffect(() => {
    if (!autoRotate) return;
    const interval = window.setInterval(goToNext, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, goToNext, rotateInterval]);

  // Handle scroll effect & infinite loop reset
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

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Carousel slides container */}
      <div
        ref={containerRef}
        className="flex overflow-x-scroll scroll-smooth scrollbar-hide"
      >
        {slides.map((fixture, idx) => (
          <div
            key={idx}
            className="min-w-full flex-shrink-0 p-4 cursor-pointer"
            onClick={() => onGameSelect?.(fixture)}
          >
            <div className="fixture-card flex items-center justify-between bg-white rounded-xl shadow-card p-4 hover:shadow-card-hover transition-all">
              <div className="flex items-center space-x-4">
                <img
                  src={fixture.homeTeam.logo}
                  alt={fixture.homeTeam.name}
                  className="team-logo"
                />
                <span className="font-bold text-lg">{fixture.homeTeam.name}</span>
                <span className="mx-2 text-gray-500">vs</span>
                <span className="font-bold text-lg">{fixture.awayTeam.name}</span>
                <img
                  src={fixture.awayTeam.logo}
                  alt={fixture.awayTeam.name}
                  className="team-logo"
                />
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">
                  {new Date(fixture.dateTime).toLocaleDateString()}
                </div>
                <div className="text-md font-semibold">
                  {new Date(fixture.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Optional navigation buttons */}
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow hover:bg-gray-100"
        onClick={goToPrev}
      >
        ‹
      </button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow hover:bg-gray-100"
        onClick={goToNext}
      >
        ›
      </button>
    </div>
  );
};
