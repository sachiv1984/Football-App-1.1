// src/components/common/Badge/Badge.types.ts
export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  outline?: boolean;
  removable?: boolean;
  className?: string;
  children?: React.ReactNode; // ✅ Made optional for dot-only usage
  onRemove?: () => void;
  title?: string; // ✅ Optional tooltip for dot badges
}
