import React, { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, A11y } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/autoplay';
import 'swiper/css/effect-coverflow';
import { useFixtures } from '../../hooks/useFixtures';

export const FixturesCarousel: React.FC = () => {
  const { featuredFixtures, allFixtures, loading, error } = useFixtures();
  const [activeTab, setActiveTab] = useState<'featured' | 'all'>('featured');

  const currentFixtures = activeTab === 'featured' ? featuredFixtures : allFixtures;

  const formatDate = (dateTime: string) =>
    new Date(dateTime).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

  if (loading) return <div className="text-center p-6">Loading fixtures...</div>;
  if (error) return <div className="text-center p-6 text-red-600">{error}</div>;

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      {/* Tabs */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setActiveTab('featured')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'featured'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Featured ({featuredFixtures.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Fixtures ({allFixtures.length})
        </button>
      </div>

      {/* Swiper Carousel */}
      <Swiper
        modules={[Navigation, Pagination, A11y]}
        slidesPerView="auto"
        centeredSlides={true}
        spaceBetween={20}
        navigation
        pagination={{ clickable: true }}
        className="pb-12" // extra padding for pagination
        a11y={{
          prevSlideMessage: 'Previous fixture',
          nextSlideMessage: 'Next fixture',
          slideLabelMessage: '{{index}} / {{slidesLength}}'
        }}
      >
        {currentFixtures.map(fixture => (
          <SwiperSlide
            key={fixture.id}
            className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow min-w-[250px]"
          >
            {/* Card content */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {fixture.competition.logo && (
                    <img src={fixture.competition.logo} alt={fixture.competition.name} className="w-5 h-5" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{fixture.competition.name}</div>
                    <div className="text-xs text-gray-500">Week {fixture.matchWeek}</div>
                  </div>
                </div>
                <div className="text-sm text-gray-700 font-medium">{fixture.importance}/10</div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{fixture.homeTeam.name}</div>
                  {fixture.homeTeam.shortName && (
                    <div className="text-xs text-gray-500">({fixture.homeTeam.shortName})</div>
                  )}
                </div>
                <div className="text-sm">vs</div>
                <div className="text-sm text-right">
                  <div className="font-medium text-gray-900">{fixture.awayTeam.name}</div>
                  {fixture.awayTeam.shortName && (
                    <div className="text-xs text-gray-500">({fixture.awayTeam.shortName})</div>
                  )}
                </div>
              </div>

              <div className="text-xs text-gray-500">{formatDate(fixture.dateTime)}</div>
              <div className="text-xs text-gray-500">{fixture.venue}</div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>

      {/* Pagination dots container (centered) */}
      <div className="swiper-pagination-container flex justify-center mt-4"></div>
    </div>
  );
};


export default SwiperFeaturedGamesCarousel;

