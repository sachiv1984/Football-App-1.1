// src/components/index.ts - Central export file for all design system components

// Common Components
export { default as Button } from './common/Button/Button';
export { default as Card } from './common/Card/Card';
export { default as Badge } from './common/Badge/Badge';
export { default as Table } from './common/Table/Table';
export { default as Modal } from './common/Modal/Modal';

// Type exports
export type { ButtonProps, ButtonVariant, ButtonSize } from './common/Button/Button.types';
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './common/Card/Card.types';
export type { BadgeProps, BadgeVariant } from './common/Badge/Badge.types';
export type { TableProps, Column, SortOrder } from './common/Table/Table.types';
export type { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps } from './common/Modal/Modal.types';

// Design tokens
export { designTokens } from '../styles/designTokens';
