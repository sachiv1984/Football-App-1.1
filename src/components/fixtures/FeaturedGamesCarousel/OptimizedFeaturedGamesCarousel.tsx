// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useRef } from 'react';
import { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { GameSelectionConfig } from '../../../types';
import FixtureCard from '../FixtureCard/FixtureCard';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures?: FeaturedFixtureWithImportance[];
  config?: FeaturedGamesCarouselConfig;
  autoRefresh?: boolean;
  rotateInterval?: number;
  className?: string;
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  maxFeaturedGames?: number;
  selectionConfig?: GameSelectionConfig;
}

const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures = [],
  config,
  autoRefresh = false,
  rotateInterval = 5000,
  className = '',
  selectionConfig,
  onGameSelect,
  maxFeaturedGames,
}) => {
  // Expose scrollRef so parent can access if needed
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
  } = useFeaturedGamesCarousel({
    fixtures,
    config: { selection: selectionConfig || config?.selection },
    autoRefresh,
    rotateInterval,
  });

  // Limit number of displayed games if maxFeaturedGames is set
  const displayedGames = maxFeaturedGames ? featuredGames.slice(0, maxFeaturedGames) : featuredGames;

  if (isLoading) return <div className={`carousel-loading ${className}`}>Loading...</div>;
  if (error) return <div className={`carousel-error ${className}`}>Error: {error}</div>;
  if (!displayedGames.length) return <div className={`carousel-empty ${className}`}>No featured games</div>;

  return (
    <div className={`featured-games-carousel w-full ${className}`}>
      {/* Scrollable Container */}
      <div
        ref={scrollRef}
        className="carousel-container flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
      >
        {displayedGames.map((fixture, index) => (
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
              showAIInsight
              showCompetition
              showVenue={false}
              onClick={() => onGameSelect?.(fixture)}
            />
          </div>
        ))}
      </div>

      {/* Dot Indicators */}
      <div className="flex justify-center gap-2 mt-3">
        {displayedGames.map((_, index) => (
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
          {carouselState.isAutoRotating ? 'Stop Auto-Rotate' : 'Start Auto-Rotate'}
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
