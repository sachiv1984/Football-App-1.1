import { FeaturedFixture, Team } from '../../../types';
import type { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';

/**
 * Props for the FeaturedGamesCarousel component
 */
export interface FeaturedGamesCarouselProps {
  fixtures?: FeaturedFixtureWithImportance[];
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  onViewStats?: (fixtureId: string) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
  maxFeaturedGames?: number;
  selectionConfig?: FeaturedGamesCarouselConfig['selection'];
}

/**
 * Configuration for game selection logic
 */
export interface GameSelectionConfig {
  prioritizeLiveGames?: boolean;
  includeNextWeekIfFew?: boolean;
  minImportanceScore?: number;
  maxGames?: number;
  boostBigSixTeams?: boolean;
  topTeamIds?: string[];
}

/**
 * Extended fixture type with importance and extra fields used in carousel
 */
export interface FeaturedFixtureWithImportance extends FeaturedFixture {
  importanceScore: number;
  matchWeek: number;
  isBigMatch: boolean;
  tags: string[];
  date: string;        // required for display
  kickoff: string;     // required for display
  homeTeam: Team;      // required for display
  awayTeam: Team;      // required for display
  score?: {
    home: number;
    away: number;
  };
}

/**
 * Type for match tags
 */
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
 * Carousel state for internal logic
 */
export interface CarouselState {
  currentIndex: number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isAutoRotating: boolean;
  isDragging: boolean;
}

/**
 * Hook return interface
 */
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

/**
 * Data fetching configuration
 */
export interface DataFetchConfig {
  fixturesEndpoint?: string;
  refreshInterval?: number;
  realTimeUpdates?: boolean;
  websocketEndpoint?: string;
  cacheDuration?: number;
}
