import React, { useRef, useState, useCallback, useEffect } from 'react';
import CarouselSlide from './CarouselSlide';
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
  isLoading = false
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(1);

  // --- Responsive calculation of cards per view ---
  const getCardsPerView = useCallback(() => {
    if (!containerRef.current) return 1;
    const width = containerRef.current.offsetWidth;
    if (width >= 1024) return 3; // Desktop
    if (width >= 640) return 2;  // Tablet
    return 1; // Mobile
  }, []);

  useEffect(() => {
    const updateCardsPerView = () => setCardsPerView(getCardsPerView());
    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, [getCardsPerView]);

  const totalSlides = fixtures.length;
  const maxIndex = Math.max(0, totalSlides - cardsPerView);

  const goToIndex = (index: number) => {
    if (index < 0 || index > maxIndex) return;
    setCurrentIndex(index);
    if (trackRef.current) {
      const slideWidth = 100 / cardsPerView; // Percentage width per slide
      const translateX = -(index * slideWidth);
      trackRef.current.style.transform = `translateX(${translateX}%)`;
    }
  };

  const goToNext = () => { if (currentIndex < maxIndex) goToIndex(currentIndex + 1); };
  const goToPrev = () => { if (currentIndex > 0) goToIndex(currentIndex - 1); };

  // Loading state
  if (isLoading) {
    return (
      <div className={`flex gap-4 sm:gap-8 ${className}`}>
        {[...Array(cardsPerView)].map((_, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 bg-gray-200 animate-pulse rounded-xl w-full aspect-[4/3] p-6 sm:p-8"
          />
        ))}
      </div>
    );
  }

  // --- Empty State ---
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
        <button
          className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 shadow-sm
                     bg-[#FFD700] text-gray-900 hover:bg-yellow-400"
        >
          View All Fixtures
        </button>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} role="region" aria-label="Featured Games Carousel">
      {/* SIMPLIFIED CAROUSEL - FORCE HORIZONTAL LAYOUT */}
      <div 
        ref={containerRef} 
        className="relative w-full overflow-hidden"
        style={{ padding: '0 2rem' }}
      >
        <div 
          ref={trackRef} 
          className="transition-transform duration-300 ease-in-out"
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'nowrap',
            gap: '2rem',
            width: `${(totalSlides * 100) / cardsPerView}%`,
          }}
        >
          {fixtures.map((fixture, index) => (
            <div
              key={fixture.id || index}
              style={{
                flexShrink: 0,
                width: `${100 / totalSlides}%`,
                minWidth: `${100 / cardsPerView}%`,
              }}
            >
              <CarouselSlide
                fixture={fixture}
                index={index}
                isActive={index >= currentIndex && index < currentIndex + cardsPerView}
                onGameSelect={onGameSelect ?? (() => {})}
                cardsPerView={cardsPerView}
              />
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {totalSlides > cardsPerView && (
          <>
            <button
              className="absolute top-1/2 -translate-y-1/2 left-2 z-20 flex items-center justify-center
                         w-12 h-12 bg-white rounded-full shadow-lg text-gray-700 hover:text-gray-900 
                         transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 
                         focus:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              aria-label="Previous slides"
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className="absolute top-1/2 -translate-y-1/2 right-2 z-20 flex items-center justify-center
                         w-12 h-12 bg-white rounded-full shadow-lg text-gray-700 hover:text-gray-900 
                         transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 
                         focus:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={goToNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next slides"
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Pagination Dots */}
      {totalSlides > cardsPerView && (
        <div className="flex justify-center items-center mt-6 gap-2">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              className={`rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 h-2 ${
                currentIndex === index 
                  ? 'w-6 bg-yellow-400' 
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => goToIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={currentIndex === index ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;