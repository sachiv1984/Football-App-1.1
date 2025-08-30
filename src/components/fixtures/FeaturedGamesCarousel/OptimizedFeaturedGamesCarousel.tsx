// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useEffect } from 'react';
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
}) => {
  const {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollToIndex,
    scrollRef,
    toggleAutoRotate,
  } = useFeaturedGamesCarousel({
    fixtures,
    config: { selection: selectionConfig || config?.selection },
    autoRefresh,
    rotateInterval,
  });

  if (isLoading) return <div className={`carousel-loading ${className}`}>Loading...</div>;
  if (error) return <div className={`carousel-error ${className}`}>Error: {error}</div>;
  if (!featuredGames.length) return <div className={`carousel-empty ${className}`}>No featured games</div>;

  // --- Clone first and last cards for infinite scroll ---
  const displayGames = [
    featuredGames[featuredGames.length - 1], // last card at start
    ...featuredGames,
    featuredGames[0], // first card at end
  ];

  // --- Sync currentIndex for dots ---
  const realIndex = carouselState.currentIndex % featuredGames.length;

  // --- Optional: reset scroll position when wrapping ---
  useEffect(() => {
    if (!scrollRef.current) return;
    const cardWidth = (scrollRef.current.children[0] as HTMLElement)?.offsetWidth + 16 || 300;
    if (carouselState.currentIndex === -1) {
      scrollRef.current.scrollLeft = featuredGames.length * cardWidth;
    } else if (carouselState.currentIndex === featuredGames.length) {
      scrollRef.current.scrollLeft = cardWidth;
    }
  }, [carouselState.currentIndex, featuredGames.length, scrollRef]);

  return (
    <div className={`featured-games-carousel w-full ${className}`}>
      <div
        ref={scrollRef}
        className="carousel-container flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2"
      >
        {displayGames.map((fixture, index) => (
          <div
            key={`${fixture.id}-${index}`}
            className={`carousel-card min-w-[280px] snap-start ${
              carouselState.currentIndex === index ? 'scale-105' : ''
            }`}
            onClick={() => scrollToIndex(index)}
          >
            <FixtureCard
              fixture={fixture}
              size="md"
              showAIInsight={false}
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
              realIndex === index
                ? 'bg-electric-yellow scale-110'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            style={{ minWidth: '12px', minHeight: '12px' }}
          />
        ))}
      </div>

      {/* Auto-Rotate Toggle */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          className="px-3 py-1 border rounded text-sm bg-gray-200 hover:bg-gray-300"
          onClick={toggleAutoRotate}
        >
          {carouselState.isAutoRotating ? 'Stop Auto-Rotate' : 'Start Auto-Rotate'}
        </button>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
