// src/components/common/Button/Button.tsx
import React from 'react';
import { clsx } from 'clsx';
import { ButtonProps } from './Button.types';

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  children,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-electric-yellow text-gray-900 hover:bg-yellow-400 focus:ring-electric-yellow shadow-sm hover:shadow-md',
    secondary: 'bg-deep-blue text-white hover:bg-blue-700 focus:ring-deep-blue shadow-sm hover:shadow-md',
    outline: 'border-2 border-deep-blue text-deep-blue hover:bg-deep-blue hover:text-white focus:ring-deep-blue',
    ghost: 'text-deep-blue hover:bg-blue-50 focus:ring-deep-blue',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500 shadow-sm hover:shadow-md',
  };
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const iconClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5', 
    lg: 'w-6 h-6',
    xl: 'w-7 h-7',
  };
  
  const isDisabled = disabled || loading;

  const buttonClasses = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    {
      'w-full': fullWidth,
      'cursor-not-allowed opacity-50': isDisabled,
    },
    className
  );

  const renderIcon = () => {
    if (loading) {
      return (
        <svg 
          className={clsx(iconClasses[size], 'animate-spin')}
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      );
    }
    
    if (icon) {
      return React.cloneElement(icon as React.ReactElement, {
        className: clsx(iconClasses[size], (icon as React.ReactElement).props?.className)
      });
    }
    
    return null;
  };

  return (
    <button
      className={buttonClasses}
      disabled={isDisabled}
      {...props}
    >
      {iconPosition === 'left' && renderIcon() && (
        <span className={clsx({ 'mr-2': children })}>{renderIcon()}</span>
      )}
      
      {children}
      
      {iconPosition === 'right' && renderIcon() && (
        <span className={clsx({ 'ml-2': children })}>{renderIcon()}</span>
      )}
    </button>
  );
};

export default Button;
