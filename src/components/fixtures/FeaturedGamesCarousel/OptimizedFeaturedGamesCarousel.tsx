// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import GameCard from '../GameCard/GameCard'; // <-- make sure this path matches your project
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect: (fixture: FeaturedFixtureWithImportance) => void;
  rotateInterval?: number;
  visibleCards?: number; // new prop to control how many cards are visible
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures,
  onGameSelect,
  rotateInterval = 5000,
  visibleCards = 4, // default to 4 cards
  className = '',
}) => {
  const {
    featuredGames,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
  } = useFeaturedGamesCarousel({
    fixtures,
    rotateInterval,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll logic
  useEffect(() => {
    const interval = setInterval(() => {
      scrollToIndex((carouselState.currentIndex + 1) % featuredGames.length);
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [carouselState.currentIndex, featuredGames.length, scrollToIndex, rotateInterval]);

  // Determine which cards to show
  const startIndex = carouselState.currentIndex;
  const endIndex = Math.min(startIndex + visibleCards, featuredGames.length);
  const visibleFixtures = featuredGames.slice(startIndex, endIndex);

  return (
    <div className={`flex overflow-x-auto ${className}`} ref={scrollRef}>
      {visibleFixtures.map((fixture) => (
        <div key={fixture.id} className="flex-shrink-0 mr-4">
          <GameCard fixture={fixture} onClick={() => onGameSelect(fixture)} />
        </div>
      ))}
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
