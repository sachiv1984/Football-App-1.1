// src/components/common/Card/Card.types.ts
export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

export interface CardProps {
  variant?: CardVariant;
  padding?: CardPadding;
  hover?: boolean;
  clickable?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export interface CardHeaderProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export interface CardBodyProps {
  className?: string;
  children: React.ReactNode;
}

export interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}
