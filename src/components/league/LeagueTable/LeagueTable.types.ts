// src/components/league/LeagueTable/LeagueTable.types.ts
import { Team } from '../../fixtures/FixtureCard/FixtureCard.types';

export interface LeagueTableRow {
  position: number;
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
  form: ('W' | 'D' | 'L')[];
  lastUpdated: string;
}

export interface League {
  id: string;
  name: string;
  shortName: string;
  country: string;
  season: string;
  logo?: string;
}

export interface LeagueTableProps {
  rows: LeagueTableRow[];
  league?: League;
  title?: string;
  showForm?: boolean;
  showGoals?: boolean;
  maxRows?: number;
  sortable?: boolean;
  onTeamClick?: (team: Team) => void;
  className?: string;
  loading?: boolean;
  viewMode?: 'table' | 'cards' | 'auto';
}

export interface LeagueTableHeaderProps {
  league?: League;
  title?: string;
  totalTeams: number;
}

export interface TeamFormIndicatorProps {
  form: ('W' | 'D' | 'L')[];
  maxItems?: number;
  size?: 'sm' | 'md';
}

export interface PositionIndicatorProps {
  position: number;
  totalTeams: number;
}

export type SortField = 
  | 'position' 
  | 'points' 
  | 'goalsFor' 
  | 'goalsAgainst' 
  | 'goalDifference' 
  | 'won' 
  | 'drawn' 
  | 'lost' 
  | 'played';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}
