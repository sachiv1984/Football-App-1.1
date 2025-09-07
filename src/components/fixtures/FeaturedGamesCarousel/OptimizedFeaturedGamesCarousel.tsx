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
  const [cardsPerView, setCardsPerView] = useState(3);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [announceText, setAnnounceText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const totalSlides = fixtures.length;
  const maxIndex = Math.max(0, totalSlides - cardsPerView);

  // Reduced motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Visibility animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Announce slide change
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

  // Cards per view
  useEffect(() => {
    const calculateCardsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) return 1;
      if (width < 1024) return 2;
      return 3;
    };
    const updateCardsPerView = () => setCardsPerView(calculateCardsPerView());
    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  // Adjust current index if cards per view change
  useEffect(() => {
    const newMaxIndex = Math.max(0, totalSlides - cardsPerView);
    if (currentIndex > newMaxIndex) setCurrentIndex(newMaxIndex);
  }, [cardsPerView, totalSlides, currentIndex]);

  // Navigation callbacks
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

  // Keyboard navigation
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

  // Touch swipe
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
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
          <div key={idx} className="bg-gray-200 animate-pulse rounded-xl aspect-[4/3] p-6" />
        ))}
      </div>
    );
  }

  if (totalSlides === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="mb-6">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="mx-auto opacity-80 text-gray-400">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-700 mb-4">Check back later for featured games</p>
      </div>
    );
  }

  const showNavigation = totalSlides > cardsPerView;

  return (
    <div
      ref={containerRef}
      className={`w-full transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${className}`}
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
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-gold"
              style={{ width: '40px', height: '40px' }}
              aria-label="Previous games"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <button
              onClick={goToNext}
              disabled={currentIndex === maxIndex}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white shadow-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-gold"
              style={{ width: '40px', height: '40px' }}
              aria-label="Next games"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </>
        )}

        <div className="overflow-hidden px-6">
          <div
            ref={trackRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="flex select-none gap-4"
            style={{
              transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`,
              transition: prefersReducedMotion ? 'none' : 'transform 0.3s ease-out',
              touchAction: 'pan-y',
            }}
          >
            {fixtures.map((fixture, index) => {
              const isActive = index >= currentIndex && index < currentIndex + cardsPerView;

              return (
                <div
                  key={fixture.id || index}
                  className={`rounded-xl transition-colors duration-300 ${isActive ? 'border-2 border-focus-gold' : 'border border-gray-300'}`}
                  style={{ flex: `0 0 calc(${100 / cardsPerView}% - 0.75rem)` }} // subtract gap for proper fit
                >
                  <button
                    className="carousel-card flex flex-col items-center justify-center p-6 aspect-[4/3] w-full h-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-gold"
                    aria-label={`View match between ${fixture.homeTeam.name} and ${fixture.awayTeam.name} on ${new Date(fixture.dateTime).toLocaleDateString('en-GB')}`}
                    onClick={() => onGameSelect?.(fixture)}
                    draggable={false}
                  >
                    {/* Competition */}
                    <div className="flex items-center justify-center mb-4 space-x-4 w-full">
                      {fixture.competition.logo && (
                        <img src={fixture.competition.logo} alt={fixture.competition.name} className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain" />
                      )}
                      <span className="text-xs md:text-sm font-medium text-gray-500">Week {fixture.matchWeek || 1}</span>
                    </div>

                    {/* Teams and Time */}
<div className="flex items-center justify-between w-full flex-1">
  {/* Home Team */}
  <div className="flex flex-col items-center justify-center text-center">
    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-2">
      {fixture.homeTeam.logo ? (
        <img src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} className="w-16 h-16 object-contain" />
      ) : (
        <span className="text-gray-400 font-medium text-lg">{fixture.homeTeam.shortName?.[0] || fixture.homeTeam.name[0]}</span>
      )}
    </div>
    <div className="text-xs font-medium text-gray-700 truncate">{fixture.homeTeam.shortName || fixture.homeTeam.name}</div>
  </div>

  {/* Match Time */}
  <div className="flex flex-col items-center justify-center text-center px-4">
    <div className="flex items-center space-x-2 mb-2 text-gray-700 font-medium text-base">
      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
    </div>
    <div className="text-xs text-gray-500">
      {new Date(fixture.dateTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
    </div>
  </div>

  {/* Away Team */}
  <div className="flex flex-col items-center justify-center text-center">
    <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-2">
      {fixture.awayTeam.logo ? (
        <img src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} className="w-16 h-16 object-contain" />
      ) : (
        <span className="text-gray-400 font-medium text-lg">{fixture.awayTeam.shortName?.[0] || fixture.awayTeam.name[0]}</span>
      )}
    </div>
    <div className="text-xs font-medium text-gray-700 truncate">{fixture.awayTeam.shortName || fixture.awayTeam.name}</div>
  </div>
</div>


                    {/* Venue */}
                    <div className="text-center mt-4">
                      <div className="truncate cursor-help transition-colors duration-200 hover:text-gray-700 text-gray-500 font-medium text-sm" title={fixture.venue}>
                        {fixture.venue}
                      </div>
                    </div>

                    {/* Featured Badge */}
                    {fixture.importance >= 80 && (
                      <div className="mt-2 text-center">
                        <span className="inline-block bg-yellow-400 text-gray-900 px-2 py-1 rounded-full font-medium text-[10px] sm:text-[12px]">
                          Featured
                        </span>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination Dots */}
        {showNavigation && (
          <div className="flex justify-center items-center mt-6 space-x-2 w-full" style={{ minHeight: '32px' }}>
            {Array.from({ length: maxIndex + 1 }, (_, index) => (
              <button
                key={index}
                onClick={() => { setCurrentIndex(index); announceSlideChange(index); }}
                className="focus:outline-none"
                style={{
                  width: currentIndex === index ? '24px' : '12px',
                  height: '12px',
                  backgroundColor: currentIndex === index ? '#FFD700' : '#6B7280',
                  borderRadius: '9999px',
                  border: 'none',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  margin: '0 4px'
                }}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={currentIndex === index ? 'true' : 'false'}
              />
            ))}
          </div>
        )}

        <div aria-live="polite" aria-atomic="true" className="sr-only">{announceText}</div>
        <div className="sr-only">Use arrow keys to navigate slides. Swipe left/right on touch devices.</div>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
