// src/types/index.ts

export interface Team {
  id?: number;
  name: string;
  shortName: string;
  logo?: string; // rename badge/logo consistently
  colors?: { primary?: string; secondary?: string };
}

// Use this for the main Game type
export interface Game {
  id: number;
  homeTeam: Team;
  awayTeam: Team;
  dateTime: string; // unify date + kickoffTime
  venue: string;
  matchWeek?: number;
  isLive?: boolean;
  isPostponed?: boolean;
  importance?: number;
  competition?: string;
  homeScore?: number;
  awayScore?: number;
  status?: 'scheduled' | 'live' | 'finished' | 'postponed';
}

// Configs for carousel logic
export interface GameSelectionConfig {
  prioritizeLiveGames?: boolean;
  includeNextWeekIfFew?: boolean;
  minImportanceScore?: number;
  maxGames?: number;
}

export interface FeaturedFixtureWithImportance extends Game {
  importance: number; // force importance to exist
}

// Placeholder types to fix the rest of your imports
export interface CarouselState { /* define as needed */ }
export interface UseCarouselReturn { /* define as needed */ }
export interface MatchTag { /* define as needed */ }
export interface DataFetchConfig { /* define as needed */ }

// Optional AI insights if needed
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
