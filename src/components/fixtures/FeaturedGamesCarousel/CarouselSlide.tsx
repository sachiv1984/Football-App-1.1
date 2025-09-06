// Fixed CarouselSlide.tsx - Remove conflicting width styles
import React from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';

interface CarouselSlideProps {
  fixture: FeaturedFixtureWithImportance;
  index: number;
  isActive: boolean;
  onGameSelect: (fixture: FeaturedFixtureWithImportance) => void;
  cardsPerView: number;
}

const CarouselSlide: React.FC<CarouselSlideProps> = ({
  fixture,
  index,
  isActive,
  onGameSelect,
  cardsPerView // Remove this parameter as it's not needed for width calculation
}) => {
  // Remove the cardWidth calculation - let CSS handle the layout
  
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`View match between ${fixture.homeTeam.name} and ${fixture.awayTeam.name}`}
      aria-live={isActive ? "polite" : undefined}
      onClick={() => onGameSelect(fixture)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onGameSelect(fixture);
        }
      }}
      className={`
        carousel-card carousel-slide
        ${isActive ? 'carousel-slide-active' : ''}
        transition-all duration-300 ease-in-out
        cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2
      `}
      // Remove the inline style that was setting width
    >
      {/* Competition header */}
      <div className="flex items-center mb-4 space-x-3">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white shadow flex items-center justify-center">
          {fixture.competition.logo ? (
            <img
              src={fixture.competition.logo}
              alt={`${fixture.competition.name} logo`}
              className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
              loading="lazy"
            />
          ) : (
            <span className="text-gray-400 font-medium">
              {fixture.competition.name[0] || "?"}
            </span>
          )}
        </div>
        <span className="text-gray-500 text-sm sm:text-base">
          {fixture.competition.shortName || fixture.competition.name}
        </span>
      </div>

      {/* Teams & kickoff */}
      <div className="flex items-center justify-between mb-4">
        {/* Home team */}
        <div className="text-center">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white shadow flex items-center justify-center mb-2 mx-auto">
            {fixture.homeTeam.logo ? (
              <img
                src={fixture.homeTeam.logo}
                alt={fixture.homeTeam.name}
                className="w-12 h-12 lg:w-16 lg:h-16 object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-gray-400 font-medium text-lg">
                {fixture.homeTeam.shortName?.[0] || fixture.homeTeam.name[0]}
              </span>
            )}
          </div>
          <div className="text-xs lg:text-sm font-medium text-gray-700 max-w-[80px] truncate">
            {fixture.homeTeam.shortName || fixture.homeTeam.name}
          </div>
        </div>

        {/* Kickoff */}
        <div className="flex flex-col items-center text-gray-700 text-base sm:text-lg px-2">
          <div className="flex items-center space-x-1 mb-1">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 sm:h-4 sm:w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm lg:text-base font-medium">
              {new Date(fixture.dateTime).toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="text-xs text-gray-500">vs</div>
        </div>

        {/* Away team */}
        <div className="text-center">
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-white shadow flex items-center justify-center mb-2 mx-auto">
            {fixture.awayTeam.logo ? (
              <img
                src={fixture.awayTeam.logo}
                alt={fixture.awayTeam.name}
                className="w-12 h-12 lg:w-16 lg:h-16 object-contain"
                loading="lazy"
              />
            ) : (
              <span className="text-gray-400 font-medium text-lg">
                {fixture.awayTeam.shortName?.[0] || fixture.awayTeam.name[0]}
              </span>
            )}
          </div>
          <div className="text-xs lg:text-sm font-medium text-gray-700 max-w-[80px] truncate">
            {fixture.awayTeam.shortName || fixture.awayTeam.name}
          </div>
        </div>
      </div>

      {/* Venue */}
      <div className="text-center">
        <div className="text-sm text-gray-500 truncate" title={fixture.venue}>
          📍 {fixture.venue}
        </div>
      </div>

      {/* Optional: Show importance indicator */}
      {fixture.importance >= 80 && (
        <div className="mt-3 text-center">
          <span className="inline-block bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded-full font-medium">
            Featured
          </span>
        </div>
      )}
    </div>
  );
};

export default CarouselSlide;