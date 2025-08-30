import React from 'react';
import type { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import './OptimizedFeaturedGamesCarousel.css';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  onViewStats?: (fixtureId: string) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  onViewStats,
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
    scrollToIndex,
    setCurrentIndex,
    realCount,
  } = useFeaturedGamesCarousel({ fixtures, autoRotate, rotateInterval });

  return (
    <div className={`carousel-container ${className}`}>
      <div className="carousel-wrapper" ref={containerRef}>
        {slides.map((fixture, index) => (
          <div key={index} className="carousel-slide">
            <div className="fixture-card" onClick={() => onGameSelect?.(fixture)}>
              <h4>{fixture.homeTeam} vs {fixture.awayTeam}</h4>
              <p>{fixture.kickoff ?? 'TBD'}</p>
              <button onClick={() => onViewStats?.(fixture.id)}>View Stats</button>
            </div>
          </div>
        ))}
      </div>

      {/* Dots */}
      <div className="carousel-dots">
        {fixtures.map((_, dotIndex) => (
          <button
            key={dotIndex}
            className={`dot ${currentIndex === dotIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(dotIndex)}
          />
        ))}
      </div>

      {/* Optional navigation */}
      <button className="carousel-nav prev" onClick={goToPrev}>‹</button>
      <button className="carousel-nav next" onClick={goToNext}>›</button>
    </div>
  );
};
