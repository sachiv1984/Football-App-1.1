// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useRef } from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import GameCard from '../GameCard/GameCard';
import './OptimizedFeaturedGamesCarousel.css';

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
  className = '',
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    featuredGames,
    carouselState,
    scrollToIndex,
    toggleAutoRotate,
  } = useFeaturedGamesCarousel({
    fixtures,
    autoRefresh: true,
    rotateInterval,
  });

  // Determine how many cards to show based on screen width
  const getVisibleCards = () => (window.innerWidth < 768 ? 1 : 3);

  const visibleCards = getVisibleCards();

  return (
    <div className={`carousel-wrapper ${className}`} ref={scrollRef}>
      <div className="carousel-container">
        {featuredGames.map((game, index) => (
          <div
            key={game.id}
            className="carousel-card"
            style={{
              flex: `0 0 calc(100% / ${visibleCards})`,
            }}
          >
            <GameCard
              game={game}
              isActive={index === carouselState.currentIndex}
              onSelect={() => onGameSelect(game)}
            />
          </div>
        ))}
      </div>

      {/* Carousel Controls */}
      <div className="carousel-controls">
        <button onClick={() => scrollToIndex((carouselState.currentIndex - 1 + featuredGames.length) % featuredGames.length)}>
          ‹
        </button>
        <button onClick={() => scrollToIndex((carouselState.currentIndex + 1) % featuredGames.length)}>
          ›
        </button>
        <button onClick={toggleAutoRotate}>Toggle Auto-Rotate</button>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
