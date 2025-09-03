import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo } from '../../../utils/teamUtils';
import { useFixtures } from '../../../hooks/useFixtures';
import clsx from 'clsx';

interface Props {
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  onGameSelect,
  className = '',
}) => {
  const { featuredFixtures, loading, error } = useFixtures();
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const totalSlides = featuredFixtures.length;
  const canGoPrev = currentSlide > 0;
  const canGoNext = currentSlide < totalSlides - 1;

  // Navigation functions
  const goToSlide = useCallback((index: number) => {
    if (index < 0 || index >= totalSlides || isTransitioning) return;
    
    setIsTransitioning(true);
    setCurrentSlide(index);
    
    if (trackRef.current) {
      trackRef.current.style.setProperty('--carousel-offset', `-${index * 100}%`);
    }

    // Reset transition state after animation completes
    setTimeout(() => setIsTransitioning(false), 400);
  }, [totalSlides, isTransitioning]);

  const goToNext = useCallback(() => {
    if (canGoNext) goToSlide(currentSlide + 1);
  }, [currentSlide, canGoNext, goToSlide]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) goToSlide(currentSlide - 1);
  }, [currentSlide, canGoPrev, goToSlide]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  // Touch/swipe handling
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const threshold = 50;

    if (distance > threshold && canGoNext) {
      goToNext();
    } else if (distance < -threshold && canGoPrev) {
      goToPrev();
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Loading state
  if (loading) {
    return (
      <div className="carousel-apple">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-300 border-t-gray-800"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="carousel-apple">
        <div className="text-red-600 text-center py-20 px-6">
          <p className="text-lg font-medium">Error loading fixtures</p>
          <p className="text-sm mt-2 opacity-75">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (totalSlides === 0) {
    return (
      <div className="carousel-apple">
        <div className="text-gray-600 text-center py-20 px-6">
          <p className="text-lg font-medium">No Featured Games Available</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={clsx('carousel-apple', className)}
      role="region"
      aria-label="Featured Games Carousel"
    >
      {/* Main carousel container */}
      <div 
        className="carousel-container relative"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Carousel track */}
        <div ref={trackRef} className="carousel-track">
          {featuredFixtures.map((fixture, index) => {
            const homeLogo = getTeamLogo(fixture.homeTeam);
            const awayLogo = getTeamLogo(fixture.awayTeam);
            const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

            return (
              <div 
                key={fixture.id || index} 
                className="carousel-slide"
                aria-hidden={currentSlide !== index}
              >
                <div 
                  className="p-6 cursor-pointer"
                  onClick={() => onGameSelect?.(fixture)}
                  tabIndex={currentSlide === index ? 0 : -1}
                  role="button"
                  aria-label={`View match between ${homeLogo.displayName} and ${awayLogo.displayName}`}
                >
                  {/* Competition header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                    {competitionLogo && (
                      <img
                        src={competitionLogo}
                        alt={fixture.competition.name}
                        className="w-12 h-12 object-contain"
                      />
                    )}
                    <div className="bg-gray-100 px-3 py-1 rounded-full">
                      <span className="text-sm font-medium text-gray-700">
                        Week {fixture.matchWeek}
                      </span>
                    </div>
                  </div>

                  {/* Teams and match info */}
                  <div className="flex items-center justify-between">
                    {/* Home team */}
                    <div className="flex flex-col items-center flex-1">
                      <img 
                        src={homeLogo.logoPath || ''} 
                        alt={homeLogo.displayName} 
                        className="w-20 h-20 object-contain mb-3"
                      />
                      <span className="text-base font-semibold text-gray-900 text-center">
                        {homeLogo.displayName}
                      </span>
                    </div>

                    {/* Match details */}
                    <div className="flex flex-col items-center px-6 flex-1">
                      <div className="text-center mb-2">
                        <div className="text-lg font-semibold text-gray-900">
                          {new Date(fixture.dateTime).toLocaleDateString('en-GB', { 
                            day: 'numeric', 
                            month: 'short' 
                          })}
                        </div>
                        <div className="text-base text-gray-600 mt-1">
                          {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Away team */}
                    <div className="flex flex-col items-center flex-1">
                      <img 
                        src={awayLogo.logoPath || ''} 
                        alt={awayLogo.displayName} 
                        className="w-20 h-20 object-contain mb-3"
                      />
                      <span className="text-base font-semibold text-gray-900 text-center">
                        {awayLogo.displayName}
                      </span>
                    </div>
                  </div>

                  {/* Venue */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <div className="text-center text-sm font-medium text-gray-600">
                      📍 {fixture.venue?.trim() || 'TBD'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Navigation arrows - only show if more than 1 slide */}
        {totalSlides > 1 && (
          <>
            <button
              className={clsx('carousel-arrow carousel-arrow-left', {
                'opacity-30 cursor-not-allowed': !canGoPrev
              })}
              onClick={goToPrev}
              disabled={!canGoPrev}
              aria-label="Previous slide"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              className={clsx('carousel-arrow carousel-arrow-right', {
                'opacity-30 cursor-not-allowed': !canGoNext
              })}
              onClick={goToNext}
              disabled={!canGoNext}
              aria-label="Next slide"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Dot navigation - only show if more than 1 slide */}
      {totalSlides > 1 && (
        <div className="carousel-dots">
          {featuredFixtures.map((_, index) => (
            <button
              key={index}
              className={clsx('carousel-dot', {
                active: currentSlide === index
              })}
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
