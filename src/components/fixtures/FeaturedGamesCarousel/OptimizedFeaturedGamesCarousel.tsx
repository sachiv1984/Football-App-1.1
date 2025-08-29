// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useRef, useEffect } from 'react';
import { Calendar, Clock, MapPin, ChevronLeft, ChevronRight, Trophy, TrendingUp } from 'lucide-react';
import { useFeaturedGamesCarousel } from '../../../hooks/useFeaturedGamesCarousel';
import { FeaturedGamesCarouselProps, FeaturedGame } from './FeaturedGamesCarousel.types';

/**
 * Optimized Featured Games Carousel with your existing design system
 */
const OptimizedFeaturedGamesCarousel: React.FC<FeaturedGamesCarouselProps> = ({
  fixtures = [],
  onGameSelect = (fixture: FeaturedGame) => console.log('Selected fixture:', fixture.id),
  onViewStats = (id: string | number) => console.log('View stats for:', id),
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

  const renderFormIndicators = (form?: ('W' | 'D' | 'L')[]) => {
    if (!form) return null;
    return (
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
  };

  const handleScroll = (direction: 'left' | 'right') => {
    if (direction === 'left') scrollLeftHook();
    else scrollRightHook();
  };

  useEffect(() => {
    if (scrollRef.current) {
      // Extendable for ref usage in hook
    }
  }, []);

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
            <button onClick={refreshData} className="btn btn-primary">Try Again</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={`bg-gradient-hero text-white section-sm ${className}`}>
      <div className="container">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div className="flex items-center">
            <Trophy className="w-6 h-6 text-electric-yellow mr-3" />
            <h2 className="text-2xl font-bold">Featured Games</h2>
            {featuredGames.some(game => game.status === 'live') && (
              <span className="badge badge-error ml-3 animate-pulse">LIVE</span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
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
            
            <button
              onClick={() => handleScroll('left')}
              disabled={!carouselState.canScrollLeft}
              className={`btn btn-sm rounded-full transition-all hover-lift ${
                carouselState.canScrollLeft ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
              aria-label="Previous games"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleScroll('right')}
              disabled={!carouselState.canScrollRight}
              className={`btn btn-sm rounded-full transition-all hover-lift ${
                carouselState.canScrollRight ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-white/5 text-white/30 cursor-not-allowed'
              }`}
              aria-label="Next games"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
          style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
          role="region"
          aria-label="Featured games carousel"
        >
          {featuredGames.map((fixture) => {
            const { date, time } = fixture.dateTime ? formatDate(fixture.dateTime) : { date: 'TBD', time: 'TBD' };
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
                aria-label={`${fixture.homeTeam?.name ?? 'Team'} vs ${fixture.awayTeam?.name ?? 'Team'} on ${date} at ${time}`}
              >
                <div className="relative">
                  {isLive ? (
                    <div className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-t-xl flex items-center">
                      <span className="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                      LIVE
                    </div>
                  ) : isBigMatch ? (
                    <div className="bg-electric-yellow text-gray-900 text-xs font-bold px-3 py-1 rounded-t-xl flex items-center">
                      <Trophy className="w-3 h-3 mr-1" />
                      BIG MATCH
                    </div>
                  ) : null}
                </div>

                <div className="p-5 text-gray-900">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <img 
                        src={fixture.competition?.logo ?? ''} 
                        alt={fixture.competition?.name ?? 'Competition'}
                        className="w-5 h-5 rounded mr-2"
                        loading="lazy"
                      />
                      <span className="text-sm font-medium text-gray-600">
                        {fixture.competition?.shortName ?? 'Comp'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="badge badge-sm badge-secondary">
                        Week {fixture.matchWeek ?? 'TBD'}
                      </span>
                      {fixture.importanceScore && fixture.importanceScore >= 8 && (
                        <span className="badge badge-sm badge-warning">🔥 Hot</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center flex-1">
                        <img 
                          src={fixture.homeTeam?.logo ?? ''} 
                          alt={fixture.homeTeam?.name ?? 'Home Team'}
                          className="team-logo mr-3"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {fixture.homeTeam?.shortName ?? 'Home'}
                          </div>
                          <div className="text-xs text-gray-500">
                            #{fixture.homeTeam?.position ?? '-'}
                          </div>
                        </div>
                      </div>
                      {renderFormIndicators(fixture.homeTeam?.form)}
                    </div>

                    <div className="flex items-center justify-center py-2">
                      {isLive ? (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900 font-mono">
                            {fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}
                          </div>
                          <div className="text-xs text-red-500 font-medium">{time}</div>
                        </div>
                      ) : (
                        <div className="px-3 py-1 bg-gradient-primary rounded-full">
                          <span className="text-sm font-bold text-gray-900">VS</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center flex-1">
                        <img 
                          src={fixture.awayTeam?.logo ?? ''} 
                          alt={fixture.awayTeam?.name ?? 'Away Team'}
                          className="team-logo mr-3"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm truncate">
                            {fixture.awayTeam?.shortName ?? 'Away'}
                          </div>
                          <div className="text-xs text-gray-500">
                            #{fixture.awayTeam?.position ?? '-'}
                          </div>
                        </div>
                      </div>
                      {renderFormIndicators(fixture.awayTeam?.form)}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-gray-600 mb-4">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-2 flex-shrink-0" />
                      <span>{date}</span>
                    </div>
                    {!isLive && (
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-2 flex-shrink-0" />
                        <span>{time}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <MapPin className="w-3 h-3 mr-2 flex-shrink-0" />
                      <span className="truncate">{fixture.venue ?? ''}</span>
                    </div>

                    {fixture.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {fixture.tags.slice(0, 2).map((tag, i) => (
                          <span
                            key={i}
                            className="inline-block bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs font-medium"
                          >
                            {tag.replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {fixture.aiInsight && (
                    <div className="ai-insight-card border-teal-400 bg-gradient-to-r from-teal-50 to-transparent">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs font-semibold text-teal-900 truncate">
                              {fixture.aiInsight.title}
                            </h4>
                            <span className={`badge badge-sm flex-shrink-0 ml-2 ${
                              fixture.aiInsight.confidence === 'high' ? 'badge-success' :
                              fixture.aiInsight.confidence === 'medium' ? 'badge-warning' :
                              'badge-error'
                            }`}>
                              {Math.round(fixture.aiInsight.probability * 100)}%
                            </span>
                          </div>
                          <p className="text-xs text-teal-800 leading-relaxed">
                            {fixture.aiInsight.description}
                          </p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewStats(fixture.id);
                            }}
                            className="mt-2 text-xs text-teal-600 hover:text-teal-800 font-medium transition-colors"
                          >
                            View detailed analysis →
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {process.env.NODE_ENV === 'development' && fixture.importanceScore && (
                    <div className="mt-2 text-xs text-gray-400">
                      Importance: {fixture.importanceScore}/10
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {featuredGames.length === 0 && !isLoading && (
          <div className="text-center py-12 animate-fade-in">
            <div className="text-white/60 mb-4">
              <Trophy className="w-12 h-12 mx-auto mb-2" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">No Featured Games</h3>
            <p className="text-white/70 mb-6">
              Check back later for upcoming matches and live games.
            </p>
            <button onClick={refreshData} className="btn btn-primary">Refresh Games</button>
          </div>
        )}

        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {featuredGames.length > 0 && (
            `Showing ${featuredGames.length} featured games. 
            ${featuredGames.filter(g => g.status === 'live').length} games are currently live.
            Use arrow keys to navigate between games.`
          )}
        </div>
      </div>
    </section>
  );
};

export default OptimizedFeaturedGamesCarousel;
