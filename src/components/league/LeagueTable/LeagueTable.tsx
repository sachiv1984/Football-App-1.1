// src/components/league/LeagueTable/LeagueTable.tsx
import React, { useState, useMemo } from 'react';
import { LeagueTableProps, LeagueTableRow, League } from './LeagueTable.types';

// Local types for sorting
type SortField = keyof LeagueTableRow;
type SortDirection = 'asc' | 'desc';
interface LocalSortConfig {
  field: SortField;
  direction: SortDirection;
}

// Team form indicators
const TeamFormIndicator: React.FC<{ form?: ('W' | 'D' | 'L')[], maxItems?: number, size?: 'sm' | 'md' | 'lg' }> = ({
  form = [], // Default to empty array
  maxItems = 5,
  size = 'sm'
}) => {
  const recentForm = form.slice(-maxItems).reverse();
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

// Position bar
const PositionIndicator: React.FC<{ position: number; totalTeams: number }> = ({ position, totalTeams }) => {
  let indicatorClass = '';
  if (position === 1) indicatorClass = 'bg-yellow-400';
  else if (position <= 4) indicatorClass = 'bg-blue-500';
  else if (position <= 6) indicatorClass = 'bg-orange-500';
  else if (position > totalTeams - 3) indicatorClass = 'bg-red-500';
  else indicatorClass = 'bg-gray-400';
  return <div className={`w-1 h-8 rounded-r ${indicatorClass}`} />;
};

// Header
const LeagueTableHeader: React.FC<{ league?: League; title?: string; totalTeams: number }> = ({ league, title, totalTeams }) => {
  const displayTitle = title || league?.name || 'League Table';
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center space-x-3">
        {league?.logo && <img src={league.logo} alt={league.name} className="w-8 h-8 object-contain" />}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{displayTitle}</h2>
          {league?.season && <p className="text-sm text-gray-600">{league.season} • {totalTeams} teams</p>}
        </div>
      </div>
    </div>
  );
};

// Mobile card row
const MobileCard: React.FC<{ row: LeagueTableRow; showForm: boolean; onTeamClick?: (team: LeagueTableRow['team']) => void }> = ({
  row, showForm, onTeamClick
}) => {
  const { position, team, played = 0, won = 0, drawn = 0, lost = 0, goalsFor = 0, goalsAgainst = 0, points = 0, form = [] } = row;
  return (
    <div 
      className={`card p-4 ${onTeamClick ? 'card-clickable' : 'card-hover'} flex items-center space-x-4`}
      onClick={() => onTeamClick?.(team)}
    >
      <PositionIndicator position={position} totalTeams={20} />
      <div className="flex items-center space-x-3 flex-1">
        <div className="text-lg font-bold text-gray-600 w-6">{position}</div>
        <img src={team.logo} alt={team.name} className="team-logo" />
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 truncate">{team.name}</h4>
          <div className="text-sm text-gray-600">P{played} W{won} D{drawn} L{lost}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-xl font-bold text-gray-900">{points}</div>
        <div className="text-xs text-gray-500">{goalsFor}-{goalsAgainst}</div>
      </div>
      {showForm && <div className="hidden sm:block ml-4"><TeamFormIndicator form={form} maxItems={3} /></div>}
    </div>
  );
};

