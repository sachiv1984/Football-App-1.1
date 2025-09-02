import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo, getDisplayTeamName } from '../../../utils/teamUtils';
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

  const realCount = featuredFixtures.length;

  // Infinite loop: clone first & last
  const slides = realCount > 0 ? [
    featuredFixtures[realCount - 1],
    ...featuredFixtures,
    featuredFixtures[0],
  ] : [];

  const slideWidth = containerRef.current?.clientWidth || 0;

  // Scroll to a specific index (offset by 1 due to clone at start)
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      left: (index + 1) * slideWidth,
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, [slideWidth]);

  const goToNext = useCallback(() => {
    if (realCount === 0) return;
    setCurrentIndex(prev => prev + 1);
  }, [realCount]);

  const goToPrev = useCallback(() => {
    if (realCount === 0) return;
    setCurrentIndex(prev => prev - 1);
  }, [realCount]);

  // Auto rotate
  useEffect(() => {
    if (!autoRotate || isPaused || realCount === 0) return;
    const interval = setInterval(goToNext, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval, realCount]);

  // Handle scroll & continuous loop
  useEffect(() => {
    if (!containerRef.current || realCount === 0) return;

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
  }, [currentIndex, realCount, slideWidth, scrollToIndex]);

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

  // Badge
  const getImportanceBadge = (importance: number) => {
    if (importance >= 8) return { text: 'BIG MATCH', style: 'bg-red-600 text-white' };
    if (importance >= 6) return { text: 'KEY MATCH', style: 'bg-orange-500 text-white' };
    if (importance >= 4) return { text: 'IMPORTANT', style: 'bg-blue-500 text-white' };
    return null;
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (featuredFixtures.length === 0) return <div>No Featured Games</div>;

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
          const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

          // Debug for missing logos
          if (!homeLogo.logoPath) console.log('Missing home logo:', fixture.homeTeam.name);
          if (!awayLogo.logoPath) console.log('Missing away logo:', fixture.awayTeam.name);
          if (!competitionLogo) console.log('Missing competition logo:', fixture.competition.name);

          return (
            <div key={idx} className="min-w-full p-2 sm:p-4 cursor-pointer" onClick={() => onGameSelect?.(fixture)}>
              <div className="fixture-card bg-gray-50 rounded-xl shadow-md p-4 flex flex-col items-center justify-center">
                {/* Competition Logo */}
                {competitionLogo && <img src={competitionLogo} alt={fixture.competition.name} className="w-16 h-16 mb-2" />}
                {/* Home vs Away */}
                <div className="flex justify-between w-full items-center">
                  <div className="flex flex-col items-center">
                    <img src={homeLogo.logoPath || ''} alt={homeLogo.displayName} className="w-12 h-12 object-contain" />
                    <span>{homeLogo.displayName}</span>
                  </div>
                  <span className="text-xl font-bold">VS</span>
                  <div className="flex flex-col items-center">
                    <img src={awayLogo.logoPath || ''} alt={awayLogo.displayName} className="w-12 h-12 object-contain" />
                    <span>{awayLogo.displayName}</span>
                  </div>
                </div>
                {importanceBadge && (
                  <span className={`mt-2 px-2 py-1 rounded-full ${importanceBadge.style}`}>{importanceBadge.text}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Arrows */}
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full shadow"
        onClick={goToPrev}
      >
        ◀
      </button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full shadow"
        onClick={goToNext}
      >
        ▶
      </button>
    </div>
  );
};
