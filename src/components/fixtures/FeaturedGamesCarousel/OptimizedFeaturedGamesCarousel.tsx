import React from 'react';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import type { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
}

export const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures,
  autoRotate = true,
  rotateInterval = 5000,
  className,
  onGameSelect,
}) => {
  const { containerRef, slides, currentIndex, realCount, goToNext, goToPrev, goToIndex } =
    useFeaturedGamesCarousel({ fixtures, autoRotate, rotateInterval });

  return (
    <div className={className}>
      {/* Carousel Container */}
      <div
        ref={containerRef}
        style={{
          display: 'flex',
          overflowX: 'hidden',
          scrollSnapType: 'x mandatory',
        }}
      >
        {slides.map((fixture, idx) => (
          <div
            key={idx}
            style={{
              minWidth: '100%',
              scrollSnapAlign: 'start',
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onClick={() => onGameSelect?.(fixture)}
          >
            <div style={{ textAlign: 'center' }}>
              <h4>
                {fixture.homeTeam} vs {fixture.awayTeam}
              </h4>
              <p>Importance: {fixture.importanceScore}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <button onClick={goToPrev}>Prev</button>
        <button onClick={goToNext}>Next</button>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        {fixtures.map((_, idx) => (
          <button
            key={idx}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              margin: '0 5px',
              background: idx === currentIndex ? '#000' : '#ccc',
              border: 'none',
            }}
            onClick={() => goToIndex(idx)}
          />
        ))}
      </div>
    </div>
  );
};
