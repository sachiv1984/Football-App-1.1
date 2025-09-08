import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  className?: string;
  isLoading?: boolean;
}

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  className = '',
  isLoading = false,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [announceText, setAnnounceText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const totalSlides = fixtures.length;
  const maxIndex = Math.max(0, totalSlides - 1);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const announceSlideChange = useCallback(
    (index: number) => {
      const fixture = fixtures[index];
      if (fixture) {
        setAnnounceText(
          `Showing match ${index + 1} of ${totalSlides}: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`
        );
      }
    },
    [fixtures, totalSlides]
  );

  const goToNext = useCallback(() => {
    const newIndex = Math.min(currentIndex + 1, maxIndex);
    setCurrentIndex(newIndex);
    announceSlideChange(newIndex);
  }, [currentIndex, maxIndex, announceSlideChange]);

  const goToPrev = useCallback(() => {
    const newIndex = Math.max(currentIndex - 1, 0);
    setCurrentIndex(newIndex);
    announceSlideChange(newIndex);
  }, [currentIndex, announceSlideChange]);

  const goToFirst = useCallback(() => {
    setCurrentIndex(0);
    announceSlideChange(0);
  }, [announceSlideChange]);

  const goToLast = useCallback(() => {
    setCurrentIndex(maxIndex);
    announceSlideChange(maxIndex);
  }, [maxIndex, announceSlideChange]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) return;
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          goToPrev();
          break;
        case 'ArrowRight':
          event.preventDefault();
          goToNext();
          break;
        case 'Home':
          event.preventDefault();
          goToFirst();
          break;
        case 'End':
          event.preventDefault();
          goToLast();
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, goToFirst, goToLast]);

  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goToNext();
    else if (distance < -minSwipeDistance) goToPrev();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-6">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="bg-gray-200 animate-pulse rounded-xl p-6" />
        ))}
      </div>
    );
  }

  if (totalSlides === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="mb-6">
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="mx-auto opacity-80 text-gray-400"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-700 mb-4">
          Check back later for featured games
        </p>
      </div>
    );
  }

  const showNavigation = totalSlides > 1;

  return (
    <div
      ref={containerRef}
      className={`w-full transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${className}`}
      role="region"
      aria-label="Featured Games Carousel"
      tabIndex={0}
    >
      <div className="relative">
        {showNavigation && (
          <>
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-gold"
              style={{ 
                width: '48px', 
                height: '48px',
                transform: 'translateX(-100%) translateY(-50%)', // Move completely left of container
                left: '10px'
              }}
              aria-label="Previous games"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-600"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              onClick={goToNext}
              disabled={currentIndex === maxIndex}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-white shadow-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-gold"
              style={{ 
                width: '48px', 
                height: '48px',
                transform: 'translateX(100%) translateY(-50%)', // Move completely right of container
                right: '10px'
              }}
              aria-label="Next games"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="text-gray-600"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        {/* Carousel */}
        <div className="overflow-hidden py-6">
          <div
            ref={trackRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="flex"
            style={{
              // Move the track so current card is centered
              // Each card + gap = 340px (300px card + 40px gap)
              // Center offset = 50% - 150px (half card width)
              transform: `translateX(calc(50% - 150px - ${currentIndex * 340}px))`,
              transition: prefersReducedMotion ? 'none' : 'transform 0.5s ease-out',
              gap: '40px',
            }}
            role="list"
          >
            {fixtures.map((fixture, index) => {
              const isActive = index === currentIndex;

              return (
                <div
                  key={fixture.id || index}
                  className="flex-shrink-0 rounded-xl transition-all duration-300"
                  style={{
                    width: '300px',
                    minWidth: '300px',
                    border: isActive ? '3px solid #FFD700' : '1px solid #E5E7EB',
                    borderRadius: '16px',
                    boxShadow: isActive
                      ? '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
                      : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    overflow: 'hidden',
                    transform: isActive ? 'scale(1.05)' : 'scale(0.9)',
                    opacity: isActive ? 1 : 0.6,
                    zIndex: isActive ? 10 : 5,
                  }}
                  role="listitem"
                >
                  <button
                    className="carousel-card flex flex-col justify-between w-full h-full p-4 bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-gold transition-all duration-300"
                    aria-label={`View match between ${fixture.homeTeam.name} and ${fixture.awayTeam.name}`}
                    onClick={() => onGameSelect?.(fixture)}
                    draggable={false}
                  >
                    {/* Competition & Week */}
                    <div className="flex justify-between items-center mb-4 w-full">
                      {/* Competition Logo Left */}
                      <div className="flex items-center justify-start flex-1">
                        {fixture.competition.logo && (
                          <img
                            src={fixture.competition.logo}
                            alt={fixture.competition.name}
                            className="w-12 h-12 object-contain"
                            draggable={false}
                          />
                        )}
                      </div>

                      {/* Game Week Right */}
                      <div className="flex items-center justify-end flex-1">
                        <span className="text-xs text-gray-500 font-medium">
                          Week {fixture.matchWeek || 1}
                        </span>
                      </div>
                    </div>

                    {/* Teams & Time */}
                    <div className="flex justify-center items-center mb-4 w-full">
                      <div className="flex items-center justify-center gap-6 max-w-full">
                        {/* Home Team */}
                        <div className="flex flex-col items-center min-w-0 flex-1 max-w-[70px]">
                          {fixture.homeTeam.logo ? (
                            <img
                              src={fixture.homeTeam.logo}
                              alt={fixture.homeTeam.name}
                              className="w-16 h-16 object-contain mb-1"
                              draggable={false}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                              <span className="text-lg font-bold text-gray-600">
                                {fixture.homeTeam.name[0]}
                              </span>
                            </div>
                          )}
                          <span className="text-xs text-center truncate w-full">
                            {fixture.homeTeam.shortName || fixture.homeTeam.name}
                          </span>
                        </div>

                        {/* Time */}
                        <div className="flex flex-col items-center text-center min-w-[60px] flex-shrink-0">
                          <span className="text-gray-700 font-medium text-base whitespace-nowrap">
                            {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              hour12: false 
                            })}
                          </span>
                          <span className="text-xs text-gray-500 whitespace-nowrap">
                            {new Date(fixture.dateTime).toLocaleDateString('en-GB', { 
                              weekday: 'short', 
                              day: 'numeric', 
                              month: 'short' 
                            })}
                          </span>
                        </div>

                        {/* Away Team */}
                        <div className="flex flex-col items-center min-w-0 flex-1 max-w-[70px]">
                          {fixture.awayTeam.logo ? (
                            <img
                              src={fixture.awayTeam.logo}
                              alt={fixture.awayTeam.name}
                              className="w-16 h-16 object-contain mb-1"
                              draggable={false}
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                              <span className="text-lg font-bold text-gray-600">
                                {fixture.awayTeam.name[0]}
                              </span>
                            </div>
                            )}
                          <span className="text-xs text-center truncate w-full">
                            {fixture.awayTeam.shortName || fixture.awayTeam.name}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Venue & Badge */}
                    <div className="flex flex-col items-center w-full">
                      <div className="text-xs text-gray-500 truncate text-center w-full px-2">
                        {fixture.venue}
                      </div>
                      {fixture.importance >= 80 && (
                        <span className="mt-2 inline-block bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-[10px] sm:text-[12px] font-medium">
                          Featured
                        </span>
                      )}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination */}
        {showNavigation && (
          <div className="flex justify-center items-center mt-6 space-x-2 w-full" style={{ minHeight: '32px' }}>
            {Array.from({ length: totalSlides }, (_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  announceSlideChange(index);
                }}
                className="focus:outline-none"
                style={{
                  width: currentIndex === index ? '32px' : '12px',
                  height: '12px',
                  backgroundColor: currentIndex === index ? '#FFD700' : '#D1D5DB',
                  borderRadius: '9999px',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  margin: '0 4px',
                }}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={currentIndex === index ? 'true' : 'false'}
              />
            ))}
          </div>
        )}

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announceText}
        </div>

        <div className="sr-only">
          Use arrow keys to navigate between slides, Home key for first slide, End key for last slide. On touch devices, swipe left or right to navigate.
        </div>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;