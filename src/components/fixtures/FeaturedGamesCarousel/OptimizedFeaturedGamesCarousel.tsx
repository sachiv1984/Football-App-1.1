// src/components/OptimizedFeaturedGamesCarousel.tsx
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
  fixtures,
  onGameSelect,
  autoRotate = true,
  rotateInterval = 5000,
  className = '',
}) => {
  const { featuredFixtures: fetchedFixtures, loading, error } = useFixtures();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const data = fixtures || fetchedFixtures;
  const realCount = data.length;

  // --- Responsive: check mobile ---
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Auto-rotation ---
  useEffect(() => {
    if (!autoRotate || isPaused || realCount === 0) return;
    const timer = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % realCount);
    }, rotateInterval);
    return () => clearInterval(timer);
  }, [autoRotate, isPaused, rotateInterval, realCount]);

  // --- Reset to first fixture on data change ---
  useEffect(() => {
    if (realCount > 0) {
      setCurrentIndex(0);
    }
  }, [realCount]);

  // --- Swipe handling ---
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (touchStart - touchEnd > 50) {
      setCurrentIndex(prev => (prev + 1) % realCount); // swipe left → next
    }
    if (touchEnd - touchStart > 50) {
      setCurrentIndex(prev => (prev - 1 + realCount) % realCount); // swipe right → prev
    }
  };

  // --- Click handler ---
  const handleGameClick = useCallback(
    (fixture: FeaturedFixtureWithImportance) => {
      if (onGameSelect) onGameSelect(fixture);
    },
    [onGameSelect]
  );

  if (loading) return <div>Loading fixtures...</div>;
  if (error) return <div>Error loading fixtures: {error}</div>;
  if (realCount === 0) return <div>No fixtures available</div>;

  const fixture = data[currentIndex];

  return (
    <div
      className={`featured-carousel ${className}`}
      ref={containerRef}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className="carousel-slide"
        onClick={() => handleGameClick(fixture)}
        style={{ cursor: onGameSelect ? 'pointer' : 'default' }}
      >
        {/* Competition */}
        <div className="competition">
          <img
            src={getCompetitionLogo(fixture.competition.logo)}
            alt={fixture.competition.name}
            className="competition-logo"
          />
          <span>{fixture.competition.name}</span>
        </div>

        {/* Teams */}
        <div className="teams">
          <div className="team">
            <img src={getTeamLogo(fixture.homeTeam.logo)} alt={fixture.homeTeam.name} />
            <span>{fixture.homeTeam.shortName}</span>
          </div>
          <span className="vs">vs</span>
          <div className="team">
            <img src={getTeamLogo(fixture.awayTeam.logo)} alt={fixture.awayTeam.name} />
            <span>{fixture.awayTeam.shortName}</span>
          </div>
        </div>

        {/* Fixture meta */}
        <div className="fixture-meta">
          <div>Matchweek: {fixture.matchWeek}</div>
          <div>Venue: {fixture.venue || 'TBD'}</div>
          <div>{new Date(fixture.dateTime).toLocaleString()}</div>
        </div>
      </div>

      {/* Dots navigation */}
      <div className="dots">
        {data.map((_, i) => (
          <span
            key={i}
            className={`dot ${i === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(i)}
          />
        ))}
      </div>
    </div>
  );
};
