// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';

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
    realCount,
    goToNext,
    goToPrev,
  } = useFeaturedGamesCarousel({ fixtures, autoRotate, rotateInterval });

  return (
    <div className={`relative ${className}`}>
      {/* Carousel container */}
      <div
        ref={containerRef}
        className="flex overflow-x-hidden scroll-smooth"
      >
        {slides.map((fixture, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 w-full px-2"
            onClick={() => onGameSelect?.(fixture)}
          >
            <div className="fixture-card flex flex-col items-center p-4">
              {/* Team Logos and Names */}
              <div className="flex items-center justify-between w-full mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={fixture.homeTeam.logoUrl}
                    alt={fixture.homeTeam.name}
                    className="team-logo"
                  />
                  <span className="font-medium">{fixture.homeTeam.name}</span>
                </div>
                <span className="match-score">vs</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{fixture.awayTeam.name}</span>
                  <img
                    src={fixture.awayTeam.logoUrl}
                    alt={fixture.awayTeam.name}
                    className="team-logo"
                  />
                </div>
              </div>

              {/* Match info */}
              <div className="text-sm text-gray-500">
                Week {fixture.matchWeek} • {fixture.kickoff}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation buttons */}
      <button
        onClick={goToPrev}
        className="absolute left-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
      >
        ◀
      </button>
      <button
        onClick={goToNext}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-md hover:bg-gray-100"
      >
        ▶
      </button>

      {/* Progress bar */}
      <div className="absolute bottom-2 left-2 right-2 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-electric-yellow transition-all duration-500"
          style={{ width: `${((currentIndex % realCount) + 1) / realCount * 100}%` }}
        />
      </div>
    </div>
  );
};
