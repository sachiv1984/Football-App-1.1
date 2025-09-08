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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null); // <-- new: measures visible viewport
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [announceText, setAnnounceText] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [viewportWidth, setViewportWidth] = useState(0);

  const totalSlides = fixtures.length;
  const maxIndex = Math.max(0, totalSlides - cardsPerView);

  /** Reduced motion media query */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  /** Fade-in animation */
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  /** Announce slide for screen readers */
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

  /** Calculate cards per view based on screen width */
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

  /** Keep current index valid */
  useEffect(() => {
    const newMaxIndex = Math.max(0, totalSlides - cardsPerView);
    if (currentIndex > newMaxIndex) setCurrentIndex(newMaxIndex);
  }, [cardsPerView, totalSlides, currentIndex]);

  /** Measure the viewport width for pixel-accurate sizing */
  useEffect(() => {
    const updateWidth = () => {
      const el = viewportRef.current;
      setViewportWidth(el ? el.clientWidth : 0);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [cardsPerView]);

  /** Navigation helpers */
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

  /** Keyboard navigation */
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

  /** Touch swipe */
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

  const showNavigation = totalSlides > cardsPerView;

  const getCardGap = () => {
    if (cardsPerView === 1) return 16;
    if (cardsPerView === 2) return 24;
    return 32;
  };

  // pixel-based sizing
  const gapPx = getCardGap();
  const totalGapsWidth = Math.max(0, gapPx * (cardsPerView - 1));
  const cardWidthPx = viewportWidth ? Math.max(0, Math.floor((viewportWidth - totalGapsWidth) / cardsPerView)) : 0;
  const translateX = -(currentIndex * (cardWidthPx + gapPx));

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

        {/* viewportRef measures visible width (pixel-based sizing) */}
        <div ref={viewportRef} className="overflow-hidden px-4 md:px-8 py-4">
          <div
            ref={trackRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="flex select-none"
            style={{
              transform: `translateX(${translateX}px)`,
              transition: prefersReducedMotion ? 'none' : 'transform 0.3s ease-out',
              gap: `${gapPx}px`,
              // ensure no accidental extra width from transforms
              willChange: 'transform',
            }}
            role="list"
          >
            {fixtures.map((fixture, index) => {
              const isActive = index >= currentIndex && index < currentIndex + cardsPerView;

              return (
                <div
                  key={fixture.id || index}
                  className="relative flex-shrink-0 box-border rounded-xl"
                  style={{
                    // use pixel-based flex-basis so cards + gaps exactly fit viewport
                    flex: `0 0 ${cardWidthPx}px`,
                    borderStyle: 'solid',
                    borderWidth: '2px', // always 2px to avoid layout shift
                    borderColor: isActive ? '#FFD700' : 'transparent',
                    borderRadius: '16px',
                    boxShadow: isActive ? '0 12px 20px rgba(0,0,0,0.25)' : '0 6px 12px rgba(0,0,0,0.1)',
                    overflow: 'hidden',
                    boxSizing: 'border-box',
                    background: '#ffffff',
                  }}
                  role="listitem"
                >
                  <button
  className="flex flex-col w-full h-full p-4 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-gold"
  onClick={() => onGameSelect?.(fixture)}
>
  {/* Card grid layout */}
  <div className="grid grid-rows-[auto_auto_auto] gap-y-4 h-full">

    {/* Top row: logo left, week right */}
    <div className="grid grid-cols-2 items-center">
      <div className="flex items-center">
        {fixture.competition.logo && (
          <img
            src={fixture.competition.logo}
            alt={fixture.competition.name}
            className="w-10 h-10 object-contain"
          />
        )}
      </div>
      <div className="flex justify-end items-center">
        <span className="text-xs text-gray-500 font-medium">
          Week {fixture.matchWeek || 1}
        </span>
      </div>
    </div>

    {/* Middle row: exactly 3 columns so time is centered */}
    <div className="grid grid-cols-3 items-center text-center">
      {/* Home */}
      <div className="flex flex-col items-center">
        {fixture.homeTeam.logo ? (
          <img src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} className="w-12 h-12 object-contain" />
        ) : (
          <span>{fixture.homeTeam.name[0]}</span>
        )}
        <span className="text-xs truncate">{fixture.homeTeam.shortName || fixture.homeTeam.name}</span>
      </div>

      {/* Time */}
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium text-gray-700">
          {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
        </span>
        <span className="text-xs text-gray-500">
          {new Date(fixture.dateTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
        </span>
      </div>

      {/* Away */}
      <div className="flex flex-col items-center">
        {fixture.awayTeam.logo ? (
          <img src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} className="w-12 h-12 object-contain" />
        ) : (
          <span>{fixture.awayTeam.name[0]}</span>
        )}
        <span className="text-xs truncate">{fixture.awayTeam.shortName || fixture.awayTeam.name}</span>
      </div>
    </div>

    {/* Bottom row: venue centered */}
    <div className="flex justify-center items-center">
      <span className="text-xs text-gray-500 truncate">{fixture.venue}</span>
    </div>
  </div>
</button>


        {/* Pagination */}
        {showNavigation && (
          <div className="flex justify-center items-center mt-6 space-x-2 w-full" style={{ minHeight: '32px' }}>
            {Array.from({ length: maxIndex + 1 }, (_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  announceSlideChange(index);
                }}
                className="focus:outline-none"
                style={{
                  width: currentIndex === index ? '24px' : '12px',
                  height: '12px',
                  backgroundColor: currentIndex === index ? '#FFD700' : '#6B7280',
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

        <div aria-live="polite" aria-atomic="true" className="sr-only">{announceText}</div>

        <div className="sr-only">
          Use arrow keys to navigate between slides, Home key for first slide, End key for last slide. On touch devices, swipe left or right to navigate.
        </div>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
