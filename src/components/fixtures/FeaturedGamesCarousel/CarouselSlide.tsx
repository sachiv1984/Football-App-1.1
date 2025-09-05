// src/components/fixtures/FeaturedGamesCarousel/CarouselSlide.tsx
import React, { useState } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo } from '../../../utils/teamUtils';
import { TeamLogo } from '../../common/Logo/TeamLogo';
import CompetitionHeader from './CompetitionHeader';
import clsx from 'clsx';

interface CarouselSlideProps {
  fixture: FeaturedFixtureWithImportance;
  index: number;
  isActive: boolean;
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  cardsPerView: number;
}

const CarouselSlide: React.FC<CarouselSlideProps> = ({
  fixture,
  index,
  isActive,
  onGameSelect,
  cardsPerView
}) => {
  const homeLogo = getTeamLogo(fixture.homeTeam);
  const awayLogo = getTeamLogo(fixture.awayTeam);
  const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

  // Calculate styles based on cards per view with max-width caps
  const cardStyle = React.useMemo(() => {
    switch (cardsPerView) {
      case 3: 
        return { maxWidth: 'min(calc((100% - 48px) / 3), 520px)' }; // Desktop: cap at 520px
      case 2: 
        return { maxWidth: 'min(calc((100% - 24px) / 2), 480px)' }; // Tablet: cap at 480px
      case 1: 
        return { maxWidth: 'min(100%, 360px)' }; // Mobile: cap at 360px
      default: 
        return { maxWidth: '100%' };
    }
  }, [cardsPerView]);

  return (
    <div
      className="carousel-slide flex-shrink-0 w-full"
      style={cardStyle}
    >
      <div
        className={clsx(
          'carousel-card w-full bg-white rounded-xl cursor-pointer',
          'transition-all duration-300 ease-in-out',
          'p-6', // Mobile: 24px
          'md:p-8', // Tablet/Desktop: 32px
          'hover:shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2'
        )}
        onClick={() => onGameSelect?.(fixture)}
        tabIndex={0}
        role="button"
        aria-label={`View match between ${homeLogo.displayName} and ${awayLogo.displayName}`}
        style={{
          aspectRatio: '4 / 3',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
          transform: 'none',
          minHeight: 'auto'
        }}
      >
        {/* Competition header */}
        <CompetitionHeader
          competitionName={fixture.competition.name}
          competitionLogo={competitionLogo ?? undefined}
          matchWeek={fixture.matchWeek}
        />

        {/* Teams Section */}
        {/* ... unchanged code for teams, kickoff, venue ... */}
      </div>
    </div>
  );
};

export default CarouselSlide;
