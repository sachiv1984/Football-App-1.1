// src/components/league/LeagueTable/LeagueTable.types.ts
import { Team, LeagueTableRow } from '../../../types';

// Re-export for convenience
export { Team, LeagueTableRow };

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
