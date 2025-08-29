l// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FeaturedGamesCarouselProps, FeaturedFixtureWithImportance, CarouselState } from './FeaturedGamesCarousel.types';
import type { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';
import './FeaturedGamesCarousel.css'; // assuming you have a CSS file

export const OptimizedFeaturedGamesCarousel: React.FC<FeaturedGamesCarouselProps> = ({
  fixtures,
  onGameSelect,
  onViewStats,
  autoRotate = false,
  rotateInterval = 5000,
  className = '',
  maxFeaturedGames = 4,
  selectionConfig,
}) => {
  const [featuredGames, setFeaturedGames] = useState<FeaturedFixtureWithImportance[]>([]);
  const [carouselState, setCarouselState] = useState<CarouselState>({
    currentIndex: 0,
    canScrollLeft: false,
    canScrollRight: false,
    isAutoRotating: autoRotate,
    isDragging: false,
  });
  const carouselRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  // Initialize featured games
  useEffect(() => {
    if (fixtures && fixtures.length > 0) {
      setFeaturedGames(fixtures.slice(0, maxFeaturedGames));
    } else {
      // Auto-selection logic could go here
      setFeaturedGames([]);
    }
  }, [fixtures, maxFeaturedGames]);

  // Auto-rotate logic
  useEffect(() => {
    if (carouselState.isAutoRotating) {
      intervalRef.current = setInterval(() => {
        scrollRight();
      }, rotateInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [carouselState.isAutoRotating, rotateInterval, featuredGames]);

  const scrollToIndex = useCallback(
    (index: number) => {
      if (!carouselRef.current) return;
      const clampedIndex = Math.max(0, Math.min(index, featuredGames.length - 1));
      const card = carouselRef.current.children[clampedIndex] as HTMLElement;
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', inline: 'center' });
        setCarouselState((prev) => ({
          ...prev,
          currentIndex: clampedIndex,
          canScrollLeft: clampedIndex > 0,
          canScrollRight: clampedIndex < featuredGames.length - 1,
        }));
      }
    },
    [featuredGames.length]
  );

  const scrollLeft = () => scrollToIndex(carouselState.currentIndex - 1);
  const scrollRight = () => scrollToIndex(carouselState.currentIndex + 1);
  const toggleAutoRotate = () => setCarouselState((prev) => ({ ...prev, isAutoRotating: !prev.isAutoRotating }));

  const handleGameClick = (fixture: FeaturedFixtureWithImportance) => {
    onGameSelect?.(fixture);
  };

  const handleViewStats = (fixtureId: string) => {
    onViewStats?.(fixtureId);
  };

  return (
    <div className={`featured-games-carousel ${className}`}>
      <div className="carousel-controls">
        <button onClick={scrollLeft} disabled={!carouselState.canScrollLeft}>
          ‹
        </button>
        <button onClick={scrollRight} disabled={!carouselState.canScrollRight}>
          ›
        </button>
        <button onClick={toggleAutoRotate}>
          {carouselState.isAutoRotating ? 'Pause' : 'Play'}
        </button>
      </div>

      <div className="carousel-container" ref={carouselRef}>
        {featuredGames.map((game, index) => (
          <div
            key={game.id}
            className={`game-card ${index === carouselState.currentIndex ? 'active' : ''}`}
            onClick={() => handleGameClick(game)}
          >
            <div className="teams">
              <span>{game.homeTeam.name}</span> vs <span>{game.awayTeam.name}</span>
            </div>
            <div className="info">
              {game.isBigMatch && <span className="big-match">Big Match</span>}
              <button onClick={() => handleViewStats(game.id)}>View Stats</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
