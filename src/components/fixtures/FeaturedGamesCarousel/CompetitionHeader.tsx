// src/components/fixtures/FeaturedGamesCarousel/CompetitionHeader.tsx
import React from 'react';

interface CompetitionHeaderProps {
  competitionName: string;
  competitionLogo?: string | null;
  matchWeek: number;
}

const CompetitionHeader: React.FC<CompetitionHeaderProps> = ({
  competitionName,
  competitionLogo,
  matchWeek
}) => {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 w-full">
      <div className="flex items-center justify-center">
        {competitionLogo && (
          <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center transition-transform duration-200 hover:scale-105 hover:shadow-xl active:scale-102">
            <img
              src={competitionLogo}
              alt={competitionName}
              className="w-12 h-12 object-contain"
            />
          </div>
        )}
      </div>
      <div className="bg-gray-100 px-3 py-1.5 rounded-full">
        <span 
          className="text-xs md:text-sm font-medium"
          style={{
            color: '#6B7280',
            fontFamily: 'Inter, system-ui, sans-serif'
          }}
        >
          Week {matchWeek}
        </span>
      </div>
    </div>
  );
};

export default CompetitionHeader;