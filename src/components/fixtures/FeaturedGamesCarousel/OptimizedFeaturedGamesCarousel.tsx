import React, { useEffect } from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import FixtureCard from '../FixtureCard/FixtureCard';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect: (fixture: FeaturedFixtureWithImportance) => void;
  rotateInterval?: number;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures,
  onGameSelect,
  rotateInterval = 5000,
  className,
}) => {
  const {
    featuredGames,
    carouselState,
    scrollRef, // ✅ from hook
  } = useFeaturedGamesCarousel({ 
    fixtures, 
    rotateInterval, 
    autoRefresh: true // ✅ enable auto-rotate
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: carouselState.currentIndex * scrollRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  }, [carouselState.currentIndex, scrollRef]);

  return (
    <div
      className={className}
      ref={scrollRef}
      style={{
        display: 'flex',
        overflowX: 'hidden',
        scrollSnapType: 'x mandatory',
      }}
    >
      {featuredGames.map((fixture) => (
        <div
          key={fixture.id}
          style={{ flex: '0 0 100%', scrollSnapAlign: 'center', padding: '0 0.5rem' }}
          onClick={() => onGameSelect(fixture)}
        >
          <FixtureCard fixture={fixture} />
        </div>
      ))}
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
