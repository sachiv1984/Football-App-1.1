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
  const [announceText, setAnnounceText] = useState('');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const totalSlides = fixtures.length;
  const maxIndex = Math.max(0, totalSlides - cardsPerView);

  // Accessibility: reduced motion
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Cards per view responsiveness
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

  useEffect(() => {
    const newMaxIndex = Math.max(0, totalSlides - cardsPerView);
    if (currentIndex > newMaxIndex) setCurrentIndex(newMaxIndex);
  }, [cardsPerView, totalSlides, currentIndex]);

  // Slide announcer for screen readers
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

  // Navigation
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

  const getCardGap = () => {
    if (cardsPerView === 1) return 16;
    if (cardsPerView === 2) return 24;
    return 32;
  };

  // ✅ Pixel-based transform calculation
  const getTransformX = () => {
    if (!trackRef.current) return 0;
    const trackWidth = trackRef.current.offsetWidth;
    const cardWidth = trackWidth / cardsPerView;
    return currentIndex * (cardWidth + getCardGap());
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
        <p className="text-lg font-medium text-gray-700 mb-4">
          Check back later for featured games
        </p>
      </div>
    );
  }

  const showNavigation = totalSlides > cardsPerView;

  return (
    <div
      ref={containerRef}
      className={`w-full transition-all duration-500 ${className}`}
      role="region"
      aria-label="Featured Games Carousel"
      tabIndex={0}
    >
      <div className="relative">
        {/* Track */}
        <div className="overflow-hidden px-4 md:px-8 py-4">
          <div
            ref={trackRef}
            className="flex select-none"
            style={{
              transform: `translateX(-${getTransformX()}px)`,
              transition: prefersReducedMotion ? 'none' : 'transform 0.3s ease-out',
              gap: `${getCardGap()}px`,
            }}
            role="list"
          >
            {fixtures.map((fixture, index) => {
              const isActive = index >= currentIndex && index < currentIndex + cardsPerView;
              return (
                <div
                  key={fixture.id || index}
                  className="relative flex-shrink-0 rounded-xl bg-white"
                  style={{
                    flex: `0 0 calc(${100 / cardsPerView}% - ${getCardGap()}px)`,
                    border: isActive ? '2px solid #FFD700' : '1px solid #D1D5DB',
                    borderRadius: '16px',
                    boxShadow: isActive
                      ? '0 12px 20px rgba(0,0,0,0.25)'
                      : '0 6px 12px rgba(0,0,0,0.1)',
                  }}
                  role="listitem"
                >
                  <button
                    className={`flex flex-col w-full h-full p-4 text-left ${
                      isActive ? 'transform scale-105 transition-transform duration-300' : ''
                    }`}
                    onClick={() => onGameSelect?.(fixture)}
                  >
                    {/* Top row: Competition left, Week right */}
                    <div className="flex justify-between items-center mb-4">
                      {fixture.competition.logo && (
                        <img
                          src={fixture.competition.logo}
                          alt={fixture.competition.name}
                          className="w-10 h-10 object-contain"
                        />
                      )}
                      <span className="text-xs text-gray-500 font-medium">
                        Week {fixture.matchWeek || 1}
                      </span>
                    </div>

                    {/* Middle row: Teams + time */}
                    <div className="grid grid-cols-3 items-center text-center mb-4">
                      {/* Home */}
                      <div>
                        {fixture.homeTeam.logo ? (
                          <img
                            src={fixture.homeTeam.logo}
                            alt={fixture.homeTeam.name}
                            className="w-12 h-12 mx-auto object-contain"
                          />
                        ) : (
                          <span>{fixture.homeTeam.name[0]}</span>
                        )}
                        <div className="text-xs truncate">{fixture.homeTeam.shortName || fixture.homeTeam.name}</div>
                      </div>
                      {/* Time */}
                      <div>
                        <div className="text-sm font-medium">
                          {new Date(fixture.dateTime).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(fixture.dateTime).toLocaleDateString('en-GB', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </div>
                      </div>
                      {/* Away */}
                      <div>
                        {fixture.awayTeam.logo ? (
                          <img
                            src={fixture.awayTeam.logo}
                            alt={fixture.awayTeam.name}
                            className="w-12 h-12 mx-auto object-contain"
                          />
                        ) : (
                          <span>{fixture.awayTeam.name[0]}</span>
                        )}
                        <div className="text-xs truncate">{fixture.awayTeam.shortName || fixture.awayTeam.name}</div>
                      </div>
                    </div>

                    {/* Bottom row: Venue & badge */}
                    <div className="text-xs text-gray-500 text-center">{fixture.venue}</div>
                    {fixture.importance >= 80 && (
                      <div className="mt-2 text-center">
                        <span className="inline-block bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-[10px]">
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

        {/* Pagination */}
        {showNavigation && (
          <div className="flex justify-center items-center mt-6 space-x-2">
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
                }}
                aria-label={`Go to slide ${index + 1}`}
                aria-current={currentIndex === index ? 'true' : 'false'}
              />
            ))}
          </div>
        )}

        {/* Screen reader live region */}
        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {announceText}
        </div>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
