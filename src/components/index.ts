// src/components/index.ts - Central export file for all design system components

// Common Components
export { default as Button } from './Button/Button';
export { default as Card } from './Card/Card';
export { default as Badge } from './Badge/Badge';
export { default as Table } from './Table/Table';
export { default as Modal } from './Modal/Modal';
export { default as Header } from './Header/Header'; 
export { default as Footer } from './Footer/Footer'; 

// Export types
export type { ButtonProps } from './Button/Button.types';
export type { CardProps } from './Card/Card.types';
export type { BadgeProps } from './Badge/Badge.types';
export type { TableProps } from './Table/Table.types';
export type { ModalProps } from './Modal/Modal.types';

// Type exports
export type { ButtonProps, ButtonVariant, ButtonSize } from './common/Button/Button.types';
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './common/Card/Card.types';
export type { BadgeProps, BadgeVariant } from './common/Badge/Badge.types';
export type { TableProps, Column, SortOrder } from './common/Table/Table.types';
export type { ModalProps, ModalHeaderProps, ModalBodyProps, ModalFooterProps } from './common/Modal/Modal.types';

// Design tokens
export { designTokens } from '../styles/designTokens';
