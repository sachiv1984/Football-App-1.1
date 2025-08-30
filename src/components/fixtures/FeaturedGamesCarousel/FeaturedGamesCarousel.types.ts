import { FeaturedFixture, Team as BaseTeam } from '../../../types';
import type { FeaturedGamesCarouselConfig } from './FeaturedGamesCarouselConfig.types';

// Extend Team to include logoUrl, shortName, and colors
export interface Team extends BaseTeam {
  logoUrl: string;
  shortName: string;
  colors?: string[];
}

// Carousel props
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

export interface GameSelectionConfig {
  prioritizeLiveGames?: boolean;
  includeNextWeekIfFew?: boolean;
  minImportanceScore?: number;
  maxGames?: number;
  boostBigSixTeams?: boolean;
  topTeamIds?: string[];
}

// Fixed type for FeaturedFixture with extra fields
export interface FeaturedFixtureWithImportance extends FeaturedFixture {
  importanceScore: number;
  matchWeek: number;
  isBigMatch: boolean;
  tags: string[];
  kickoff: string; // ISO string
  date: string;    // Display string or date
  homeTeam: Team;
  awayTeam: Team;
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
