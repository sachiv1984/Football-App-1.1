import React, { useRef, useState, useEffect } from 'react';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(3);

  // Responsive cards per view (hard-coded breakpoints)
  useEffect(() => {
    const calculateCardsPerView = () => {
      const width = window.innerWidth;
      if (width < 640) return 1; // mobile
      if (width < 1024) return 2; // tablet
      return 3; // desktop
    };
    const updateCardsPerView = () => {
      setCardsPerView(calculateCardsPerView());
    };
    updateCardsPerView();
    window.addEventListener('resize', updateCardsPerView);
    return () => window.removeEventListener('resize', updateCardsPerView);
  }, []);

  const totalSlides = fixtures.length;
  const maxIndex = Math.max(0, totalSlides - cardsPerView);

  // Scroll to card on navigation
  useEffect(() => {
    if (trackRef.current) {
      const children = trackRef.current.children;
      if (children.length > currentIndex) {
        const card = children[currentIndex] as HTMLElement;
        card.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      }
    }
  }, [currentIndex, cardsPerView, fixtures.length]);

  const goToNext = () => {
    if (currentIndex < maxIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToIndex = (index: number) => {
    if (index >= 0 && index <= maxIndex) {
      setCurrentIndex(index);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, padding: 24 }}>
        {[...Array(3)].map((_, idx) => (
          <div
            key={idx}
            style={{
              background: '#e5e7eb',
              animation: 'pulse 2s infinite',
              borderRadius: 16,
              aspectRatio: '4/3',
              padding: 24,
            }}
          />
        ))}
      </div>
    );
  }

  // Empty state
  if (totalSlides === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '80px 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
            <circle cx="12" cy="12" r="10" />
            <path d="M8 12h8M12 8v8" />
          </svg>
        </div>
        <p style={{ fontSize: 18, fontWeight: 500, color: '#374151', marginBottom: 16 }}>
          Check back later for featured games
        </p>
      </div>
    );
  }

  // Card width and gap (hard-coded)
  const gap = 24; // px
  let cardWidth = '100%';
  let maxWidth = 360;
  if (cardsPerView === 3) {
    cardWidth = 'calc(33.333% - 16px)';
    maxWidth = 520;
  } else if (cardsPerView === 2) {
    cardWidth = 'calc(50% - 12px)';
    maxWidth = 480;
  }

  return (
    <div className={`w-full ${className}`} role="region" aria-label="Featured Games Carousel">
      <div style={{ position: 'relative', overflow: 'hidden', margin: '0 16px' }}>
        {/* Carousel Track */}
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            gap: `${gap}px`,
            overflowX: 'auto',
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch',
            scrollBehavior: 'smooth',
            paddingBottom: 8,
          }}
        >
          {fixtures.map((fixture, index) => (
            <div
              key={fixture.id || index}
              style={{
                flex: '0 0 auto',
                width: cardWidth,
                maxWidth: maxWidth,
                scrollSnapAlign: 'start',
              }}
            >
              {/* Card Content */}
              <div
                role="button"
                tabIndex={0}
                aria-label={`View match between ${fixture.homeTeam.name} and ${fixture.awayTeam.name}`}
                onClick={() => (onGameSelect ?? (() => {}))(fixture)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    (onGameSelect ?? (() => {}))(fixture);
                  }
                }}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  padding: 16,
                  cursor: 'pointer',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                {/* Competition header */}
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {fixture.competition.logo ? (
                      <img
                        src={fixture.competition.logo}
                        alt={`${fixture.competition.name} logo`}
                        style={{ width: 40, height: 40, objectFit: 'contain' }}
                        loading="lazy"
                      />
                    ) : (
                      <span style={{ color: '#9ca3af', fontWeight: 500, fontSize: 14 }}>
                        {fixture.competition.name[0] || "?"}
                      </span>
                    )}
                  </div>
                  <span style={{ color: '#6b7280', fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {fixture.competition.shortName || fixture.competition.name}
                  </span>
                </div>

                {/* Teams & kickoff */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  {/* Home team */}
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, marginLeft: 'auto', marginRight: 'auto' }}>
                      {fixture.homeTeam.logo ? (
                        <img
                          src={fixture.homeTeam.logo}
                          alt={fixture.homeTeam.name}
                          style={{ width: 48, height: 48, objectFit: 'contain' }}
                          loading="lazy"
                        />
                      ) : (
                        <span style={{ color: '#9ca3af', fontWeight: 500 }}>
                          {fixture.homeTeam.shortName?.[0] || fixture.homeTeam.name[0]}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: 4 }}>
                      {fixture.homeTeam.shortName || fixture.homeTeam.name}
                    </div>
                  </div>

                  {/* Kickoff */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#374151', padding: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                      <svg xmlns="http://www.w3.org/2000/svg" style={{ height: 16, width: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span style={{ fontSize: 14, fontWeight: 500 }}>
                        {new Date(fixture.dateTime).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>vs</div>
                  </div>

                  {/* Away team */}
                  <div style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, marginLeft: 'auto', marginRight: 'auto' }}>
                      {fixture.awayTeam.logo ? (
                        <img
                          src={fixture.awayTeam.logo}
                          alt={fixture.awayTeam.name}
                          style={{ width: 48, height: 48, objectFit: 'contain' }}
                          loading="lazy"
                        />
                      ) : (
                        <span style={{ color: '#9ca3af', fontWeight: 500 }}>
                          {fixture.awayTeam.shortName?.[0] || fixture.awayTeam.name[0]}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', padding: 4 }}>
                      {fixture.awayTeam.shortName || fixture.awayTeam.name}
                    </div>
                  </div>
                </div>

                {/* Venue */}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fixture.venue}>
                    📍 {fixture.venue}
                  </div>
                </div>

                {/* Optional: Show importance indicator */}
                {fixture.importance >= 80 && (
                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <span style={{ display: 'inline-block', background: '#fde68a', color: '#374151', fontSize: 12, padding: '4px 8px', borderRadius: 999, fontWeight: 500 }}>
                      Featured
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {totalSlides > cardsPerView && (
          <>
            <button
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                zIndex: 20,
                transform: 'translateY(-50%)',
                width: 40,
                height: 40,
                background: '#fff',
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                color: '#374151',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                opacity: currentIndex === 0 ? 0.4 : 1,
              }}
              onClick={goToPrev}
              disabled={currentIndex === 0}
              aria-label="Previous slides"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              style={{
                position: 'absolute',
                top: '50%',
                right: 0,
                zIndex: 20,
                transform: 'translateY(-50%)',
                width: 40,
                height: 40,
                background: '#fff',
                borderRadius: '50%',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                color: '#374151',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: currentIndex >= maxIndex ? 'not-allowed' : 'pointer',
                opacity: currentIndex >= maxIndex ? 0.4 : 1,
              }}
              onClick={goToNext}
              disabled={currentIndex >= maxIndex}
              aria-label="Next slides"
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path d="M9 6l6 6-6 6" stroke="currentColor" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        )}
      </div>

      {/* Pagination Dots */}
      {totalSlides > cardsPerView && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 24, gap: 8 }}>
          {Array.from({ length: maxIndex + 1 }, (_, index) => (
            <button
              key={index}
              style={{
                borderRadius: 999,
                height: 8,
                transition: 'all 0.2s',
                outline: 'none',
                width: currentIndex === index ? 24 : 8,
                background: currentIndex === index ? '#fde68a' : '#d1d5db',
                border: 'none',
                cursor: 'pointer',
              }}
              onClick={() => goToIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={currentIndex === index ? 'true' : 'false'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;