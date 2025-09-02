import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo } from '../../../utils/teamUtils';
import { useFixtures } from '../../../hooks/useFixtures';

interface Props {
  fixtures?: FeaturedFixtureWithImportance[];
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
  const { featuredFixtures, loading, error } = useFixtures();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const realCount = featuredFixtures.length;

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint - show 2 on tablet+
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // For mobile: infinite loop with clones, for desktop: show 2 games
  const slides = realCount > 0 && isMobile ? [
    featuredFixtures[realCount - 1],
    ...featuredFixtures,
    featuredFixtures[0],
  ] : featuredFixtures;

  const slideWidth = containerRef.current?.clientWidth || 0;

  // Scroll to a specific index (offset by 1 due to clone at start on mobile)
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!containerRef.current || !isMobile) return;
    containerRef.current.scrollTo({
      left: (index + 1) * slideWidth,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [slideWidth, isMobile]);

  const goToNext = useCallback(() => {
    if (realCount === 0 || !isMobile) return;
    setCurrentIndex(prev => prev + 1);
  }, [realCount, isMobile]);

  const goToPrev = useCallback(() => {
    if (realCount === 0 || !isMobile) return;
    setCurrentIndex(prev => prev - 1);
  }, [realCount, isMobile]);

  // Auto rotate (only on mobile)
  useEffect(() => {
    if (!autoRotate || isPaused || realCount === 0 || !isMobile) return;
    const interval = setInterval(goToNext, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval, realCount, isMobile]);

  // Handle scroll & continuous loop (only on mobile)
  useEffect(() => {
    if (!containerRef.current || realCount === 0 || !isMobile) return;

    const container = containerRef.current;

    scrollToIndex(currentIndex);

    const handleScroll = () => {
      if (currentIndex >= realCount) {
        // Jump to first real slide
        setCurrentIndex(0);
        container.scrollLeft = slideWidth;
        console.info('Looped back to start');
      }
      if (currentIndex < 0) {
        // Jump to last real slide
        setCurrentIndex(realCount - 1);
        container.scrollLeft = realCount * slideWidth;
        console.info('Looped back to end');
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [currentIndex, realCount, slideWidth, scrollToIndex, isMobile]);

  // Touch swipe (only on mobile)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isMobile) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!isMobile) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) goToNext();
    if (distance < -50) goToPrev();
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Keyboard navigation (only on mobile)
  useEffect(() => {
    if (!isMobile) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setIsPaused(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext, isMobile]);

  // Badge
  const getImportanceBadge = (importance: number) => {
    if (importance >= 8) return { text: 'BIG MATCH', style: 'bg-red-600 text-white' };
    if (importance >= 6) return { text: 'KEY MATCH', style: 'bg-orange-500 text-white' };
    if (importance >= 4) return { text: 'IMPORTANT', style: 'bg-blue-500 text-white' };
    return null;
  };

  // Get week number from fixture date
  const getWeekNumber = (fixture: FeaturedFixtureWithImportance) => {
    const dateStr = fixture.dateTime;
    if (!dateStr) return 1; // Default to week 1 if no date found
    
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 1; // Default to week 1 if invalid date
    
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-red-600 text-center p-4 bg-red-50 rounded-lg">
        Error loading fixtures: {error}
      </div>
    );
  }
  
  if (featuredFixtures.length === 0) {
    return (
      <div className="text-gray-600 text-center p-8 bg-gray-50 rounded-lg">
        No Featured Games Available
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden group ${className}`}
      onMouseEnter={() => isMobile && setIsPaused(true)}
      onMouseLeave={() => isMobile && setIsPaused(false)}
    >
      <div
        ref={containerRef}
        className={`flex ${
          isMobile 
            ? 'overflow-x-scroll scroll-smooth hide-scrollbar' 
            : 'grid md:grid-cols-2 gap-6'
        }`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((fixture, idx) => {
          const homeLogo = getTeamLogo(fixture.homeTeam);
          const awayLogo = getTeamLogo(fixture.awayTeam);
          const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);
          const weekNumber = getWeekNumber(fixture);

          // Debug for missing logos
          if (!homeLogo.logoPath) console.log('Missing home logo:', fixture.homeTeam.name);
          if (!awayLogo.logoPath) console.log('Missing away logo:', fixture.awayTeam.name);
          if (!competitionLogo) console.log('Missing competition logo:', fixture.competition.name);

          return (
            <div 
              key={idx} 
              className={`${isMobile ? 'min-w-full' : 'w-full'} p-3 cursor-pointer`} 
              onClick={() => onGameSelect?.(fixture)}
            >
              <div className="fixture-card bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] overflow-hidden">
                {/* Purple-to-blue gradient header */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-4 py-3 flex justify-between items-center border-b border-gray-100">
                  {/* Competition logo on the left */}
                  <div className="flex items-center">
                    {competitionLogo && (
                      <img 
                        src={competitionLogo} 
                        alt={fixture.competition.name} 
                        className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                      />
                    )}
                  </div>
                  
                  {/* Week number on the right */}
                  <div className="text-xs sm:text-sm font-semibold text-purple-600 bg-white px-2 py-1 rounded-full">
                    Week {weekNumber}
                  </div>
                </div>

                {/* Teams section with improved layout */}
                <div className="p-4 sm:p-6">
                  {/* Home vs Away */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 bg-white rounded-full shadow-md flex items-center justify-center ring-2 ring-gray-100">
                        <img 
                          src={homeLogo.logoPath || ''} 
                          alt={homeLogo.displayName} 
                          className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-center text-gray-800 leading-tight">
                        {homeLogo.displayName}
                      </span>
                    </div>
                    
                    {/* VS with prominent time/date */}
                    <div className="flex flex-col items-center mx-4 min-w-[80px]">
                      <span className="text-xl sm:text-2xl font-bold text-purple-600 mb-2">VS</span>
                      
                      {/* Prominent time/date display */}
                      <div className="bg-gradient-to-r from-purple-100 to-blue-100 px-3 py-2 rounded-lg text-center border border-purple-200">
                        <div className="text-xs sm:text-sm font-bold text-purple-700">
                          {(() => {
                            const dateStr = fixture.dateTime;
                            if (!dateStr) return 'TBD';
                            
                            const date = new Date(dateStr);
                            if (isNaN(date.getTime())) return 'TBD';
                            
                            return date.toLocaleDateString('en-GB', {
                              day: 'numeric',
                              month: 'short'
                            });
                          })()}
                        </div>
                        <div className="text-xs sm:text-sm font-semibold text-gray-600 mt-1">
                          {(() => {
                            const dateStr = fixture.dateTime;
                            if (!dateStr) return 'TBD';
                            
                            const date = new Date(dateStr);
                            if (isNaN(date.getTime())) return 'TBD';
                            
                            return date.toLocaleTimeString('en-GB', {
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center flex-1">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 mb-3 bg-white rounded-full shadow-md flex items-center justify-center ring-2 ring-gray-100">
                        <img 
                          src={awayLogo.logoPath || ''} 
                          alt={awayLogo.displayName} 
                          className="w-12 h-12 sm:w-16 sm:h-16 object-contain"
                        />
                      </div>
                      <span className="text-sm sm:text-base font-semibold text-center text-gray-800 leading-tight">
                        {awayLogo.displayName}
                      </span>
                    </div>
                  </div>

                  {/* Venue information at bottom - cleaner presentation */}
                  <div className="flex justify-center mt-4 pt-3 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Venue</div>
                      <div className="text-sm font-medium text-gray-700">
                        {fixture.venue || 'TBD'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows - only show on mobile */}
      {isMobile && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-3 rounded-full shadow-lg hover:shadow-xl border border-gray-200"
            onClick={goToPrev}
          >
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-3 rounded-full shadow-lg hover:shadow-xl border border-gray-200"
            onClick={goToNext}
          >
            <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </>
      )}

      {/* Pagination dots - only show on mobile */}
      {isMobile && (
        <div className="flex justify-center mt-4 space-x-2">
          {featuredFixtures.map((_, idx) => (
            <button
              key={idx}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                idx === (currentIndex < 0 ? realCount - 1 : currentIndex % realCount)
                  ? 'bg-purple-600 w-4'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              onClick={() => setCurrentIndex(idx)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
