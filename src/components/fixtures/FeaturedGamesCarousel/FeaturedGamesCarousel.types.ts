// src/components/fixtures/FeaturedGamesCarousel/FeaturedGamesCarousel.types.ts
import { FeaturedFixture } from '../../../types';
import type { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';

/**
 * Props for the carousel component
 */
export interface FeaturedGamesCarouselProps {
  fixtures?: FeaturedFixture[];
  onGameSelect?: (fixture: FeaturedFixture) => void;
  onViewStats?: (fixtureId: string) => void;
  autoRotate?: boolean;
  rotateInterval?: number;
  className?: string;
  maxFeaturedGames?: number;
  selectionConfig?: FeaturedGamesCarouselConfig['selection'];
}

/**
 * Configuration for filtering/selecting games
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
 * Team object
 */
export interface Team {
  id: string;
  name: string;
  logoUrl: string; // Ensure your data provides this
}

/**
 * Extended fixture object for carousel usage
 */
export interface FeaturedFixtureWithImportance extends FeaturedFixture {
  importanceScore: number;
  matchWeek: number;
  isBigMatch: boolean;
  tags: string[];
  kickoff: string; // time string (e.g., "19:45")
  date: string;    // date string (e.g., "2025-09-01")
  homeTeam: Team;
  awayTeam: Team;
}

/**
 * Match type tags
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
 * State of the carousel
 */
export interface CarouselState {
  currentIndex: number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isAutoRotating: boolean;
  isDragging: boolean;
}

/**
 * Return type from carousel hook
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
 * Data fetch configuration
 */
export interface DataFetchConfig {
  fixturesEndpoint?: string;
  refreshInterval?: number;
  realTimeUpdates?: boolean;
  websocketEndpoint?: string;
  cacheDuration?: number;
}
