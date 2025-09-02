import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo } from '../../../utils/teamUtils';
import { useFixtures } from '../../../hooks/useFixtures';

interface Props {
  fixtures?: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
}

export const OptimizedFeaturedGamesCarousel: React.FC<Props> = ({
  onGameSelect,
  autoRotate = true,
  rotateInterval = 5000,
  className = '',
}) => {
  const { featuredFixtures, loading, error } = useFixtures();
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const realCount = featuredFixtures.length;

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {