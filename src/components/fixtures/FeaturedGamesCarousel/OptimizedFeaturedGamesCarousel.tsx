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
      const cardWidth = trackRef.current.children[0]?.getBoundingClientRect().width || 0;
      const gap = 24; // must match CSS gap
      const translateX = -(index * (cardWidth + gap));
      trackRef.current.style.transform = `translateX(${translateX}px)`;
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
        {/* Optional illustration */}
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
    <div className={`carousel-apple ${className}`} role="region" aria-label="Featured Games Carousel">
      <div ref={containerRef} className="carousel-container">
        <div ref={trackRef} className="carousel-track">
          {fixtures.map((fixture, index) => (
            <CarouselSlide
              key={fixture.id || index}
              fixture={fixture}
              index={index}
              isActive={index === currentIndex}
              onGameSelect={onGameSelect ?? (() => {})} // FIX: Add null coalescing with empty function
              cardsPerView={cardsPerView}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        {totalSlides > cardsPerView && (
          <>
            <button
              className="carousel-nav-arrow carousel-nav-arrow-left"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              aria-label="Previous slides"
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className="carousel-nav-arrow carousel-nav-arrow-right"
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
        <div className="carousel-pagination">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              className={`carousel-dot ${
                currentIndex === index ? 'carousel-dot-active' : 'carousel-dot-inactive'
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