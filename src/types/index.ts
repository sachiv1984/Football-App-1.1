// -------------------------
// Team & Competition
// -------------------------
export interface Team {
  id: string; // Changed from number to string for consistency
  name: string;
  shortName: string;
  logo?: string;
  colors: { primary?: string; secondary?: string };
  form?: ('W' | 'D' | 'L')[];
  position?: number;
}

export interface Competition {
  id: string; // keeping as string
  name: string;
  shortName?: string;
  logo?: string;
  country?: string;
}

// -------------------------
// AI Insight
// -------------------------
export interface AIInsight {
  id: string; // keeping as string
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  probability: number;
  market?: string;
  odds?: string;
  supportingData?: string;
}

// -------------------------
// Fixtures / Games
// -------------------------
export interface Game {
  id: string; // Changed from number to string for consistency
  homeTeam: Team;
  awayTeam: Team;
  dateTime: string; // ISO datetime
  venue: string;
  matchWeek?: number;
  isLive?: boolean;
  isPostponed?: boolean;
  importance?: number; // for FeaturedFixture
  competition: Competition; // always an object
  homeScore?: number;
  awayScore?: number;
  status?: 'scheduled' | 'live' | 'finished' | 'postponed';
  aiInsight?: AIInsight;
}

// Alias
export type Fixture = Game;

export interface FeaturedFixtureWithImportance extends Game {
  importance: number; // always exists
  importanceScore: number; // used for calculations
  tags: string[];
  matchWeek: number; // made required
  isBigMatch: boolean;
}

export type FeaturedFixture = FeaturedFixtureWithImportance;

// -------------------------
// League / Stats
// -------------------------
export interface TeamStats {
  shotsOnTarget?: number;
  totalShots?: number;
  corners?: number;
  fouls?: number;
  yellowCards?: number;
  redCards?: number;
  possession?: number;
  passAccuracy?: number;
  offsides?: number;
}

export interface MatchStats {
  fixtureId: string;
  homeTeamStats: TeamStats;
  awayTeamStats: TeamStats;
  leagueAverages: TeamStats;
  lastUpdated: string;
}

export interface LeagueTableRow {
  position: number;
  team: Team;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points?: number;
  form?: ('W' | 'D' | 'L')[]; // Made optional to handle undefined
  lastUpdated?: string;
}

// -------------------------
// Carousel / Hooks
// -------------------------
export interface GameSelectionConfig {
  prioritizeLiveGames?: boolean;
  includeNextWeekIfFew?: boolean;
  minImportanceScore?: number;
  maxGames?: number;
  topTeamIds?: string[]; // Changed from number[] to string[] to match Team.id
  boostBigSixTeams?: boolean;
}

export interface DataFetchConfig {
  fixturesEndpoint?: string;
  refreshInterval?: number;
  realTimeUpdates?: boolean;
  websocketEndpoint?: string;
  cacheDuration?: number;
}

export interface CarouselState {
  currentIndex: number;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  isAutoRotating: boolean;
  isDragging: boolean;
}

export interface UseCarouselReturn {
  featuredGames: FeaturedFixture[];
  isLoading: boolean;
  error?: string;
  carouselState: CarouselState;
  scrollToIndex: (index: number) => void;
  scrollLeft: () => void;
  scrollRight: () => void;
  toggleAutoRotate: () => void;
  refreshData: () => Promise<void>; // Made async to match expected usage
}

// -------------------------
// Match Tags
// -------------------------
export type MatchTag =
  | 'top-six'
  | 'derby'
  | 'title-race'
  | 'european-qualification'
  | 'relegation-battle'
  | 'cup-final'
  | 'season-opener'
  | 'season-finale';

// -------------------------
// Featured Games Carousel Config
// -------------------------
export interface FeaturedGamesCarouselConfig {
  selection?: GameSelectionConfig;
  data?: DataFetchConfig;
}