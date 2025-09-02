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
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const realCount = featuredFixtures.length;

  // Clone slides for infinite scroll
  const slides =
    realCount > 0
      ? [featuredFixtures[realCount - 1], ...featuredFixtures, featuredFixtures[0]]
      : [];

  // Scroll to a specific index
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!containerRef.current) return;
    const slideWidth = containerRef.current.clientWidth;
    containerRef.current.scrollTo({
      left: (index + 1) * slideWidth,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  // Next / Prev
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

  // Touch swipe
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    const distance = touchStart - touchEnd;
    if (distance > 50) goToNext();
    if (distance < -50) goToPrev();
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setIsPaused(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  // Auto rotate
  useEffect(() => {
    if (!autoRotate || isPaused || realCount === 0) return;
    const interval = window.setInterval(goToNext, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval, realCount]);

  // Infinite scroll & animation reset
  useEffect(() => {
    if (!containerRef.current || realCount === 0) return;

    const container = containerRef.current;
    const handleScrollEnd = () => {
      setIsAnimating(false);
      if (currentIndex >= realCount) {
        setCurrentIndex(0);
        scrollToIndex(0, false);
      }
      if (currentIndex < 0) {
        setCurrentIndex(realCount - 1);
        scrollToIndex(realCount - 1, false);
      }
    };

    scrollToIndex(currentIndex, true);
    container.addEventListener('scroll', handleScrollEnd);
    return () => container.removeEventListener('scroll', handleScrollEnd);
  }, [currentIndex, realCount, scrollToIndex]);

  // Preload logos
  useEffect(() => {
    featuredFixtures.forEach((fixture) => {
      [fixture.homeTeam, fixture.awayTeam].forEach((team) => {
        const { logoPath } = getTeamLogo(team);
        if (logoPath) {
          const img = new Image();
          img.src = logoPath;
        }
      });
    });
  }, [featuredFixtures]);

  const getImportanceBadge = (importance: number) => {
    if (importance >= 8) return { text: 'BIG MATCH', style: 'bg-red-600 text-white' };
    if (importance >= 6) return { text: 'KEY MATCH', style: 'bg-orange-500 text-white' };
    if (importance >= 4) return { text: 'IMPORTANT', style: 'bg-blue-500 text-white' };
    return null;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  };

  const getMatchDayLabel = (dateTime: string) => {
    if (!dateTime || dateTime.includes('null')) return 'TBD';
    const matchDate = new Date(dateTime);
    if (isNaN(matchDate.getTime())) return 'TBD';
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (matchDate.toDateString() === today.toDateString()) return 'Today';
    if (matchDate.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return matchDate.toLocaleDateString('en-GB', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getMatchTime = (dateTime: string) => {
    if (!dateTime || dateTime.includes('null')) return 'TBD';
    const matchDate = new Date(dateTime);
    if (isNaN(matchDate.getTime())) return 'TBD';
    return matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return (
    <div className={`${className} flex items-center justify-center h-64`}>
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <div>Loading Featured Games...</div>
    </div>
  );

  if (error) return <div className={`${className}`}>Error: {error}</div>;
  if (featuredFixtures.length === 0) return <div className={`${className}`}>No Featured Games</div>;

  return (
    <div 
      className={`relative overflow-hidden group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
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
          const matchTime = getMatchTime(fixture.dateTime);
          const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

          return (
            <div
              key={idx}
              className="min-w-full flex-shrink-0 p-2 cursor-pointer"
              onClick={() => onGameSelect?.(fixture)}
            >
              {/* FULL FIXTURE CARD JSX */}
              <div className="fixture-card bg-white rounded-xl shadow-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  {competitionLogo && <img src={competitionLogo} alt={fixture.competition.name} className="w-20 h-20 object-contain" />}
                  {importanceBadge && <span className={`px-2 py-1 text-xs font-bold rounded-full ${importanceBadge.style}`}>{importanceBadge.text}</span>}
                </div>
                <div className="flex justify-between items-center mt-4">
                  {/* Home */}
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 relative">
                      {homeLogo.logoPath ? (
                        <>
                          <img src={homeLogo.logoPath} alt={fixture.homeTeam.name} className="w-full h-full object-contain" onError={handleImageError} />
                          <div className="absolute inset-0 hidden items-center justify-center text-gray-600 font-bold">{homeLogo.fallbackInitial}</div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-full">{homeLogo.fallbackInitial}</div>
                      )}
                    </div>
                    <div className="text-center font-bold">{homeLogo.displayName}</div>
                  </div>

                  {/* VS */}
                  <div className="flex flex-col items-center">
                    <div className="font-bold text-gray-400 text-2xl">VS</div>
                    <div className="text-center border rounded-lg p-2">
                      <div className="font-bold">{matchTime}</div>
                      <div className="text-sm">{matchDayLabel}</div>
                    </div>
                  </div>

                  {/* Away */}
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 relative">
                      {awayLogo.logoPath ? (
                        <>
                          <img src={awayLogo.logoPath} alt={fixture.awayTeam.name} className="w-full h-full object-contain" onError={handleImageError} />
                          <div className="absolute inset-0 hidden items-center justify-center text-gray-600 font-bold">{awayLogo.fallbackInitial}</div>
                        </>
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center rounded-full">{awayLogo.fallbackInitial}</div>
                      )}
                    </div>
                    <div className="text-center font-bold">{awayLogo.displayName}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation arrows */}
      <button onClick={goToPrev} className="absolute left-2 top-1/2 -translate-y-1/2">◀</button>
      <button onClick={goToNext} className="absolute right-2 top-1/2 -translate-y-1/2">▶</button>
    </div>
  );
};
