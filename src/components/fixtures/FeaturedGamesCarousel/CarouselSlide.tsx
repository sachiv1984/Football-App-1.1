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

  // Calculate card width based on cards per view
  const getCardWidth = () => {
    switch (cardsPerView) {
      case 3: return 'w-full max-w-[320px]'; // Desktop: ~32% with gaps
      case 2: return 'w-full max-w-[400px]'; // Tablet: ~48% with gaps  
      case 1: return 'w-full max-w-[360px]'; // Mobile: 100%
      default: return 'w-full max-w-[360px]';
    }
  };

  return (
    <div
      className={clsx(
        'carousel-slide flex-shrink-0',
        getCardWidth()
      )}
      style={getMaxWidth()}
    >
      <div
        className={clsx(
          'carousel-card w-full bg-white rounded-xl cursor-pointer',
          'transition-all duration-300 ease-in-out',
          // Responsive padding
          'p-6', // Mobile: 24px
          'md:p-8', // Tablet/Desktop: 32px
          // Interactive states
          'hover:shadow-lg hover:scale-[1.02]',
          'focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2'
        )}
        onClick={() => onGameSelect?.(fixture)}
        tabIndex={0}
        role="button"
        aria-label={`View match between ${homeLogo.displayName} and ${awayLogo.displayName}`}
        style={{
          aspectRatio: '4 / 3',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
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
            <div className="mb-3 flex items-center justify-center">
              <div 
                className="transition-all duration-300 ease-in-out hover:scale-105"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TeamLogo
                  logo={homeLogo.logoPath ?? undefined}
                  name={homeLogo.displayName}
                  size={60}
                  background="transparent"
                  className="transition-all duration-300"
                />
              </div>
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
            <div className="mb-3 flex items-center justify-center">
              <div 
                className="transition-all duration-300 ease-in-out hover:scale-105"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TeamLogo
                  logo={awayLogo.logoPath ?? undefined}
                  name={awayLogo.displayName}
                  size={60}
                  background="transparent"
                  className="transition-all duration-300"
                />
              </div>
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