// src/components/index.ts
// ============================================================================
// SAFE CENTRAL EXPORT FILE
// ============================================================================
// This file exports only shared, dependency-free components and types.
// Large feature-specific components (Fixtures, Insights, League) are excluded
// to avoid circular dependencies. Import them directly where needed.
// ============================================================================

// --------------------
// Common UI Components
// --------------------
export { default as Button } from './common/Button/Button';
export { default as Badge } from './common/Badge/Badge';
export { default as Card } from './common/Card/Card';
export { default as Header } from './common/Header/Header';
export { default as Footer } from './common/Footer/Footer';
export { default as Modal } from './common/Modal/Modal';
export { default as Table } from './common/Table/Table';
export { default as TabNavigation } from './common/TabNavigation/TabNavigation';

// --------------------
// Common Component Types
// --------------------
export type { ButtonProps } from './common/Button/Button.types';
export type { BadgeProps } from './common/Badge/Badge.types';
export type { CardProps } from './common/Card/Card.types';
export type { ModalProps } from './common/Modal/Modal.types';
export type { TableProps } from './common/Table/Table.types';
export type { 
  Tab, 
  TabNavigationProps 
} from './common/TabNavigation/TabNavigation.types';

// --------------------
// Global/Shared Types
// --------------------
export type { 
  Fixture, 
  Team, 
  LeagueTableRow, 
  Competition, 
  AIInsight, 
  MatchStats, 
  TeamStats 
} from '../types';
