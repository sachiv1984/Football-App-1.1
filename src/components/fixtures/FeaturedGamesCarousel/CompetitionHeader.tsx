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
      <div className="flex items-center">
        {competitionLogo && (
          <img
            src={competitionLogo}
            alt={competitionName}
            className="w-10 h-10 md:w-12 md:h-12 object-contain"
          />
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