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

const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  fixtures,
  onGameSelect,
  className = '',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 p-6">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="skeleton rounded-xl p-6 h-64" />
        ))}
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <p className="text-lg font-medium text-neutral-700 mb-4">
          Check back later for featured games
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`w-full ${className}`} 
      style={{overflow: 'visible'}}
      role="region" 
      aria-label="Featured Games Carousel"
      >
      <Swiper
        modules={[Navigation, Pagination, FreeMode]}
        navigation
        pagination={{
          clickable: true,
          el: '.swiper-pagination-container',
          renderBullet: (index: number, className: string) => {
            return `<span class="${className} carousel-dot"></span>`;
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
              <div className="py-4">
              <button
                className="carousel-card flex flex-col justify-between w-full p-4 py-6"
                onClick={() => onGameSelect?.(fixture)}
                aria-label={`View match between ${fixture.homeTeam.name} and ${fixture.awayTeam.name}`}
              >
                {/* Competition & Week */}
                <div className="flex justify-between items-center mb-4 w-full">
                  <div className="flex items-center justify-start flex-1">
                    {fixture.competition.logo && (
                      <img 
                        src={fixture.competition.logo} 
                        alt={fixture.competition.name} 
                        className="w-12 h-12 object-contain team-logo" 
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-end flex-1">
                    <span className="text-xs text-neutral-500 font-medium">Week {fixture.matchWeek || 1}</span>
                  </div>
                </div>

                {/* Teams & Time */}
                <div className="flex justify-center items-center mb-4 w-full">
                  <div className="flex items-center justify-center gap-6 max-w-full">
                    <div className="flex flex-col items-center min-w-0 flex-1 max-w-[90px]">
                      {fixture.homeTeam.logo ? (
                        <img 
                          src={fixture.homeTeam.logo} 
                          alt={fixture.homeTeam.name} 
                          className="w-16 h-16 object-contain mb-1 team-logo" 
                        />
                      ) : (
                        <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-1">
                          <span className="text-lg font-bold text-neutral-600">{fixture.homeTeam.name[0]}</span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-neutral-700 text-center truncate w-full leading-tight">
                        {homeShort}
                      </span>
                    </div>

                    {/* Time */}
                    <div className="flex flex-col items-center text-center min-w-[60px] flex-shrink-0">
                      <span className="text-neutral-800 font-medium text-base whitespace-nowrap">
                        {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      <span className="text-xs text-neutral-500 whitespace-nowrap">
                        {new Date(fixture.dateTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <div className="flex flex-col items-center min-w-0 flex-1 max-w-[90px]">
                      {fixture.awayTeam.logo ? (
                        <img 
                          src={fixture.awayTeam.logo} 
                          alt={fixture.awayTeam.name} 
                          className="w-16 h-16 object-contain mb-1 team-logo" 
                        />
                      ) : (
                        <div className="w-16 h-16 bg-neutral-200 rounded-full flex items-center justify-center mb-1">
                          <span className="text-lg font-bold text-neutral-600">{fixture.awayTeam.name[0]}</span>
                        </div>
                      )}
                      <span className="text-sm font-medium text-neutral-700 text-center truncate w-full leading-tight">
                        {awayShort}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Venue & Badge */}
                <div className="flex flex-col items-center w-full">
                  <div className="text-xs text-neutral-500 truncate text-center w-full px-2">{fixture.venue}</div>
                  {fixture.importance >= 80 && (
                    <span className="carousel-ribbon mt-2">Featured</span>
                  )}
                </div>
              </button>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Centered Pagination below */}
      <div className="carousel-pagination swiper-pagination-container" />
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;