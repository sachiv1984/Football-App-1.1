// OptimizedFeaturedGamesCarousel.tsx
import React from 'react';
import { useFeaturedGamesCarousel } from '../hooks/useFeaturedGamesCarousel';
import { FeaturedFixtureWithImportance } from '../types';

interface OptimizedFeaturedGamesCarouselProps {
  fixtures?: FeaturedFixtureWithImportance[];
  autoRefresh?: boolean;
  rotateInterval?: number;
  className?: string;
}

export const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures = [],
  autoRefresh = false,
  rotateInterval = 5000,
  className = '',
}) => {
  const {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollLeft,
    scrollRight,
    toggleAutoRotate,
    scrollRef,
  } = useFeaturedGamesCarousel({ fixtures, autoRefresh, rotateInterval });

  // --- Render states ---
  if (isLoading) {
    return <div className="p-4 text-center">Loading featured games…</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">Error: {error}</div>;
  }

  if (!featuredGames.length) {
    return <div className="p-4 text-center">No featured games available</div>;
  }

  // --- Render carousel ---
  return (
    <div className={`relative w-full overflow-hidden ${className}`}>
      {/* Scrollable container */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto scroll-smooth no-scrollbar"
      >
        {featuredGames.map((game, idx) => (
          <div
            key={idx}
            className="min-w-[280px] max-w-[300px] flex-shrink-0 rounded-lg bg-white shadow-md p-4"
          >
            {/* Competition + status */}
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>{game.competition?.name ?? 'Premier League'}</span>
              <span className="capitalize">{game.status ?? 'scheduled'}</span>
            </div>

            {/* Teams */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex flex-col items-center">
                <img
                  src={game.homeTeam.badge}
                  alt={game.homeTeam.name}
                  className="h-10 w-10 object-contain mb-1"
                />
                <span className="text-xs text-gray-700">{game.homeTeam.shortName}</span>
              </div>
              <span className="text-lg font-bold">vs</span>
              <div className="flex flex-col items-center">
                <img
                  src={game.awayTeam.badge}
                  alt={game.awayTeam.name}
                  className="h-10 w-10 object-contain mb-1"
                />
                <span className="text-xs text-gray-700">{game.awayTeam.shortName}</span>
              </div>
            </div>

            {/* Match info */}
            <div className="text-center text-sm text-gray-500">
              {new Date(game.dateTime).toLocaleDateString()} —{' '}
              {new Date(game.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>

            {/* Tags */}
            {game.tags?.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {game.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-2 py-0.5 rounded-full bg-gray-200 text-xs text-gray-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Controls */}
      {carouselState.canScrollLeft && (
        <button
          onClick={scrollLeft}
          className="absolute top-1/2 left-2 -translate-y-1/2 bg-gray-800 text-white rounded-full p-2"
        >
          ◀
        </button>
      )}
      {carouselState.canScrollRight && (
        <button
          onClick={scrollRight}
          className="absolute top-1/2 right-2 -translate-y-1/2 bg-gray-800 text-white rounded-full p-2"
        >
          ▶
        </button>
      )}

      {/* Auto-rotate toggle */}
      <button
        onClick={toggleAutoRotate}
        className="absolute bottom-2 right-2 bg-gray-200 text-gray-700 px-3 py-1 rounded-md text-xs"
      >
        {carouselState.isAutoRotating ? 'Pause' : 'Auto'}
      </button>
    </div>
  );
};
