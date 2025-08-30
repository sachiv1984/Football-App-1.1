// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React from 'react';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import FixtureCard from '../FixtureCard/FixtureCard';
import { GameSelectionConfig } from '../../../types';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  maxFeaturedGames?: number;
  rotateInterval?: number; // milliseconds
  selectionConfig?: GameSelectionConfig;
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures,
  maxFeaturedGames = 4,
  rotateInterval = 5000,
  selectionConfig,
  onGameSelect,
  className = '',
}) => {
  const {
    featuredGames,
    carouselState,
    scrollToIndex,
  } = useFeaturedGamesCarousel(fixtures, rotateInterval, selectionConfig);

  if (!featuredGames.length) return <div className={`carousel-empty ${className}`}>No featured games</div>;

  return (
    <div className={`featured-games-carousel w-full ${className}`}>
      {/* Scrollable Container */}
      <div className="carousel-container flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
        {featuredGames.slice(0, maxFeaturedGames).map((fixture, index) => (
          <div
            key={fixture.id}
            className={`relative carousel-card min-w-[280px] snap-start ${
              carouselState.currentIndex === index ? 'scale-105' : ''
            }`}
            onClick={() => scrollToIndex(index)}
          >
            <FixtureCard
              fixture={fixture}
              size="md"
              showAIInsight={false}   // Removed AI insight
              showCompetition={true}
              showVenue={false}
              onClick={() => onGameSelect?.(fixture)}
            />
          </div>
        ))}
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-3">
        {featuredGames.slice(0, maxFeaturedGames).map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            aria-label={`Go to game ${index + 1}`}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              carouselState.currentIndex === index
                ? 'bg-electric-yellow scale-110'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            style={{ minWidth: '12px', minHeight: '12px' }}
          />
        ))}
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
