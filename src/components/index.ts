// src/components/index.ts
// Fixed paths to match your actual directory structure

// Common Components - Import from ./common/ subdirectory
export { default as Button } from './common/Button/Button';
export { default as Card } from './common/Card/Card';
export { default as Badge } from './common/Badge/Badge';
export { default as Table } from './common/Table/Table';
export { default as Modal } from './common/Modal/Modal';
export { default as Header } from './common/Header/Header';
export { default as Footer } from './common/Footer/Footer';

// Export all component types
export type { ButtonProps } from './common/Button/Button.types';
export type { CardProps } from './common/Card/Card.types';
export type { BadgeProps } from './common/Badge/Badge.types';
export type { TableProps } from './common/Table/Table.types';
export type { ModalProps } from './common/Modal/Modal.types';

// Type exports - Fixtures
export type { 
  HeroSectionProps, 
  FeaturedFixture, 
  Team, 
  Competition, 
  AIInsight 
} from './fixtures/HeroSection/HeroSection.types';

// Re-export design tokens for convenience
export { designTokens } from '../styles/designTokens';
