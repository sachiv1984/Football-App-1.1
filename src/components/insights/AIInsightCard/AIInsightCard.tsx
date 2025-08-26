// src/components/insights/AIInsightCard/AIInsightCard.tsx
import React from 'react';
import { Target, DollarSign } from 'lucide-react';
import ConfidenceIndicator from './ConfidenceIndicator';
import { AIInsightCardProps } from './AIInsightCard.types';

const AIInsightCard: React.FC<AIInsightCardProps> = ({
  insight,
  className = '',
  showConfidence = true,
  compact = false
}) => {
  const getMarketIcon = (market: string) => {
    if (market.toLowerCase().includes('goal')) return '⚽';
    if (market.toLowerCase().includes('card')) return '🟨';
    if (market.toLowerCase().includes('corner')) return '📐';
    if (market.toLowerCase().includes('shot')) return '🎯';
    return '📊';
  };

  if (compact) {
    return (
      <div className={`ai-insight-card p-3 ${className}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{insight.market}</span>
              {showConfidence && (
                <ConfidenceIndicator confidence={insight.confidence} size="sm" />
              )}
            </div>
          </div>
          <span className="text-lg ml-2">{getMarketIcon(insight.market)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`ai-insight-card ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{getMarketIcon(insight.market)}</span>
          <h4 className="font-semibold text-gray-900">{insight.title}</h4>
        </div>
        {showConfidence && (
          <ConfidenceIndicator confidence={insight.confidence} />
        )}
      </div>

      {/* Description */}
      <p className="text-gray-700 mb-4 leading-relaxed">
        {insight.description}
      </p>

      {/* Market and Odds */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Target className="w-4 h-4" />
          <span>{insight.market}</span>
        </div>
        
        {insight.odds && (
          <div className="flex items-center space-x-1 text-sm font-semibold text-highlight-teal">
            <DollarSign className="w-4 h-4" />
            <span>{insight.odds}</span>
          </div>
        )}
      </div>

      {/* Supporting Data */}
      {insight.supportingData && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            📈 {insight.supportingData}
          </p>
        </div>
      )}
    </div>
  );
};

export default AIInsightCard;
