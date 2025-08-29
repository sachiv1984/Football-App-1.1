import { FeaturedFixture } from '../../../types';
import type { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';

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
  selectionConfig?: FeaturedGamesCarouselConfig['selection'];
}

export interface GameSelectionConfig {
  prioritizeLiveGames?: boolean;
  includeNextWeekIfFew?: boolean;
  minImportanceScore?: number;
  maxGames?: number;
  boostBigSixTeams?: boolean;
  topTeamIds?: number[];
}

/**
 * Updated interface to match main FeaturedFixtureWithImportance
 * - matchWeek is required
 * - tags is required
 */
export interface FeaturedFixtureWithImportance extends FeaturedFixture {
  importanceScore: number;
  matchWeek: number; // now required
  isBigMatch?: boolean;
  tags: string[]; // required to match main interface
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

export interface CarouselState {
  currentIndex: number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isAutoRotating: boolean;
  isDragging: boolean;
}

export interface UseCarouselReturn {
  featuredGames: FeaturedFixtureWithImportance[];
  isLoading: boolean;
  error: string | undefined;
  carouselState: CarouselState;
  scrollToIndex: (index: number) => void;
  scrollLeft: () => void;
  scrollRight: () => void;
  toggleAutoRotate: () => void;
  refreshData: () => Promise<void>;
}

export interface DataFetchConfig {
  fixturesEndpoint?: string;
  refreshInterval?: number;
  realTimeUpdates?: boolean;
  websocketEndpoint?: string;
  cacheDuration?: number;
}
