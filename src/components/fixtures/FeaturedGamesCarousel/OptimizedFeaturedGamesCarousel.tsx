import React from 'react';
import FixtureCard from '../FixtureCard/FixtureCard';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import type { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';

interface CarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  rotateInterval?: number;
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
}

const OptimizedFeaturedGamesCarousel: React.FC<CarouselProps> = ({
  fixtures,
  rotateInterval = 5000,
  onGameSelect,
}) => {
  const {
    containerRef,
    slides,
    currentIndex,
    realCount,
    setCurrentIndex,
    scrollToIndex,
  } = useFeaturedGamesCarousel({
    fixtures,
    rotateInterval,
  });

  return (
    <div className="relative w-full">
      {/* Carousel */}
      <div
        ref={containerRef}
        className="flex overflow-x-hidden scroll-smooth snap-x snap-mandatory"
      >
        {slides.map((fixture, idx) => (
          <div
            key={fixture.id + idx} // clone safety
            className="flex-shrink-0 w-full snap-center px-2"
            onClick={() => onGameSelect?.(fixture)}
          >
            <FixtureCard fixture={fixture} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
        {fixtures.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-3 h-3 rounded-full ${
              idx === currentIndex % realCount ? 'bg-gray-900' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
