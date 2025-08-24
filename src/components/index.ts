// src/components/index.ts - Central Export File

// Common Components
export { default as Button } from './common/Button/Button';
export { default as Badge } from './common/Badge/Badge';
export { default as Card } from './common/Card/Card';
export { default as Header } from './common/Header/Header';
export { default as Footer } from './common/Footer/Footer';

// Fixtures Components
export { default as HeroSection } from './fixtures/HeroSection/HeroSection';
export { default as FixtureCard } from './fixtures/FixtureCard/FixtureCard';
export { default as FixturesList } from './fixtures/FixturesList/FixturesList';

// League Components
export { default as LeagueTable } from './league/LeagueTable/LeagueTable';

// Stats Components  
// export { default as StatsTable } from './stats/StatsTable/StatsTable';

// Insights Components
// export { default as AIInsightCard } from './insights/AIInsightCard/AIInsightCard';

// Type Exports - Common
export type { ButtonProps } from './common/Button/Button.types';
export type { BadgeProps } from './common/Badge/Badge.types';
export type { CardProps } from './common/Card/Card.types';
export type { HeaderProps } from './common/Header/Header.types';
export type { FooterProps } from './common/Footer/Footer.types';

// Type Exports - Fixtures
export type { 
  HeroSectionProps, 
  FeaturedFixture 
} from './fixtures/HeroSection/HeroSection.types';

export type { 
  FixtureCardProps,
  Fixture,
  Team,
  Competition,
  AIInsight,
  FixtureStatusProps,
  TeamFormProps
} from './fixtures/FixtureCard/FixtureCard.types';

export type {
  FixturesListProps,
  FixtureGroup,
  FixturesListHeaderProps,
  FixtureGroupProps
} from './fixtures/FixturesList/FixturesList.types';

// Type Exports - League
export type { 
  LeagueTableProps, 
  LeagueTableRow, 
  League,
  TeamFormIndicatorProps,
  PositionIndicatorProps,
  SortConfig,
  SortField,
  SortDirection
} from './league/LeagueTable/LeagueTable.types';

// Type Exports - Stats
// export type { StatsTableProps, StatRow } from './stats/StatsTable/StatsTable.types';

// Type Exports - Insights
// export type { AIInsightCardProps, InsightData } from './insights/AIInsightCard/AIInsightCard.types';
