import React from 'react';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import type { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  className?: string;
  autoRotate?: boolean;
  rotateInterval?: number;
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  className = '',
  autoRotate = true,
  rotateInterval = 5000,
}) => {
  const { containerRef, slides, currentIndex, goToIndex } = useFeaturedGamesCarousel({
    fixtures,
    autoRotate,
    rotateInterval,
  });

  return (
    <div className={`featured-games-carousel ${className}`}>
      <div ref={containerRef} className="carousel-container" style={{ display: 'flex', overflowX: 'scroll' }}>
        {slides.map((fixture, idx) => (
          <div
            key={`${fixture.homeTeam.id}-${fixture.awayTeam.id}-${idx}`}
            className="carousel-slide"
            style={{ flex: '0 0 100%' }}
            onClick={() => onGameSelect?.(fixture)}
          >
            <div>{fixture.homeTeam.name} vs {fixture.awayTeam.name}</div>
            <div>{fixture.matchWeek ? `Week ${fixture.matchWeek}` : 'TBD'}</div>
          </div>
        ))}
      </div>

      <div className="carousel-dots" style={{ textAlign: 'center', marginTop: '8px' }}>
        {fixtures.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goToIndex(idx)}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              margin: '0 4px',
              background: idx === currentIndex ? '#000' : '#ccc',
              border: 'none',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  );
};
