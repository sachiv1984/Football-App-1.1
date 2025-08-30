// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useRef, useEffect } from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import GameCard from '../GameCard/GameCard';

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
    // scrollToIndex,  <-- removed because it’s unused
  } = useFeaturedGamesCarousel({ fixtures, rotateInterval });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        left: carouselState.currentIndex * scrollRef.current.clientWidth,
        behavior: 'smooth',
      });
    }
  }, [carouselState.currentIndex]);

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
          <GameCard fixture={fixture} />
        </div>
      ))}
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;

