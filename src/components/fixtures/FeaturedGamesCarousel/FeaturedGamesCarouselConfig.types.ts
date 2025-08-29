// src/components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarouselConfig.types.ts
import type { FeaturedFixture, AIInsight } from '../../../types';
import { GameSelectionConfig } from './FeaturedGamesCarousel.types';

export interface ScrollConfig {
  smooth?: boolean;
  snapOnMobile?: boolean;
  autoHideIndicators?: boolean;
  hideIndicatorsTimeout?: number;
}

export interface CarouselTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundGradient?: string;
  cardOpacity?: number;
  cardBorderRadius?: string;
}

export interface CarouselAnalytics {
  onGameCardView?: (fixture: FeaturedFixture, index: number) => void;
  onGameCardClick?: (fixture: FeaturedFixture, index: number) => void;
  onCarouselInteraction?: (action: CarouselInteraction) => void;

  /**
   * Track AI insight interactions
   */
  onAIInsightView?: (fixture: FeaturedFixture, insight: AIInsight) => void;
}

export interface CarouselInteraction {
  type: 'scroll' | 'navigate' | 'auto-rotate' | 'manual-rotate';
  direction?: 'left' | 'right';
  fromIndex: number;
  toIndex: number;
  timestamp: number;
}

export interface AccessibilityConfig {
  keyboardNavigation?: boolean;
  screenReaderAnnouncements?: boolean;
  ariaLabels?: {
    carousel?: string;
    previousButton?: string;
    nextButton?: string;
    gameCard?: (fixture: FeaturedFixture) => string;
    liveIndicator?: string;
    aiInsight?: string;
  };
  respectMotionPreferences?: boolean;
}

export interface PerformanceConfig {
  lazyLoadImages?: boolean;
  scrollDebounce?: number;
  virtualScrolling?: boolean;
  preloadCount?: number;
}

export interface ResponsiveConfig {
  cardWidth?: { mobile: number; tablet: number; desktop: number };
  visibleCards?: { mobile: number; tablet: number; desktop: number };
  gap?: { mobile: number; tablet: number; desktop: number };
}

export interface FeaturedGamesCarouselConfig {
  selection?: GameSelectionConfig;
  scroll?: ScrollConfig;
  theme?: CarouselTheme;
  analytics?: CarouselAnalytics;
  accessibility?: AccessibilityConfig;
  performance?: PerformanceConfig;
  responsive?: ResponsiveConfig;
}
