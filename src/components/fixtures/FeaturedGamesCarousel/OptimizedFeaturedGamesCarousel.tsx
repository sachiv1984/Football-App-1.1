import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';

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
  const trackRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const totalSlides = fixtures.length; // move this here, before totalPages
  const totalPages = totalSlides > cardsPerView ? totalSlides - cardsPerView + 1 : 1;
  const maxIndex = Math.max(0, totalSlides - cardsPerView);

  const inactiveColor = '#D1D5DB';
  const activeColor = '#FFD700';

  // Responsive cards per view
  useEffect(() => {
    const calculateCardsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) return 1;
      if (width < 1024) return 2;
      return 3;
    };
    const updateCardsPerView = () => setCardsPerView(calculateCardsPerView());
    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  // Calculate card width after render
  useEffect(() => {
  if (trackRef.current && trackRef.current.children.length > 0) {
    const firstCard = trackRef.current.children[0] as HTMLElement;
    const gap = 24; // same as your flex gap
    setCardWidth(firstCard.offsetWidth + gap);
  }
}, [cardsPerView, fixtures.length]);

const goToNext = useCallback(() => {
  setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
}, [maxIndex]);

const goToPrev = useCallback(() => {
  setCurrentIndex(prev => Math.max(prev - 1, 0)); // Change from: Math.min(prev + 1, maxIndex)
}, [maxIndex]); // Add maxIndex to dependencies


  const goToFirst = useCallback(() => setCurrentIndex(0), []);
  const goToLast = useCallback(() => setCurrentIndex(maxIndex), [maxIndex]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) return;
      switch (event.key) {
        case 'ArrowLeft': event.preventDefault(); goToPrev(); break;
        case 'ArrowRight': event.preventDefault(); goToNext(); break;
        case 'Home': event.preventDefault(); goToFirst(); break;
        case 'End': event.preventDefault(); goToLast(); break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [goToNext, goToPrev, goToFirst, goToLast]);

  // Swipe handlers
  const minSwipeDistance = 50;
  const onTouchStart = (e: React.TouchEvent) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) goToNext();
    else if (distance < -minSwipeDistance) goToPrev();
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {[...Array(3)].map((_, idx) => (
          <div key={idx} className="bg-gray-200 animate-pulse rounded-xl aspect-[4/3] p-6" />
        ))}
      </div>
    );
  }

  if (totalSlides === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 px-6">
        <div className="mb-6">
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto opacity-80">
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </div>
        <p className="text-lg font-medium text-gray-700 mb-4">Check back later for featured games</p>
      </div>
    );
  }

  const showNavigation = totalSlides > cardsPerView;

  return (
    <div ref={containerRef} className={`w-full ${className}`} role="region" aria-label="Featured Games Carousel" tabIndex={0}>
      <div className="relative">
        {/* Left Arrow */}
        {showNavigation && (
          <button onClick={goToPrev} disabled={currentIndex === 0} className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200" style={{ width: '40px', height: '40px' }} aria-label="Previous games">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )}

        {/* Right Arrow */}
        {showNavigation && (
          <button onClick={goToNext} disabled={currentIndex === maxIndex} className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200" style={{ width: '40px', height: '40px' }} aria-label="Next games">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        )}

        {/* Carousel Track */}
        <div className="relative w-full overflow-hidden px-12">
          <div
            ref={trackRef}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
  style={{
    display: 'grid',
    gridTemplateColumns: `repeat(${fixtures.length}, ${100/cardsPerView}%)`,
    gap: '24px',
    transform: `translateX(-${currentIndex * (100/cardsPerView)}%)`,
    transition: 'transform 0.3s ease',
    cursor: 'grab',
  }}
  className="[&::-webkit-scrollbar]:hidden"
>
            {fixtures.map((fixture, index) => {
              const isActive = index >= currentIndex && index < currentIndex + cardsPerView;

              return (
                <div
                  key={fixture.id || index}
                  className={`transition-all duration-300 ${isActive ? 'opacity-100 scale-105' : 'opacity-90 scale-100'}`}
                  style={{
                    flex: '0 0 auto',
                    scrollSnapAlign: 'start',
                    background: '#FFFFFF',
                    borderRadius: '12px',
                    boxShadow: isActive
                      ? '0 8px 25px rgba(0,0,0,0.15), 0 4px 10px rgba(0,0,0,0.1)'
                      : 'var(--shadow-card, 0 4px 6px rgba(0,0,0,0.07))',
                    padding: cardsPerView === 1 ? '16px' : '24px',
                    aspectRatio: '4/3',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    width: cardsPerView === 1 ? '100%' : cardsPerView === 2 ? '48%' : '32%',
                    maxWidth: cardsPerView === 1 ? '360px' : cardsPerView === 2 ? '480px' : '520px',
                  }}
                >
                  {/* Card Content - keep exactly as your original code */}
                  {/* Competition header */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 w-full">
                    <div className="flex items-center justify-center">
                      {fixture.competition.logo && (
                        <div
                          className={`bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-out hover:scale-105 hover:shadow-xl active:scale-102 ${isActive ? 'scale-100' : 'scale-90'} w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20`}
                        >
                          <img src={fixture.competition.logo} alt={fixture.competition.name} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 object-contain" loading="lazy" />
                        </div>
                      )}
                    </div>
                    <div className="bg-gray-100 px-3 py-1.5 rounded-full">
                      <span className="text-xs md:text-sm font-medium" style={{ color: '#6B7280', fontFamily: 'Inter, system-ui, sans-serif' }}>
                        Week {fixture.matchWeek || 1}
                      </span>
                    </div>
                  </div>

                  {/* Teams & kickoff */}
                  <div className="flex items-center justify-between mb-4">
                    {/* Home team */}
                    <div className="text-center flex-1">
                      <div className={`w-20 h-20 rounded-full bg-white flex items-center justify-center mb-3 mx-auto transition-all duration-200 ${isActive ? 'scale-105' : 'scale-100'} hover:scale-102`} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {fixture.homeTeam.logo ? (
                          <img src={fixture.homeTeam.logo} alt={fixture.homeTeam.name} className="w-16 h-16 object-contain" loading="lazy" />
                        ) : (
                          <span className="text-gray-400 font-medium text-lg">{fixture.homeTeam.shortName?.[0] || fixture.homeTeam.name[0]}</span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-700 truncate px-1">{fixture.homeTeam.shortName || fixture.homeTeam.name}</div>
                    </div>

                    {/* Kick-off */}
                    <div className="flex flex-col items-center text-center px-4">
                      <div className="flex items-center space-x-2 mb-2" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: cardsPerView === 1 ? '16px' : '18px', fontWeight: 500, color: '#374151' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{new Date(fixture.dateTime).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                      </div>
                      <div className={`${cardsPerView === 1 ? 'text-xs' : 'text-xs'} text-gray-500`} style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                        {new Date(fixture.dateTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      </div>
                    </div>

                    {/* Away team */}
                    <div className="text-center flex-1">
                      <div className={`w-20 h-20 rounded-full bg-white flex items-center justify-center mb-3 mx-auto transition-all duration-200 ${isActive ? 'scale-105' : 'scale-100'} hover:scale-102`} style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {fixture.awayTeam.logo ? (
                          <img src={fixture.awayTeam.logo} alt={fixture.awayTeam.name} className="w-16 h-16 object-contain" loading="lazy" />
                        ) : (
                          <span className="text-gray-400 font-medium text-lg">{fixture.awayTeam.shortName?.[0] || fixture.awayTeam.name[0]}</span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-700 truncate px-1">{fixture.awayTeam.shortName || fixture.awayTeam.name}</div>
                    </div>
                  </div>

                  {/* Venue */}
                  <div className="text-center" style={{ marginTop: cardsPerView === 1 ? '12px' : '16px' }}>
                    <div className="truncate cursor-help transition-colors duration-200 hover:text-gray-700" style={{ fontFamily: 'Inter, system-ui, sans-serif', fontSize: cardsPerView === 1 ? '14px' : '16px', fontWeight: 500, color: '#6B7280' }} title={fixture.venue}>
                      📍 {fixture.venue}
                    </div>
                  </div>

                  {/* Importance */}
                  {fixture.importance >= 80 && (
                    <div className="mt-3 text-center">
                      <span className="inline-block bg-yellow-400 text-gray-900 text-xs px-2 py-1 rounded-full font-medium">
                        Featured
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Pagination dots */}
{showNavigation && (
  <div className="flex justify-center mt-6 space-x-2">
    {Array.from({ length: totalPages }, (_, index) => (
      <button
        key={index}
        onClick={() => setCurrentIndex(index)}
        className="transition-all duration-200"
        style={{
          width: currentIndex === index ? '24px' : '8px',
          height: '8px',
          borderRadius: currentIndex === index ? '9999px' : '50%',
          backgroundColor: currentIndex === index ? activeColor : inactiveColor,
        }}
        aria-label={`Go to slide ${index + 1}`}
      />
    ))}
  </div>
)}
      <div className="sr-only">
        Use arrow keys to navigate between slides, Home key for first slide, End key for last slide. On touch devices, swipe left or right to navigate.
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;


