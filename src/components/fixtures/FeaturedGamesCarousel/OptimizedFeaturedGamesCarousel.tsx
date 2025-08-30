import React from 'react';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import type { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import './OptimizedFeaturedGamesCarousel.css';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({ fixtures, onGameSelect }) => {
  const {
    containerRef,
    slides,
    currentIndex,
    goToNext,
    goToPrev,
    goToIndex,
  } = useFeaturedGamesCarousel({ fixtures, autoRotate: true });

  return (
    <div className="carousel-wrapper">
      <div className="carousel-container" ref={containerRef}>
        {slides.map((fixture, idx) => (
          <div key={fixture.id + idx} className="carousel-slide">
            <div
              className="fixture-card"
              onClick={() => onGameSelect?.(fixture)}
            >
              <div>
                <h3>{fixture.homeTeam} vs {fixture.awayTeam}</h3>
                {/* Replace fixture.date with the correct property from FeaturedFixture */}
                <p>{fixture.kickoff || 'TBD'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="carousel-dots">
        {fixtures.map((_, idx) => (
          <button
            key={idx}
            className={`dot ${currentIndex === idx ? 'active' : ''}`}
            onClick={() => goToIndex(idx)}
          />
        ))}
      </div>

      <button className="carousel-arrow prev" onClick={goToPrev}>{'<'}</button>
      <button className="carousel-arrow next" onClick={goToNext}>{'>'}</button>
    </div>
  );
};
