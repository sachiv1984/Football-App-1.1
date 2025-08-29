// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useEffect, useCallback } from 'react';
import { FeaturedGamesCarouselProps, FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';
import useCarousel from './useCarousel'; // assuming your hook file

const OptimizedFeaturedGamesCarousel: React.FC<FeaturedGamesCarouselProps> = ({
  fixtures = [],
  onGameSelect,
  onViewStats,
  autoRotate = false,
  rotateInterval = 5000,
  className,
  maxFeaturedGames = 4,
  selectionConfig,
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
  } = useCarousel({
    fixtures,
    autoRotate,
    rotateInterval,
    maxFeaturedGames,
    selectionConfig,
  });

  // Auto-refresh when component mounts
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auto-rotation effect
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      scrollRight();
    }, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, scrollRight, rotateInterval]);

  if (isLoading) return <div>Loading featured games...</div>;
  if (error) return <div>Error loading games: {error}</div>;

  return (
    <div className={className}>
      <button
        onClick={scrollLeft}
        disabled={!carouselState.canScrollLeft}
        aria-label="Scroll Left"
      >
        ◀
      </button>

      {featuredGames.map((game: FeaturedFixtureWithImportance, index: number) => (
        <div
          key={game.id}
          onClick={() => onGameSelect?.(game)}
          aria-label={`Game card: ${game.homeTeam.name} vs ${game.awayTeam.name}`}
          style={{
            display: 'inline-block',
            margin: '0 8px',
            opacity: game.isBigMatch ? 1 : 0.8,
            border: carouselState.currentIndex === index ? '2px solid blue' : '1px solid gray',
            borderRadius: '8px',
            padding: '8px',
          }}
        >
          <div>{game.homeTeam.name} vs {game.awayTeam.name}</div>
          <div>Importance: {game.importanceScore ?? '-'}</div>
          <button onClick={() => onViewStats?.(game.id)}>View Stats</button>
        </div>
      ))}

      <button
        onClick={scrollRight}
        disabled={!carouselState.canScrollRight}
        aria-label="Scroll Right"
      >
        ▶
      </button>

      <div style={{ marginTop: '8px' }}>
        <button onClick={toggleAutoRotate}>
          {carouselState.isAutoRotating ? 'Stop' : 'Start'} Auto-Rotate
        </button>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
