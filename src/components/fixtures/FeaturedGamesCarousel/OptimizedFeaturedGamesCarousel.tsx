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
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

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

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
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
    const interval = window.setInterval(goToNext, rotateInterval);
    return () => clearInterval(interval);
  }, [autoRotate, isPaused, goToNext, rotateInterval, realCount]);

  useEffect(() => {
    if (realCount === 0) return;
    scrollToIndex(currentIndex);
    const handleTransitionEnd = () => {
      setIsAnimating(false);
      if (currentIndex >= realCount) setCurrentIndex(0);
      if (currentIndex < 0) setCurrentIndex(realCount - 1);
    };
    const container = containerRef.current;
    if (container) container.addEventListener('scroll', handleTransitionEnd);
    return () => container?.removeEventListener('scroll', handleTransitionEnd);
  }, [currentIndex, realCount, scrollToIndex]);

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
    <div className={`relative overflow-hidden group ${className}`} onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <div ref={containerRef} className="flex overflow-x-scroll scroll-smooth hide-scrollbar" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
        {slides.map((fixture, idx) => {
          const importanceBadge = getImportanceBadge(fixture.importance);
          const homeLogo = getTeamLogo(fixture.homeTeam);
          const awayLogo = getTeamLogo(fixture.awayTeam);
          const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);
          const matchDayLabel = getMatchDayLabel(fixture.dateTime);
          const matchTime = getMatchTime(fixture.dateTime);

          return (
            <div key={idx} className="min-w-full flex-shrink-0 p-2 sm:p-4 cursor-pointer" onClick={() => onGameSelect?.(fixture)}>
              <div className="fixture-card relative bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] border border-gray-100">

                {/* Header with Competition Logo */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-t-xl px-4 sm:px-6 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">{competitionLogo && <img src={competitionLogo} alt={`${fixture.competition.name} logo`} className="w-20 h-20 sm:w-24 sm:h-24 object-contain" />}</div>
                    <div className="flex items-center space-x-3">
                      <span className="text-xs sm:text-sm text-gray-500">Week {fixture.matchWeek}</span>
                      {importanceBadge && <span className={`px-2 py-1 text-xs font-bold rounded-full ${importanceBadge.style}`}>{importanceBadge.text}</span>}
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">{fixture.venue}</h3>
                  </div>
                </div>

                {/* Main fixture content */}
                <div className="p-4 sm:p-6 flex justify-between items-center">
                  {/** Home Team */}
                  <TeamDisplay team={fixture.homeTeam} logo={homeLogo} />

                  {/** VS / Match Time */}
                  <div className="flex flex-col items-center px-4 sm:px-8 space-y-2">
                    <div className="text-2xl sm:text-3xl font-bold text-gray-400">VS</div>
                    <div className="text-center bg-gray-50 rounded-lg px-3 py-2 border">
                      <div className="text-sm sm:text-base font-bold text-gray-900">{matchTime}</div>
                      <div className="text-xs sm:text-sm text-gray-600">{matchDayLabel}</div>
                    </div>
                  </div>

                  {/** Away Team */}
                  <TeamDisplay team={fixture.awayTeam} logo={awayLogo} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------------------
// TeamDisplay component
// ------------------------------
const TeamDisplay: React.FC<{ team: any; logo: any }> = ({ team, logo }) => {
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.style.display = 'none';
    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
    if (fallback) fallback.style.display = 'flex';
  };

  return (
    <div className="flex flex-col items-center space-y-3 flex-1">
      <div className="w-14 h-14 sm:w-18 sm:h-18 flex items-center justify-center relative">
        {logo.logoPath ? (
          <>
            <img src={logo.logoPath} alt={team.name} className="w-full h-full object-contain drop-shadow-sm" onError={handleImageError} />
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full absolute inset-0 hidden items-center justify-center text-gray-600 font-bold text-sm sm:text-lg border-2 border-gray-300">
              {logo.fallbackInitial}
            </div>
          </>
        ) : (
          <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold text-sm sm:text-lg border-2 border-gray-300">
            {logo.fallbackInitial}
          </div>
        )}
      </div>
      <div className="text-center">
        <div className="font-bold text-base sm:text-xl text-gray-900">{getDisplayTeamName(team.name, team.shortName)}</div>
        <div className="text-xs sm:text-sm text-gray-500 font-medium mt-1">{team.isHome ? 'Home' : 'Away'}</div>
        {team.form && (
          <div className="flex space-x-1 mt-2 justify-center">
            {team.form.slice(-5).map((result: string, i: number) => (
              <span key={i} className={`w-5 h-5 sm:w-6 sm:h-6 text-xs font-bold rounded-full flex items-center justify-center ${
                result === 'W' ? 'bg-green-500 text-white' :
                result === 'D' ? 'bg-yellow-500 text-white' :
                'bg-red-500 text-white'
              }`}>
                {result}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
