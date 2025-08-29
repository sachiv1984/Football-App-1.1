// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useRef, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Trophy, TrendingUp } from 'lucide-react';
import { FeaturedFixture } from '../../../types';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import { FeaturedGamesCarouselProps } from './FeaturedGamesCarousel.types';

/**
 * Optimized Featured Games Carousel with your existing design system
 */
const OptimizedFeaturedGamesCarousel: React.FC<FeaturedGamesCarouselProps> = ({
  fixtures = [],
  onGameSelect = (fixture) => console.log('Selected fixture:', fixture.id),
  onViewStats = (id) => console.log('View stats for:', id),
  autoRotate = false,
  rotateInterval = 5000,
  maxFeaturedGames = 4,
  selectionConfig,
  className = ''
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Use the custom hook for all carousel logic
  const {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollToIndex,
    scrollLeft: scrollLeftHook,
    scrollRight: scrollRightHook,
    refreshData
  } = useFeaturedGamesCarousel({
    fixtures,
    config: {
      selection: {
        maxGames: maxFeaturedGames,
        ...selectionConfig
      }
    },
    autoRefresh: true
  });

  /**
   * Format date using your existing pattern
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-GB', { 
        weekday: 'short', 
        day: 'numeric', 
        month: 'short' 
      }),
      time: date.toLocaleTimeString('en-GB', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  };

  /**
   * Render form indicators using your existing CSS classes
   */
  const renderFormIndicators = (form: ('W' | 'D' | 'L')[]) => (
    <div className="flex space-x-1">
      {form.slice(-3).map((result, index) => (
        <span
          key={index}
          className={`form-indicator ${
            result === 'W' ? 'form-w' : 
            result === 'D' ? 'form-d' : 'form-l'
          }`}
        >
          {result}
        </span>
      ))}
    </div>
  );

  /**
   * Handle scroll with custom logic
   */
  const handleScroll = (direction: 'left' | 'right') => {
    if (direction === 'left') {
      scrollLeftHook();
    } else {
      scrollRightHook();
    }
  };

  /**
   * Update scroll container ref
   */
  useEffect(() => {
    // This allows the hook to access the scroll container if needed
    if (scrollRef.current) {
      // You can extend this to pass the ref to the hook if needed
    }
  }, []);

  // Loading state using your design system
  if (isLoading) {
    return (
      <section className={`bg-gradient-hero text-white section-sm ${className}`}>
        <div className="container">
          <div className="flex items-center justify-between mb-6 animate-fade-in">
            <div className="flex items-center">
              <Trophy className="w-6 h-6 text-electric-yellow mr-3" />
              <h2 className="text-2xl font-bold">Featured Games</h2>
            </div>
          </div>
          
          <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3].map(i => (
              <div 
                key={i} 
                className="min-w-[280px] h-52 bg-white/10 rounded-xl animate-pulse border border-white/20" 
              />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Error state
  if (error) {
    return (
      <section className={`bg-gradient-hero text-white section-sm ${className}`}>
        <div className="container">
          <div className="text-center py-12">
            <div className="text-red-300 mb-4">
              <Trophy className="w-12 h-12 mx-auto mb-2" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Unable to load featured games</h3>
            <p className="text-white/70 mb-4">{error}</p>
            <button
              onClick={refreshData}
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`bg-gradient-hero text-white section-sm ${className}`}>
      <div className="container">
        {/* Header with navigation */}
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center">
            <Trophy className="w-6 h-6 text-electric-yellow mr-3" />
            <h2 className="text-2xl font-bold">Featured Games</h2>
            {featuredGames.some(game => game.status === 'live') && (
              <span className="badge badge-error ml-3 animate-pulse">LIVE</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Mobile dot indicators */}
            <div className="flex gap-1 mr-4 lg:hidden">
              {featuredGames.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === carouselState.currentIndex ? 'bg-electric-yellow' : 'bg-white/30'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            
            {/* Navigation arrows */}
            <button
              onClick={() => handleScroll('left')}
              disabled={!carouselState.canScrollLeft}
              className={`btn btn-sm rounded-full transition-all hover-lift ${
                carouselState.canScrollLeft 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
              aria-label="Previous games"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              disabled={!carouselState.canScrollRight}
              className={`btn btn-sm rounded-full transition-all hover-lift ${
                carouselState.canScrollRight 
                  ? 'bg-white/20 hover:bg-white/30 text-white' 
                  : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
              aria-label="Next games"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Games carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ 
            scrollSnapType: 'x mandatory',
            WebkitOverflowScrolling: 'touch'
          }}
          role="region"
          aria-label="Featured games carousel"
        >
          {featuredGames.map((fixture, index) => {
            const { date, time } = formatDate(fixture.dateTime);
            const isLive = fixture.status === 'live';
            const isBigMatch = fixture.isBigMatch;
            
            return (
              <div
                key={fixture.id}
                className="min-w-[280px] card-elevated bg-white/95 hover:bg-white transition-all duration-300 cursor-pointer hover-lift"
                style={{ scrollSnapAlign: 'start' }}
                onClick={() => onGameSelect(fixture)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onGameSelect(fixture);
                  }
                }}
                aria-label={`${fixture.homeTeam.name} vs ${fixture.awayTeam.name} on ${date} at ${time}`}
              >
                {/* Live indicator or big match badge */}
                <div className="relative">
                  {isLive ? (
                    <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-t-xl flex items-center">
                      <span className="w-2 h-2 bg-white rounded-full mr-
