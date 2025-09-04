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

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({ fixtures, onGameSelect, className = '' }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const totalSlides = fixtures.length;
  const canGoPrev = currentSlide > 0;
  const canGoNext = currentSlide < totalSlides - 1;

  const goToSlide = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalSlides || isTransitioning) return;
      setIsTransitioning(true);
      setCurrentSlide(index);
      if (trackRef.current) trackRef.current.style.transform = `translateX(-${index * 100}%)`;
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [totalSlides, isTransitioning]
  );

  const goToNext = useCallback(() => { if (canGoNext) goToSlide(currentSlide + 1); }, [canGoNext, currentSlide, goToSlide]);
  const goToPrev = useCallback(() => { if (canGoPrev) goToSlide(currentSlide - 1); }, [canGoPrev, currentSlide, goToSlide]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'ArrowLeft') goToPrev(); if (e.key === 'ArrowRight') goToNext(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  const handleTouchStart = (e: React.TouchEvent) => (touchStartX.current = e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => (touchEndX.current = e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50 && canGoNext) goToNext();
    else if (distance < -50 && canGoPrev) goToPrev();
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  if (totalSlides === 0)
    return (
      <div className="text-gray-600 text-center py-20 px-6">
        <p className="text-lg font-medium">No Featured Games Available</p>
      </div>
    );

  return (
    <div className={clsx('carousel-apple', className)} role="region" aria-label="Featured Games Carousel">
      <div
        className="carousel-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div ref={trackRef} className="carousel-track">
          {fixtures.map((fixture, index) => (
            <CarouselSlide
              key={fixture.id || index}
              fixture={fixture}
              index={index}
              isActive={currentSlide === index}
              onGameSelect={onGameSelect}
            />
          ))}
        </div>

        {totalSlides > 1 && (
          <>
            <button
              className={clsx('carousel-nav-arrow carousel-nav-arrow-left', { 'opacity-50 cursor-not-allowed': !canGoPrev })}
              onClick={goToPrev}
              disabled={!canGoPrev}
              aria-label="Previous slide"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              className={clsx('carousel-nav-arrow carousel-nav-arrow-right', { 'opacity-50 cursor-not-allowed': !canGoNext })}
              onClick={goToNext}
              disabled={!canGoNext}
              aria-label="Next slide"
            >
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-6 h-6" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>

      {totalSlides > 1 && (
        <div className="carousel-pagination">
          {fixtures.map((_, index) => (
            <button
              key={index}
              className={clsx('carousel-dot', currentSlide === index ? 'carousel-dot-active' : 'carousel-dot-inactive')}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={currentSlide === index ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
