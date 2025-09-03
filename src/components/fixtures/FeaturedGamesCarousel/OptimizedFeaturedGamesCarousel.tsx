import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo } from '../../../utils/teamUtils';
import { useFixtures } from '../../../hooks/useFixtures';
import clsx from 'clsx';

interface Props {
  fixtures?: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  onGameSelect,
  autoRotate = true,
  rotateInterval = 5000,
  className = '',
}) => {
  const { featuredFixtures, loading, error } = useFixtures();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [cardWidth, setCardWidth] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);

  const cardsPerSlide = isMobile ? 1 : 2;
  const gap = 16;

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const calculateCardWidth = () => {
      const containerWidth = containerRef.current?.clientWidth || window.innerWidth;
      const width = (containerWidth - gap * (cardsPerSlide - 1)) / cardsPerSlide;
      setCardWidth(width);
    };
    calculateCardWidth();
    window.addEventListener('resize', calculateCardWidth);
    return () => window.removeEventListener('resize', calculateCardWidth);
  }, [isMobile, featuredFixtures.length]);

  // Create cloned slides for looping
  const clonedStart = featuredFixtures.slice(-cardsPerSlide);
  const clonedEnd = featuredFixtures.slice(0, cardsPerSlide);
  const slides = [...clonedStart, ...featuredFixtures, ...clonedEnd];
  const totalSlides = featuredFixtures.length;

  const slideWidth = cardWidth + gap;

  // Go to slide (with smooth scroll)
  const goToSlide = useCallback(
    (index: number, smooth = true) => {
      if (!containerRef.current) return;
      const scrollLeft = (index + cardsPerSlide) * slideWidth;
      containerRef.current.scrollTo({
        left: scrollLeft,
        behavior: smooth ? 'smooth' : 'auto',
      });
      setCurrentSlide((index + totalSlides) % totalSlides); // keep dots synced
    },
    [cardsPerSlide, slideWidth, totalSlides]
  );

  const goToNext = useCallback(() => goToSlide(currentSlide + 1), [currentSlide, goToSlide]);
  const goToPrev = useCallback(() => goToSlide(currentSlide - 1), [currentSlide, goToSlide]);

  // Auto rotate
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      if (!isPaused) goToNext();
    }, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval]);

  // Infinite loop scroll fix
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const handleTransitionEnd = () => {
      if (currentSlide < 0) {
        container.scrollLeft = totalSlides * slideWidth;
      } else if (currentSlide >= totalSlides) {
        container.scrollLeft = 0;
      }
    };

    container.addEventListener('scroll', handleTransitionEnd);
    return () => container.removeEventListener('scroll', handleTransitionEnd);
  }, [currentSlide, slideWidth, totalSlides]);

  // Touch swipe
  const touchStartRef = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => (touchStartRef.current = e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const distance = touchStartRef.current - e.changedTouches[0].clientX;
    if (distance > 30) goToNext();
    if (distance < -30) goToPrev();
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  if (loading)
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  if (error)
    return (
      <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
        Error loading fixtures: {error}
      </div>
    );
  if (featuredFixtures.length === 0)
    return (
      <div className="text-gray-600 text-center p-8 bg-gray-50 rounded-lg">
        No Featured Games Available
      </div>
    );

  return (
    <div
      className={clsx('relative group', className)}
      role="region"
      aria-label="Featured Games Carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Scroll container */}
      <div
        ref={containerRef}
        className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory hide-scrollbar px-12"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((fixture, idx) => {
          const homeLogo = getTeamLogo(fixture.homeTeam);
          const awayLogo = getTeamLogo(fixture.awayTeam);
          const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

          return (
            <div
              key={idx}
              style={{ flex: `0 0 ${cardWidth}px` }}
              className="flex-shrink-0 snap-start"
              onClick={() => onGameSelect?.(fixture)}
              tabIndex={0}
              role="group"
              aria-roledescription="slide"
              aria-label={`Match ${idx + 1} of ${featuredFixtures.length}`}
            >
              <div className="fixture-card card-hover overflow-hidden">
                <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                  {competitionLogo && (
                    <img
                      src={competitionLogo}
                      alt={fixture.competition.name}
                      className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
                    />
                  )}
                  <div className="text-xs sm:text-sm font-semibold text-purple-600 bg-white px-2 py-1 rounded-full">
                    Week {fixture.matchWeek}
                  </div>
                </div>

                <div className="flex items-center justify-between px-4 py-4">
                  <div className="flex flex-col items-center">
                    <img src={homeLogo.logoPath || ''} alt={homeLogo.displayName} className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                    <span className="text-sm font-semibold text-gray-800 mt-2">{homeLogo.displayName}</span>
                  </div>

                  <div className="flex flex-col items-center justify-center text-center mx-4">
                    <span className="text-sm font-semibold text-gray-900">
                      {new Date(fixture.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    <span className="text-sm font-medium text-gray-700 mt-1">
                      {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <img src={awayLogo.logoPath || ''} alt={awayLogo.displayName} className="w-16 h-16 sm:w-20 sm:h-20 object-contain" />
                    <span className="text-sm font-semibold text-gray-800 mt-2">{awayLogo.displayName}</span>
                  </div>
                </div>

                <div className="mt-2 px-4 py-2 text-center text-sm font-medium text-gray-700 bg-gray-100 rounded-b-lg">
                  {fixture.venue?.trim() || 'TBD'}
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
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white p-3 rounded-full shadow-md hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-600 border border-gray-200 z-10"
            onClick={goToPrev}
            aria-label="Previous slide"
          >
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white p-3 rounded-full shadow-md hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-600 border border-gray-200 z-10"
            onClick={goToNext}
            aria-label="Next slide"
          >
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {totalSlides > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {featuredFixtures.map((_, idx) => (
            <button
              key={idx}
              className={clsx(
                'w-2 h-2 rounded-full transition-all duration-300',
                currentSlide === idx ? 'bg-purple-600 w-4 h-4' : 'bg-gray-300 hover:bg-gray-400'
              )}
              onClick={() => goToSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
