import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import CarouselSlide from './CarouselSlide';

interface Props {
  fixture,
  index,
  onGameSelect,
  cardsPerView
}

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({ 
  fixtures, 
  onGameSelect, 
  className = '' 
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

  if (totalSlides === 0) {
    return (
      <div className="text-gray-600 text-center py-20 px-6">
        <p className="text-lg font-medium">No Featured Games Available</p>
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
              onGameSelect={onGameSelect}
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
                <path d="M15 18l-6-6 6-6" stroke="currentColor" fill="none" />
              </svg>
            </button>

            <button
              className="carousel-nav-arrow carousel-nav-arrow-right"
              onClick={goToNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next slides"
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" stroke="currentColor" fill="none" />
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
