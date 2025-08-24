// src/components/fixtures/HeroSection/HeroSection.tsx
import React from 'react';
import { HeroSectionProps } from './HeroSection.types';
import Badge from '../../common/Badge/Badge';

export const HeroSection: React.FC<HeroSectionProps> = ({
  featuredFixture,
  onViewStats,
  onViewInsights,
  className,
}) => {
  if (!featuredFixture) return <div className={className}>No featured fixture</div>;

  const { homeTeam, awayTeam, competition, dateTime, status, aiInsight } = featuredFixture;

  return (
    <div className={`p-4 border rounded ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span>{competition.name}</span>
        <span>{new Date(dateTime).toLocaleString()}</span>
      </div>
      <div className="flex justify-between items-center mb-2">
        <span>{homeTeam.name}</span>
        <span>vs</span>
        <span>{awayTeam.name}</span>
      </div>
      <div className="flex gap-2 mb-2">
        <Badge variant="primary">Home Form: {homeTeam.form.join(',')}</Badge>
        <Badge variant="secondary">Away Form: {awayTeam.form.join(',')}</Badge>
      </div>
      {aiInsight && (
        <div className="p-2 bg-gray-100 rounded mb-2">
          <h4 className="font-semibold">{aiInsight.title}</h4>
          <p>{aiInsight.description}</p>
          <p>Confidence: {aiInsight.confidence}</p>
        </div>
      )}
      <div className="flex gap-2">
        {onViewStats && (
          <button
            className="px-2 py-1 bg-blue-500 text-white rounded"
            onClick={() => onViewStats(featuredFixture.id)}
          >
            View Stats
          </button>
        )}
        {onViewInsights && (
          <button
            className="px-2 py-1 bg-green-500 text-white rounded"
            onClick={() => onViewInsights(featuredFixture.id)}
          >
            View AI Insights
          </button>
        )}
      </div>
    </div>
  );
};
