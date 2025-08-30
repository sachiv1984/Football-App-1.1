import React from 'react';
import { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { GameSelectionConfig } from '../../../types';
import FixtureCard from '../FixtureCard/FixtureCard';
import Button from '../../common/Button/Button';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures?: FeaturedFixtureWithImportance[];
  config?: FeaturedGamesCarouselConfig;
  autoRefresh?: boolean;
  rotateInterval?: number;
  className?: string;
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  onViewStats?: (fixtureId: string) => void;
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
  onViewStats,
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
    scrollRef,
  } = useFeaturedGamesCarousel({
    fixtures,
    config: {
      selection: selectionConfig || config?.selection,
    },
    autoRefresh,
    rotateInterval,
  });

  if (isLoading) return <div className={`carousel-loading ${className}`}>Loading...</div>;
  if (error) return <div className={`carousel-error ${className}`}>Error: {error}</div>;
  if (!featuredGames.length) return <div className={`carousel-empty ${className}`}>No featured games</div>;

  return (
    <div className={`featured-games-carousel w-full ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <Button variant="secondary" size="sm" disabled={!carouselState.canScrollLeft} onClick={scrollLeft}>◀</Button>
        <Button variant="secondary" size="sm" disabled={!carouselState.canScrollRight} onClick={scrollRight}>▶</Button>
      </div>

      <div ref={scrollRef} className="carousel-container flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
        {featuredGames.map((fixture, index) => (
          <div
            key={fixture.id}
            className={`relative carousel-card min-w-[280px] snap-start ${carouselState.currentIndex === index ? 'scale-105' : ''}`}
            onClick={() => scrollToIndex(index)}
          >
            <FixtureCard fixture={fixture} size="md" showAIInsight showCompetition showVenue={false} onClick={() => onGameSelect?.(fixture)} />
            {onViewStats && (
              <div className="absolute bottom-2 right-2">
                <Button size="sm" variant="primary" onClick={e => { e.stopPropagation(); onViewStats(fixture.id); }}>View Stats</Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-3">
        {featuredGames.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            aria-label={`Go to game ${index + 1}`}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${carouselState.currentIndex === index ? 'bg-electric-yellow scale-110' : 'bg-gray-300 hover:bg-gray-400'}`}
            style={{ minWidth: '12px', minHeight: '12px' }}
          />
        ))}
      </div>

      <div className="flex justify-center gap-2 mt-4">
        <Button size="sm" onClick={toggleAutoRotate}>{carouselState.isAutoRotating ? 'Stop Auto-Rotate' : 'Start Auto-Rotate'}</Button>
        <Button size="sm" onClick={refreshData}>Refresh Games</Button>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
