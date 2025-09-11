// src/components/fixtures/FixtureCard/UnifiedFixtureCard.tsx
import React from 'react';
import type { Fixture, FeaturedFixtureWithImportance } from '../../../types';

interface UnifiedFixtureCardProps {
  fixture: Fixture | FeaturedFixtureWithImportance;
  variant?: 'carousel' | 'list' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  showCompetition?: boolean;
  showVenue?: boolean;
  showImportanceBadge?: boolean;
  onClick?: (fixture: Fixture | FeaturedFixtureWithImportance) => void;
  className?: string;
}

const UnifiedFixtureCard: React.FC<UnifiedFixtureCardProps> = ({
  fixture,
  variant = 'list',
  size = 'md',
  showCompetition = false,
  showVenue = true,
  showImportanceBadge = true,
  onClick,
  className = '',
}) => {
  const {
    homeTeam,
    awayTeam,
    dateTime,
    status = 'upcoming',
    venue = '',
  } = fixture;

  // Handle scores - check multiple possible locations
  const homeScore = fixture.homeScore ?? fixture.score?.fullTime?.home ?? 0;
  const awayScore = fixture.awayScore ?? fixture.score?.fullTime?.away ?? 0;

  // Check if this is a featured fixture with importance
  //const isFeaturedFixture = 'importance' in fixture;
  //const importance = isFeaturedFixture ? fixture.importance : 0;

  // Status checks
  const isLive = status === 'live';
  const isFinished = status === 'finished';
  const hasScore = isLive || isFinished;

  // Format date and time
  const matchDate = new Date(dateTime);
  const formattedTime = matchDate.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  const formattedDate = matchDate.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  });

  // Team name handling - use shortName if available, otherwise truncate
  const getTeamDisplayName = (team: typeof homeTeam): string => {
    if (team.shortName) return team.shortName;
    return team.name.length > 12 ? team.name.substring(0, 12) + '...' : team.name;
  };

  const homeDisplayName = getTeamDisplayName(homeTeam);
  const awayDisplayName = getTeamDisplayName(awayTeam);

  // Size-based styling
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'p-3',
          logo: 'w-6 h-6',
          teamText: 'text-sm',
          scoreText: 'text-lg',
          timeText: 'text-sm',
          spacing: 'gap-2',
          teamSpacing: 'space-y-2',
        };
      case 'lg':
        return {
          container: 'p-8',
          logo: 'w-12 h-12',
          teamText: 'text-lg',
          scoreText: 'text-3xl',
          timeText: 'text-xl',
          spacing: 'gap-6',
          teamSpacing: 'space-y-6',
        };
      default: // md
        return {
          container: 'p-6',
          logo: 'w-8 h-8',
          teamText: 'text-base',
          scoreText: 'text-2xl',
          timeText: 'text-base',
          spacing: 'gap-4',
          teamSpacing: 'space-y-4',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Render team logo
  const renderTeamLogo = (team: typeof homeTeam, sizeClass: string) => {
    if (team.logo) {
      return (
        <img 
          src={team.logo} 
          alt={team.name} 
          className={`${sizeClass} object-contain team-logo`}
        />
      );
    }
    
    return (
      <div className={`${sizeClass} bg-neutral-200 rounded-full flex items-center justify-center`}>
        <span className="text-sm font-bold text-neutral-600">
          {team.name[0]}
        </span>
      </div>
    );
  };

  // Carousel layout - vertical teams
  const renderCarouselLayout = () => (
    <div className="flex flex-col justify-between h-full">
      {/* Header - Competition & Week */}
      {showCompetition && 'competition' in fixture && fixture.competition && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center">
            {fixture.competition.logo && (
              <img 
                src={fixture.competition.logo} 
                alt={fixture.competition.name} 
                className="w-6 h-6 object-contain team-logo mr-2" 
              />
            )}
            <span className="text-xs font-medium text-neutral-600">
              {fixture.competition.name}
            </span>
          </div>
          {'matchWeek' in fixture && (
            <span className="text-xs text-neutral-500 font-medium">
              Week {fixture.matchWeek || 1}
            </span>
          )}
        </div>
      )}

      {/* Teams - Vertical layout for carousel */}
      <div className="flex justify-center items-center flex-1 mb-4">
        <div className="flex items-center justify-center gap-6 w-full">
          {/* Home Team */}
          <div className="flex flex-col items-center flex-1 min-w-0 max-w-[90px]">
            {renderTeamLogo(homeTeam, 'w-16 h-16 mb-2')}
            <span className="text-sm font-medium text-neutral-700 text-center truncate w-full leading-tight">
              {homeDisplayName}
            </span>
          </div>

          {/* Time/Score */}
          <div className="flex flex-col items-center text-center min-w-[60px] flex-shrink-0">
            {hasScore ? (
              <>
                <div className="text-lg font-bold text-neutral-800">
                  {homeScore} - {awayScore}
                </div>
                {isLive && (
                  <span className="status-live text-xs">LIVE</span>
                )}
                {isFinished && (
                  <span className="text-xs text-neutral-500">FT</span>
                )}
              </>
            ) : (
              <>
                <div className="text-base font-medium text-neutral-800">
                  {formattedTime}
                </div>
                <div className="text-xs text-neutral-500">
                  {formattedDate}
                </div>
              </>
            )}
          </div>

          {/* Away Team */}
          <div className="flex flex-col items-center flex-1 min-w-0 max-w-[90px]">
            {renderTeamLogo(awayTeam, 'w-16 h-16 mb-2')}
            <span className="text-sm font-medium text-neutral-700 text-center truncate w-full leading-tight">
              {awayDisplayName}
            </span>
          </div>
        </div>
      </div>

      {/* Footer - Venue & Badge */}
      <div className="flex flex-col items-center">
        {showVenue && venue && (
          <div className="text-xs text-neutral-500 truncate text-center w-full px-2 mb-2">
            {venue}
          </div>
        )}
      </div>
    </div>
  );

  // List layout - horizontal teams
  const renderListLayout = () => (
    <div className="flex items-center justify-between w-full">
      {/* Left Side - Teams */}
      <div className={`flex flex-col ${sizeClasses.teamSpacing} flex-1`}>
        {/* Home Team */}
        <div className={`flex items-center ${sizeClasses.spacing}`}>
          {renderTeamLogo(homeTeam, `${sizeClasses.logo} flex-shrink-0`)}
          <span className={`font-medium text-neutral-800 ${sizeClasses.teamText} truncate`}>
            {homeDisplayName}
          </span>
        </div>

        {/* Away Team */}
        <div className={`flex items-center ${sizeClasses.spacing}`}>
          {renderTeamLogo(awayTeam, `${sizeClasses.logo} flex-shrink-0`)}
          <span className={`font-medium text-neutral-800 ${sizeClasses.teamText} truncate`}>
            {awayDisplayName}
          </span>
        </div>
      </div>

      {/* Right Side - Time/Score & Status */}
      <div className="flex items-center justify-center ml-6 pl-6 border-l border-neutral-200 min-w-[100px]">
        {hasScore ? (
          <div className="text-center">
            <div className={`${sizeClasses.scoreText} font-bold text-neutral-800 leading-none mb-1`}>
              {homeScore}
            </div>
            <div className={`${sizeClasses.scoreText} font-bold text-neutral-800 leading-none mb-1`}>
              {awayScore}
            </div>
            <div className="text-xs text-neutral-500 font-medium">
              {isLive ? (
                <span className="status-live">LIVE</span>
              ) : (
                'FT'
              )}
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className={`${sizeClasses.timeText} font-semibold text-neutral-800 leading-tight`}>
              {formattedTime}
            </div>
            <div className="text-xs text-neutral-500 mt-1">
              {formattedDate}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Compact layout - side by side teams
  const renderCompactLayout = () => (
    <div className="flex items-center justify-between w-full">
      {/* Teams - Side by side */}
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center gap-2">
          {renderTeamLogo(homeTeam, 'w-6 h-6')}
          <span className="text-sm font-medium text-neutral-800 truncate max-w-[80px]">
            {homeDisplayName}
          </span>
        </div>

        <span className="text-neutral-400 text-sm">vs</span>

        <div className="flex items-center gap-2">
          {renderTeamLogo(awayTeam, 'w-6 h-6')}
          <span className="text-sm font-medium text-neutral-800 truncate max-w-[80px]">
            {awayDisplayName}
          </span>
        </div>
      </div>

      {/* Score/Time */}
      <div className="text-right min-w-[60px]">
        {hasScore ? (
          <div className="flex items-center gap-1">
            <span className="text-lg font-bold text-neutral-800">
              {homeScore}-{awayScore}
            </span>
            {isLive && <span className="status-live text-xs ml-1">LIVE</span>}
          </div>
        ) : (
          <div className="text-sm font-medium text-neutral-800">
            {formattedTime}
          </div>
        )}
      </div>
    </div>
  );

  // Choose layout based on variant
  const renderContent = () => {
    switch (variant) {
      case 'carousel':
        return renderCarouselLayout();
      case 'compact':
        return renderCompactLayout();
      default:
        return renderListLayout();
    }
  };

  // Handle click
  const handleClick = () => {
    if (onClick) {
      onClick(fixture);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      handleClick();
    }
  };

  // Container classes
  const containerClasses = [
    variant === 'carousel' ? 'carousel-card' : 'fixture-card',
    sizeClasses.container,
    onClick ? 'cursor-pointer' : '',
    variant === 'carousel' ? 'min-h-[280px]' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={containerClasses}
      onClick={onClick ? handleClick : undefined}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `View match between ${homeTeam.name} and ${awayTeam.name}` : undefined}
      onKeyDown={onClick ? handleKeyDown : undefined}
    >
      {renderContent()}
    </div>
  );
};

export default UnifiedFixtureCard;
