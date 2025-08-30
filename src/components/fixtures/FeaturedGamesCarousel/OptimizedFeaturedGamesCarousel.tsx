import React from 'react';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { GameSelectionConfig } from '../../../types';
import FixtureCard from '../FixtureCard/FixtureCard';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  maxFeaturedGames?: number;
  rotateInterval?: number;
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
  const { featuredGames, carouselState, scrollToIndex } = useFeaturedGamesCarousel({
    fixtures,
    autoRefresh: true,
    rotateInterval,
  });

  if (!featuredGames.length) return <div className={`carousel-empty ${className}`}>No featured games</div>;

  return (
    <div className={`featured-games-carousel w-full ${className}`}>
      {/* Scrollable Cards */}
      <div className="carousel-container flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2">
        {featuredGames.slice(0, maxFeaturedGames).map((fixture, index) => (
          <div
            key={fixture.id}
            className={`relative carousel-card min-w-[280px] snap-start transition-transform duration-300 ${
              carouselState.currentIndex === index ? 'scale-105' : 'scale-100'
            }`}
            onClick={() => onGameSelect?.(fixture)}
          >
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
