// src/components/insights/AIInsightCard/AIInsightCard.types.ts
export interface AIInsightCardProps {
  insight: AIInsight;
  className?: string;
  showConfidence?: boolean;
  compact?: boolean;
}

export interface InsightsContainerProps {
  insights: AIInsight[];
  title?: string;
  className?: string;
  maxItems?: number;
}

export interface ConfidenceIndicatorProps {
  confidence: 'high' | 'medium' | 'low';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}
