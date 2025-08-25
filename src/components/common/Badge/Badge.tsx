import React from 'react';
import { clsx } from 'clsx';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { BadgeProps } from './Badge.types';

const Badge: React.FC<BadgeProps> = ({
  variant = 'primary', // ✅ ensures no undefined
  size = 'md',
  dot = false,
  outline = false,
  removable = false,
  className,
  children,
  onRemove,
}) => {
  const baseClasses =
    'inline-flex items-center font-medium rounded-full transition-colors duration-200';

  const sizeClasses = {
    sm: dot ? 'w-2 h-2' : 'px-2 py-0.5 text-xs',
    md: dot ? 'w-2.5 h-2.5' : 'px-2.5 py-1 text-sm',
    lg: dot ? 'w-3 h-3' : 'px-3 py-1.5 text-base',
  };

  // ✅ Define allowed variants explicitly
  type VariantKeys =
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'neutral'
    | 'danger';

  const solidVariantClasses: Record<VariantKeys, string> = {
    primary: 'bg-electric-yellow text-gray-900',
    secondary: 'bg-deep-blue text-white',
    success: 'bg-green-500 text-white',
    warning: 'bg-yellow-500 text-white',
    error: 'bg-red-500 text-white',
    info: 'bg-blue-500 text-white',
    neutral: 'bg-gray-500 text-white',
    danger: 'bg-red-600 text-white',
  };

  const outlineVariantClasses: Record<VariantKeys, string> = {
    primary: 'border border-electric-yellow text-gray-900 bg-yellow-50',
    secondary: 'border border-deep-blue text-deep-blue bg-blue-50',
    success: 'border border-green-500 text-green-700 bg-green-50',
    warning: 'border border-yellow-500 text-yellow-700 bg-yellow-50',
    error: 'border border-red-500 text-red-700 bg-red-50',
    info: 'border border-blue-500 text-blue-700 bg-blue-50',
    neutral: 'border border-gray-500 text-gray-700 bg-gray-50',
    danger: 'border border-red-600 text-red-700 bg-red-50',
  };

  // ✅ fallback to primary if variant is not in keys
  const variantClasses =
    outline ? outlineVariantClasses[variant as VariantKeys] : solidVariantClasses[variant as VariantKeys];

  const badgeClasses = clsx(
    baseClasses,
    sizeClasses[size],
    variantClasses,
    {
      'gap-1.5': removable && !dot,
    },
    className
  );

  const iconSizes = { sm: 'w-3 h-3', md: 'w-4 h-4', lg: 'w-5 h-5' };

  if (dot) return <span className={badgeClasses} />;

  return (
    <span className={badgeClasses}>
      {children}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className={clsx(
            'ml-1 inline-flex items-center justify-center rounded-full hover:bg-black hover:bg-opacity-10 focus:outline-none focus:bg-black focus:bg-opacity-10 transition-colors duration-150',
            iconSizes[size]
          )}
        >
          <XMarkIcon className={clsx(iconSizes[size])} />
        </button>
      )}
    </span>
  );
};

export default Badge;
