import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import type { FeaturedFixtureWithImportance } from '../../../types';

interface Props {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  className?: string;
  isLoading?: boolean;
}

const FeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  className = '',
  isLoading = false,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-6">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="bg-gray-200 animate-pulse rounded-xl p-6" />
        ))}
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="mb-6">
          <svg
            width="120"
            height="120"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            className="mx-auto opacity-80 text-gray-400"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-700 mb-4">
          Check back later for featured games
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full relative ${className}`}>
      <Swiper
        modules={[Navigation, Pagination, A11y]}
        navigation
        pagination={{ clickable: true }}
        spaceBetween={20}
        slidesPerView={'auto'}
        centeredSlides={true}
        onSlideChange={(swiper) => setActiveIndex(swiper.activeIndex)}
        className="pb-12" // extra space for pagination dots
      >
        {fixtures.map((fixture, index) => (
          <SwiperSlide
            key={fixture.id || index}
            style={{ width: 280 }} // can adjust for responsive breakpoints
          >
            <button
              onClick={() => onGameSelect?.(fixture)}
              aria-label={`View match: ${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`}
              className={`carousel-card flex flex-col justify-between w-full h-full p-4 bg-white rounded-xl transition-all duration-300
                ${
                  index === activeIndex
                    ? 'scale-105 shadow-xl border-2 border-yellow-400'
                    : 'scale-95 shadow-md border border-gray-200 opacity-70'
                }
                hover:scale-105 hover:shadow-xl`}
            >
              {/* Competition & Week */}
              <div className="flex justify-between items-center mb-4 w-full">
                <div className="flex items-center justify-start flex-1">
                  {fixture.competition.logo && (
                    <img
                      src={fixture.competition.logo}
                      alt={fixture.competition.name}
                      className="w-12 h-12 object-contain"
                      draggable={false}
                    />
                  )}
                </div>
                <div className="flex items-center justify-end flex-1">
                  <span className="text-xs text-gray-500 font-medium">
                    Week {fixture.matchWeek || 1}
                  </span>
                </div>
              </div>

              {/* Teams & Time */}
              <div className="flex justify-center items-center mb-4 w-full">
                <div className="flex items-center justify-center gap-6 max-w-full">
                  {/* Home Team */}
                  <div className="flex flex-col items-center min-w-0 flex-1 max-w-[90px]">
                    {fixture.homeTeam.logo ? (
                      <img
                        src={fixture.homeTeam.logo}
                        alt={fixture.homeTeam.name}
                        className="w-16 h-16 object-contain mb-1"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                        <span className="text-lg font-bold text-gray-600">
                          {fixture.homeTeam.name[0]}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-center w-full leading-tight">
                      {fixture.homeTeam.shortName || fixture.homeTeam.name}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="flex flex-col items-center text-center min-w-[60px] flex-shrink-0">
                    <span className="text-gray-700 font-medium text-base whitespace-nowrap">
                      {new Date(fixture.dateTime).toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {new Date(fixture.dateTime).toLocaleDateString('en-GB', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center min-w-0 flex-1 max-w-[90px]">
                    {fixture.awayTeam.logo ? (
                      <img
                        src={fixture.awayTeam.logo}
                        alt={fixture.awayTeam.name}
                        className="w-16 h-16 object-contain mb-1"
                        draggable={false}
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mb-1">
                        <span className="text-lg font-bold text-gray-600">
                          {fixture.awayTeam.name[0]}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-center w-full leading-tight">
                      {fixture.awayTeam.shortName || fixture.awayTeam.name}
                    </span>
                  </div>
                </div>
              </div>

              {/* Venue & Badge */}
              <div className="flex flex-col items-center w-full">
                <div className="text-xs text-gray-500 truncate text-center w-full px-2">
                  {fixture.venue}
                </div>
                {fixture.importance >= 80 && (
                  <span className="mt-2 inline-block bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-[10px] sm:text-[12px] font-medium">
                    Featured
                  </span>
                )}
              </div>
            </button>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Centered Pagination Dots */}
      <div className="swiper-pagination-container absolute bottom-2 left-1/2 -translate-x-1/2 flex justify-center" />
    </div>
  );
};

export default FeaturedGamesCarousel;

