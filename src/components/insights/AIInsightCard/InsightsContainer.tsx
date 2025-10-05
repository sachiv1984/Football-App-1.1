// src/components/insights/AIInsightCard/InsightsContainer.tsx
import React from 'react';
import AIInsightCard from './AIInsightCard';
import { InsightsContainerProps } from './AIInsightCard.types';

const InsightsContainer: React.FC<InsightsContainerProps> = ({
  insights,
  title = 'AI Betting Insights',
  className = '',
  maxItems
}) => {
  const displayedInsights = maxItems ? insights.slice(0, maxItems) : insights;

  if (insights.length === 0) {
    return (
      <div className={`card p-8 text-center ${className}`}>
        <div className="text-gray-400 mb-2">🤖</div>
        <p className="text-gray-500">No AI insights available for this match.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-xl font-bold mb-4 flex items-center space-x-2">
        <span>🧠</span>
        <span>{title}</span>
      </h3>
      
      <div className="space-y-4">
        {displayedInsights.map((insight, index) => (
          <AIInsightCard
            key={insight.id || index}
            insight={insight}
          />
        ))}
      </div>
    </div>
  );
};

export default InsightsContainer;
