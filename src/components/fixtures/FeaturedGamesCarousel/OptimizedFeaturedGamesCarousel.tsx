import React, { useRef, useState, useCallback, useEffect } from 'react';
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
      const slideWidth = cardsPerView === 1 ? 100 : 
                        cardsPerView === 2 ? 50 : 
                        33.333;
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
              className="transition-all duration-300 ease-in-out"
              style={{
                flexShrink: 0,
                width: `${100 / totalSlides}%`,
                minWidth: `${100 / cardsPerView}%`,
              }}
            >
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
                className="w-full bg-white cursor-pointer rounded-xl transition-all duration-300 ease-in-out 
                           p-6 sm:p-8 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 
                           focus:ring-yellow-400 focus:ring-offset-2 hover:scale-[1.02]"
                style={{ aspectRatio: '4 / 3' }}
              >
                {/* Competition header */}
                <div className="flex items-center mb-4 space-x-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow flex items-center justify-center">
                    {fixture.competition.logo ? (
                      <img
                        src={fixture.competition.logo}
                        alt={`${fixture.competition.name} logo`}
                        className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-gray-400 font-medium">
                        {fixture.competition.name[0] || "?"}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm sm:text-base">
                    {fixture.competition.shortName || fixture.competition.name}
                  </span>
                </div>

                {/* Teams & kickoff */}
                <div className="flex items-center justify-between mb-4">
                  {/* Home team */}
                  <div className="text-center">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white shadow flex items-center justify-center mb-2 mx-auto">
                      {fixture.homeTeam.logo ? (
                        <img
                          src={fixture.homeTeam.logo}
                          alt={fixture.homeTeam.name}
                          className="w-12 h-12 lg:w-16 lg:h-16 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-gray-400 font-medium text-lg">
                          {fixture.homeTeam.shortName?.[0] || fixture.homeTeam.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="text-xs lg:text-sm font-medium text-gray-700 max-w-[80px] truncate">
                      {fixture.homeTeam.shortName || fixture.homeTeam.name}
                    </div>
                  </div>

                  {/* Kickoff */}
                  <div className="flex flex-col items-center text-gray-700 text-base sm:text-lg px-2">
                    <div className="flex items-center space-x-1 mb-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 sm:h-4 sm:w-4"
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
                      <span className="text-sm lg:text-base font-medium">
                        {new Date(fixture.dateTime).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">vs</div>
                  </div>

                  {/* Away team */}
                  <div className="text-center">
                    <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white shadow flex items-center justify-center mb-2 mx-auto">
                      {fixture.awayTeam.logo ? (
                        <img
                          src={fixture.awayTeam.logo}
                          alt={fixture.awayTeam.name}
                          className="w-12 h-12 lg:w-16 lg:h-16 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-gray-400 font-medium text-lg">
                          {fixture.awayTeam.shortName?.[0] || fixture.awayTeam.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="text-xs lg:text-sm font-medium text-gray-700 max-w-[80px] truncate">
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