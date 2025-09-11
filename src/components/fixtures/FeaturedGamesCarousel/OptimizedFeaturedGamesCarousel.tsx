// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, FreeMode } from 'swiper/modules';
import UnifiedFixtureCard from '../FixtureCard/UnifiedFixtureCard';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

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
          <div key={idx} className="skeleton rounded-xl h-64" />
        ))}
      </div>
    );
  }

  if (fixtures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-neutral-700 mb-2">
          No Featured Games Available
        </h3>
        <p className="text-neutral-500 max-w-sm">
          Check back later for featured games and upcoming matches.
        </p>
      </div>
    );
  }

  return (
    <div 
      className={`featured-games-carousel w-full ${className}`} 
      style={{ overflow: 'visible' }}
      role="region" 
      aria-label="Featured Games Carousel"
    >
      <Swiper
        modules={[Navigation, Pagination, FreeMode]}
        navigation={{
          nextEl: '.swiper-button-next',
          prevEl: '.swiper-button-prev',
          enabled: true,
        }}
        pagination={{
          clickable: true,
          el: '.swiper-pagination-container',
          renderBullet: (index: number, className: string) => {
            return `<span class="${className} carousel-dot" aria-label="Go to slide ${index + 1}"></span>`;
          },
        }}
        loop={fixtures.length > 2} // Only enable loop if we have more than 2 slides
        freeMode={{ 
          enabled: true, 
          momentum: true,
          momentumBounce: false,
        }}
        spaceBetween={20}
        slidesPerView={1}
        breakpoints={{
          640: { 
            slidesPerView: 1.25,
            spaceBetween: 16,
          },
          768: { 
            slidesPerView: 1.5,
            spaceBetween: 20,
          },
          1024: { 
            slidesPerView: 2.2,
            spaceBetween: 24,
          },
          1280: { 
            slidesPerView: 3,
            spaceBetween: 32,
          },
        }}
        centeredSlides={true}
        grabCursor={true}
        watchOverflow={true} // Hide navigation when not needed
        className="carousel-swiper"
        style={{ paddingLeft: '50px', paddingRight: '50px' }} // Add padding for arrows
      >
        {fixtures.map((fixture) => (
          <SwiperSlide key={fixture.id}>
            <div className="py-4">
              <UnifiedFixtureCard
                fixture={fixture}
                variant="carousel"
                size="md"
                showCompetition={true}
                showVenue={true}
                showImportanceBadge={true}
                onClick={onGameSelect}
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Custom Navigation Buttons */}
      <div className="swiper-button-prev carousel-nav prev" aria-label="Previous slide">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </div>
      <div className="swiper-button-next carousel-nav next" aria-label="Next slide">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Custom Pagination */}
      <div 
        className="carousel-pagination swiper-pagination-container mt-6 flex justify-center" 
        role="tablist"
        aria-label="Carousel pagination"
      />
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
