// src/components/common/Table/Table.tsx
import React, { useState, useMemo } from 'react';
import { clsx } from 'clsx';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { TableProps, Column, SortOrder } from './Table.types';

const Table = <T extends Record<string, unknown>>({
  data,
  columns,
  loading = false,
  bordered = false,
  striped = false,
  hover = true,
  size = 'md',
  sortable = false,
  onSort,
  defaultSortKey,
  defaultSortOrder = null,
  emptyText = 'No data available',
  className,
  rowClassName,
  onRowClick,
}: TableProps<T>) => {
  const [sortKey, setSortKey] = useState<keyof T | string | null>(defaultSortKey || null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const sizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const paddingClasses = {
    sm: 'px-3 py-2',
    md: 'px-4 py-3',
    lg: 'px-6 py-4',
  };

  const handleSort = (column: Column<T>) => {
    if (!column.sortable && !sortable) return;

    let newOrder: SortOrder = 'asc';
    if (sortKey === column.key) {
      if (sortOrder === 'asc') newOrder = 'desc';
      else if (sortOrder === 'desc') newOrder = null;
      else newOrder = 'asc';
    }

    setSortKey(newOrder ? column.key : null);
    setSortOrder(newOrder);
    onSort?.(column.key, newOrder);
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortOrder) return data;

    return [...data].sort((a, b) => {
      const aValue = a[sortKey as keyof T];
      const bValue = b[sortKey as keyof T];

      if (aValue === bValue) return 0;
      
      // Handle different types for comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const comparison = aValue - bValue;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
      
      // Fallback to string comparison
      const comparison = String(aValue).localeCompare(String(bValue));
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, sortKey, sortOrder]);

  const tableClasses = clsx(
    'w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm',
    sizeClasses[size],
    {
      'border border-gray-200': bordered,
    },
    className
  );

  const headerClasses = 'bg-gray-50 text-left font-medium text-gray-700 uppercase tracking-wider border-b border-gray-200';
  
  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable && !sortable) return null;
    
    if (sortKey !== column.key) {
      return (
        <div className="flex flex-col ml-1 opacity-50">
          <ChevronUpIcon className="w-3 h-3 -mb-1" />
          <ChevronDownIcon className="w-3 h-3" />
        </div>
      );
    }
    
    if (sortOrder === 'asc') {
      return <ChevronUpIcon className="w-4 h-4 ml-1 text-electric-yellow" />;
    }
    
    if (sortOrder === 'desc') {
      return <ChevronDownIcon className="w-4 h-4 ml-1 text-electric-yellow" />;
    }
    
    return (
      <div className="flex flex-col ml-1 opacity-50">
        <ChevronUpIcon className="w-3 h-3 -mb-1" />
        <ChevronDownIcon className="w-3 h-3" />
      </div>
    );
  };

  const getRowClassName = (record: T, index: number) => {
    let classes = 'border-b border-gray-100 transition-colors duration-150';
    
    if (striped && index % 2 === 1) {
      classes += ' bg-gray-25';
    }
    
    if (hover) {
      classes += ' hover:bg-gray-50';
    }
    
    if (onRowClick) {
      classes += ' cursor-pointer';
    }
    
    if (typeof rowClassName === 'string') {
      classes += ` ${rowClassName}`;
    } else if (typeof rowClassName === 'function') {
      classes += ` ${rowClassName(record, index)}`;
    }
    
    return classes;
  };

  if (loading) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className={tableClasses}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={String(column.key)}
                className={clsx(
                  headerClasses,
                  paddingClasses[size],
                  {
                    'cursor-pointer select-none': column.sortable || sortable,
                    'text-center': column.align === 'center',
                    'text-right': column.align === 'right',
                  },
                  column.className
                )}
                style={{ width: column.width }}
                onClick={() => handleSort(column)}
              >
                <div className="flex items-center">
                  {column.title}
                  {getSortIcon(column)}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((record, index) => (
            <tr
              key={index}
              className={getRowClassName(record, index)}
              onClick={() => onRowClick?.(record, index)}
            >
              {columns.map((column) => (
                <td
                  key={`${index}-${String(column.key)}`}
                  className={clsx(
                    paddingClasses[size],
                    'text-gray-900',
                    {
                      'text-center': column.align === 'center',
                      'text-right': column.align === 'right',
                    },
                    column.className
                  )}
                >
                  {column.render ? (
                    column.render(
                      column.dataIndex ? record[column.dataIndex as keyof T] : undefined,
                      record,
                      index
                    )
                  ) : (
                    column.dataIndex ? String(record[column.dataIndex as keyof T] ?? '') : null
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;