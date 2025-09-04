// src/components/fixtures/FeaturedGamesCarousel/CarouselSlide.tsx
import React from 'react';
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
}

const CarouselSlide: React.FC<CarouselSlideProps> = ({
  fixture,
  index,
  isActive,
  onGameSelect
}) => {
  const homeLogo = getTeamLogo(fixture.homeTeam);
  const awayLogo = getTeamLogo(fixture.awayTeam);
  const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

  return (
    <div
      key={fixture.id || index}
      className={clsx(
        'carousel-slide flex-shrink-0',
        // Responsive widths
        'w-full max-w-[360px]', // Mobile: 100% width, max 360px
        'sm:w-[48%] sm:max-w-[480px]', // Tablet: 48% width, max 480px
        'lg:w-[32%] lg:max-w-[520px]', // Desktop: 32% width, max 520px
        // Opacity for inactive slides
        {
          'opacity-100': isActive,
          'opacity-75': !isActive
        }
      )}
      aria-hidden={!isActive}
    >
      <div
        className={clsx(
          'carousel-card w-full bg-white rounded-xl cursor-pointer',
          'transition-all duration-300 ease-in-out',
          // Responsive padding
          'p-6', // Mobile: 24px
          'md:p-8', // Tablet/Desktop: 32px
          // Base shadow
          'shadow-card',
          // Interactive states
          'hover:shadow-card-hover hover:scale-[1.02]',
          'focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2',
          // Active slide styling
          {
            'scale-105 shadow-card-hover': isActive,
            'scale-100': !isActive
          }
        )}
        onClick={() => onGameSelect?.(fixture)}
        tabIndex={isActive ? 0 : -1}
        role="button"
        aria-label={`View match between ${homeLogo.displayName} and ${awayLogo.displayName}`}
        style={{
          aspectRatio: '4 / 3',
          boxShadow: isActive 
            ? 'var(--shadow-card-hover)' 
            : 'var(--shadow-card)'
        }}
      >
        {/* Competition header */}
        <CompetitionHeader
          competitionName={fixture.competition.name}
          competitionLogo={competitionLogo ?? undefined}
          matchWeek={fixture.matchWeek}
        />

        {/* Teams Section */}
        <div className="flex items-center justify-between w-full mt-4 md:mt-6">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <div className="mb-3 flex items-center justify-center w-16 h-16 md:w-20 md:h-20">
              <TeamLogo
                logo={homeLogo.logoPath ?? undefined}
                name={homeLogo.displayName}
                size={isActive ? 80 : 72}
                background="white"
                className="drop-shadow-sm transition-all duration-300"
              />
            </div>
            <span className="text-xs md:text-sm font-semibold text-gray-900 text-center leading-tight">
              {homeLogo.displayName}
            </span>
          </div>

          {/* Kick-off / Date */}
          <div className="flex flex-col items-center flex-1 text-center px-2 md:px-4">
            <div className="text-base md:text-lg font-semibold text-gray-900 mb-1">
              {new Date(fixture.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
            <div className="text-xs md:text-sm text-gray-600">
              {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-medium">
              Kick-off
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <div className="mb-3 flex items-center justify-center w-16 h-16 md:w-20 md:h-20">
              <TeamLogo
                logo={awayLogo.logoPath ?? undefined}
                name={awayLogo.displayName}
                size={isActive ? 80 : 72}
                background="white"
                className="drop-shadow-sm transition-all duration-300"
              />
            </div>
            <span className="text-xs md:text-sm font-semibold text-gray-900 text-center leading-tight">
              {awayLogo.displayName}
            </span>
          </div>
        </div>

        {/* Venue */}
        <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-100 w-full text-center">
          <div className="text-xs md:text-sm font-medium text-gray-600 flex items-center justify-center gap-1">
            <span className="text-sm">📍</span>
            <span>{fixture.venue?.trim() || 'TBD'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarouselSlide;