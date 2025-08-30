import React from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import FixtureCard from '../FixtureCard/FixtureCard';

interface CarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect: (fixture: FeaturedFixtureWithImportance) => void;
  rotateInterval?: number;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<CarouselProps> = ({
  fixtures,
  onGameSelect,
  rotateInterval = 5000,
  className = '',
}) => {
  const {
    featuredGames,
    carouselState,
    scrollToIndex,
    scrollRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useFeaturedGamesCarousel({ fixtures, rotateInterval });

  return (
    <div className={`relative ${className}`}>
      {/* Carousel */}
      <div
        className="flex overflow-hidden scroll-smooth"
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {featuredGames.map((fixture, idx) => (
          <div
            key={fixture.id}
            style={{ flex: '0 0 100%', scrollSnapAlign: 'center', padding: '0 0.5rem' }}
            onClick={() => onGameSelect(fixture)}
          >
            <FixtureCard fixture={fixture} />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="flex justify-center mt-4 space-x-2">
        {featuredGames.map((_, idx) => (
          <button
            key={idx}
            className={`w-3 h-3 rounded-full transition-colors ${
              idx === carouselState.currentIndex ? 'bg-gray-900' : 'bg-gray-400'
            }`}
            onClick={() => scrollToIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
