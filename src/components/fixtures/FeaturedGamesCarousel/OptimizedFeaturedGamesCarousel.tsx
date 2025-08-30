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
  className = '',
}) => {
  const {
    containerRef,
    slides,
    currentIndex,
    goToNext,
    goToPrev,
    scrollToIndex,
  } = useFeaturedGamesCarousel({
    fixtures,
    autoRotate,
    rotateInterval,
  });

  const handleDotClick = (index: number) => {
    scrollToIndex(index);
  };

  return (
    <div className={`featured-games-carousel ${className}`}>
      <div className="carousel-container" ref={containerRef} style={{ display: 'flex', overflowX: 'hidden' }}>
        {slides.map((fixture, idx) => (
          <div
            key={`${fixture.id}-${idx}`}
            className="carousel-slide"
            style={{ minWidth: '100%', cursor: 'pointer' }}
            onClick={() => onGameSelect?.(fixture)}
          >
            <div className="fixture-details">
              <span>{fixture.homeTeam.name}</span> vs <span>{fixture.awayTeam.name}</span>
              <div>{fixture.date}</div> {/* replace with your kickoff property if needed */}
            </div>
          </div>
        ))}
      </div>

      {/* Dots navigation */}
      <div className="carousel-dots" style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
        {fixtures.map((_, idx) => (
          <button
            key={idx}
            className={`dot ${currentIndex % fixtures.length === idx ? 'active' : ''}`}
            onClick={() => handleDotClick(idx)}
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              margin: 4,
              border: 'none',
              backgroundColor: currentIndex % fixtures.length === idx ? '#000' : '#ccc',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  );
};
