// src/components/common/Card/Card.tsx
import React from 'react';
import { clsx } from 'clsx';
import { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './Card.types';

const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  hover = false,
  clickable = false,
  className,
  children,
  onClick,
}) => {
  const baseClasses = 'bg-white rounded-xl transition-all duration-300';
  
  const variantClasses = {
    default: 'shadow-card border border-gray-100',
    elevated: 'shadow-lg border border-gray-100',
    outlined: 'border-2 border-gray-200 shadow-sm',
    ghost: 'border border-transparent',
  };
  
  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6', 
    xl: 'p-8',
  };

  const interactiveClasses = {
    hover: hover && 'hover:shadow-card-hover hover:-translate-y-1',
    clickable: clickable && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-electric-yellow focus:ring-offset-2',
  };

  const cardClasses = clsx(
    baseClasses,
    variantClasses[variant],
    paddingClasses[padding],
    interactiveClasses.hover,
    interactiveClasses.clickable,
    className
  );

  const Component = clickable ? 'button' : 'div';

  return (
    <Component className={cardClasses} onClick={onClick}>
      {children}
    </Component>
  );
};

const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  className,
  children,
}) => {
  return (
    <div className={clsx('flex items-start justify-between pb-3 border-b border-gray-100', className)}>
      <div className="flex-1">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 font-heading">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">
            {subtitle}
          </p>
        )}
        {children}
      </div>
      {action && (
        <div className="ml-4 flex-shrink-0">
          {action}
        </div>
      )}
    </div>
  );
};

const CardBody: React.FC<CardBodyProps> = ({ className, children }) => {
  return (
    <div className={clsx('py-3', className)}>
      {children}
    </div>
  );
};

const CardFooter: React.FC<CardFooterProps> = ({ className, children }) => {
  return (
    <div className={clsx('pt-3 border-t border-gray-100', className)}>
      {children}
    </div>
  );
};

// Compound component pattern
Card.Header = CardHeader;
Card.Body = CardBody;
Card.Footer = CardFooter;

export default Card;
