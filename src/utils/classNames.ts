// src/utils/classNames.ts - Utility for conditional class names
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Helper for creating component variants
export function createVariants<T extends Record<string, Record<string, string>>>(variants: T) {
  return variants;
}

// Example usage of createVariants
export const buttonVariants = createVariants({
  variant: {
    primary: 'bg-electric-yellow text-gray-900 hover:bg-yellow-400',
    secondary: 'bg-deep-blue text-white hover:bg-blue-700',
    outline: 'border-2 border-deep-blue text-deep-blue hover:bg-deep-blue hover:text-white',
    ghost: 'text-deep-blue hover:bg-blue-50',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  },
  size: {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  },
});
