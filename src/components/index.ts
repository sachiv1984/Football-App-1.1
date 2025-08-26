// src/components/index.ts - Central Export File

// ============================================================================
// COMPONENT EXPORTS
// ============================================================================

// Common Components
export { default as Button } from './common/Button/Button';
export { default as Badge } from './common/Badge/Badge';
export { default as Card } from './common/Card/Card';
export { default as Header } from './common/Header/Header';
export { default as Footer } from './common/Footer/Footer';
export { default as Modal } from './common/Modal/Modal';
export { default as Table } from './common/Table/Table';
export { default as TabNavigation } from './common/TabNavigation/TabNavigation';

// Fixtures Components
export { default as HeroSection } from './fixtures/HeroSection/HeroSection';
export { default as FixtureCard } from './fixtures/FixtureCard/FixtureCard';
export { default as FixturesList } from './fixtures/FixturesList/FixturesList';
export { default as MatchHeader } from './fixtures/MatchHeader/MatchHeader';

// League Components
export { default as LeagueTable } from './league/LeagueTable/LeagueTable';

// Stats Components  
export { default as StatsTable } from './stats/StatsTable/StatsTable';
export { default as StatRow } from './stats/StatsTable/StatRow';

// AI Insights Components
export { default as AIInsightCard } from './insights/AIInsightCard/AIInsightCard';
export { default as InsightsContainer } from './insights/AIInsightCard/InsightsContainer';
export { default as ConfidenceIndicator } from './insights/AIInsightCard/ConfidenceIndicator';

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Global/Shared Types
export type { 
  Fixture, 
  Team, 
  LeagueTableRow, 
  Competition, 
  AIInsight, 
  MatchStats, 
  TeamStats 
} from '../types';

// Common Component Types
export type { ButtonProps } from './common/Button/Button.types';
export type { BadgeProps } from './common/Badge/Badge.types';
export type { CardProps } from './common/Card/Card.types';
export type { ModalProps } from './common/Modal/Modal.types';
export type { TableProps } from './common/Table/Table.types';
export type { 
  Tab, 
  TabNavigationProps 
} from './common/TabNavigation/TabNavigation.types';

// Fixtures Types
export type { 
  HeroSectionProps, 
  FeaturedFixture 
} from './fixtures/HeroSection/HeroSection.types';

export type { 
  FixtureCardProps,
  FixtureStatusProps,
  TeamFormProps
} from './fixtures/FixtureCard/FixtureCard.types';

export type {
  FixturesListProps,
  FixtureGroup,
  FixturesListHeaderProps,
  FixtureGroupProps
} from './fixtures/FixturesList/FixturesList.types';

export type {
  MatchHeaderProps
} from './fixtures/MatchHeader/MatchHeader.types';

// League Types
export type { 
  LeagueTableProps, 
  League
} from './league/LeagueTable/LeagueTable.types';

// Stats Types
export type { 
  StatsTableProps, 
  StatRowProps
} from './stats/StatsTable/StatsTable.types';

// AI Insights Types
export type { 
  AIInsightCardProps, 
  InsightsContainerProps,
  ConfidenceIndicatorProps
} from './insights/AIInsightCard/AIInsightCard.types';
