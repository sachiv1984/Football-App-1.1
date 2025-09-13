// src/components/stats/TeamForm/TeamForm.tsx
import React from 'react';
import { Team } from '../../../types';

interface TeamFormProps {
  homeTeam: Team;
  awayTeam: Team;
  homeForm: {
    results: ('W' | 'D' | 'L')[];
    matchesPlayed: number;
    won: number;
    drawn: number;
    lost: number;
  };
  awayForm: {
    results: ('W' | 'D' | 'L')[];
    matchesPlayed: number;
    won: number;
    drawn: number;
    lost: number;
  };
  league?: string;
  season?: string;
  className?: string;
}

const FormResult: React.FC<{ result: 'W' | 'D' | 'L' }> = ({ result }) => {
  const getResultStyle = (result: 'W' | 'D' | 'L') => {
    switch (result) {
      case 'W':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'D':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'L':
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  return (
    <div className={`w-8 h-8 rounded border flex items-center justify-center text-sm font-semibold ${getResultStyle(result)}`}>
      {result}
    </div>
  );
};

const TeamForm: React.FC<TeamFormProps> = ({
  homeTeam,
  awayTeam,
  homeForm,
  awayForm,
  league = "Premier League",
  season = "25/26",
  className = ""
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden ${className}`}>

      {/* League indicator */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-sm text-gray-600">
          Showing stats for {league} {season}
        </p>
      </div>

      {/* Main content */}
      <div className="p-6">
        {/* Team logos and title */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center">
            {homeTeam.logo ? (
              <img src={homeTeam.logo} alt={homeTeam.name} className="w-12 h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">{homeTeam.shortName.charAt(0)}</span>
              </div>
            )}
          </div>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Team Form</h2>
          </div>
          
          <div className="flex items-center">
            {awayTeam.logo ? (
              <img src={awayTeam.logo} alt={awayTeam.name} className="w-12 h-12 object-contain" />
            ) : (
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-600 font-semibold text-sm">{awayTeam.shortName.charAt(0)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Form display */}
        <div className="flex justify-between items-center mb-8">
          {/* Home team form */}
          <div className="flex space-x-2">
            {Array.from({ length: 5 - homeForm.results.length }).map((_, index) => (
              <div key={`empty-home-${index}`} className="w-8 h-8 rounded border border-gray-200 bg-gray-50"></div>
            ))}
            {homeForm.results.map((result, index) => (
              <FormResult key={`home-${index}`} result={result} />
            ))}
          </div>

          {/* Center form label */}
          <div className="text-center">
            <span className="text-lg font-semibold text-gray-700">Form</span>
          </div>

          {/* Away team form */}
          <div className="flex space-x-2">
            {awayForm.results.map((result, index) => (
              <FormResult key={`away-${index}`} result={result} />
            ))}
            {Array.from({ length: 5 - awayForm.results.length }).map((_, index) => (
              <div key={`empty-away-${index}`} className="w-8 h-8 rounded border border-gray-200 bg-gray-50"></div>
            ))}
          </div>
        </div>

        {/* Stats comparison */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900">{homeForm.matchesPlayed}</span>
            <span className="text-lg font-medium text-gray-700">Matches Played</span>
            <span className="text-2xl font-bold text-gray-900">{awayForm.matchesPlayed}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900">{homeForm.won}</span>
            <span className="text-lg font-medium text-gray-700">Won</span>
            <span className="text-2xl font-bold text-gray-900">{awayForm.won}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900">{homeForm.drawn}</span>
            <span className="text-lg font-medium text-gray-700">Drawn</span>
            <span className="text-2xl font-bold text-gray-900">{awayForm.drawn}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-2xl font-bold text-gray-900">{homeForm.lost}</span>
            <span className="text-lg font-medium text-gray-700">Lost</span>
            <span className="text-2xl font-bold text-gray-900">{awayForm.lost}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamForm;
