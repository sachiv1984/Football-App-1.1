// src/components/fixtures/FixtureCard/FixtureCard.tsx
import React from 'react';
import { Badge } from '@/components';
import { 
  FixtureCardProps, 
  FixtureStatusProps, 
  TeamFormProps 
} from './FixtureCard.types';

const TeamForm: React.FC<TeamFormProps> = ({ form, maxItems = 5 }) => {
  const recentForm = form.slice(-maxItems);
  
  return (
    <div className="flex items-center space-x-1">
      {recentForm.map((result, index) => (
        <span
          key={index}
          className={`form-indicator ${
            result === 'W' ? 'form-w' : 
            result === 'D' ? 'form-d' : 'form-l'
          }`}
        >
          {result}
        </span>
      ))}
    </div>
  );
};

const FixtureStatus: React.FC<FixtureStatusProps> = ({ 
  status, 
  kickoffTime, 
  homeScore, 
  awayScore 
}) => {
  switch (status) {
    case 'live':
      return (
        <div className="text-center">
          <Badge className="badge-error mb-2">LIVE</Badge>
          <div className="match-score">
            {homeScore} - {awayScore}
          </div>
        </div>
      );
      
    case 'finished':
      return (
        <div className="text-center">
          <Badge className="badge-secondary mb-2">FT</Badge>
          <div className="match-score">
            {homeScore} - {awayScore}
          </div>
        </div>
      );
      
    case 'postponed':
      return (
        <div className="text-center">
          <Badge className="badge-warning">POSTPONED</Badge>
        </div>
      );
      
    default:
      return (
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-600">
            {kickoffTime || 'TBD'}
          </div>
        </div>
      );
  }
};

const FixtureCard: React.FC<FixtureCardProps> = ({
  fixture,
  size = 'md',
  showAIInsight = true,
  showCompetition = true,
  showVenue = false,
  onClick,
  className = '',
}) => {
  const {
    homeTeam,
    awayTeam,
    competition,
    dateTime,
    venue,
    status,
    homeScore,
    awayScore,
    aiInsight,
    kickoffTime
  } = fixture;

  const handleClick = () => {
    if (onClick) {
      onClick(fixture);
    }
  };

  const cardClasses = `
    fixture-card 
    ${onClick ? 'card-clickable' : 'card-hover'} 
    ${size === 'sm' ? 'p-3' : size === 'lg' ? 'p-6' : 'p-4'}
    ${className}
  `.trim();

  const logoSize = size === 'sm' ? 'team-logo' : 'team-logo-lg';
  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';

  return (
    <div className={cardClasses} onClick={handleClick}>
      {/* Competition Header */}
      {showCompetition && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <img 
              src={competition.logo} 
              alt={competition.name}
              className="w-4 h-4 object-contain"
            />
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wider">
              {competition.shortName}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            {new Date(dateTime).toLocaleDateString('en-GB', {
              weekday: 'short',
              day: 'numeric',
              month: 'short'
            })}
          </div>
        </div>
      )}

      {/* Main Fixture Content */}
      <div className="grid grid-cols-5 items-center gap-4">
        {/* Home Team */}
        <div className="col-span-2 flex flex-col items-center text-center">
          <img 
            src={homeTeam.logo} 
            alt={homeTeam.name}
            className={`${logoSize} mb-2`}
          />
          <h4 className={`font-semibold ${textSize} text-gray-900 mb-1`}>
            {size === 'sm' ? homeTeam.shortName : homeTeam.name}
          </h4>
          {size !== 'sm' && (
            <TeamForm form={homeTeam.form} maxItems={3} />
          )}
        </div>

        {/* Match Status/Score */}
        <div className="col-span-1 flex justify-center">
          <FixtureStatus
            status={status}
            kickoffTime={kickoffTime}
            homeScore={homeScore}
            awayScore={awayScore}
          />
        </div>

        {/* Away Team */}
        <div className="col-span-2 flex flex-col items-center text-center">
          <img 
            src={awayTeam.logo} 
            alt={awayTeam.name}
            className={`${logoSize} mb-2`}
          />
          <h4 className={`font-semibold ${textSize} text-gray-900 mb-1`}>
            {size === 'sm' ? awayTeam.shortName : awayTeam.name}
          </h4>
          {size !== 'sm' && (
            <TeamForm form={awayTeam.form} maxItems={3} />
          )}
        </div>
      </div>

      {/* Venue */}
      {showVenue && venue && (
        <div className="mt-3 text-center">
          <span className="text-xs text-gray-500">
            📍 {venue}
          </span>
        </div>
      )}

      {/* AI Insight */}
      {showAIInsight && aiInsight && size !== 'sm' && (
        <div className="mt-4 p-3 bg-gradient-to-r from-teal-50 to-transparent border-l-4 border-highlight-teal rounded-r-lg">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-semibold text-teal-600 uppercase tracking-wider">
                  AI Insight
                </span>
                <Badge 
                  className={`badge-sm ${
                    aiInsight.confidence === 'high' ? 'badge-success' :
                    aiInsight.confidence === 'medium' ? 'badge-warning' : 'badge-error'
                  }`}
                >
                  {aiInsight.confidence}
                </Badge>
              </div>
              <h5 className="text-sm font-semibold text-gray-900 mb-1">
                {aiInsight.title}
              </h5>
              <p className="text-xs text-gray-600 line-clamp-2">
                {aiInsight.description}
              </p>
            </div>
            {aiInsight.odds && (
              <div className="ml-3 text-right">
                <div className="text-xs text-gray-500 uppercase tracking-wider">Odds</div>
                <div className="text-sm font-bold text-teal-600">
                  {aiInsight.odds}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FixtureCard;
