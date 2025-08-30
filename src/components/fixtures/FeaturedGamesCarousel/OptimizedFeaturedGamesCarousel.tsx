// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { GameSelectionConfig } from '../../../types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import FixtureCard from '../FixtureCard/FixtureCard';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures?: FeaturedFixtureWithImportance[];
  config?: { selection?: GameSelectionConfig };
  autoRefresh?: boolean;
  rotateInterval?: number;
  className?: string;
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
}

const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures = [],
  config,
  autoRefresh = false,
  rotateInterval = 5000,
  className = '',
  onGameSelect,
}) => {
  const {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
    scrollRef,
    isAutoRotating,
  } = useFeaturedGamesCarousel({
    fixtures,
    config,
    autoRefresh,
    rotateInterval,
  });

  if (isLoading) return <div className={`carousel-loading ${className}`}>Loading...</div>;
  if (error) return <div className={`carousel-error ${className}`}>Error: {error}</div>;
  if (!featuredGames.length) return <div className={`carousel-empty ${className}`}>No featured games</div>;

  return (
    <div className={`featured-games-carousel w-full ${className}`}>
      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="carousel-container flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
      >
        {featuredGames.map((fixture, index) => (
          <div
            key={fixture.id}
            className={`relative carousel-card min-w-[280px] sm:min-w-[300px] md:min-w-[320px] lg:min-w-[350px] snap-start ${
              carouselState.currentIndex === index ? 'scale-105' : ''
            }`}
            onClick={() => scrollToIndex(index)}
          >
            <FixtureCard
              fixture={fixture}
              size="md"
              showAIInsight={true}
              showCompetition={true}
              showVenue={false}
              onClick={() => onGameSelect?.(fixture)}
            />
          </div>
        ))}
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-3">
        {featuredGames.map((_, index) => (
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

      {/* Controls */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          onClick={toggleAutoRotate}
        >
          {isAutoRotating ? 'Stop Auto-Rotate' : 'Start Auto-Rotate'}
        </button>
        <button
          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
          onClick={refreshData}
        >
          Refresh Games
        </button>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
