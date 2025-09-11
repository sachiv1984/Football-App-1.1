import React from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Navigation, Pagination, FreeMode } from 'swiper/modules';
import FixtureCard from '../FixtureCard/FixtureCard';

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
         <FixtureCard key={idx} isSkeleton />
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
    <div className={`featured-games-carousel w-full ${className}`} style={{ overflow: 'visible' }} role="region" aria-label="Featured Games Carousel">
      <Swiper
        modules={[Navigation, Pagination, FreeMode]}
        navigation
        pagination={{
          clickable: true,
          el: '.swiper-pagination-container',
          renderBullet: (index: number, className: string) => `<span class="${className} carousel-dot"></span>`,
        }}
        loop
        freeMode={{ enabled: true, momentum: true }}
        spaceBetween={20}
        slidesPerView={1}
        breakpoints={{
          640: { slidesPerView: 1.25 },
          768: { slidesPerView: 1.5 },
          1024: { slidesPerView: 2.2 },
          1280: { slidesPerView: 3 },
        }}
        centeredSlides
      >
        {fixtures.map((fixture) => (
          <SwiperSlide key={fixture.id}>
            <div className="py-4">
              <FixtureCard
                fixture={fixture}
                size="md"
                // onClick={onGameSelect}
                className="carousel-card"
              />
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Pagination */}
      <div className="carousel-pagination swiper-pagination-container mt-6 flex justify-center" />
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
