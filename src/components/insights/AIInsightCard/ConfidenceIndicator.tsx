// src/components/insights/AIInsightCard/ConfidenceIndicator.tsxame={getClasses()}>
import React from 'react';
import { TrendingUp, AlertTriangle, AlertCircle } from 'lucide-react';
import { ConfidenceIndicatorProps } from './AIInsightCard.types';

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  showLabel = true,
  size = 'md'
}) => {
  const getIcon = () => {
    switch (confidence) {
      case 'high':
        return <TrendingUp className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}`} />;
      case 'medium':
        return <AlertTriangle className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}`} />;
      case 'low':
        return <AlertCircle className={`${size === 'sm' ? 'w-3 h-3' : size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}`} />;
      default:
        return null; // ensures switch always returns
    }
  };

  const getClasses = () => {
    const baseClasses = 'flex items-center space-x-1';
    switch (confidence) {
      case 'high':
        return `${baseClasses} text-green-600`;
      case 'medium':
        return `${baseClasses} text-yellow-600`;
      case 'low':
        return `${baseClasses} text-red-600`;
      default:
        return baseClasses;
    }
  };

  return (
    <div className={getClasses()}>
      {getIcon()}
      {showLabel && (
        <span className={`font-semibold ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : 'text-sm'}`}>
          {confidence.toUpperCase()}
        </span>
      )}
    </div>
  );
};

export default ConfidenceIndicator;
