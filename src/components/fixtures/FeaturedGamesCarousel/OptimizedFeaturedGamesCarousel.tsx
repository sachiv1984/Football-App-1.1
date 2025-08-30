import React, { useEffect } from 'react';
import { FeaturedFixtureWithImportance } from './FeaturedGamesCarousel.types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import FixtureCard from '../FixtureCard/FixtureCard';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures: FeaturedFixtureWithImportance[];
  onGameSelect: (fixture: FeaturedFixtureWithImportance) => void;
  rotateInterval?: number;
  className?: string;
}

const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures,
  onGameSelect,
  rotateInterval = 5000,
  className,
}) => {
  const {
    featuredGames,   // includes clones
    baseGames,       // only real fixtures
    carouselState,
    setCarouselState,
    scrollRef,
    scrollToIndex,
    handleTransitionEnd,
  } = useFeaturedGamesCarousel({ 
    fixtures, 
    rotateInterval, 
    autoRefresh: true 
  });

  // Keep scroll synced with index changes (when auto-rotating or dot click)
  useEffect(() => {
    scrollToIndex(carouselState.currentIndex, true);
  }, [carouselState.currentIndex, scrollToIndex]);

  // Update index when user swipes manually
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const index = Math.round(
      scrollRef.current.scrollLeft / scrollRef.current.clientWidth
    );
    if (index !== carouselState.currentIndex) {
      setCarouselState(prev => ({ ...prev, currentIndex: index }));
    }
  };

  // Map current index (with clones) to "real" index for dots
  const getRealIndex = (index: number) => {
    if (index === 0) return baseGames.length - 1;        // left clone → last
    if (index === baseGames.length + 1) return 0;        // right clone → first
    return index - 1;                                    // shift down by 1
  };

  return (
    <div>
      {/* Carousel */}
      <div
        className={className}
        ref={scrollRef}
        onScroll={handleScroll}
        onTransitionEnd={handleTransitionEnd}
        style={{
          display: 'flex',
          overflowX: 'scroll',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {featuredGames.map((fixture, idx) => (
          <div
            key={`${fixture.id}-${idx}`} // must include idx because of clones
            style={{ 
              flex: '0 0 100%', 
              scrollSnapAlign: 'center', 
              padding: '0 0.5rem' 
            }}
            onClick={() => onGameSelect(fixture)}
          >
            <FixtureCard fixture={fixture} />
          </div>
        ))}
      </div>

      {/* Navigation Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
        {baseGames.map((_, index) => (
          <button
            key={index}
            onClick={() => setCarouselState(prev => ({ ...prev, currentIndex: index + 1 }))}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              margin: '0 4px',
              border: 'none',
              background: 
                getRealIndex(carouselState.currentIndex) === index ? '#333' : '#ccc',
              cursor: 'pointer',
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;
