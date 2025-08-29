// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React from 'react';
import { FeaturedGamesCarouselProps } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import './OptimizedFeaturedGamesCarousel.css'; // optional CSS file

export const OptimizedFeaturedGamesCarousel: React.FC<FeaturedGamesCarouselProps> = ({
  fixtures,
  onGameSelect,
  onViewStats,
  autoRotate = false,
  rotateInterval = 5000,
  maxFeaturedGames = 4,
  selectionConfig
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
    config: { selection: selectionConfig },
    autoRefresh: true,
    rotateInterval
  });

  if (isLoading) return <div>Loading featured games...</div>;
  if (error) return <div>Error loading featured games: {error}</div>;
  if (!featuredGames.length) return <div>No featured games available</div>;

  return (
    <div className="featured-carousel-container">
      {/* Navigation */}
      <button
        onClick={scrollLeft}
        disabled={!carouselState.canScrollLeft}
        aria-label="Scroll left"
        className="carousel-nav left"
      >
        ◀
      </button>

      <div className="carousel-wrapper" ref={scrollRef}>
        {featuredGames.slice(0, maxFeaturedGames).map((fixture, index) => (
          <div
            key={fixture.id}
            className={`carousel-card ${fixture.status === 'live' ? 'live' : ''}`}
            onClick={() => onGameSelect?.(fixture)}
            aria-label={`Game: ${fixture.homeTeam?.name} vs ${fixture.awayTeam?.name}`}
          >
            <div className="teams">
              <span>{fixture.homeTeam?.name}</span> vs <span>{fixture.awayTeam?.name}</span>
            </div>
            <div className="kickoff">{new Date(fixture.dateTime).toLocaleString()}</div>
            <button
              className="view-stats-btn"
              onClick={(e) => {
                e.stopPropagation();
                onViewStats?.(fixture.id);
              }}
            >
              View Stats
            </button>

            {/* Optional AI Insight */}
            {fixture.aiInsight && (
              <div className="ai-insight">
                <strong>AI Insight:</strong> {fixture.aiInsight.text}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={scrollRight}
        disabled={!carouselState.canScrollRight}
        aria-label="Scroll right"
        className="carousel-nav right"
      >
        ▶
      </button>

      {/* Auto-rotate toggle */}
      {featuredGames.length > 1 && (
        <button
          onClick={toggleAutoRotate}
          className="auto-rotate-toggle"
          aria-pressed={carouselState.isAutoRotating}
        >
          {carouselState.isAutoRotating ? 'Pause Rotation' : 'Auto-Rotate'}
        </button>
      )}
    </div>
  );
};