// Skeleton for loading
const LoadingSkeleton: React.FC = () => (
  <div className="space-y-2">
    {Array.from({ length: 10 }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg animate-pulse">
        <div className="w-6 h-6 bg-gray-300 rounded" />
        <div className="w-8 h-8 bg-gray-300 rounded" />
        <div className="flex-1">
          <div className="w-32 h-4 bg-gray-300 rounded mb-1" />
          <div className="w-20 h-3 bg-gray-300 rounded" />
        </div>
        <div className="hidden md:flex space-x-6">
          <div className="w-6 h-4 bg-gray-300 rounded" />
          <div className="w-6 h-4 bg-gray-300 rounded" />
          <div className="w-6 h-4 bg-gray-300 rounded" />
        </div>
        <div className="w-8 h-6 bg-gray-300 rounded font-bold" />
      </div>
    ))}
  </div>
);

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
  loading = false
}) => {
  const [sortConfig, setSortConfig] = useState<LocalSortConfig>({ field: 'position', direction: 'asc' });
  const displayRows = maxRows ? rows.slice(0, maxRows) : rows;

  const sortedRows = useMemo(() => {
    if (!sortable) return displayRows;
    return [...displayRows].sort((a, b) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];
      
      // Handle undefined values
      if (aValue === undefined || bValue === undefined) {
        if (aValue === undefined && bValue === undefined) return 0;
        if (aValue === undefined) return 1;
        if (bValue === undefined) return -1;
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      return aValue! < bValue! ? (sortConfig.direction === 'asc' ? -1 : 1)
           : aValue! > bValue! ? (sortConfig.direction === 'asc' ? 1 : -1)
           : 0;
    });
  }, [displayRows, sortConfig, sortable]);

  const handleSort = (field: SortField) => {
    if (!sortable) return;
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortIcon = (field: SortField) => sortConfig.field !== field ? '↕️' : (sortConfig.direction === 'asc' ? '↑' : '↓');

  if (loading) return <div className={className}><LeagueTableHeader league={league} title={title} totalTeams={0} /><LoadingSkeleton /></div>;
  if (!rows.length) return <div className={className}><LeagueTableHeader league={league} title={title} totalTeams={0} /><div className="text-center py-12"><h3>No league data available</h3></div></div>;

  return (
    <div className={className}>
      <LeagueTableHeader league={league} title={title} totalTeams={rows.length} />
      <div className="block md:hidden">
        <div className="space-y-3">
          {sortedRows.map(row => <MobileCard key={row.team.id} row={row} showForm={showForm} onTeamClick={onTeamClick} />)}
        </div>
      </div>
      <div className="hidden md:block overflow-x-auto">
        <table className="table table-hover w-full">
          <thead>
            <tr>
              <th className="w-4"></th>
              <th className={`text-left ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`} onClick={() => handleSort('position')}>
                <div className="flex items-center space-x-1">
                  <span>Pos</span>{sortable && <span className="text-xs">{getSortIcon('position')}</span>}
                </div>
              </th>
              <th className="text-left">Team</th>
              <th className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`} onClick={() => handleSort('played')}>
                P {sortable && <span className="text-xs">{getSortIcon('played')}</span>}
              </th>
              <th className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`} onClick={() => handleSort('won')}>
                W {sortable && <span className="text-xs">{getSortIcon('won')}</span>}
              </th>
              <th className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`} onClick={() => handleSort('drawn')}>
                D {sortable && <span className="text-xs">{getSortIcon('drawn')}</span>}
              </th>
              <th className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`} onClick={() => handleSort('lost')}>
                L {sortable && <span className="text-xs">{getSortIcon('lost')}</span>}
              </th>
              {showGoals && <>
                <th className="text-center hidden lg:table-cell" onClick={() => handleSort('goalsFor')}>GF {sortable && <span className="text-xs">{getSortIcon('goalsFor')}</span>}</th>
                <th className="text-center hidden lg:table-cell" onClick={() => handleSort('goalsAgainst')}>GA {sortable && <span className="text-xs">{getSortIcon('goalsAgainst')}</span>}</th>
                <th className="text-center hidden lg:table-cell" onClick={() => handleSort('goalDifference')}>GD {sortable && <span className="text-xs">{getSortIcon('goalDifference')}</span>}</th>
              </>}
              <th className={`text-center ${sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`} onClick={() => handleSort('points')}>
                Pts {sortable && <span className="text-xs">{getSortIcon('points')}</span>}
              </th>
              {showForm && <th className="text-center hidden xl:table-cell">Form</th>}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => {
              const { 
                position, 
                team, 
                played = 0, 
                won = 0, 
                drawn = 0, 
                lost = 0, 
                goalsFor = 0, 
                goalsAgainst = 0, 
                goalDifference = 0, 
                points = 0, 
                form = [] 
              } = row;
              
              return (
                <tr key={team.id} className={`league-table-row ${onTeamClick ? 'cursor-pointer' : ''} ${
                  position === 1 ? 'bg-green-50 border-l-4 border-green-500' :
                  position <= 4 ? 'bg-blue-50 border-l-4 border-blue-500' :
                  position <= 6 ? 'bg-orange-50 border-l-4 border-orange-500' :
                  position > sortedRows.length - 3 ? 'bg-red-50 border-l-4 border-red-500' : 'hover:bg-gray-50'
                }`} onClick={() => onTeamClick?.(team)}>
                  <td><PositionIndicator position={position} totalTeams={rows.length} /></td>
                  <td>{position}</td>
                  <td>{team.name}</td>
                  <td className="text-center">{played}</td>
                  <td className="text-center">{won}</td>
                  <td className="text-center">{drawn}</td>
                  <td className="text-center">{lost}</td>
                  {showGoals && <>
                    <td className="text-center hidden lg:table-cell">{goalsFor}</td>
                    <td className="text-center hidden lg:table-cell">{goalsAgainst}</td>
                    <td className={`text-center hidden lg:table-cell ${goalDifference > 0 ? 'text-green-600' : goalDifference < 0 ? 'text-red-600' : 'text-gray-600'}`}>{goalDifference > 0 ? '+' : ''}{goalDifference}</td>
                  </>}
                  <td className="text-center">{points}</td>
                  {showForm && <td className="text-center hidden xl:table-cell"><TeamFormIndicator form={form} maxItems={5} /></td>}
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