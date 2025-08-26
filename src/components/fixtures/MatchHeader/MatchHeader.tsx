// src/components/fixtures/MatchHeader/MatchHeader.tsx
import React from 'react';
import { format } from 'date-fns';
import { MapPin, Clock, Calendar } from 'lucide-react';
import TeamMatchup from './TeamMatchup';
import { MatchHeaderProps } from './MatchHeader.types';

const MatchHeader: React.FC<MatchHeaderProps> = ({ fixture, className = '' }) => {
  const getStatusDisplay = () => {
    switch (fixture.status) {
      case 'live':
        return (
          <div className="flex items-center space-x-2 bg-electric-yellow text-gray-900 px-3 py-2 rounded-lg font-bold animate-pulse">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>LIVE</span>
          </div>
        );
      case 'finished':
        return (
          <div className="bg-green-500 text-white px-3 py-2 rounded-lg font-semibold">
            Full Time
          </div>
        );
      case 'postponed':
        return (
          <div className="bg-red-500 text-white px-3 py-2 rounded-lg font-semibold">
            Postponed
          </div>
        );
      default:
        return (
          <div className="bg-deep-blue text-white px-3 py-2 rounded-lg font-semibold flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>{format(new Date(fixture.dateTime), 'HH:mm')}</span>
          </div>
        );
    }
  };

  const getScoreDisplay = () => {
    if (fixture.status === 'finished' || fixture.status === 'live') {
      return (
        <div className="text-center">
          <div className="match-score text-4xl md:text-6xl mb-2">
            {fixture.homeScore} - {fixture.awayScore}
          </div>
          {getStatusDisplay()}
        </div>
      );
    }
    return getStatusDisplay();
  };

  return (
    <div className={`card p-6 ${className}`}>
      {/* Competition and Date Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex items-center space-x-3 mb-4 md:mb-0">
          <div className="badge-primary badge-lg">
            {fixture.competition.name}
          </div>
          <div className="flex items-center text-gray-600 space-x-2">
            <Calendar className="w-4 h-4" />
            <span>{format(new Date(fixture.dateTime), 'EEEE, MMMM do')}</span>
          </div>
        </div>
        
        {/* Venue */}
        <div className="flex items-center text-gray-600 space-x-2">
          <MapPin className="w-4 h-4" />
          <span>{fixture.venue}</span>
        </div>
      </div>

      {/* Main Match Display */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Home Team */}
        <div className="order-1 md:order-1">
          <TeamMatchup 
            team={fixture.homeTeam} 
            score={fixture.homeScore}
            isHome={true}
          />
        </div>

        {/* Score/Status */}
        <div className="order-3 md:order-2 flex justify-center">
          {getScoreDisplay()}
        </div>

        {/* Away Team */}
        <div className="order-2 md:order-3">
          <TeamMatchup 
            team={fixture.awayTeam} 
            score={fixture.awayScore}
            isHome={false}
          />
        </div>
      </div>

      {/* AI Insight Preview */}
      {fixture.aiInsight && (
        <div className="mt-6 ai-insight-card">
          <h4 className="font-semibold text-gray-900 mb-2">
            💡 AI Insight
          </h4>
          <p className="text-sm text-gray-700">
            {fixture.aiInsight.description}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <span className={`text-xs font-semibold confidence-${fixture.aiInsight.confidence}`}>
              {fixture.aiInsight.confidence.toUpperCase()} CONFIDENCE
            </span>
            <span className="text-xs text-gray-500">
              {fixture.aiInsight.market}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MatchHeader;
