import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo } from '../../../utils/logoUtils';
import { useFixtures } from '../../../hooks/useFixtures'; // Add this import

interface Props {
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  onGameSelect,
  autoRotate = true,
  rotateInterval = 5000,
  className = '',
}) => {
  // Replace mock data with useFixtures hook
const { featuredFixtures, loading, error } = useFixtures();

  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const realCount = featuredFixtures.length;

  // Cloned slides for infinite scroll
  const slides = realCount > 0 ? [
    featuredFixtures[realCount - 1], // last item clone at start
    ...featuredFixtures,
    featuredFixtures[0], // first item clone at end
  ] : [];

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
    if (isAnimating || realCount === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev + 1);
  }, [isAnimating, realCount]);

  const goToPrev = useCallback(() => {
    if (isAnimating || realCount === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev - 1);
  }, [isAnimating, realCount]);

  // Touch handlers for swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) goToNext();
    if (isRightSwipe) goToPrev();
    
    // Reset touch values
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setIsPaused(true);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  // Auto rotate with pause functionality
  useEffect(() => {
    if (!autoRotate || isPaused || realCount === 0) return;
    const interval = window.setInterval(goToNext, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval, realCount]);

  // Handle scroll effect & infinite loop reset
  useEffect(() => {
    if (realCount === 0) return;
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

  // Get importance badge styling
  const getImportanceBadge = (importance: number) => {
    if (importance >= 8) return { text: 'BIG MATCH', style: 'bg-red-600 text-white' };
    if (importance >= 6) return { text: 'KEY MATCH', style: 'bg-orange-500 text-white' };
    if (importance >= 4) return { text: 'IMPORTANT', style: 'bg-blue-500 text-white' };
    return null;
  };

  // Team name abbreviations for long names
  const getDisplayName = (teamName: string, shortName?: string) => {
    const abbreviations: { [key: string]: string } = {
      'Manchester United': 'Man Utd',
      'Manchester City': 'Man City',
      'Tottenham Hotspur': 'Tottenham',
      'Brighton & Hove Albion': 'Brighton',
      'Sheffield United': 'Sheffield Utd',
      'West Ham United': 'West Ham',
      'Newcastle United': 'Newcastle',
      'Wolverhampton Wanderers': 'Wolves',
      'Leicester City': 'Leicester',
      'Crystal Palace': 'Crystal Palace',
      'Nottingham Forest': "Nott'm Forest",
      'AFC Bournemouth': 'Bournemouth',
      'Luton Town': 'Luton',
    };

    // Use predefined abbreviation if exists
    if (abbreviations[teamName]) {
      return abbreviations[teamName];
    }
    
    // Use shortName from API if available
    if (shortName && shortName.length <= 12) {
      return shortName;
    }
    
    // Use full name if it's short enough
    if (teamName.length <= 12) {
      return teamName;
    }
    
    // Fallback: truncate long names
    return teamName.length > 12 ? `${teamName.substring(0, 10)}...` : teamName;
  };

  // Handle image error (fallback for missing logos)
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  };

  // Check if match is today or tomorrow for better time display
  const getMatchDayLabel = (dateTime: string) => {
    const matchDate = new Date(dateTime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const isToday = matchDate.toDateString() === today.toDateString();
    const isTomorrow = matchDate.toDateString() === tomorrow.toDateString();
    
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    return matchDate.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg font-semibold text-gray-600">Loading Featured Games...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
          <div className="text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <div className="text-xl font-semibold text-red-600 mb-2">Error Loading Games</div>
            <div className="text-sm text-red-500">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className={`${className}`}>
        <div className="flex items-center justify-center h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200">
          <div className="text-center">
            <div className="text-4xl mb-4">⚽</div>
            <div className="text-xl font-semibold text-gray-600 mb-2">No Featured Games</div>
            <div className="text-sm text-gray-500">Check back later for upcoming matches</div>
          </div>
        </div>
      </div>
    );
  }

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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((fixture, idx) => {
          const importanceBadge = getImportanceBadge(fixture.importance);
          const homeLogo = getTeamLogo(fixture.homeTeam);
          const awayLogo = getTeamLogo(fixture.awayTeam);
          const matchDayLabel = getMatchDayLabel(fixture.dateTime);
          
          return (
            <div
              key={idx}
              className="min-w-full sm:min-w-0 sm:w-full md:min-w-full flex-shrink-0 p-2 sm:p-4 cursor-pointer"
              onClick={() => onGameSelect?.(fixture)}
            >
              <div className="fixture-card relative bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border border-gray-100">
                
                {/* Header with Competition Info and Venue */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl px-4 sm:px-6 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {fixture.competition.logo && (
                        <img 
                          src={fixture.competition.logo} 
                          alt={fixture.competition.name}
                          className="w-5 h-5 sm:w-6 sm:h-6"
                        />
                      )}
                      <span className="text-sm sm:text-base font-semibold text-gray-800">
                        {fixture.competition.name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs sm:text-sm text-gray-500">
                        Week {fixture.matchWeek}
                      </span>
                      {importanceBadge && (
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${importanceBadge.style}`}>
                          {importanceBadge.text}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Venue */}
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{fixture.venue}</h3>
                  </div>
                </div>

                {/* Main fixture content */}
                <div className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    {/* Home Team */}
                    <div className="flex flex-col items-center space-y-3 flex-1">
                      <div className="w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center relative">
                        {homeLogo.logoPath ? (
                          <>
                            <img
                              src={homeLogo.logoPath}
                              alt={fixture.homeTeam.name}
                              className="w-full h-full object-contain drop-shadow-sm"
                              onError={handleImageError}
                            />
                            <div 
                              className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full absolute inset-0 hidden items-center justify-center text-gray-600 font-bold text-sm sm:text-lg border-2 border-gray-300"
                            >
                              {homeLogo.fallbackInitial}
                            </div>
                          </>
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm sm:text-lg border-2 border-gray-300">
                            {homeLogo.fallbackInitial}
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-base sm:text-xl text-gray-900">
                          {getDisplayName(fixture.homeTeam.name, fixture.homeTeam.shortName)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                          Home
                        </div>
                        {fixture.homeTeam.form && (
                          <div className="flex space-x-1 mt-2 justify-center">
                            {fixture.homeTeam.form.slice(-5).map((result, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 sm:w-6 sm:h-6 text-xs font-bold rounded-full flex items-center justify-center ${
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

                    {/* VS and Match Time */}
                    <div className="flex flex-col items-center space-y-2 px-4 sm:px-8">
                      <div className="text-2xl sm:text-3xl font-bold text-gray-400">VS</div>
                      <div className="text-center bg-gray-50 rounded-lg px-3 py-2 border">
                        <div className="text-sm sm:text-base font-bold text-gray-900">
                          {new Date(fixture.dateTime).toLocaleTimeString([], {
                            hour: '2-digit', 
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {matchDayLabel}
                        </div>
                      </div>
                    </div>

                    {/* Away Team */}
                    <div className="flex flex-col items-center space-y-3 flex-1">
                      <div className="w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center relative">
                        {awayLogo.logoPath ? (
                          <>
                            <img
                              src={awayLogo.logoPath}
                              alt={fixture.awayTeam.name}
                              className="w-full h-full object-contain drop-shadow-sm"
                              onError={handleImageError}
                            />
                            <div 
                              className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full absolute inset-0 hidden items-center justify-center text-gray-600 font-bold text-sm sm:text-lg border-2 border-gray-300"
                            >
                              {awayLogo.fallbackInitial}
                            </div>
                          </>
                        ) : (
                          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm sm:text-lg border-2 border-gray-300">
                            {awayLogo.fallbackInitial}
                          </div>
                        )}
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-base sm:text-xl text-gray-900">
                          {getDisplayName(fixture.awayTeam.name, fixture.awayTeam.shortName)}
                        </div>
                        <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
                          Away
                        </div>
                        {fixture.awayTeam.form && (
                          <div className="flex space-x-1 mt-2 justify-center">
                            {fixture.awayTeam.form.slice(-5).map((result, i) => (
                              <span
                                key={i}
                                className={`w-5 h-5 sm:w-6 sm:h-6 text-xs font-bold rounded-full flex items-center justify-center ${
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
                    <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                      {fixture.tags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                        >
                          {tag.replace('-', ' ').toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows - hidden on mobile, show on hover on desktop */}
      <button
        className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2 sm:p-3 rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 text-gray-700 hover:text-gray-900 hidden md:block opacity-0 group-hover:opacity-100"
        onClick={goToPrev}
        aria-label="Previous game"
        disabled={realCount === 0}
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2 sm:p-3 rounded-full shadow-lg hover:bg-white hover:shadow-xl transition-all duration-200 text-gray-700 hover:text-gray-900 hidden md:block opacity-0 group-hover:opacity-100"
        onClick={goToNext}
        aria-label="Next game"
        disabled={realCount === 0}
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

     {/* Dots indicator */}
{realCount > 1 && (
  <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
    {featuredFixtures.map((_, idx) => (
      <button
        key={idx}
        className={`w-2 h-2 rounded-full transition-all duration-200 ${
          idx === (currentIndex < 0 ? realCount - 1 : currentIndex % realCount)
            ? 'bg-blue-600 w-4 sm:w-6'
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
)}
    </div>
  );
};
