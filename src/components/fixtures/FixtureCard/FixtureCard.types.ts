// src/components/fixtures/FixtureCard/FixtureCard.types.ts
import type { Team, Competition, AIInsight, Fixture } from '../../../types';

// Re-export the main types for convenience using `export type`
export type { Team, Competition, AIInsight, Fixture };

// Component-specific props and interfaces
export interface FixtureCardProps {
  fixture: Fixture;
  size?: 'sm' | 'md' | 'lg';
  showAIInsight?: boolean;
  showCompetition?: boolean;
  showVenue?: boolean;
  onClick?: (fixture: Fixture) => void;
  className?: string;
}

export interface FixtureStatusProps {
  status: Fixture['status'];
  kickoffTime?: string;
  homeScore?: number;
  awayScore?: number;
}

export interface TeamFormProps {
  form: ('W' | 'D' | 'L')[];
  maxItems?: number;
}
