import React from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, FreeMode } from 'swiper/modules';

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
if (isLoading) {
  return (
    <div className="w-full space-y-4">
      <Swiper
        modules={[Navigation, Pagination]}
        spaceBetween={20}
        slidesPerView={1}
        breakpoints={{
          640: { slidesPerView: 1.25 },
          768: { slidesPerView: 1.5 },
          1024: { slidesPerView: 2.2 },
          1280: { slidesPerView: 3 },
        }}
        centeredSlides={true}
      >
        {[...Array(4)].map((_, idx) => (
          <SwiperSlide key={idx}>
            <div className="bg-white rounded-xl shadow-md p-4 animate-pulse">
              <div className="flex justify-between items-center mb-4">
                <div className="w-12 h-12 bg-neutral-200 rounded"></div>
                <div className="w-16 h-4 bg-neutral-200 rounded"></div>
              </div>
              <div className="flex justify-center items-center gap-6 mb-4">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-neutral-200 rounded-full mb-1"></div>
                  <div className="w-12 h-3 bg-neutral-200 rounded"></div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-12 h-6 bg-neutral-200 rounded mb-1"></div>
                  <div className="w-16 h-3 bg-neutral-200 rounded"></div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-neutral-200 rounded-full mb-1"></div>
                  <div className="w-12 h-3 bg-neutral-200 rounded"></div>
                </div>
              </div>
              <div className="w-20 h-3 bg-neutral-200 rounded mx-auto"></div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
      <div className="flex justify-center mt-4">
        <div className="flex space-x-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="w-4 h-4 bg-neutral-200 rounded-full animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <p className="text-lg font-medium text-gray-700 mb-4">
          Check back later for featured games
        </p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} role="region" aria-label="Featured Games Carousel">
      <Swiper
        modules={[Navigation, Pagination, FreeMode]}
        navigation
        pagination={{
          clickable: true,
          el: '.swiper-pagination-container',
          renderBullet: (index: number, className: string) => {
            return `<span class="${className} w-4 h-4 md:w-5 md:h-5 rounded-full bg-gray-300 mx-1 inline-block"></span>`;
          },
        }}
        loop={true}
        freeMode={{ enabled: true, momentum: true }}
        spaceBetween={20}
        slidesPerView={1}
        breakpoints={{
          640: { slidesPerView: 1.25 },
          768: { slidesPerView: 1.5 },
          1024: { slidesPerView: 2.2 },
          1280: { slidesPerView: 3 },
        }}
        centeredSlides={true}
      >
        {fixtures.map((fixture) => {
          // Use the shortName already set by FixtureService
          const homeShort = fixture.homeTeam.shortName;
          const awayShort = fixture.awayTeam.shortName;

          return (
            <SwiperSlide key={fixture.id}>
              <button
                className="carousel-card flex flex-col justify-between w-full h-full p-4 bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-focus-gold rounded-xl shadow-md transition-all duration-300"
                onClick={() => onGameSelect?.(fixture)}
                aria-label={`View match between ${fixture.homeTeam.name} and ${fixture.awayTeam.name}`}
              >
                {/* Competition & Week */}
                <div className="flex justify-between items-center mb-4 w-full">
                  <div className="flex items-center justify-start flex-1">
                    {fixture.competition.logo && (
                      <img src={fixture.competition.logo} alt={fixture.competition.name} className="w-12 h-12 object-contain" />
                    )}
                  </div>
                  <div className="flex items-center justify-end flex-1">
                    <span className="text-xs text-gray-500 font-medium">Week {fixture.matchWeek || 1}</span>
                  </div>
                </div>

                {/* Teams & Time */}
                <div className="flex flex-col items-center min-w-0 flex-1 max-w-[90px]">
                {fixture.homeTeam.logo ? (
                <img src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} className="team-logo w-16 h-16 mb-1" />
                 ) : (
                <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-1">
                <span className="text-lg font-bold text-neutral-600">{fixture.homeTeam.name[0]}</span>
                </div>
                  )}
                <span className="text-xs text-center w-full leading-tight">{homeShort}</span>
                </div>

                    {/* Time */}
                    <div className="flex flex-col items-center text-center min-w-[60px] flex-shrink-0">
                      <span className="text-gray-700 font-medium text-base whitespace-nowrap">
                        {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {new Date(fixture.dateTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <div className="flex flex-col items-center min-w-0 flex-1 max-w-[90px]">
                      {fixture.awayTeam.logo ? (
                        <img src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} className="w-16 h-16 object-contain mb-1" />
                      ) : (
                        <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-1">
                          <span className="text-lg font-bold text-gray-600">{fixture.awayTeam.name[0]}</span>
                        </div>
                      )}
                      <span className="text-xs text-center w-full leading-tight">{awayShort}</span>
                    </div>
                  </div>
                </div>

                {/* Venue & Badge */}
                <div className="flex flex-col items-center w-full">
                  <div className="text-xs text-gray-500 truncate text-center w-full px-2">{fixture.venue}</div>
                  {fixture.importance >= 80 && (
                    <span className="mt-2 inline-block bg-[var(--color-focus-gold)] text-[var(--color-neutral-800)] px-2 py-1 rounded-full text-xs sm:text-sm font-medium">Featured</span>
                  )}
                </div>
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Centered Pagination below */}
      <div className="swiper-pagination-container mt-4 flex justify-center" />
    </div>
  );
};

export default FeaturedGamesCarousel;
