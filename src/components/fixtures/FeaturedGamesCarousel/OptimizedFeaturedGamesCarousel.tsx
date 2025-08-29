// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React from 'react';
import { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures?: FeaturedFixtureWithImportance[];
  config?: FeaturedGamesCarouselConfig;
  autoRefresh?: boolean;
  rotateInterval?: number;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures = [],
  config,
  autoRefresh = false,
  rotateInterval = 5000,
  className = ''
}) => {
  const {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollToIndex,
    scrollLeft,
    scrollRight,
    toggleAutoRotate,
    refreshData,
    scrollRef
  } = useFeaturedGamesCarousel({
    fixtures,
    config: { selection: config?.selection },
    autoRefresh,
    rotateInterval
  });

  if (isLoading) return <div className={`carousel-loading ${className}`}>Loading...</div>;
  if (error) return <div className={`carousel-error ${className}`}>Error: {error}</div>;
  if (!featuredGames.length) return <div className={`carousel-empty ${className}`}>No featured games</div>;

  return (
    <div className={`featured-games-carousel ${className}`}>
      {/* Navigation Buttons */}
      <button disabled={!carouselState.canScrollLeft} onClick={scrollLeft}>
        ◀
      </button>
      <button disabled={!carouselState.canScrollRight} onClick={scrollRight}>
        ▶
      </button>

      {/* Scrollable Container */}
      <div ref={scrollRef} className="carousel-container overflow-x-auto flex gap-4">
        {featuredGames.map((fixture, index) => (
          <div
            key={fixture.id}
            className={`carousel-card ${carouselState.currentIndex === index ? 'active' : ''}`}
            onClick={() => scrollToIndex(index)}
          >
            <p>{fixture.homeTeam?.name} vs {fixture.awayTeam?.name}</p>
            <p>Importance: {fixture.importanceScore}</p>
          </div>
        ))}
      </div>

      {/* Auto-Rotate Toggle */}
      <button onClick={toggleAutoRotate}>
        {carouselState.isAutoRotating ? 'Stop Auto-Rotate' : 'Start Auto-Rotate'}
      </button>

      {/* Manual Refresh */}
      <button onClick={refreshData}>Refresh Games</button>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
