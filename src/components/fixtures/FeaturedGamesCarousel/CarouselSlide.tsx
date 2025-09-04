// src/components/fixtures/FeaturedGamesCarousel
import React from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo } from '../../../utils/teamUtils';
import { TeamLogo } from '../../common/Logo/TeamLogo';
import CompetitionHeader from './CompetitionHeader';

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
      className="carousel-slide flex-shrink-0 w-full flex justify-center"
      aria-hidden={!isActive}
    >
      <div
        className="carousel-card w-full max-w-xl p-6 md:p-8 flex flex-col items-center justify-center cursor-pointer"
        onClick={() => onGameSelect?.(fixture)}
        tabIndex={isActive ? 0 : -1}
        role="button"
        aria-label={`View match between ${homeLogo.displayName} and ${awayLogo.displayName}`}
      >
        {/* Competition header */}
        <CompetitionHeader
          competitionName={fixture.competition.name}
          competitionLogo={competitionLogo ?? undefined}
          matchWeek={fixture.matchWeek}
        />

        {/* Teams Section */}
        <div className="flex items-center justify-between w-full mt-6">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <div className="mb-3 flex items-center justify-center w-20 h-20">
              <TeamLogo
                logo={homeLogo.logoPath ?? undefined}
                name={homeLogo.displayName}
                size={80}
                background="white"
                className="drop-shadow-sm"
              />
            </div>
            <span className="text-sm md:text-base font-semibold text-gray-900 text-center leading-tight">
              {homeLogo.displayName}
            </span>
          </div>

          {/* Kick-off / Date */}
          <div className="flex flex-col items-center flex-1 text-center px-4">
            <div className="text-lg md:text-xl font-semibold text-gray-900 mb-1">
              {new Date(fixture.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
            <div className="text-sm md:text-base text-gray-600">
              {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="text-xs text-gray-500 mt-1 uppercase tracking-wide font-medium">
              Kick-off
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <div className="mb-3 flex items-center justify-center w-20 h-20">
              <TeamLogo
                logo={awayLogo.logoPath ?? undefined}
                name={awayLogo.displayName}
                size={80}
                background="white"
                className="drop-shadow-sm"
              />
            </div>
            <span className="text-sm md:text-base font-semibold text-gray-900 text-center leading-tight">
              {awayLogo.displayName}
            </span>
          </div>
        </div>

        {/* Venue */}
        <div className="mt-6 pt-4 border-t border-gray-100 w-full text-center text-sm font-medium text-gray-600">
          📍 {fixture.venue?.trim() || 'TBD'}
        </div>
      </div>
    </div>
  );
};

export default CarouselSlide;
