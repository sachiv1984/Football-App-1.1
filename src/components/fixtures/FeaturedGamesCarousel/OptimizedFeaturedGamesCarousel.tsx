import React from 'react';

type Team = { name: string, shortName?: string, logo?: string };
type Competition = { name: string, shortName?: string, logo?: string };
type Fixture = {
  id: number | string;
  homeTeam: Team;
  awayTeam: Team;
  competition: Competition;
  dateTime: string;
  venue: string;
  importance: number;
};

interface Props {
  fixtures: Fixture[];
  onGameSelect?: (fixture: Fixture) => void;
  className?: string;
  isLoading?: boolean;
}

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  className = '',
  isLoading = false,
}) => {
  return (
    <div className={`w-full ${className}`} role="region" aria-label="Featured Games Carousel">
      <div className="carousel-container">
        <div className="carousel-track hide-scrollbar">
          {fixtures.map((fixture, index) => (
            <div className="carousel-slide" key={fixture.id || index}>
              <div
                role="button"
                tabIndex={0}
                aria-label={`View match between ${fixture.homeTeam.name} and ${fixture.awayTeam.name}`}
                onClick={() => onGameSelect?.(fixture)}
              >
                <div className="flex items-center mb-4 space-x-3">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center">
                    {fixture.competition.logo ? (
                      <img
                        src={fixture.competition.logo}
                        alt={fixture.competition.name}
                        className="w-10 h-10 object-contain"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-gray-400 font-medium text-sm">
                        {fixture.competition.name[0] || "?"}
                      </span>
                    )}
                  </div>
                  <span className="text-gray-500 text-sm font-medium truncate">
                    {fixture.competition.shortName || fixture.competition.name}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-center flex-1">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-2 mx-auto">
                      {fixture.homeTeam.logo ? (
                        <img
                          src={fixture.homeTeam.logo}
                          alt={fixture.homeTeam.name}
                          className="w-12 h-12 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-gray-400 font-medium">
                          {fixture.homeTeam.shortName?.[0] || fixture.homeTeam.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-700 truncate px-1">
                      {fixture.homeTeam.shortName || fixture.homeTeam.name}
                    </div>
                  </div>
                  <div className="flex flex-col items-center text-gray-700 px-3">
                    <div className="flex items-center space-x-1 mb-1">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
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
                      <span className="text-sm font-medium">
                        {new Date(fixture.dateTime).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">vs</div>
                  </div>
                  <div className="text-center flex-1">
                    <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-2 mx-auto">
                      {fixture.awayTeam.logo ? (
                        <img
                          src={fixture.awayTeam.logo}
                          alt={fixture.awayTeam.name}
                          className="w-12 h-12 object-contain"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-gray-400 font-medium">
                          {fixture.awayTeam.shortName?.[0] || fixture.awayTeam.name[0]}
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-700 truncate px-1">
                      {fixture.awayTeam.shortName || fixture.awayTeam.name}
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500 truncate" title={fixture.venue}>
                    📍 {fixture.venue}
                  </div>
                </div>
                {fixture.importance >= 80 && (
                  <div className="mt-3 text-center">
                    <span className="inline-block bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded-full font-medium">
                      Featured
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;