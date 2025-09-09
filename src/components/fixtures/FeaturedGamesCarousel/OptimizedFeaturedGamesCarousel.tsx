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
      <div className="w-full space-y-[var(--space-md)]">
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
              <div className="bg-[var(--color-background)] rounded-xl shadow-card p-[var(--space-md)] animate-pulse">
                <div className="flex justify-between items-center mb-[var(--space-sm)]">
                  <div className="w-12 h-12 bg-[var(--color-neutral-200)] rounded"></div>
                  <div className="w-16 h-4 bg-[var(--color-neutral-200)] rounded"></div>
                </div>
                <div className="flex justify-center items-center gap-[var(--space-lg)] mb-[var(--space-sm)]">
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-[var(--color-neutral-200)] rounded-full mb-[var(--space-xs)]"></div>
                    <div className="w-12 h-3 bg-[var(--color-neutral-200)] rounded"></div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-6 bg-[var(--color-neutral-200)] rounded mb-[var(--space-xs)]"></div>
                    <div className="w-16 h-3 bg-[var(--color-neutral-200)] rounded"></div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-16 h-16 bg-[var(--color-neutral-200)] rounded-full mb-[var(--space-xs)]"></div>
                    <div className="w-12 h-3 bg-[var(--color-neutral-200)] rounded"></div>
                  </div>
                </div>
                <div className="w-20 h-3 bg-[var(--color-neutral-200)] rounded mx-auto"></div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <div className="flex justify-center mt-[var(--space-md)]">
          <div className="flex space-x-[var(--space-xs)]">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-4 h-4 bg-[var(--color-neutral-200)] rounded-full animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-[var(--space-xl)] px-[var(--space-lg)]">
        <p className="text-lg font-medium text-[var(--color-neutral-700)] mb-[var(--space-sm)]">
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
      return `<span class="${className} w-4 h-4 md:w-5 md:h-5 rounded-full bg-[var(--color-neutral-400)] mx-1 inline-block"></span>`;
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
  style={{
    height: 'calc(var(--carousel-card-min-height) + 40px)', // Explicitly set height with padding
    paddingBottom: '40px', // Add padding to prevent cutoff
  }}
>
        {fixtures.map((fixture) => {
          const homeShort = fixture.homeTeam.shortName;
          const awayShort = fixture.awayTeam.shortName;

          return (
            <SwiperSlide key={fixture.id}>
              <button
                <div className="carousel-card flex flex-col justify-between w-full h-full p-[var(--space-md)] bg-[var(--color-background)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-focus-gold)] rounded-xl shadow-card transition-all duration-300">
                onClick={() => onGameSelect?.(fixture)}
                aria-label={`View match between ${fixture.homeTeam.name} and ${fixture.awayTeam.name}`}
              >
                {/* Competition & Week */}
                <div className="flex justify-between items-center mb-[var(--space-sm)] w-full">
                  <div className="flex items-center justify-start flex-1">
                    {fixture.competition.logo && (
                      <img src={fixture.competition.logo} alt={fixture.competition.name} className="w-12 h-12 object-contain" />
                    )}
                  </div>
                  <div className="flex items-center justify-end flex-1">
                    <span className="text-xs text-[var(--color-neutral-500)] font-medium">Week {fixture.matchWeek || 1}</span>
                  </div>
                </div>

                {/* Teams & Time */}
                <div className="flex justify-center items-center mb-[var(--space-sm)] w-full">
                  <div className="flex items-center justify-center gap-[var(--space-lg)] max-w-full">
                    <div className="flex flex-col items-center min-w-0 flex-1 max-w-[90px]">
                      {fixture.homeTeam.logo ? (
                        <img src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} className="team-logo w-16 h-16 mb-[var(--space-xs)]" />
                      ) : (
                        <div className="w-16 h-16 bg-[var(--color-neutral-200)] rounded-full flex items-center justify-center mb-[var(--space-xs)]">
                          <span className="text-lg font-bold text-[var(--color-neutral-600)]">{fixture.homeTeam.name[0]}</span>
                        </div>
                      )}
                      <span className="text-xs text-center w-full leading-tight">{homeShort}</span>
                    </div>

                    {/* Time */}
                    <div className="flex flex-col items-center text-center min-w-[60px] flex-shrink-0">
                      <span className="text-[var(--color-neutral-700)] font-medium text-base whitespace-nowrap">
                        {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </span>
                      <span className="text-xs text-[var(--color-neutral-500)] whitespace-nowrap">
                        {new Date(fixture.dateTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>

                    <div className="flex flex-col items-center min-w-0 flex-1 max-w-[90px]">
                      {fixture.awayTeam.logo ? (
                        <img src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} className="w-16 h-16 object-contain mb-[var(--space-xs)]" />
                      ) : (
                        <div className="w-16 h-16 bg-[var(--color-neutral-200)] rounded-full flex items-center justify-center mb-[var(--space-xs)]">
                          <span className="text-lg font-bold text-[var(--color-neutral-600)]">{fixture.awayTeam.name[0]}</span>
                        </div>
                      )}
                      <span className="text-xs text-center w-full leading-tight">{awayShort}</span>
                    </div>
                  </div>
                </div>

                {/* Venue & Badge */}
                <div className="flex flex-col items-center w-full">
                  <div className="text-xs text-[var(--color-neutral-500)] truncate text-center w-full px-[var(--space-xs)]">{fixture.venue}</div>
                  {fixture.importance >= 80 && (
                    <span className="mt-[var(--space-xs)] inline-block bg-[var(--color-focus-gold)] text-[var(--color-neutral-800)] px-[var(--space-xs)] py-[var(--space-xs)] rounded-full text-xs sm:text-sm font-medium">Featured</span>
                  )}
                </div>
              </button>
            </SwiperSlide>
          );
        })}
      </Swiper>

      {/* Centered Pagination below */}
      <div className="swiper-pagination-container mt-[var(--space-md)] flex justify-center" />
    </div>
  );
};

export default FeaturedGamesCarousel;
