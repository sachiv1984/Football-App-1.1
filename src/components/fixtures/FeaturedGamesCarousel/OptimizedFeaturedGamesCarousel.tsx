// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useEffect } from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import FixtureCard from '../FixtureCard/FixtureCard';
import clsx from 'clsx';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect: (fixture: FeaturedFixtureWithImportance) => void;
  rotateInterval?: number;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures,
  onGameSelect,
  rotateInterval = 5000,
  className,
}) => {
  const {
    containerRef,
    slides,
    currentIndex,
    realCount,
    setCurrentIndex,
    scrollToIndex: _scrollToIndex, // kept for ESLint
  } = useFeaturedGamesCarousel({ fixtures, rotateInterval });

  // Auto rotate effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % realCount);
    }, rotateInterval);
    return () => clearInterval(interval);
  }, [rotateInterval, realCount, setCurrentIndex]);

  // Handle dot click
  const handleDotClick = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={clsx('relative w-full', className)}>
      {/* Carousel slides */}
      <div
        ref={containerRef}
        className="flex overflow-x-hidden scroll-smooth"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {slides.map((fixture, idx) => (
          <div
            key={`${fixture.id}-${idx}`} // use idx for duplicated clones
            className="flex-0-0-100% scroll-snap-align-center px-2"
            onClick={() => onGameSelect(fixture)}
          >
            <FixtureCard fixture={fixture} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {Array.from({ length: realCount }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => handleDotClick(idx)}
            className={clsx(
              'w-3 h-3 rounded-full transition-colors duration-200',
              idx === currentIndex ? 'bg-gray-900' : 'bg-gray-400'
            )}
            aria-label={`Go to slide ${idx + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
