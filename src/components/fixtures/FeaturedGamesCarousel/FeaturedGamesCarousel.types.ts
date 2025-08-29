// src/components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types.ts
import { FeaturedFixture } from '../../../types';

export interface FeaturedGamesCarouselProps {
  /**
   * Array of fixture data to display
   * If empty, component will use auto-selection logic
   */
  fixtures?: FeaturedFixture[];
  
  /**
   * Callback when a game card is clicked/selected
   */
  onGameSelect?: (fixture: FeaturedFixture) => void;
  
  /**
   * Callback when "View Stats" button is clicked
   */
  onViewStats?: (fixtureId: string) => void;
  
  /**
   * Enable automatic rotation of featured games
   * @default false
   */
  autoRotate?: boolean;
  
  /**
   * Interval for auto-rotation in milliseconds
   * @default 5000
   */
  rotateInterval?: number;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Maximum number of featured games to show
   * @default 4
   */
  maxFeaturedGames?: number;
  
  /**
   * Configuration for game selection logic
   */
  selectionConfig?: GameSelectionConfig;
}

export interface GameSelectionConfig {
  /**
   * Whether to prioritize live games in selection
   * @default true
   */
  prioritizeLiveGames?: boolean;
  
  /**
   * Include games from next week if current week has few games
   * @default true
   */
  includeNextWeekIfFew?: boolean;
  
  /**
   * Minimum importance score for a game to be featured
   * @default 0
   */
  minImportanceScore?: number;
  
  /**
   * Maximum number of games to feature
   * @default 4
   */
  maxGames?: number;
  
  /**
   * Whether to boost importance for "Big 6" teams
   * @default true
   */
  boostBigSixTeams?: boolean;
  
  /**
   * Team IDs considered as "Big 6" or top teams
   */
  topTeamIds?: string[];
}

/**
 * Extended fixture interface with importance scoring
 */
export interface FeaturedFixtureWithImportance extends FeaturedFixture {
  /**
   * Calculated importance score (1-10 scale)
   */
  importanceScore?: number;
  
  /**
   * Match week number
   */
  matchWeek?: number;
  
  /**
   * Whether this is a "big" match (top teams, derby, etc.)
   */
  isBigMatch?: boolean;
  
  /**
   * Tags for categorizing the match
   */
  tags?: MatchTag[];
}

export type MatchTag = 
  | 'derby' 
  | 'top-six' 
  | 'title-race' 
  | 'relegation-battle' 
  | 'european-qualification' 
  | 'cup-final' 
  | 'season-opener' 
  | 'season-finale';

/**
 * Carousel state interface
 */
export interface CarouselState {
  currentIndex: number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isAutoRotating: boolean;
  isDragging: boolean;
}

/**
 * Scroll behavior configuration
 */
export interface ScrollConfig {
  /**
   * Smooth scrolling behavior
   * @default true
   */
  smooth?: boolean;
  
  /**
   * Enable snap scrolling on mobile
   * @default true
   */
  snapOnMobile?: boolean;
  
  /**
   * Auto-hide scroll indicators after inactivity
   * @default true
   */
  autoHideIndicators?: boolean;
  
  /**
   * Timeout for hiding indicators (ms)
   * @default 3000
   */
  hideIndicatorsTimeout?: number;
}

/**
 * Theme configuration for the carousel
 */
export interface CarouselTheme {
  /**
   * Primary color for active states
   */
  primaryColor?: string;
  
  /**
   * Secondary color for inactive states
   */
  secondaryColor?: string;
  
  /**
   * Background gradient
   */
  backgroundGradient?: string;
  
  /**
   * Card background opacity
   */
  cardOpacity?: number;
  
  /**
   * Border radius for cards
   */
  cardBorderRadius?: string;
}

/**
 * Analytics tracking interface
 */
export interface CarouselAnalytics {
  /**
   * Track when a game card is viewed
   */
  onGameCardView?: (fixture: FeaturedFixture, index: number) => void;
  
  /**
   * Track when a game is selected/clicked
   */
  onGameCardClick?: (fixture: FeaturedFixture, index: number) => void;
  
  /**
   * Track carousel interactions (scroll, navigation)
   */
  onCarouselInteraction?: (action: CarouselInteraction) => void;
  
  /**
   * Track AI insight interactions
   */
  onAIInsightView?: (fixture: FeaturedFixture, insight: any) => void;
}

export interface CarouselInteraction {
  type: 'scroll' | 'navigate' | 'auto-rotate' | 'manual-rotate';
  direction?: 'left' | 'right';
  fromIndex: number;
  toIndex: number;
  timestamp: number;
}

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
  /**
   * Enable keyboard navigation
   * @default true
   */
  keyboardNavigation?: boolean;
  
  /**
   * Enable screen reader announcements
   * @default true
   */
  screenReaderAnnouncements?: boolean;
  
  /**
   * Custom ARIA labels
   */
  ariaLabels?: {
    carousel?: string;
    previousButton?: string;
    nextButton?: string;
    gameCard?: (fixture: FeaturedFixture) => string;
    liveIndicator?: string;
    aiInsight?: string;
  };
  
  /**
   * Respect user's motion preferences
   * @default true
   */
  respectMotionPreferences?: boolean;
}

/**
 * Performance optimization configuration
 */
export interface PerformanceConfig {
  /**
   * Enable lazy loading for team logos
   * @default true
   */
  lazyLoadImages?: boolean;
  
  /**
   * Debounce scroll events (ms)
   * @default 16
   */
  scrollDebounce?: number;
  
  /**
   * Enable virtual scrolling for large datasets
   * @default false
   */
  virtualScrolling?: boolean;
  
  /**
   * Preload adjacent cards
   * @default 1
   */
  preloadCount?: number;
}

/**
 * Responsive breakpoint configuration
 */
export interface ResponsiveConfig {
  /**
   * Card width at different breakpoints
   */
  cardWidth?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  
  /**
   * Visible cards at different breakpoints
   */
  visibleCards?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
  
  /**
   * Gap between cards at different breakpoints
   */
  gap?: {
    mobile: number;
    tablet: number;
    desktop: number;
  };
}

/**
 * Complete configuration interface
 */
export interface FeaturedGamesCarouselConfig {
  selection?: GameSelectionConfig;
  scroll?: ScrollConfig;
  theme?: CarouselTheme;
  analytics?: CarouselAnalytics;
  accessibility?: AccessibilityConfig;
  performance?: PerformanceConfig;
  responsive?: ResponsiveConfig;
}

/**
 * Hook return type for carousel logic
 */
export interface UseCarouselReturn {
  featuredGames: FeaturedFixtureWithImportance[];
  isLoading: boolean;
  error: string | null;
  carouselState: CarouselState;
  scrollToIndex: (index: number) => void;
  scrollLeft: () => void;
  scrollRight: () => void;
  toggleAutoRotate: () => void;
  refreshData: () => Promise<void>;
}

/**
 * Data fetching interface
 */
export interface DataFetchConfig {
  /**
   * API endpoint for fixtures
   */
  fixturesEndpoint?: string;
  
  /**
   * Refresh interval for live data (ms)
   * @default 30000
   */
  refreshInterval?: number;
  
  /**
   * Enable real-time updates via WebSocket
   * @default false
   */
  realTimeUpdates?: boolean;
  
  /**
   * WebSocket endpoint for live updates
   */
  websocketEndpoint?: string;
  
  /**
   * Cache duration for fixture data (ms)
   * @default 300000
   */
  cacheDuration?: number;
}
