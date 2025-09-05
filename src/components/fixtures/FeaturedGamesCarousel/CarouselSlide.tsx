// src/components/fixtures/FeaturedGamesCarousel/CarouselSlide.tsx
import React, { useState } from 'react';
import type { FeaturedFixtureWithImportance } from '../../../types';
import { getTeamLogo, getCompetitionLogo } from '../../../utils/teamUtils';
import { TeamLogo } from '../../common/Logo/TeamLogo';
import CompetitionHeader from './CompetitionHeader';
import clsx from 'clsx';

interface CarouselSlideProps {
  fixture: FeaturedFixtureWithImportance;
  index: number;
  onGameSelect?: (fixture: FeaturedFixtureWithImportance) => void;
  cardsPerView: number;
}

const CarouselSlide: React.FC<CarouselSlideProps> = ({
  fixture,
  index,
  onGameSelect,
  cardsPerView
}) => {
  const homeLogo = getTeamLogo(fixture.homeTeam);
  const awayLogo = getTeamLogo(fixture.awayTeam);
  const competitionLogo = getCompetitionLogo(fixture.competition.name, fixture.competition.logo);

  // Calculate styles based on cards per view
  const cardStyle = React.useMemo(() => {
    switch (cardsPerView) {
      case 3: 
        return { maxWidth: 'calc((100% - 48px) / 3)' }; // Account for 2 gaps of 24px each
      case 2: 
        return { maxWidth: 'calc((100% - 24px) / 2)' }; // Account for 1 gap of 24px
      case 1: 
        return { maxWidth: '100%' };
      default: 
        return { maxWidth: '100%' };
    }
  }, [cardsPerView]);

  return (
    <div
      className="carousel-slide flex-shrink-0 w-full"
      style={cardStyle}
    >
      <div
        className={clsx(
          'carousel-card w-full bg-white rounded-xl cursor-pointer',
          'transition-all duration-300 ease-in-out',
          // Responsive padding
          'p-6', // Mobile: 24px
          'md:p-8', // Tablet/Desktop: 32px
          // Interactive states - removed scale on hover to prevent size inconsistencies
          'hover:shadow-lg',
          'focus:outline-none focus:ring-2 focus:ring-[#FFD700] focus:ring-offset-2'
        )}
        onClick={() => onGameSelect?.(fixture)}
        tabIndex={0}
        role="button"
        aria-label={`View match between ${homeLogo.displayName} and ${awayLogo.displayName}`}
        style={{
          aspectRatio: '4 / 3',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
          // Force consistent sizing regardless of isActive state
          transform: 'none',
          minHeight: 'auto'
        }}
      >
        {/* Competition header */}
        <CompetitionHeader
          competitionName={fixture.competition.name}
          competitionLogo={competitionLogo ?? undefined}
          matchWeek={fixture.matchWeek}
        />

        {/* Teams Section */}
        <div className="flex items-center justify-between w-full mt-4 md:mt-6">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <div className="mb-3 flex items-center justify-center">
              <div 
                className="transition-all duration-300 ease-in-out hover:scale-105"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TeamLogo
                  logo={homeLogo.logoPath ?? undefined}
                  name={homeLogo.displayName}
                  size={60}
                  background="transparent"
                  className="transition-all duration-300"
                />
              </div>
            </div>
            <span className="text-xs md:text-sm font-semibold text-gray-900 text-center leading-tight">
              {homeLogo.displayName}
            </span>
          </div>

          {/* Kick-off Date & Time */}
          <div className="flex flex-col items-center flex-1 text-center px-2 md:px-4">
            <div className="flex items-center gap-2 mb-1">
              {/* Optional clock icon */}
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                className="text-gray-500"
              >
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
              <div 
                className="font-semibold"
                style={{
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: '#374151',
                  fontFamily: 'Inter, system-ui, sans-serif'
                }}
              >
                <span className="md:text-lg">
                  {new Date(fixture.dateTime).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
            <div 
              className="font-medium"
              style={{
                fontSize: '16px',
                lineHeight: '24px',
                color: '#374151',
                fontFamily: 'Inter, system-ui, sans-serif'
              }}
            >
              <span className="md:text-lg">
                {new Date(fixture.dateTime).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 min-w-0 px-2">
            <div className="mb-3 flex items-center justify-center">
              <div 
                className="transition-all duration-300 ease-in-out hover:scale-105"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <TeamLogo
                  logo={awayLogo.logoPath ?? undefined}
                  name={awayLogo.displayName}
                  size={60}
                  background="transparent"
                  className="transition-all duration-300"
                />
              </div>
            </div>
            <span className="text-xs md:text-sm font-semibold text-gray-900 text-center leading-tight">
              {awayLogo.displayName}
            </span>
          </div>
        </div>

        {/* Venue */}
        <div className="mt-4 md:mt-6 pt-3 md:pt-4 border-t border-gray-100 w-full text-center">
          <VenueWithTooltip venue={fixture.venue?.trim() || 'TBD'} />
        </div>
      </div>
    </div>
  );
};

// Venue component with tooltip for truncated names
const VenueWithTooltip: React.FC<{ venue: string }> = ({ venue }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const textRef = React.useRef<HTMLSpanElement>(null);

  React.useEffect(() => {
    if (textRef.current) {
      setIsTextTruncated(textRef.current.scrollWidth > textRef.current.clientWidth);
    }
  }, [venue]);

  return (
    <div 
      className="relative flex items-center justify-center gap-1"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span className="text-sm">📍</span>
      <span 
        ref={textRef}
        className="font-medium truncate max-w-[200px] md:max-w-[250px]"
        style={{
          fontSize: '14px',
          lineHeight: '20px',
          color: '#6B7280',
          fontFamily: 'Inter, system-ui, sans-serif'
        }}
      >
        <span className="md:text-base">{venue}</span>
      </span>
      
      {/* Tooltip */}
      {showTooltip && isTextTruncated && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg whitespace-nowrap z-10">
          {venue}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
};

export default CarouselSlide;