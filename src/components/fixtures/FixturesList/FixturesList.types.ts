// src/components/fixtures/FixturesList/FixturesList.types.ts
import { Fixture } from '../FixtureCard/FixtureCard.types';

export interface FixturesListProps {
  fixtures: Fixture[];
  title?: string;
  groupBy?: 'date' | 'competition' | 'none';
  cardSize?: 'sm' | 'md' | 'lg';
  showAIInsights?: boolean;
  showCompetition?: boolean;
  showVenue?: boolean;
  maxItems?: number;
  onFixtureClick?: (fixture: Fixture) => void;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
}

export interface FixtureGroup {
  key: string;
  label: string;
  fixtures: Fixture[];
}

export interface FixturesListHeaderProps {
  title?: string;
  totalFixtures: number;
  showFilters?: boolean;
}

export interface FixtureGroupProps {
  group: FixtureGroup;
  cardSize: 'sm' | 'md' | 'lg';
  showAIInsights: boolean;
  showCompetition: boolean;
  showVenue: boolean;
  onFixtureClick?: (fixture: Fixture) => void;
}
