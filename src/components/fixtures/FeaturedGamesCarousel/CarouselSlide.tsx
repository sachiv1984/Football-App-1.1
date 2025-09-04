
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
          competitionLogo={competitionLogo}
          matchWeek={fixture.matchWeek}
        />

        {/* Teams Section */}
        <div className="flex items-center justify-between w-full mt-4">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1">
            <TeamLogo
              logo={homeLogo.logoPath ?? undefined}
              name={homeLogo.displayName}
              size={80}
              background="white"
              className="mb-2"
            />
            <span className="text-base font-semibold text-gray-900 text-center">
              {homeLogo.displayName}
            </span>
          </div>

          {/* Kick-off / Date */}
          <div className="flex flex-col items-center flex-1 text-center">
            <div className="text-lg font-semibold text-gray-900">
              {new Date(fixture.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </div>
            <div className="text-base text-gray-600 mt-1">
              {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1">
            <TeamLogo
              logo={awayLogo.logoPath ?? undefined}
              name={awayLogo.displayName}
              size={80}
              background="white"
              className="mb-2"
            />
            <span className="text-base font-semibold text-gray-900 text-center">
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
