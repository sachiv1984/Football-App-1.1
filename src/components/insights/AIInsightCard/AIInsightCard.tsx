// src/components/insights/AIInsightCard/AIInsightCard.tsx
import React from 'react';
import { Target, DollarSign, TrendingUp, Brain, Zap } from 'lucide-react';
import ConfidenceIndicator from './ConfidenceIndicator';
import { AIInsightCardProps } from './AIInsightCard.types';

export interface AIInsight {
  id: string;
  title: string;
  description: string;
  market?: string;
  confidence: 'high' | 'medium' | 'low';
  odds?: string;
  supportingData?: string;
  source?: string; // Added for service identification
  aiEnhanced?: boolean; // Added for AI enhancement badge
}

export interface AIInsightCardProps {
  insight: AIInsight;
  className?: string;
  showConfidence?: boolean;
  compact?: boolean;
  showServiceBadge?: boolean; // New prop
  animated?: boolean; // New prop
}

export interface ConfidenceIndicatorProps {
  confidence: 'high' | 'medium' | 'low';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export interface InsightsContainerProps {
  insights: AIInsight[];
  title?: string;
  className?: string;
  maxItems?: number;
}

const AIInsightCard: React.FC<AIInsightCardProps> = ({
  insight,
  className = '',
  showConfidence = true,
  compact = false,
  showServiceBadge = true,
  animated = true,
}) => {
  
  /**
   * Enhanced market icon mapping with more specific icons
   */
  const getMarketIcon = (market?: string) => {
    if (!market) return '📊';
    
    const marketLower = market.toLowerCase();
    
    // Goal-related markets
    if (marketLower.includes('total goals')) {
      if (marketLower.includes('over')) return '📈';
      if (marketLower.includes('under')) return '📉';
      return '⚽';
    }
    if (marketLower.includes('home team') && marketLower.includes('goals')) return '🏠';
    if (marketLower.includes('away team') && marketLower.includes('goals')) return '✈️';
    if (marketLower.includes('both teams to score')) return '⚽⚽';
    if (marketLower.includes('goal')) return '⚽';
    
    // Other markets
    if (marketLower.includes('card')) return '🟨';
    if (marketLower.includes('corner')) return '📐';
    if (marketLower.includes('shot')) return '🎯';
    if (marketLower.includes('foul')) return '⚠️';
    if (marketLower.includes('offside')) return '🚩';
    
    return '📊';
  };

  /**
   * Get service badge info
   */
  const getServiceInfo = (insight: any) => {
    const source = insight.source || 'ai';
    
    const serviceMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      goals: { 
        label: 'Goals AI', 
        color: 'bg-green-100 text-green-800',
        icon: <Target className="w-3 h-3" />
      },
      cards: { 
        label: 'Cards AI', 
        color: 'bg-yellow-100 text-yellow-800',
        icon: <Zap className="w-3 h-3" />
      },
      corners: { 
        label: 'Corners AI', 
        color: 'bg-blue-100 text-blue-800',
        icon: <TrendingUp className="w-3 h-3" />
      },
      ai: { 
        label: 'AI', 
        color: 'bg-purple-100 text-purple-800',
        icon: <Brain className="w-3 h-3" />
      }
    };

    return serviceMap[source] || serviceMap.ai;
  };

  /**
   * Get confidence-based styling
   */
  const getConfidenceStyles = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'border-l-green-500 bg-gradient-to-r from-green-50 to-white';
      case 'medium':
        return 'border-l-yellow-500 bg-gradient-to-r from-yellow-50 to-white';
      case 'low':
        return 'border-l-red-500 bg-gradient-to-r from-red-50 to-white';
      default:
        return 'border-l-gray-500 bg-white';
    }
  };

  /**
   * Animation classes
   */
  const animationClasses = animated 
    ? 'transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]' 
    : '';

  if (compact) {
    return (
      <div className={`
        ai-insight-card p-3 rounded-lg border border-gray-200 
        ${getConfidenceStyles(insight.confidence)}
        border-l-4 ${animationClasses} ${className}
      `}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Service badge for compact view */}
            {showServiceBadge && (
              <div className="mb-2">
                {(() => {
                  const serviceInfo = getServiceInfo(insight);
                  return (
                    <span className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${serviceInfo.color}
                    `}>
                      {serviceInfo.icon}
                      {serviceInfo.label}
                    </span>
                  );
                })()}
              </div>
            )}
            
            <p className="mb-2 text-sm text-gray-700 font-medium">{insight.title}</p>
            <p className="mb-2 text-xs text-gray-600 line-clamp-2">{insight.description}</p>
            
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 flex items-center gap-1">
                <Target className="w-3 h-3" />
                {insight.market || 'General'}
              </span>
              {showConfidence && (
                <ConfidenceIndicator
                  confidence={insight.confidence}
                  size="sm"
                />
              )}
            </div>
          </div>
          <div className="ml-3 flex flex-col items-center gap-1">
            <span className="text-2xl">{getMarketIcon(insight.market)}</span>
            {insight.odds && (
              <span className="text-xs font-bold text-green-600">
                {insight.odds}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`
      ai-insight-card rounded-xl border border-gray-200 p-6
      ${getConfidenceStyles(insight.confidence)}
      border-l-4 ${animationClasses} ${className}
    `}>
      {/* Header with Service Badge */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          {/* Service Badge */}
          {showServiceBadge && (
            <div className="mb-3">
              {(() => {
                const serviceInfo = getServiceInfo(insight);
                return (
                  <span className={`
                    inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold
                    ${serviceInfo.color}
                  `}>
                    {serviceInfo.icon}
                    {serviceInfo.label}
                  </span>
                );
              })()}
            </div>
          )}
          
          {/* Title with Icon */}
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getMarketIcon(insight.market)}</span>
            <h4 className="font-bold text-gray-900 text-lg">{insight.title}</h4>
          </div>
        </div>
        
        {/* Confidence Indicator */}
        {showConfidence && (
          <ConfidenceIndicator 
            confidence={insight.confidence} 
            size="md"
            showLabel={true}
          />
        )}
      </div>

      {/* Description */}
      <p className="mb-4 leading-relaxed text-gray-700">
        {insight.description}
      </p>

      {/* Market and Odds Row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Target className="h-4 w-4" />
          <span className="font-medium">{insight.market || 'General'}</span>
        </div>

        {insight.odds && (
          <div className="flex items-center space-x-1 text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full">
            <DollarSign className="h-4 w-4" />
            <span>{insight.odds}</span>
          </div>
        )}
      </div>

      {/* Supporting Data */}
      {insight.supportingData && (
        <div className="border-t border-gray-200 pt-3">
          <div className="flex items-start space-x-2">
            <span className="text-gray-400 mt-0.5">📊</span>
            <div className="flex-1">
              <p className="text-xs text-gray-600 font-medium mb-1">Supporting Data:</p>
              <p className="text-xs text-gray-500 leading-relaxed">
                {insight.supportingData}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Enhancement Badge (if this insight has special AI features) */}
      {(insight as any).aiEnhanced && (
        <div className="mt-3 flex items-center gap-2">
          <Brain className="w-4 h-4 text-purple-500" />
          <span className="text-xs text-purple-600 font-medium">
            AI Enhanced Analysis
          </span>
        </div>
      )}
    </div>
  );
};

export default AIInsightCard;