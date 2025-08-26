// src/components/fixtures/MatchHeader/TeamMatchup.tsx
import React from 'react';
import { TeamMatchupProps } from './MatchHeader.types';

const TeamMatchup: React.FC<TeamMatchupProps> = ({ 
  team, 
  score, 
  isHome = false, 
  className = '' 
}) => {
  const teamStyle = {
    borderColor: team.colors.primary,
    backgroundColor: `${team.colors.primary}10`
  };

  return (
    <div 
      className={`flex flex-col items-center p-4 rounded-lg border-2 ${className}`}
      style={teamStyle}
    >
      {/* Team Logo and Name */}
      <div className="flex flex-col items-center mb-3">
        <img 
          src={team.logo} 
          alt={`${team.name} logo`}
          className="team-logo-lg mb-2"
        />
        <h3 className="text-lg font-bold text-center">{team.name}</h3>
        <span className="text-sm text-gray-600">{team.shortName}</span>
      </div>

      {/* Score Display */}
      {typeof score !== 'undefined' && (
        <div className="match-score mb-3">
          {score}
        </div>
      )}

      {/* Form Indicators */}
      <div className="flex space-x-1">
        {team.form.slice(-5).map((result, index) => (
          <span 
            key={index} 
            className={`form-indicator form-${result.toLowerCase()}`}
            title={`${result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}`}
          >
            {result}
          </span>
        ))}
      </div>

      {/* League Position */}
      <div className="mt-2 text-xs text-gray-500">
        {team.position ? `${team.position}${getOrdinalSuffix(team.position)} place` : ''}
      </div>
    </div>
  );
};

// Helper function for ordinal suffixes
const getOrdinalSuffix = (num: number): string => {
  const j = num % 10;
  const k = num % 100;
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
};

export default TeamMatchup;
