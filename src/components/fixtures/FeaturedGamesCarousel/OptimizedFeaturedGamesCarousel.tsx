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

  // Responsive cards per view (hard-coded breakpoints)
  useEffect(() => {
    const calculateCardsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) return 1; // mobile
      if (width < 1024) return 2; // tablet
      return 3; // desktop
    };
    const updateCardsPerView = () => {
      setCardsPerView(calculateCardsPerView());
    };
    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  const totalSlides = fixtures.length;
  const maxIndex = Math.max(0, totalSlides - cardsPerView);

  // Scroll to card on navigation
  useEffect(() => {
    if (trackRef.current) {
      const children = trackRef.current.children;
      if (children.length > currentIndex) {
        const card = children[currentIndex] as HTMLElement;
        card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
    }
  }, [currentIndex, cardsPerView, fixtures.length]);

  const goToNext = useCallback(() => {
    if (currentIndex < maxIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, maxIndex]);

  const goToPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const goToIndex = useCallback((index: number) => {
    if (index >= 0 && index <= maxIndex) {
      setCurrentIndex(index);
    }
  }, [maxIndex]);

  const goToFirst = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  const goToLast = useCallback(() => {
    setCurrentIndex(maxIndex);
  }, [maxIndex]);

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

  // Touch/swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    } else if (isRightSwipe) {
      goToPrev();
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {[...Array(3)].map((_, idx) => (
          <div
            key={idx}
            className="bg-gray-200 animate-pulse rounded-xl aspect-[4/3] p-6"
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (totalSlides === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="mb-6">
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6B7280"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto opacity-80"
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

  // Show navigation only if there are more items than can be displayed
  const showNavigation = totalSlides > cardsPerView;

  return (
    <div 
      ref={containerRef}
      className={`w-full ${className}`} 
      role="region" 
      aria-label="Featured Games Carousel"
      tabIndex={0}
    >
      <div className="relative">
        {/* Left Arrow */}
        {showNavigation && (
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            style={{ width: '40px', height: '40px' }}
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
        )}

        {/* Right Arrow */}
        {showNavigation && (
          <button
            onClick={goToNext}
            disabled={currentIndex === maxIndex}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            style={{ width: '40px', height: '40px' }}
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
        )}

        {/* Carousel Track */}
        <div className="relative w-full overflow-hidden px-12">
          <div
            ref={trackRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '24px',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              WebkitOverflowScrolling: 'touch',
              scrollBehavior: 'smooth',
              paddingBottom: '8px',
              flexWrap: 'nowrap',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
            className="[&::-webkit-scrollbar]:hidden"
          >
            {fixtures.map((fixture, index) => (
              <div
                key={fixture.id || index}
                style={{
                  flex: '0 0 auto',
                  scrollSnapAlign: 'start',
                  background: '#fff',
                  borderRadius: '16px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  padding: '16px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  width: cardsPerView === 1 ? 'calc(100% - 24px)' : cardsPerView === 2 ? 'calc(50% - 12px)' : 'calc(33.333% - 16px)',
                  minWidth: cardsPerView === 1 ? '280px' : '320px',
                  maxWidth: '360px',
                }}
              >
                {/* Card Content */}
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`View match between ${fixture.homeTeam.name} and ${fixture.awayTeam.name}`}
                  onClick={() => (onGameSelect ?? (() => {}))(fixture)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      (onGameSelect ?? (() => {}))(fixture);
                    }
                  }}
                >
                  {/* Competition header */}
                  <div className="flex items-center mb-4 space-x-3">
                    <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                      {fixture.competition.logo ? (
                        <img
                          src={fixture.competition.logo}
                          alt={`${fixture.competition.name} logo`}
                          className="w-10 h-10 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-gray-400 font-medium text-sm">
                          {fixture.competition.name[0] || "?"}
                        </span>
                      )}
                    </div>
                    <span className="text-gray-500 text-sm font-medium truncate">
                      {fixture.competition.shortName || fixture.competition.name}
                    </span>
                  </div>

                  {/* Teams & kickoff */}
                  <div className="flex items-center justify-between mb-4">
                    {/* Home team */}
                    <div className="text-center flex-1">
                      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-2 mx-auto">
                        {fixture.homeTeam.logo ? (
                          <img
                            src={fixture.homeTeam.logo}
                            alt={fixture.homeTeam.name}
                            className="w-12 h-12 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-gray-400 font-medium">
                            {fixture.homeTeam.shortName?.[0] || fixture.homeTeam.name[0]}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-700 truncate px-1">
                        {fixture.homeTeam.shortName || fixture.homeTeam.name}
                      </div>
                    </div>

                    {/* Kickoff */}
                    <div className="flex flex-col items-center text-gray-700 px-3">
                      <div className="flex items-center space-x-1 mb-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span className="text-sm font-medium">
                          {new Date(fixture.dateTime).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">vs</div>
                    </div>

                    {/* Away team */}
                    <div className="text-center flex-1">
                      <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-2 mx-auto">
                        {fixture.awayTeam.logo ? (
                          <img
                            src={fixture.awayTeam.logo}
                            alt={fixture.awayTeam.name}
                            className="w-12 h-12 object-contain"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-gray-400 font-medium">
                            {fixture.awayTeam.shortName?.[0] || fixture.awayTeam.name[0]}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-700 truncate px-1">
                        {fixture.awayTeam.shortName || fixture.awayTeam.name}
                      </div>
                    </div>
                  </div>

                  {/* Venue */}
                  <div className="text-center">
                    <div className="text-sm text-gray-500 truncate" title={fixture.venue}>
                      📍 {fixture.venue}
                    </div>
                  </div>

                  {/* Optional: Show importance indicator */}
                  {fixture.importance >= 80 && (
                    <div className="mt-3 text-center">
                      <span className="inline-block bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded-full font-medium">
                        Featured
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pagination dots */}
      {showNavigation && maxIndex > 0 && (
        <div className="flex justify-center mt-6 space-x-2">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={`transition-all duration-200 ${
                currentIndex === index 
                  ? 'bg-yellow-400 rounded-full' 
                  : 'bg-gray-300 rounded-full hover:bg-gray-400'
              }`}
              style={{
                width: currentIndex === index ? '24px' : '8px',
                height: '8px',
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Accessibility instructions */}
      <div className="sr-only">
        Use arrow keys to navigate between slides, Home key for first slide, End key for last slide.
        On touch devices, swipe left or right to navigate.
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
