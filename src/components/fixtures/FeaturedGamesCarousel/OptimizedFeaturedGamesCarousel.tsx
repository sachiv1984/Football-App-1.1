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
    scrollToIndex,
  } = useFeaturedGamesCarousel({
    fixtures,
    autoRotate,
    rotateInterval,
  });

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
        {slides.map((fixture, index) => (
          <div
            key={index}
            style={{
              flex: '0 0 100%',
              scrollSnapAlign: 'start',
            }}
            onClick={() => onGameSelect?.(fixture)}
          >
            {/* Render your fixture card here */}
            <div>{fixture.homeTeam.name} vs {fixture.awayTeam.name}</div>
            <div>{fixture.kickoff}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        {fixtures.map((_, dotIndex) => (
          <button
            key={dotIndex}
            onClick={() => scrollToIndex(dotIndex)}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              margin: '0 4px',
              background: dotIndex === currentIndex ? 'black' : 'gray',
              border: 'none',
              padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  );
};
