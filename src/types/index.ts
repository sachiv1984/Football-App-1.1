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
  score?: {
    fullTime?: {
      home?: number;
      away?: number;
    };
  };
  status?: 'scheduled' | 'live' | 'finished' | 'postponed' | 'upcoming';
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

// ===========================================
// API-SPECIFIC TYPES (TheSportsDB Integration)
// ===========================================

// Raw API response types from TheSportsDB
export interface SportsDbEvent {
  idEvent: string;
  strEvent: string;
  strHomeTeam: string;
  strAwayTeam: string;
  strHomeTeamShort?: string;
  strAwayTeamShort?: string;
  idHomeTeam: string;
  idAwayTeam: string;
  strVenue: string;
  strDate: string;
  strTime: string;
  intRound: string;
  strLeague: string;
  strHomeTeamBadge?: string;
  strAwayTeamBadge?: string;
  strStatus?: string;
}

export interface SportsDbTeam {
  idTeam: string;
  strTeam: string;
  strTeamShort?: string;
  strTeamBadge?: string;
  strStadium?: string;
  strLeague: string;
}

export interface SportsDbLeague {
  idLeague: string;
  strLeague: string;
  strSport: string;
  strLeagueBadge?: string;
  strLogo?: string;
  strCountry: string;
}

// API Response wrappers
export interface SportsDbEventsResponse {
  events: SportsDbEvent[];
}

export interface SportsDbTeamsResponse {
  teams: SportsDbTeam[];
}

export interface SportsDbLeaguesResponse {
  leagues: SportsDbLeague[];
}

export interface SportsDbFormResponse {
  results: any[]; // TheSportsDB form response structure varies
}

// Transformed/normalized types for your app (bridges API to your existing types)
export interface ApiFixture {
  id: string;
  dateTime: string;
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  venue: string;
  competition: ApiCompetition;
  matchWeek: number;
  status: 'upcoming' | 'live' | 'finished';
}

export interface ApiTeam {
  id: string;
  name: string;
  shortName?: string;
  badge?: string;
  form?: string[];
}

export interface ApiCompetition {
  id: string;
  name: string;
  logo?: string;
}

// ===========================================
// UTILITY & ERROR TYPES
// ===========================================

export type TeamNameMapping = { [fullName: string]: string };

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

export type ApiEndpoint = 
  | 'upcoming-fixtures'
  | 'team-details' 
  | 'league-details'
  | 'team-form';

export interface ApiErrorDetails {
  message: string;
  statusCode?: number;
  endpoint?: string;
  timestamp: number;
}

export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Enhanced hook return types
export interface UseFixturesReturn {
  featuredFixtures: FeaturedFixtureWithImportance[];
  allFixtures: FeaturedFixtureWithImportance[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseTeamDataReturn {
  team: ApiTeam | null;
  loading: boolean;
  error: string | null;
}
