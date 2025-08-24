// src/components/league/LeagueTable/LeagueTable.tsx
import React, { useState, useMemo } from 'react';
import { Badge } from '@/components';
import { 
  LeagueTableProps, 
  LeagueTableHeaderProps,
  TeamFormIndicatorProps,
  PositionIndicatorProps,
  SortConfig,
  SortField,
  SortDirection,
  LeagueTableRow
} from './LeagueTable.types';

const TeamFormIndicator: React.FC<TeamFormIndicatorProps> = ({ 
  form, 
  maxItems = 5, 
  size = 'sm' 
}) => {
  const recentForm = form.slice(-maxItems).reverse(); // Most recent first
  
  return (
    <div className="flex items-center space-x-1">
      {recentForm.map((result, index) => (
        <span
          key={index}
          className={`form-indicator ${size === 'sm' ? 'w-4 h-4 text-xs' : 'w-5 h-5 text-xs'} ${
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

const PositionIndicator: React.FC<PositionIndicatorProps> = ({ position, totalTeams }) => {
  let indicatorClass = '';
  let title = '';

  if (position === 1) {
    indicatorClass = 'bg-yellow-400';
    title = 'League Winner';
  } else if (position <= 4) {
    indicatorClass = 'bg-blue-500';
    title = 'Champions League';
  } else if (position <= 6) {
    indicatorClass = 'bg-orange-500';
    title = 'Europa League';
  } else if (position > totalTeams - 3) {
    indicatorClass = 'bg-red-500';
    title = 'Relegation Zone';
  } else {
    indicatorClass = 'bg-gray-400';
    title = 'Mid Table';
  }

  return (
    <div 
      className={`w-1 h-8 rounded-r ${indicatorClass}`}
      title={title}
    />
  );
};

const LeagueTableHeader: React.FC<LeagueTableHeaderProps> = ({ 
  league, 
  title, 
  totalTeams 
}) => {
  const displayTitle = title || league?.name || 'League Table';
  
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        {league?.logo && (
          <img 
            src={league.logo} 
            alt={league.name}
            className="w-8 h-8 object-contain"
          />
        )}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{displayTitle}</h2>
          {league?.season && (
            <p className="text-sm text-gray-600">
              {league.season} • {totalTeams} teams
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg animate-pulse">
          <div className="w-6 h-6 bg-gray-300 rounded"></div>
          <div className="w-8 h-8 bg-gray-300 rounded"></div>
          <div className="flex-1">
            <div className="w-32 h-4 bg-gray-300 rounded mb-1"></div>
            <div className="w-20 h-3 bg-gray-300 rounded"></div>
          </div>
          <div className="hidden md:flex space-x-6">
            <div className="w-6 h-4 bg-gray-300 rounded"></div>
            <div className="w-6 h-4 bg-gray-300 rounded"></div>
            <div className="w-6 h-4 bg-gray-300 rounded"></div>
          </div>
          <div className="w-8 h-6 bg-gray-300 rounded font-bold"></div>
        </div>
      ))}
    </div>
  );
};

const MobileCard: React.FC<{
  row: LeagueTableRow;
  showForm: boolean;
  onTeamClick?: (team: any) => void;
}> = ({ row, showForm, onTeamClick }) => {
  const { position, team, played, won, drawn, lost, goalsFor, goalsAgainst, points, form } = row;
  
  return (
    <div 
      className={`card p-4 ${onTeamClick ? 'card-clickable' : 'card-hover'} flex items-center space-x-4`}
      onClick={() => onTeamClick?.(team)}
    >
      <PositionIndicator position={position} totalTeams={20} />
      
      <div className="flex items-center space-x-3 flex-1">
        <div className="text-lg font-bold text-gray-600 w-6">
          {position}
        </div>
        
        <img 
          src={team.logo} 
          alt={team.name}
          className="team-logo"
        />
        
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">
            {team.name}
          </h4>
          <div className="text-sm text-gray-600">
            P{played} W{won} D{drawn} L{lost}
          </div>
        </div>
      </div>
      
      <div className="text-right">
        <div className="text-xl font-bold text-gray-900">
          {points}
        </div>
        <div className="text-xs text-gray-500">
          {goalsFor}-{goalsAgainst}
        </div>
      </div>
      
      {showForm && (
        <div className="hidden sm:block ml-4">
          <TeamFormIndicator form={form} maxItems={3} />
        </div>
      )}
    </div>
  );
};

const LeagueTable: React.FC<LeagueTableProps> = ({
  rows,
  league,
  title,
  showForm = true,
  showGoals = true,
  maxRows,
  sortable = true,
  onTeamClick,
  className = '',
  loading = false,
  viewMode = 'auto'
}) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'position',
    direction: 'asc'
  });

  const displayRows = maxRows ? rows.slice(0, maxRows) : rows;

  const sortedRows = useMemo(() => {
    if (!sortable) return displayRows;

    return [...displayRows].sort((a, b) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string).toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [displayRows, sortConfig, sortable]);

  const handleSort = (field: SortField) => {
    if (!sortable) return;

    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) return '↕️';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (loading) {
    return (
      <div className={className}>
        <LeagueTableHeader league={league} title={title} totalTeams={0} />
        <LoadingSkeleton />
      </div>
    );
  }

  if (!sortedRows.length) {
    return (
      <div className={className}>
        <LeagueTableHeader league={league} title={title} totalTeams={0} />
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No league data available
            </h3>
            <p className="text-gray-600">
              League table will appear here once the season begins.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isMobile = viewMode === 'cards' || (viewMode === 'auto' && window.innerWidth < 768);

  return (
    <div className={className}>
      <LeagueTableHeader 
        league={league} 
        title={title} 
        totalTeams={rows.length} 
      />

      {/* Mobile Card View */}
      <div className="block md:hidden">
        <div className="space-y-3">
          {sortedRows.map((row) => (
            <MobileCard
              key={row.team.id}
              row={row}
              showForm={showForm}
              onTeamClick={onTeamClick}
            />
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="table table-hover w-full">
          <thead>
            <tr>
              <th className="w-4"></th>
              <th 
                className={`text-left ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                onClick={() => handleSort('position')}
              >
                <div className="flex items-center space-x-1">
                  <span>Pos</span>
                  {sortable && <span className="text-xs">{getSortIcon('position')}</span>}
                </div>
              </th>
              <th className="text-left">Team</th>
              <th 
                className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                onClick={() => handleSort('played')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>P</span>
                  {sortable && <span className="text-xs">{getSortIcon('played')}</span>}
                </div>
              </th>
              <th 
                className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                onClick={() => handleSort('won')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>W</span>
                  {sortable && <span className="text-xs">{getSortIcon('won')}</span>}
                </div>
              </th>
              <th 
                className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                onClick={() => handleSort('drawn')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>D</span>
                  {sortable && <span className="text-xs">{getSortIcon('drawn')}</span>}
                </div>
              </th>
              <th 
                className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                onClick={() => handleSort('lost')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span>L</span>
                  {sortable && <span className="text-xs">{getSortIcon('lost')}</span>}
                </div>
              </th>
              {showGoals && (
                <>
                  <th 
                    className={`text-center hidden lg:table-cell ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => handleSort('goalsFor')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>GF</span>
                      {sortable && <span className="text-xs">{getSortIcon('goalsFor')}</span>}
                    </div>
                  </th>
                  <th 
                    className={`text-center hidden lg:table-cell ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => handleSort('goalsAgainst')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>GA</span>
                      {sortable && <span className="text-xs">{getSortIcon('goalsAgainst')}</span>}
                    </div>
                  </th>
                  <th 
                    className={`text-center hidden lg:table-cell ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                    onClick={() => handleSort('goalDifference')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>GD</span>
                      {sortable && <span className="text-xs">{getSortIcon('goalDifference')}</span>}
                    </div>
                  </th>
                </>
              )}
              <th 
                className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                onClick={() => handleSort('points')}
              >
                <div className="flex items-center justify-center space-x-1">
                  <span className="font-semibold">Pts</span>
                  {sortable && <span className="text-xs">{getSortIcon('points')}</span>}
                </div>
              </th>
              {showForm && (
                <th className="text-center hidden xl:table-cell">Form</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, index) => {
              const { position, team, played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference, points, form } = row;
              
              return (
                <tr 
                  key={team.id}
                  className={`
                    league-table-row
                    ${onTeamClick ? 'cursor-pointer' : ''}
                    ${position === 1 ? 'bg-green-50 border-l-4 border-green-500' :
                      position <= 4 ? 'bg-blue-50 border-l-4 border-blue-500' :
                      position <= 6 ? 'bg-orange-50 border-l-4 border-orange-500' :
                      position > sortedRows.length - 3 ? 'bg-red-50 border-l-4 border-red-500' : 
                      'hover:bg-gray-50'}
                  `}
                  onClick={() => onTeamClick?.(team)}
                >
                  <td>
                    <PositionIndicator position={position} totalTeams={rows.length} />
                  </td>
                  <td>
                    <div className="font-bold text-gray-900">
                      {position}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center space-x-3">
                      <img 
                        src={team.logo} 
                        alt={team.name}
                        className="team-logo"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">
                          {team.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {team.shortName}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="text-center font-medium">{played}</td>
                  <td className="text-center text-green-600 font-medium">{won}</td>
                  <td className="text-center text-yellow-600 font-medium">{drawn}</td>
                  <td className="text-center text-red-600 font-medium">{lost}</td>
                  {showGoals && (
                    <>
                      <td className="text-center font-medium hidden lg:table-cell">{goalsFor}</td>
                      <td className="text-center font-medium hidden lg:table-cell">{goalsAgainst}</td>
                      <td className={`text-center font-medium hidden lg:table-cell ${
                        goalDifference > 0 ? 'text-green-600' : 
                        goalDifference < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {goalDifference > 0 ? '+' : ''}{goalDifference}
                      </td>
                    </>
                  )}
                  <td className="text-center">
                    <div className="font-bold text-lg text-gray-900">
                      {points}
                    </div>
                  </td>
                  {showForm && (
                    <td className="text-center hidden xl:table-cell">
                      <TeamFormIndicator form={form} maxItems={5} />
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeagueTable;
