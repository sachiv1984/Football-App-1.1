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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);

  // Calculate cards per view based on screen size
  useEffect(() => {
    const calculateCardsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) return 1;
      if (width < 1024) return 2;
      return 3;
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

  const goToNext = () => {
    if (currentIndex < maxIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index <= maxIndex) {
      setCurrentIndex(index);
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

  // Calculate transform based on current index
  const transformX = -(currentIndex * (100 / cardsPerView));

  return (
    <div className={`w-full ${className}`} role="region" aria-label="Featured Games Carousel">
      <div className="relative overflow-hidden mx-4">
        {/* Carousel Track */}
        <div 
          ref={trackRef}
          className="flex transition-transform duration-300 ease-in-out gap-6"
          style={{
            transform: `translateX(${transformX}%)`,
          }}
        >
          {fixtures.map((fixture, index) => (
            <div
              key={fixture.id || index}
              className="flex-none"
              style={{
                width: `calc(${100 / cardsPerView}% - ${24 * (cardsPerView - 1) / cardsPerView}px)`,
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
                className="w-full bg-white cursor-pointer rounded-xl transition-all duration-300 ease-in-out 
                           p-6 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 
                           focus:ring-yellow-400 focus:ring-offset-2 hover:scale-[1.02] aspect-[4/3]"
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

        {/* Navigation Arrows */}
        {totalSlides > cardsPerView && (
          <>
            <button
              className="absolute top-1/2 -translate-y-1/2 -left-2 z-20 flex items-center justify-center
                         w-10 h-10 bg-white rounded-full shadow-lg text-gray-700 hover:text-gray-900 
                         transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 
                         focus:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={goToPrev}
              disabled={currentIndex === 0}
              aria-label="Previous slides"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className="absolute top-1/2 -translate-y-1/2 -right-2 z-20 flex items-center justify-center
                         w-10 h-10 bg-white rounded-full shadow-lg text-gray-700 hover:text-gray-900 
                         transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400 
                         focus:ring-offset-2 disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={goToNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next slides"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
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
