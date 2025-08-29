// src/components/fixtures/FeaturedGamesCarousel/OptimizedFeaturedGamesCarousel.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { FeaturedGamesCarouselProps, FeaturedFixtureWithImportance, UseCarouselReturn } from './FeaturedGamesCarousel.types';
import { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';

interface OptimizedFeaturedGamesCarouselProps extends FeaturedGamesCarouselProps {
  config?: FeaturedGamesCarouselConfig;
}

const OptimizedFeaturedGamesCarousel: React.FC<OptimizedFeaturedGamesCarouselProps> = ({
  fixtures = [],
  onGameSelect,
  onViewStats,
  autoRotate = false,
  rotateInterval = 5000,
  className,
  maxFeaturedGames = 4,
  selectionConfig,
  config,
}) => {
  const [featuredGames, setFeaturedGames] = useState<FeaturedFixtureWithImportance[]>(fixtures);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(autoRotate);

  // Scroll functions
  const scrollLeft = useCallback(() => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  }, []);

  const scrollRight = useCallback(() => {
    setCurrentIndex(prev => Math.min(prev + 1, featuredGames.length - 1));
  }, [featuredGames.length]);

  const scrollToIndex = (index: number) => {
    if (index >= 0 && index < featuredGames.length) setCurrentIndex(index);
  };

  const toggleAutoRotate = () => setIsAutoRotating(prev => !prev);

  // Auto-rotate effect
  useEffect(() => {
    if (!isAutoRotating) return;
    const interval = setInterval(() => {
      scrollRight();
    }, rotateInterval);

    return () => clearInterval(interval);
  }, [isAutoRotating, rotateInterval, scrollRight]);

  // Refresh data placeholder
  const refreshData = async () => {
    // Implement your data fetching logic here if needed
  };

  return (
    <div className={className}>
      {/* Carousel UI goes here */}
      {/* Example: */}
      {featuredGames.map((game, index) => (
        <div key={game.id} onClick={() => onGameSelect?.(game)}>
          <div>{game.homeTeam.name} vs {game.awayTeam.name}</div>
          <button onClick={() => onViewStats?.(game.id)}>View Stats</button>
        </div>
      ))}
    </div>
  );
};

export default OptimizedFeaturedGamesCarousel;

// Hook return type
export const useCarousel = (): UseCarouselReturn => {
  const [featuredGames, setFeaturedGames] = useState<FeaturedFixtureWithImportance[]>([]);
  const [carouselState, setCarouselState] = useState({
    currentIndex: 0,
    canScrollLeft: false,
    canScrollRight: false,
    isAutoRotating: false,
    isDragging: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollToIndex = (index: number) => {
    setCarouselState(prev => ({ ...prev, currentIndex: index }));
  };

  const scrollLeft = () => {
    setCarouselState(prev => ({
      ...prev,
      currentIndex: Math.max(prev.currentIndex - 1, 0),
    }));
  };

  const scrollRight = () => {
    setCarouselState(prev => ({
      ...prev,
      currentIndex: Math.min(prev.currentIndex + 1, featuredGames.length - 1),
    }));
  };

  const toggleAutoRotate = () => {
    setCarouselState(prev => ({ ...prev, isAutoRotating: !prev.isAutoRotating }));
  };

  const refreshData = async () => {
    // Fetch and update featuredGames here
  };

  return {
    featuredGames,
    isLoading,
    error,
    carouselState,
    scrollToIndex,
    scrollLeft,
    scrollRight,
    toggleAutoRotate,
    refreshData,
  };
};

