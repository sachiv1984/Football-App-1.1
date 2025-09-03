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

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  onGameSelect,
  autoRotate = true,
  rotateInterval = 5000,
  className = '',
}) => {
  // --- Hooks always first ---
  const { featuredFixtures, loading, error } = useFixtures();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  const realCount = featuredFixtures.length;

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const cardWidth = isMobile ? window.innerWidth : 320;

  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!containerRef.current) return;
      containerRef.current.scrollTo({
        left: index * cardWidth,
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    [cardWidth]
  );

  const goToNext = useCallback(() => setCurrentIndex(prev => prev + 1), []);
  const goToPrev = useCallback(() => setCurrentIndex(prev => prev - 1), []);

  // Auto-rotate
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      if (!isPaused) goToNext();
    }, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval]);

  // Infinite loop effect
  useEffect(() => {
    if (!containerRef.current || realCount === 0) return;
    const container = containerRef.current;
    const maxIndex = realCount * 2 - 1;

    scrollToIndex(currentIndex);

    if (currentIndex > maxIndex - 1) {
      setTimeout(() => {
        container.scrollLeft -= realCount * cardWidth;
        setCurrentIndex(prev => prev - realCount);
      }, 300);
    }

    if (currentIndex < 0) {
      setTimeout(() => {
        container.scrollLeft += realCount * cardWidth;
        setCurrentIndex(prev => prev + realCount);
      }, 300);
    }
  }, [currentIndex, cardWidth, realCount, scrollToIndex]);

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    const distance = touchStart - touchEnd;
    if (distance > 30) goToNext();
    if (distance < -30) goToPrev();
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setIsPaused(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  // --- Early returns AFTER hooks ---
  if (loading)
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );

  if (error)
    return (
      <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
        Error loading fixtures: {error}
      </div>
    );

  if (realCount === 0)
    return <div className="text-gray-600 text-center p-8 bg-gray-50 rounded-lg">No Featured Games Available</div>;

  const slides = [...featuredFixtures, ...featuredFixtures]; // duplicate for infinite loop
  const totalSlides = slides.length;

  return (
    <div
      className={clsx('relative overflow-hidden group', className)}
      role="region"
      aria-label="Featured Games Carousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        ref={containerRef}
        className="flex overflow-x-auto scroll-smooth hide-scrollbar snap-x snap-mandatory"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((fixture, idx) => {
          const homeLogo = getTeamLogo(fixture.homeTeam);
          const awayLogo = getTeamLogo(fixture.awayTeam);
          const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

          return (
            <div
              key={idx}
              className="snap-start flex-shrink-0 w-[300px] sm:w-[320px] md:w-[320px] p-3 cursor-pointer"
              onClick={() => onGameSelect?.(fixture)}
              role="group"
              aria-roledescription="slide"
              aria-label={`Match ${idx + 1} of ${totalSlides}`}
              tabIndex={0}
            >
              <div className="fixture-card card hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.05] overflow-hidden">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
                  {competitionLogo && <img src={competitionLogo} alt={fixture.competition.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />}
                  <div className="text-xs sm:text-sm font-semibold text-purple-600 bg-white px-2 py-1 rounded-full">Week {fixture.matchWeek}</div>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    {/* Home team */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 bg-white rounded-full shadow-md flex items-center justify-center ring-2 ring-gray-100">
                        <img src={homeLogo.logoPath || ''} alt={homeLogo.displayName} className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-center text-gray-800 leading-tight">{homeLogo.displayName}</span>
                    </div>

                    {/* VS + Date */}
                    <div className="flex flex-col items-center mx-4 min-w-[80px]">
                      <span className="text-xl sm:text-2xl font-bold text-purple-600 mb-2">VS</span>
                      <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-3 py-2 rounded-lg text-center border border-purple-200">
                        <div className="text-sm sm:text-base font-bold text-gray-900">{new Date(fixture.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</div>
                        <div className="text-sm sm:text-base font-semibold text-gray-800 mt-1">{new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>

                    {/* Away team */}
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 bg-white rounded-full shadow-md flex items-center justify-center ring-2 ring-gray-100">
                        <img src={awayLogo.logoPath || ''} alt={awayLogo.displayName} className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-center text-gray-800 leading-tight">{awayLogo.displayName}</span>
                    </div>
                  </div>

                  {/* Venue */}
                  <div className="flex justify-center mt-4 pt-3 border-t border-gray-100">
                    <div className="inline-block px-2 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm font-semibold">
                      {fixture.venue?.trim() || 'TBD'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      {realCount > 1 && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-3 rounded-full shadow-md hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-600 border border-gray-200"
            onClick={goToPrev}
            aria-label="Previous slide"
          >
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-3 rounded-full shadow-md hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-purple-600 border border-gray-200"
            onClick={goToNext}
            aria-label="Next slide"
          >
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </>
      )}

      {/* Pagination dots */}
      {realCount > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {featuredFixtures.map((_, idx) => (
            <button
              key={idx}
              className={clsx(
                'w-2 h-2 rounded-full transition-all duration-300',
                idx === (currentIndex % realCount) ? 'bg-purple-600 w-4 h-4' : 'bg-gray-300 hover:bg-gray-400'
              )}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              tabIndex={0}
            />
          ))}
        </div>
      )}
    </div>
  );
};
