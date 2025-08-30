import React from 'react';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import type { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
}

export const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures,
  onGameSelect,
  autoRotate = true,
  rotateInterval = 5000,
  className = '',
}) => {
  const {
    containerRef,
    slides,
    currentIndex,
    goToNext,
    goToPrev,
    goToIndex,
  } = useFeaturedGamesCarousel({ fixtures, autoRotate, rotateInterval });

  const handleDotClick = (index: number) => {
    goToIndex(index);
  };

  return (
    <div className={`carousel-container ${className}`}>
      <div className="carousel-wrapper" ref={containerRef}>
        {slides.map((fixture, idx) => (
          <div
            key={`${fixture.id}-${idx}`}
            className="carousel-slide"
            onClick={() => onGameSelect?.(fixture)}
          >
            <div className="fixture-details">
              <span>{fixture.homeTeam}</span> vs <span>{fixture.awayTeam}</span>
              <div>{fixture.kickoff}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="carousel-dots">
        {fixtures.map((_, idx) => (
          <button
            key={idx}
            className={`dot ${currentIndex === idx ? 'active' : ''}`}
            onClick={() => handleDotClick(idx)}
          />
        ))}
      </div>

      {/* Optional controls */}
      <button className="carousel-prev" onClick={goToPrev}>
        ‹
      </button>
      <button className="carousel-next" onClick={goToNext}>
        ›
      </button>
    </div>
  );
};
