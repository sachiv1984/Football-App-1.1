// src/components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types.ts
import { FeaturedFixture } from '../../../types';

/**
 * Props for the FeaturedGamesCarousel component
 */
export interface FeaturedGamesCarouselProps {
  /** Array of fixture data to display; auto-selection used if empty */
  fixtures?: FeaturedFixtureWithImportance[];
  
  /** Callback when a game card is clicked */
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  
  /** Callback when "View Stats" is clicked */
  onViewStats?: (fixture: FeaturedFixtureWithImportance) => void;
  
  /** Enable automatic rotation of featured games */
  autoRotate?: boolean;
  
  /** Interval for auto-rotation in ms */
  rotateInterval?: number;
  
  /** Additional CSS classes */
  className?: string;
  
  /** Maximum number of featured games to show */
  maxFeaturedGames?: number;
  
  /** Configuration for automatic game selection logic */
  selectionConfig?: GameSelectionConfig;
}

/**
 * Rules for selecting featured games
 */
export interface GameSelectionConfig {
  prioritizeLiveGames?: boolean;  // show live games first
  includeNextWeekIfFew?: boolean; // pull next week's games if current week is light
  minImportanceScore?: number;    // minimum importance score to feature
  maxGames?: number;              // maximum games to feature
  boostBigSixTeams?: boolean;     // boost matches with top teams
  topTeamIds?: string[];          // IDs of "big" teams
}

/**
 * Extended fixture data for carousel, including app-specific info
 */
export interface FeaturedFixtureWithImportance extends FeaturedFixture {
  importanceScore?: number;
  matchWeek?: number;
  isBigMatch?: boolean;
  tags?: MatchTag[];

  // App-specific extras
  kickoffTimeLocal?: string;
  broadcastChannel?: string;
  odds?: { home: number; draw: number; away: number };
  referee?: string;
}

/** Types of special matches */
export type MatchTag =
  | 'derby'
  | 'top-six'
  | 'title-race'
  | 'relegation-battle'
  | 'european-qualification'
  | 'cup-final'
  | 'season-opener'
  | 'season-finale';

/** Carousel state for UI */
export interface CarouselState {
  currentIndex: number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isAutoRotating: boolean;
  isDragging: boolean;
}

/** Analytics callbacks */
export interface CarouselAnalytics {
  onGameCardView?: (fixture: FeaturedFixtureWithImportance, index: number) => void;
  onGameCardClick?: (fixture: FeaturedFixtureWithImportance, index: number) => void;
  onViewStatsClick?: (fixture: FeaturedFixtureWithImportance) => void;
}

/** Return type for the carousel hook */
export interface UseCarouselReturn {
  featuredGames: FeaturedFixtureWithImportance[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  carouselState: CarouselState;
  scrollToIndex: (index: number) => void;
  scrollLeft: () => void;
  scrollRight: () => void;
  toggleAutoRotate: () => void;
  refreshData: () => Promise<void>;
}

/** Configuration for data fetching */
export interface DataFetchConfig {
  fixturesEndpoint?: string;
  refreshInterval?: number; // ms
  realTimeUpdates?: boolean;
  websocketEndpoint?: string;
  cacheDuration?: number; // ms
}
