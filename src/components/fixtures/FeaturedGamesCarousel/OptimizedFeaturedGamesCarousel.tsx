import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo, getDisplayName } from '../../../utils/teamUtils';
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
  const [showArrows, setShowArrows] = useState(false);

  const realCount = featuredFixtures.length;

  const slides = realCount > 0 ? [
    featuredFixtures[realCount - 1],
    ...featuredFixtures,
    featuredFixtures[0],
  ] : [];

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

  const goToNext = useCallback(() => {
    if (realCount === 0) return;
    setCurrentIndex((prev) => prev + 1);
  }, [realCount]);

  const goToPrev = useCallback(() => {
    if (realCount === 0) return;
    setCurrentIndex((prev) => prev - 1);
  }, [realCount]);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) goToNext();
    if (distance < -50) goToPrev();
    setTouchStart(0);
    setTouchEnd(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setIsPaused(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev]);

  useEffect(() => {
    if (!autoRotate || isPaused || realCount === 0) return;
    const interval = setInterval(goToNext, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval, realCount]);

  useEffect(() => {
    if (!containerRef.current || realCount === 0) return;
    const container = containerRef.current;
    scrollToIndex(currentIndex);

    const handleScrollEnd = () => {
      if (currentIndex >= realCount) {
        setCurrentIndex(0);
        scrollToIndex(0, false);
      }
      if (currentIndex < 0) {
        setCurrentIndex(realCount - 1);
        scrollToIndex(realCount - 1, false);
      }
    };

    container.addEventListener('scroll', handleScrollEnd);
    return () => container.removeEventListener('scroll', handleScrollEnd);
  }, [currentIndex, realCount, scrollToIndex]);

  const handleImageError = (teamName: string, logoPath: string | null) => {
    console.warn(`Logo missing for ${teamName}: ${logoPath}`);
  };

  if (loading) {
    return <div className={`${className} h-64 flex items-center justify-center`}>Loading...</div>;
  }

  if (error) {
    return <div className={`${className} h-64 flex items-center justify-center text-red-600`}>Error: {error}</div>;
  }

  if (realCount === 0) {
    return <div className={`${className} h-64 flex items-center justify-center`}>No Featured Games</div>;
  }

  return (
    <div
      className={`relative overflow-hidden group ${className}`}
      onMouseEnter={() => { setIsPaused(true); setShowArrows(true); }}
      onMouseLeave={() => { setIsPaused(false); setShowArrows(false); }}
    >
      <div
        ref={containerRef}
        className="flex overflow-x-scroll scroll-smooth hide-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {slides.map((fixture, idx) => {
          const homeLogo = getTeamLogo(fixture.homeTeam);
          const awayLogo = getTeamLogo(fixture.awayTeam);
          const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

          return (
            <div key={idx} className="min-w-full flex-shrink-0 p-4 cursor-pointer" onClick={() => onGameSelect?.(fixture)}>
              <div className="bg-white rounded-xl shadow-lg p-4 flex flex-col items-center">
                {competitionLogo && <img src={competitionLogo} alt={`${fixture.competition.name} logo`} className="w-16 h-16 mb-2" />}
                <div className="flex justify-between w-full items-center mb-2">
                  <div className="flex flex-col items-center">
                    {homeLogo.logoPath ? (
                      <img src={homeLogo.logoPath} alt={fixture.homeTeam.name} className="w-14 h-14 object-contain" onError={() => handleImageError(fixture.homeTeam.name, homeLogo.logoPath)} />
                    ) : (
                      <div className="w-14 h-14 bg-gray-200 flex items-center justify-center text-gray-600 font-bold">{homeLogo.fallbackInitial}</div>
                    )}
                    <div className="mt-1 text-center">{getDisplayName(fixture.homeTeam.name, fixture.homeTeam.shortName)}</div>
                  </div>
                  <div className="text-xl font-bold">VS</div>
                  <div className="flex flex-col items-center">
                    {awayLogo.logoPath ? (
                      <img src={awayLogo.logoPath} alt={fixture.awayTeam.name} className="w-14 h-14 object-contain" onError={() => handleImageError(fixture.awayTeam.name, awayLogo.logoPath)} />
                    ) : (
                      <div className="w-14 h-14 bg-gray-200 flex items-center justify-center text-gray-600 font-bold">{awayLogo.fallbackInitial}</div>
                    )}
                    <div className="mt-1 text-center">{getDisplayName(fixture.awayTeam.name, fixture.awayTeam.shortName)}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-500">{fixture.venue}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrows */}
      {showArrows && (
        <>
          <button
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow"
            onClick={goToPrev}
          >
            &#10094;
          </button>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow"
            onClick={goToNext}
          >
            &#10095;
          </button>
        </>
      )}
    </div>
  );
};
