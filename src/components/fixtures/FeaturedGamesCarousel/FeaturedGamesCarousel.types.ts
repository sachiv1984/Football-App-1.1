import { FeaturedFixture } from '../../../types';
import type { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';

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

export interface GameSelectionConfig {
  prioritizeLiveGames?: boolean;
  includeNextWeekIfFew?: boolean;
  minImportanceScore?: number;
  maxGames?: number;
  boostBigSixTeams?: boolean;
  topTeamIds?: string[];
}

export interface FeaturedFixtureWithImportance extends FeaturedFixture {
  importanceScore: number;
  matchWeek: number;
  isBigMatch: boolean;
  tags: string[];
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
