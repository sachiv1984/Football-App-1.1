import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo } from '../../../utils/teamUtils';
import clsx from 'clsx';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({ fixtures, onGameSelect, className = '' }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const totalSlides = fixtures.length;
  const canGoPrev = currentSlide > 0;
  const canGoNext = currentSlide < totalSlides - 1;

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSlides || isTransitioning) return;
      setIsTransitioning(true);
      setCurrentSlide(index);
      if (trackRef.current) {
        trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      }
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [totalSlides, isTransitioning]
  );

  const goToNext = useCallback(() => {
    if (canGoNext) goToSlide(currentSlide + 1);
  }, [canGoNext, currentSlide, goToSlide]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) goToSlide(currentSlide - 1);
  }, [canGoPrev, currentSlide, goToSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  const handleTouchStart = (e: React.TouchEvent) => (touchStartX.current = e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => (touchEndX.current = e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (distance > threshold && canGoNext) goToNext();
    else if (distance < -threshold && canGoPrev) goToPrev();
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (totalSlides === 0) {
    return (
      <div className="text-gray-600 text-center py-20 px-6">
        <p className="text-lg font-medium">No Featured Games Available</p>
      </div>
    );
  }

  return (
    <div className={clsx('carousel-apple', className)} role="region" aria-label="Featured Games Carousel">
      <div
        className="carousel-container w-full relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          className="carousel-track flex transition-transform duration-400 ease-in-out"
          style={{ width: `${totalSlides * 100}%` }}
        >
          {fixtures.map((fixture, index) => {
            const homeLogo = getTeamLogo(fixture.homeTeam);
            const awayLogo = getTeamLogo(fixture.awayTeam);
            const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

            return (
              <div key={fixture.id || index} className="carousel-slide flex-shrink-0 w-full" aria-hidden={currentSlide !== index}>
                <div
                  className="carousel-card p-6 md:p-8 flex flex-col items-center justify-center cursor-pointer"
                  style={{ maxWidth: '500px', margin: '0 auto' }}
                  onClick={() => onGameSelect?.(fixture)}
                  tabIndex={currentSlide === index ? 0 : -1}
                  role="button"
                  aria-label={`View match between ${homeLogo.displayName} and ${awayLogo.displayName}`}
                >
                  {/* Competition header */}
                  <div className="flex flex-col md:flex-row items-center justify-between mb-6 pb-4 border-b border-gray-100 w-full">
                    {competitionLogo && (
                      <img
                        src={competitionLogo}
                        alt={fixture.competition.name}
                        className="w-12 h-12 object-contain mb-2 md:mb-0"
                      />
                    )}
                    <div className="bg-gray-100 px-3 py-1 rounded-full mt-2 md:mt-0">
                      <span className="text-sm font-medium text-gray-700">Week {fixture.matchWeek}</span>
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="flex flex-col md:flex-row items-center justify-between w-full">
                    <div className="flex flex-col items-center flex-1 mb-4 md:mb-0">
                      {homeLogo.logoPath && <img src={homeLogo.logoPath} alt={homeLogo.displayName} className="w-20 h-20 object-contain mb-3" />}
                      <span className="text-base font-semibold text-gray-900 text-center">{homeLogo.displayName}</span>
                    </div>

                    <div className="flex flex-col items-center px-6 flex-1 text-center mb-4 md:mb-0">
                      <div className="text-lg font-semibold text-gray-900">
                        {new Date(fixture.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </div>
                      <div className="text-base text-gray-600 mt-1">
                        {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <div className="flex flex-col items-center flex-1">
                      {awayLogo.logoPath && <img src={awayLogo.logoPath} alt={awayLogo.displayName} className="w-20 h-20 object-contain mb-3" />}
                      <span className="text-base font-semibold text-gray-900 text-center">{awayLogo.displayName}</span>
                    </div>
                  </div>

                  {/* Venue */}
                  <div className="mt-6 pt-4 border-t border-gray-100 w-full text-center text-sm font-medium text-gray-600">
                    📍 {fixture.venue?.trim() || 'TBD'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Arrows */}
        {totalSlides > 1 && (
          <>
            <button
              className={clsx('carousel-arrow carousel-arrow-left absolute top-1/2 -translate-y-1/2 left-2 z-10', {
                'opacity-30 cursor-not-allowed': !canGoPrev,
              })}
              onClick={goToPrev}
              disabled={!canGoPrev}
              aria-label="Previous slide"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              className={clsx('carousel-arrow carousel-arrow-right absolute top-1/2 -translate-y-1/2 right-2 z-10', {
                'opacity-30 cursor-not-allowed': !canGoNext,
              })}
              onClick={goToNext}
              disabled={!canGoNext}
              aria-label="Next slide"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {totalSlides > 1 && (
        <div className="carousel-dots">
          {fixtures.map((_, index) => (
            <button
              key={index}
              className={clsx('carousel-dot', { active: currentSlide === index })}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={currentSlide === index ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
