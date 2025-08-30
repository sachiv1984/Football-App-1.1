import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  autoRotate = true,
  rotateInterval = 5000,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const realCount = fixtures.length;

  // Cloned slides for infinite scroll
  const slides = [
    fixtures[realCount - 1], // last item clone at start
    ...fixtures,
    fixtures[0], // first item clone at end
  ];

  // Scroll to a specific index
  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (!containerRef.current) return;
      const slideWidth = containerRef.current.clientWidth;
      containerRef.current.scrollTo({
        left: (index + 1) * slideWidth,
        behavior: smooth ? 'smooth' : 'auto',
      });
    },
    []
  );

  // Next / Previous
  const goToNext = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev + 1);
  }, [isAnimating]);

  const goToPrev = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev - 1);
  }, [isAnimating]);

  // Auto rotate with pause functionality
  useEffect(() => {
    if (!autoRotate || isPaused) return;
    const interval = window.setInterval(goToNext, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval]);

  // Handle scroll effect & infinite loop reset
  useEffect(() => {
    scrollToIndex(currentIndex);

    const handleTransitionEnd = () => {
      setIsAnimating(false);
      if (currentIndex >= realCount) setCurrentIndex(0);
      if (currentIndex < 0) setCurrentIndex(realCount - 1);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleTransitionEnd);
    }
    return () => {
      if (container) container.removeEventListener('scroll', handleTransitionEnd);
    };
  }, [currentIndex, realCount, scrollToIndex]);

  // Format time until match
  const getTimeUntilMatch = (dateTime: string) => {
    const now = new Date();
    const matchTime = new Date(dateTime);
    const diffMs = matchTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'Match finished';
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (diffDays > 0) return `${diffDays}d ${diffHours}h`;
    if (diffHours > 0) return `${diffHours}h`;
    return 'Starting soon';
  };

  // Get importance badge styling
  const getImportanceBadge = (importance: number) => {
    if (importance >= 8) return { text: 'BIG MATCH', style: 'bg-red-600 text-white' };
    if (importance >= 6) return { text: 'KEY MATCH', style: 'bg-orange-500 text-white' };
    if (importance >= 4) return { text: 'IMPORTANT', style: 'bg-blue-500 text-white' };
    return null;
  };

  return (
    <div 
      className={`relative overflow-hidden group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Carousel slides container */}
      <div
        ref={containerRef}
        className="flex overflow-x-scroll scroll-smooth hide-scrollbar"
      >
        {slides.map((fixture, idx) => {
          const importanceBadge = getImportanceBadge(fixture.importance);
          const timeUntil = getTimeUntilMatch(fixture.dateTime);
          
          return (
            <div
              key={idx}
              className="min-w-full flex-shrink-0 p-4 cursor-pointer"
              onClick={() => onGameSelect?.(fixture)}
            >
              <div className="fixture-card relative bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border border-gray-100">
                
                {/* Status and Importance badges */}
                <div className="absolute top-4 right-4 flex gap-2">
                  {fixture.isLive && (
                    <span className="px-2 py-1 text-xs font-bold bg-red-500 text-white rounded-full animate-pulse">
                      LIVE
                    </span>
                  )}
                  {importanceBadge && (
                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${importanceBadge.style}`}>
                      {importanceBadge.text}
                    </span>
                  )}
                </div>

                <div className="p-6">
                  {/* Competition info */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {fixture.competition.logo && (
                        <img 
                          src={fixture.competition.logo} 
                          alt={fixture.competition.name}
                          className="w-6 h-6"
                        />
                      )}
                      <span className="text-sm font-medium text-gray-600">
                        {fixture.competition.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      Matchweek {fixture.matchWeek}
                    </span>
                  </div>

                  {/* Main fixture content */}
                  <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div className="flex flex-col items-center space-y-2 flex-1">
                      <div className="w-16 h-16 flex items-center justify-center">
                        {fixture.homeTeam.logo ? (
                          <img
                            src={fixture.homeTeam.logo}
                            alt={fixture.homeTeam.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                            {fixture.homeTeam.shortName?.charAt(0) || fixture.homeTeam.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg">{fixture.homeTeam.shortName || fixture.homeTeam.name}</div>
                        {fixture.homeTeam.form && (
                          <div className="flex space-x-1 mt-1">
                            {fixture.homeTeam.form.slice(-5).map((result, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center ${
                                  result === 'W' ? 'bg-green-500 text-white' :
                                  result === 'D' ? 'bg-yellow-500 text-white' :
                                  'bg-red-500 text-white'
                                }`}
                              >
                                {result}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* VS and Score/Time */}
                    <div className="flex flex-col items-center space-y-2 px-6">
                      {fixture.status === 'finished' && fixture.homeScore !== undefined && fixture.awayScore !== undefined ? (
                        <div className="text-2xl font-bold text-gray-900">
                          {fixture.homeScore} - {fixture.awayScore}
                        </div>
                      ) : (
                        <div className="text-xl font-bold text-gray-400">VS</div>
                      )}
                      <div className="text-center">
                        <div className="text-sm text-gray-600">
                          {new Date(fixture.dateTime).toLocaleDateString('en-GB', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                        <div className="text-sm font-semibold text-gray-800">
                          {fixture.isLive ? 'LIVE' : new Date(fixture.dateTime).toLocaleTimeString([], {
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {timeUntil}
                        </div>
                      </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex flex-col items-center space-y-2 flex-1">
                      <div className="w-16 h-16 flex items-center justify-center">
                        {fixture.awayTeam.logo ? (
                          <img
                            src={fixture.awayTeam.logo}
                            alt={fixture.awayTeam.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 font-bold">
                            {fixture.awayTeam.shortName?.charAt(0) || fixture.awayTeam.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg">{fixture.awayTeam.shortName || fixture.awayTeam.name}</div>
                        {fixture.awayTeam.form && (
                          <div className="flex space-x-1 mt-1">
                            {fixture.awayTeam.form.slice(-5).map((result, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 text-xs font-bold rounded-full flex items-center justify-center ${
                                  result === 'W' ? 'bg-green-500 text-white' :
                                  result === 'D' ? 'bg-yellow-500 text-white' :
                                  'bg-red-500 text-white'
                                }`}
                              >
                                {result}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Match tags */}
                  {fixture.tags && fixture.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                      {fixture.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                        >
                          {tag.replace('-', ' ').toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Venue info */}
                  <div className="text-center mt-4 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      📍 {fixture.venue}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows - hidden on mobile, visible on desktop */}
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 text-gray-700 hover:text-gray-900 hidden md:block opacity-0 group-hover:opacity-100"
        onClick={goToPrev}
        aria-label="Previous game"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-3 rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 text-gray-700 hover:text-gray-900 hidden md:block opacity-0 group-hover:opacity-100"
        onClick={goToNext}
        aria-label="Next game"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots indicator */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
        {fixtures.map((_, idx) => (
          <button
            key={idx}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              idx === (currentIndex < 0 ? realCount - 1 : currentIndex % realCount)
                ? 'bg-blue-600 w-6'
                : 'bg-gray-300 hover:bg-gray-400'
            }`}
            onClick={() => {
              setCurrentIndex(idx);
              setIsAnimating(true);
            }}
            aria-label={`Go to game ${idx + 1}`}
          />
        ))}
      </div>

      {/* Remove the pause/play button - pause on hover is sufficient */}
    </div>
  );
};
