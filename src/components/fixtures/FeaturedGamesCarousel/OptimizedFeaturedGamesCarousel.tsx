// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useEffect } from 'react';
import { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { GameSelectionConfig } from '../../../types';

// ✅ Import design system components
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
  // --- Hooks must come first ---
  const {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
    refreshData,
    scrollRef,
  } = useFeaturedGamesCarousel({
    fixtures,
    config: { selection: selectionConfig || config?.selection },
    autoRefresh,
    rotateInterval,
  });

  // Infinite loop: reset index to 0 after last
  useEffect(() => {
    if (carouselState.currentIndex >= featuredGames.length && featuredGames.length > 0) {
      scrollToIndex(0, false);
    }
  }, [carouselState.currentIndex, featuredGames, scrollToIndex]);

  // --- Early returns ---
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
            className={`relative carousel-card min-w-[280px] snap-start ${
              carouselState.currentIndex === index ? 'scale-105' : ''
            }`}
            onClick={() => onGameSelect?.(fixture)}
          >
            {/* ✅ Fixture Card (clean, no overlay) */}
            <FixtureCard
              fixture={fixture}
              size="md"
              showAIInsight={false}
              showCompetition={true}
              showVenue={false}
            />
          </div>
        ))}
      </div>

      {/* ✅ Dot Indicators */}
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

      {/* Controls (optional auto-rotate toggle & refresh) */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          className="btn btn-sm"
          onClick={toggleAutoRotate}
        >
          {carouselState.isAutoRotating ? 'Stop Auto-Rotate' : 'Start Auto-Rotate'}
        </button>
        <button
          className="btn btn-sm"
          onClick={refreshData}
        >
          Refresh Games
        </button>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
