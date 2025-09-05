// src/components/fixtures/FeaturedGamesCarousel/CarouselSlide.tsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo } from '../../../utils/teamUtils';
import { TeamLogo } from '../../common/Logo/TeamLogo';
import CompetitionHeader from './CompetitionHeader';

interface CarouselSlideProps {
  fixture: FeaturedFixtureWithImportance;
  index: number;
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  cardsPerView: number;
}

const CarouselSlide: React.FC<CarouselSlideProps> = ({
  fixture,
  onGameSelect,
  cardsPerView
}) => {
  const homeLogo = getTeamLogo(fixture.homeTeam);
  const awayLogo = getTeamLogo(fixture.awayTeam);
  const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

  // Width calculation per card
  const cardStyle = useMemo(() => {
    switch (cardsPerView) {
      case 3: return { maxWidth: 'calc((100% - 48px) / 3)' };
      case 2: return { maxWidth: 'calc((100% - 24px) / 2)' };
      default: return { maxWidth: '100%' };
    }
  }, [cardsPerView]);

  return (
    <div className="carousel-slide" style={cardStyle}>
      <div
        className="carousel-card"
        onClick={() => onGameSelect?.(fixture)}
        tabIndex={0}
        role="button"
        aria-label={`View match between ${homeLogo.displayName} and ${awayLogo.displayName}`}
      >
        {/* Competition header */}
        <CompetitionHeader
          competitionName={fixture.competition.name}
          competitionLogo={competitionLogo ?? undefined}
          matchWeek={fixture.matchWeek}
        />

        {/* Teams + Kick-off */}
        <div className="flex items-center justify-between w-full mt-4 md:mt-6">
          <TeamBlock team={homeLogo} />
          <MatchDateTime dateTime={fixture.dateTime} />
          <TeamBlock team={awayLogo} />
        </div>

        {/* Venue */}
        <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-100 w-full text-center">
          <VenueWithTooltip venue={fixture.venue?.trim() || 'TBD'} />
        </div>
      </div>
    </div>
  );
};

const TeamBlock: React.FC<{ team: { displayName: string; logoPath?: string } }> = ({ team }) => (
  <div className="flex flex-col items-center flex-1 min-w-0 px-2">
    <div className="mb-3 flex items-center justify-center">
      <div className="w-20 h-20 rounded-full bg-white shadow-card flex items-center justify-center hover:scale-105 transition-transform">
        <TeamLogo
          logo={team.logoPath ?? undefined}
          name={team.displayName}
          size={60}
          background="transparent"
        />
      </div>
    </div>
    <span className="text-xs md:text-sm font-semibold text-gray-900 text-center leading-tight">
      {team.displayName}
    </span>
  </div>
);

const MatchDateTime: React.FC<{ dateTime: string }> = ({ dateTime }) => {
  const date = new Date(dateTime);
  return (
    <div className="flex flex-col items-center flex-1 text-center px-2 md:px-4">
      <div className="flex items-center gap-2 mb-1 text-gray-600">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </svg>
        <span className="font-semibold text-sm md:text-lg">
          {date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </span>
      </div>
      <span className="font-medium text-sm md:text-lg text-gray-700">
        {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};

const VenueWithTooltip: React.FC<{ venue: string }> = ({ venue }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [venue]);

  return (
    <div
      className="relative flex items-center justify-center gap-1"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="text-sm">📍</span>
      <span ref={textRef} className="font-medium truncate max-w-[200px] md:max-w-[250px] text-sm md:text-base text-gray-500">
        {venue}
      </span>
      {showTooltip && isTruncated && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-10">
          {venue}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default CarouselSlide;
