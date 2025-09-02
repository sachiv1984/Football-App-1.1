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

  const realCount = featuredFixtures.length;
  const slides = realCount > 0
    ? [featuredFixtures[realCount - 1], ...featuredFixtures, featuredFixtures[0]]
    : [];

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
    if (isAnimating || realCount === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev + 1);
  }, [isAnimating, realCount]);

  const goToPrev = useCallback(() => {
    if (isAnimating || realCount === 0) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => prev - 1);
  }, [isAnimating, realCount]);

  useEffect(() => {
    if (realCount === 0 || !containerRef.current) return;
    const container = containerRef.current;
    const slideWidth = container.clientWidth;
    scrollToIndex(currentIndex);

    const handleScrollEnd = () => {
      setIsAnimating(false);

      if (currentIndex >= realCount) {
        // Reset to first real slide without smooth scroll
        setCurrentIndex(0);
        scrollToIndex(0, false);
      }
      if (currentIndex < 0) {
        // Reset to last real slide
        setCurrentIndex(realCount - 1);
        scrollToIndex(realCount - 1, false);
      }
    };

    container.addEventListener('scroll', handleScrollEnd);
    return () => container.removeEventListener('scroll', handleScrollEnd);
  }, [currentIndex, realCount, scrollToIndex]);

  useEffect(() => {
    if (!autoRotate || isPaused || realCount === 0) return;
    const interval = window.setInterval(goToNext, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval, realCount]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrev();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setIsPaused(true);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrev, goToNext]);

  const handleImageError = (teamName: string, logoPath: string | null) => {
    console.warn(`Logo missing for team: ${teamName}, attempted path: ${logoPath}`);
  };

  const getMatchDayLabel = (dateTime: string) => {
    if (!dateTime || dateTime === 'nullTnull' || dateTime === 'null') return 'TBD';
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
    if (!dateTime || dateTime === 'nullTnull' || dateTime === 'null') return 'TBD';
    const matchDate = new Date(dateTime);
    if (isNaN(matchDate.getTime())) return 'TBD';
    return matchDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <div className={`${className}`}>Loading...</div>;
  if (error) return <div className={`${className}`}>Error: {error}</div>;
  if (featuredFixtures.length === 0) return <div className={`${className}`}>No Featured Games</div>;

  return (
    <div
      className={`relative overflow-hidden group ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div ref={containerRef} className="flex overflow-x-scroll scroll-smooth hide-scrollbar">
        {slides.map((fixture, idx) => {
          const homeLogo = getTeamLogo(fixture.homeTeam);
          const awayLogo = getTeamLogo(fixture.awayTeam);
          const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

          if (!homeLogo.logoPath) handleImageError(fixture.homeTeam.name, homeLogo.logoPath);
          if (!awayLogo.logoPath) handleImageError(fixture.awayTeam.name, awayLogo.logoPath);
          if (!competitionLogo) console.warn(`Competition logo missing: ${fixture.competition.name}`);

          return (
            <div key={idx} className="min-w-full flex-shrink-0 p-2">
              <div className="fixture-card bg-white rounded-xl shadow-lg p-4">
                {/* Competition Logo */}
                {competitionLogo && (
                  <img src={competitionLogo} alt={fixture.competition.name} className="w-20 h-20 object-contain mb-2" />
                )}

                {/* Teams */}
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    {homeLogo.logoPath ? (
                      <img src={homeLogo.logoPath} alt={fixture.homeTeam.name} className="w-14 h-14 object-contain" />
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center bg-gray-200 rounded-full">
                        {homeLogo.fallbackInitial}
                      </div>
                    )}
                    <div className="mt-1 font-bold">{homeLogo.displayName}</div>
                  </div>

                  <div className="text-center">
                    <div>VS</div>
                    <div>{getMatchTime(fixture.dateTime)}</div>
                    <div>{getMatchDayLabel(fixture.dateTime)}</div>
                  </div>

                  <div className="text-center">
                    {awayLogo.logoPath ? (
                      <img src={awayLogo.logoPath} alt={fixture.awayTeam.name} className="w-14 h-14 object-contain" />
                    ) : (
                      <div className="w-14 h-14 flex items-center justify-center bg-gray-200 rounded-full">
                        {awayLogo.fallbackInitial}
                      </div>
                    )}
                    <div className="mt-1 font-bold">{awayLogo.displayName}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Arrows (show on hover) */}
      <button
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
        onClick={goToPrev}
      >‹</button>
      <button
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full opacity-0 group-hover:opacity-100 transition"
        onClick={goToNext}
      >›</button>
    </div>
  );
};
