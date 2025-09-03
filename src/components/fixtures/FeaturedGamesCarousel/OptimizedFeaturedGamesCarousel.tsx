import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
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
  const { featuredFixtures, loading, error } = useFixtures();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // --- Update isMobile on resize ---
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Determine cards per slide ---
  const cardsPerSlide = isMobile ? 1 : Math.min(4, Math.max(2, Math.floor(window.innerWidth / 320)));

  // --- Group cards into slides ---
  const slides = useMemo(() => {
    if (isMobile) return featuredFixtures.map(f => [f]);
    const grouped: FeaturedFixtureWithImportance[][] = [];
    for (let i = 0; i < featuredFixtures.length; i += cardsPerSlide) {
      grouped.push(featuredFixtures.slice(i, i + cardsPerSlide));
    }
    return grouped;
  }, [featuredFixtures, cardsPerSlide, isMobile]);

  const totalSlides = slides.length;

  // --- Scroll to current slide ---
  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!containerRef.current) return;
      const container = containerRef.current;
      const slideWidth = container.clientWidth;
      container.scrollTo({
        left: index * slideWidth,
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    []
  );

  // --- Navigation ---
  const goToNext = useCallback(() => setCurrentIndex(prev => (prev + 1) % totalSlides), [totalSlides]);
  const goToPrev = useCallback(() => setCurrentIndex(prev => (prev - 1 + totalSlides) % totalSlides), [totalSlides]);

  // --- Auto-rotate ---
  useEffect(() => {
    if (!autoRotate) return;
    const interval = setInterval(() => {
      if (!isPaused) goToNext();
    }, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval]);

  // --- Sync scroll ---
  useEffect(() => scrollToIndex(currentIndex), [currentIndex, scrollToIndex]);

  // --- Touch swipe ---
  const touchStartRef = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => (touchStartRef.current = e.targetTouches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    const distance = touchStartRef.current - e.changedTouches[0].clientX;
    if (distance > 30) goToNext();
    if (distance < -30) goToPrev();
  };

  // --- Keyboard navigation ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  // --- Early returns ---
  if (loading) return <div className="flex justify-center items-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" /></div>;
  if (error) return <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">Error loading fixtures: {error}</div>;
  if (featuredFixtures.length === 0) return <div className="text-gray-600 text-center p-8 bg-gray-50 rounded-lg">No Featured Games Available</div>;

  // --- Card width ---
  const cardWidth = isMobile ? '100%' : `${100 / cardsPerSlide}%`;

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
        className="flex overflow-x-hidden scroll-smooth snap-x snap-mandatory"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((slideGroup, idx) => (
          <div
            key={idx}
            className="flex gap-4 flex-shrink-0 w-full snap-start"
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${idx + 1} of ${totalSlides}`}
          >
            {slideGroup.map((fixture, i) => {
              const homeLogo = getTeamLogo(fixture.homeTeam);
              const awayLogo = getTeamLogo(fixture.awayTeam);
              const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

              return (
                <div
                  key={i}
                  className="cursor-pointer"
                  onClick={() => onGameSelect?.(fixture)}
                  style={{ minWidth: cardWidth }}
                  tabIndex={0}
                >
                  <div className="fixture-card card hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.05] overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
                      {competitionLogo && <img src={competitionLogo} alt={fixture.competition.name} className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />}
                      <div className="text-xs sm:text-sm font-semibold text-purple-600 bg-white px-2 py-1 rounded-full">
                        Week {fixture.matchWeek}
                      </div>
                    </div>
                    <div className="p-4 sm:p-6 flex flex-col items-center">
                      {/* Home Team */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 bg-white rounded-full shadow-md flex items-center justify-center ring-2 ring-gray-100">
                        <img src={homeLogo.logoPath || ''} alt={homeLogo.displayName} className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-center text-gray-800 leading-tight">{homeLogo.displayName}</span>

                      {/* Away Team */}
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mt-4 mb-3 bg-white rounded-full shadow-md flex items-center justify-center ring-2 ring-gray-100">
                        <img src={awayLogo.logoPath || ''} alt={awayLogo.displayName} className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-center text-gray-800 leading-tight">{awayLogo.displayName}</span>

                      {/* Date */}
                      <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-3 py-2 rounded-lg text-center border border-purple-200 mt-3">
                        <div className="text-sm sm:text-base font-bold text-gray-900">
                          {new Date(fixture.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-sm sm:text-base font-semibold text-gray-800 mt-1">
                          {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>

                      {/* Venue */}
                      <div className="mt-4 pt-3 border-t border-gray-100 text-center">
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
        ))}
      </div>

      {/* Arrows */}
      {totalSlides > 1 && (
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
      {totalSlides > 1 && (
        <div className="flex justify-center mt-4 space-x-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              className={clsx('w-2 h-2 rounded-full transition-all duration-300', idx === currentIndex ? 'bg-purple-600 w-4 h-4' : 'bg-gray-300 hover:bg-gray-400')}
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
