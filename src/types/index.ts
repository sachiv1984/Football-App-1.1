// -------------------------
// Team & Competition
// -------------------------
export interface Team {
  id?: number;
  name: string;
  shortName: string;
  logo?: string; // or badge
  colors: { primary?: string; secondary?: string };
  form?: ('W' | 'D' | 'L')[];
  position?: number;
}

export interface Competition {
  id?: string;
  name: string;
  shortName?: string;
  logo?: string;
  country?: string;
}

// -------------------------
// Fixtures / Games
// -------------------------
export interface Game {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  dateTime: string; // ISO datetime
  venue: string;
  matchWeek?: number;
  isLive?: boolean;
  isPostponed?: boolean;
  importance?: number; // used for FeaturedFixture
  competition?: Competition | string;
  homeScore?: number;
  awayScore?: number;
  status?: 'scheduled' | 'live' | 'finished' | 'postponed';
  aiInsight?: AIInsight; // add AI insight to Game
}

// Alias for existing components
export type Fixture = Game;

export interface FeaturedFixtureWithImportance extends Game {
  importance: number; // force importance to exist
  importanceScore?: number; // used in hook for calculation
  tags?: string[];
  matchWeek?: number;
  isBigMatch?: boolean;
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
  position?: number;
  team: Team;
  played?: number;
  won?: number;
  drawn?: number;
  lost?: number;
  goalsFor?: number;
  goalsAgainst?: number;
  goalDifference?: number;
  points?: number;
  form?: ('W' | 'D' | 'L')[];
  lastUpdated?: string;
}

// -------------------------
// AI Insight
// -------------------------
export interface AIInsight {
  id: string;
  title: string;
  description: string;
  confidence: 'high' | 'medium' | 'low';
  probability: number;
  market?: string;
  odds?: string;
  supportingData?: string;
}

// -------------------------
// Carousel / Hooks
// -------------------------
export interface GameSelectionConfig {
  prioritizeLiveGames?: boolean;
  includeNextWeekIfFew?: boolean;
  minImportanceScore?: number;
  maxGames?: number;
  topTeamIds?: number[]; // should match team IDs
  boostBigSixTeams?: boolean;
}

export interface DataFetchConfig {
  fixturesEndpoint?: string;
  refreshInterval?: number;
}

export interface CarouselState {
  currentIndex?: number;
  canScrollLeft?: boolean;
  canScrollRight?: boolean;
  isAutoRotating?: boolean;
  isDragging?: boolean;
}

export interface UseCarouselReturn {
  featuredGames: FeaturedFixture[];
  isLoading: boolean;
  error?: string;
  carouselState: CarouselState;
  scrollToIndex: (index: number) => void;
  scrollLeft: () => void;
  scrollRight: () => void;
  refreshData: () => void;
}

// -------------------------
// Match Tags
// -------------------------
export type MatchTag = 'top-six' | 'derby' | 'title-race' | 'european-qualification' | 'relegation-battle';
