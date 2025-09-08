import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation } from 'swiper/modules/navigation';
import { Pagination } from 'swiper/modules/pagination';
import { A11y } from 'swiper/modules/a11y';
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

const shortNameMap: Record<string, string> = {
  Wolverhampton: 'Wolves',
  ManchesterUnited: 'Man U',
  ManchesterCity: 'Man City',
  // add other mappings here
};

const FeaturedGamesSwiper: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  className = '',
  isLoading = false,
}) => {
  if (isLoading || fixtures.length === 0) {
    return (
      <div className="py-6 flex justify-center items-center">
        <span className="text-gray-500">Loading fixtures...</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={20}
        slidesPerView={1.2} // peek effect
        centeredSlides
        navigation
        pagination={{ clickable: true }}
        breakpoints={{
          640: { slidesPerView: 1.5 },
          768: { slidesPerView: 2 },
          1024: { slidesPerView: 3 },
        }}
        className="py-6"
      >
        {fixtures.map((fixture) => {
          const homeName = fixture.homeTeam.shortName || shortNameMap[fixture.homeTeam.name] || fixture.homeTeam.name;
          const awayName = fixture.awayTeam.shortName || shortNameMap[fixture.awayTeam.name] || fixture.awayTeam.name;

          return (
            <SwiperSlide key={fixture.id}>
              <button
                onClick={() => onGameSelect?.(fixture)}
                className="w-full h-full bg-white rounded-xl shadow-md p-4 flex flex-col justify-between transition-transform duration-300 hover:scale-105 focus:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-gold"
                aria-label={`View match: ${homeName} versus ${awayName} at ${fixture.venue} on ${new Date(fixture.dateTime).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
              >
                {/* Competition & Week */}
                <div className="flex justify-between items-center mb-4">
                  {fixture.competition.logo && (
                    <img src={fixture.competition.logo} alt={fixture.competition.name} className="w-12 h-12 object-contain" loading="lazy" />
                  )}
                  <span className="text-xs text-gray-500 font-medium">Week {fixture.matchWeek || 1}</span>
                </div>

                {/* Teams */}
                <div className="flex justify-center items-center gap-6 mb-4">
                  {/* Home Team */}
                  <div className="flex flex-col items-center">
                    {fixture.homeTeam.logo ? (
                      <img src={fixture.homeTeam.logo} alt={homeName} className="w-16 h-16 object-contain" loading="lazy" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-600">{homeName[0]}</span>
                      </div>
                    )}
                    <span className="text-xs text-center">{homeName}</span>
                  </div>

                  {/* Match Time */}
                  <div className="flex flex-col items-center">
                    <span className="text-gray-700 font-medium text-base">
                      {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(fixture.dateTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                  </div>

                  {/* Away Team */}
                  <div className="flex flex-col items-center">
                    {fixture.awayTeam.logo ? (
                      <img src={fixture.awayTeam.logo} alt={awayName} className="w-16 h-16 object-contain" loading="lazy" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-gray-600">{awayName[0]}</span>
                      </div>
                    )}
                    <span className="text-xs text-center">{awayName}</span>
                  </div>
                </div>

                {/* Venue & Badge */}
                <div className="flex flex-col items-center">
                  <div className="text-xs text-gray-500 truncate text-center">{fixture.venue}</div>
                  {fixture.importance >= 80 && (
                    <span className="mt-2 inline-block bg-yellow-400 text-gray-900 px-2 py-1 rounded-full text-[10px] sm:text-[12px] font-medium">
                      Featured
                    </span>
                  )}
                </div>
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Pagination Container (centered below carousel) */}
      <div className="swiper-pagination-container mt-4 flex justify-center"></div>
    </div>
  );
};

export default FeaturedGamesSwiper;

