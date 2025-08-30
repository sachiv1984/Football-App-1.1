import React, { useEffect } from 'react';
import { FeaturedFixtureWithImportance, FeaturedGamesCarouselProps } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';

export const OptimizedFeaturedGamesCarousel: React.FC<FeaturedGamesCarouselProps> = ({
  fixtures = [],
  autoRotate = true,
  rotateInterval = 5000,
  className = '',
  onGameSelect,
}) => {
  const {
    containerRef,
    slides,
    currentIndex,
    goToNext,
    goToPrev,
    scrollToIndex,
    setCurrentIndex,
  } = useFeaturedGamesCarousel({
    fixtures,
    autoRotate,
    rotateInterval,
  });

  // Reset to real first/last slide without animation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const slideWidth = container.clientWidth;
      if (currentIndex >= fixtures.length) {
        container.scrollLeft = slideWidth;
        setCurrentIndex(0);
      } else if (currentIndex < 0) {
        container.scrollLeft = slideWidth * fixtures.length;
        setCurrentIndex(fixtures.length - 1);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, containerRef, fixtures.length, setCurrentIndex]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Carousel container */}
      <div
        ref={containerRef}
        className="flex overflow-x-hidden scroll-smooth touch-pan-x"
        style={{ scrollSnapType: 'x mandatory' }}
      >
        {slides.map((fixture: FeaturedFixtureWithImportance, index: number) => (
          <div
            key={`${fixture.homeTeam.id}-${fixture.awayTeam.id}-${index}`}
            className="flex-shrink-0 w-full p-4 scroll-snap-start"
            onClick={() => onGameSelect?.(fixture)}
          >
            <div className="fixture-card flex flex-col sm:flex-row items-center bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300">
              {/* Teams */}
              <div className="flex items-center space-x-4 mb-2 sm:mb-0">
                <img
                  src={fixture.homeTeam.logo}
                  alt={fixture.homeTeam.name}
                  className="team-logo-lg"
                />
                <span className="font-bold text-xl sm:text-2xl">{fixture.homeTeam.name}</span>
                <span className="mx-2 text-gray-500">vs</span>
                <span className="font-bold text-xl sm:text-2xl">{fixture.awayTeam.name}</span>
                <img
                  src={fixture.awayTeam.logo}
                  alt={fixture.awayTeam.name}
                  className="team-logo-lg"
                />
              </div>

              {/* Score & info */}
              <div className="ml-auto text-center sm:text-right mt-2 sm:mt-0">
                {fixture.score ? (
                  <div className="match-score">
                    {fixture.score.home} - {fixture.score.away}
                  </div>
                ) : (
                  <div className="text-gray-500">{fixture.kickoff}</div>
                )}
                <div className="text-sm text-gray-400 mt-1">Week {fixture.matchWeek}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <button
        onClick={goToPrev}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow hover:bg-gray-100"
      >
        ◀
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white p-2 rounded-full shadow hover:bg-gray-100"
      >
        ▶
      </button>
    </div>
  );
};
