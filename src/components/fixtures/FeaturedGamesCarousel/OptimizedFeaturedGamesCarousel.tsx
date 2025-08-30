import React from 'react';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import type { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  autoRotate = true,
  rotateInterval = 5000,
  className,
}) => {
  const {
    containerRef,
    slides,
    currentIndex,
    goToNext,
    goToPrev,
    setCurrentIndex,
  } = useFeaturedGamesCarousel({ fixtures, autoRotate, rotateInterval });

  return (
    <div className={className}>
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
            key={`${fixture.id}-${idx}`}
            style={{
              flex: '0 0 100%',
              scrollSnapAlign: 'start',
            }}
            onClick={() => onGameSelect?.(fixture)}
          >
            <div>
              <h4>{fixture.homeTeam} vs {fixture.awayTeam}</h4>
              <p>{fixture.kickoff}</p>
            </div>
          </div>
        ))}
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
            onClick={() => setCurrentIndex(idx)}
          />
        ))}
      </div>

      {/* Navigation */}
      <button onClick={goToPrev}>Prev</button>
      <button onClick={goToNext}>Next</button>
    </div>
  );
};
