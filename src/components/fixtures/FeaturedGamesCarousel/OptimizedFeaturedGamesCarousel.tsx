// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import clsx from 'clsx';
import CarouselSlide from './CarouselSlide';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({ 
  fixtures, 
  onGameSelect, 
  className = '' 
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  // Calculate cards per view based on screen size
  const getCardsPerView = useCallback(() => {
    if (!containerRef.current) return 1;
    const width = containerRef.current.offsetWidth;
    if (width >= 1024) return 3; // Desktop
    if (width >= 640) return 2;  // Tablet
    return 1; // Mobile
  }, []);

  const [cardsPerView, setCardsPerView] = useState(1);

  useEffect(() => {
    const updateCardsPerView = () => {
      setCardsPerView(getCardsPerView());
    };
    
    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, [getCardsPerView]);

  const totalSlides = fixtures.length;
  const maxIndex = Math.max(0, totalSlides - cardsPerView);
  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < maxIndex;

  const goToIndex = useCallback(
    (index: number) => {
      if (index < 0 || index > maxIndex || isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex(index);
      
      if (trackRef.current) {
        // Calculate translation based on card width + gap
        const cardWidth = trackRef.current.children[0]?.getBoundingClientRect().width || 0;
        const gap = 24; // 1.5rem = 24px
        const translateX = -(index * (cardWidth + gap));
        trackRef.current.style.transform = `translateX(${translateX}px)`;
      }
      
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [maxIndex, isTransitioning]
  );

  const goToNext = useCallback(() => {
    if (canGoNext) goToIndex(currentIndex + 1);
  }, [canGoNext, currentIndex, goToIndex]);

  const goToPrev = useCallback(() => {
    if (canGoPrev) goToIndex(currentIndex - 1);
  }, [canGoPrev, currentIndex, goToIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  const handleTouchStart = (e: React.TouchEvent) => (touchStartX.current = e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => (touchEndX.current = e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    const threshold = 50;
    if (distance > threshold && canGoNext) goToNext();
    else if (distance < -threshold && canGoPrev) goToPrev();
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Reset index when cards per view changes
  useEffect(() => {
    if (currentIndex > maxIndex) {
      goToIndex(maxIndex);
    }
  }, [currentIndex, maxIndex, goToIndex]);

  if (totalSlides === 0) {
    return (
      <div className="text-gray-600 text-center py-20 px-6">
        <p className="text-lg font-medium">No Featured Games Available</p>
      </div>
    );
  }

  return (
    <div className={clsx('carousel-apple', className)} role="region" aria-label="Featured Games Carousel">
      <div
        ref={containerRef}
        className="carousel-container w-full relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          className="carousel-track flex gap-6 transition-transform duration-400 ease-in-out"
        >
          {fixtures.map((fixture, index) => (
            <CarouselSlide
              key={fixture.id || index}
              fixture={fixture}
              index={index}
              isActive={true} // All visible cards are "active"
              onGameSelect={onGameSelect}
              cardsPerView={cardsPerView}
            />
          ))}
        </div>

        {/* Navigation Arrows */}
        {totalSlides > cardsPerView && (
          <>
            <button
              className={clsx(
                'absolute top-1/2 -translate-y-1/2 left-4 z-10',
                'w-10 h-10 flex items-center justify-center',
                'bg-white/90 backdrop-blur-sm rounded-full shadow-md',
                'border border-gray-200',
                'text-gray-700 hover:text-gray-900',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-electric-yellow focus:ring-offset-2',
                {
                  'opacity-50 cursor-not-allowed': !canGoPrev,
                  'hover:bg-gray-50 hover:shadow-lg transform hover:scale-105': canGoPrev
                }
              )}
              onClick={goToPrev}
              disabled={!canGoPrev}
              aria-label="Previous slides"
            >
              <svg 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                className="w-6 h-6"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              className={clsx(
                'absolute top-1/2 -translate-y-1/2 right-4 z-10',
                'w-10 h-10 flex items-center justify-center',
                'bg-white/90 backdrop-blur-sm rounded-full shadow-md',
                'border border-gray-200',
                'text-gray-700 hover:text-gray-900',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-electric-yellow focus:ring-offset-2',
                {
                  'opacity-50 cursor-not-allowed': !canGoNext,
                  'hover:bg-gray-50 hover:shadow-lg transform hover:scale-105': canGoNext
                }
              )}
              onClick={goToNext}
              disabled={!canGoNext}
              aria-label="Next slides"
            >
              <svg 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                className="w-6 h-6"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Pagination Dots - Only show if more slides than visible */}
      {totalSlides > cardsPerView && (
        <div className="flex justify-center items-center gap-2 mt-6">
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              className={clsx(
                'transition-all duration-200 rounded-full',
                'focus:outline-none focus:ring-2 focus:ring-electric-yellow focus:ring-offset-2',
                'hover:scale-110',
                {
                  // Active dot - 24px wide × 8px tall pill with soft gold
                  'w-6 h-2': currentIndex === index,
                  // Inactive dot - 8px × 8px circle
                  'w-2 h-2 bg-gray-300 hover:bg-gray-400': currentIndex !== index
                }
              )}
              style={{
                borderRadius: currentIndex === index ? '4px' : '50%',
                backgroundColor: currentIndex === index ? '#FFD700' : undefined
              }}
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