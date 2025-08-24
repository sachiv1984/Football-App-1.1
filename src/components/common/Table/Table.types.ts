// src/components/common/Table/Table.types.ts
import React from 'react';

export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  title: string;
  dataIndex?: keyof T | string;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  fixed?: 'left' | 'right';
  className?: string;
}

// Export Column as an alias for backward compatibility
export type Column<T = Record<string, unknown>> = TableColumn<T>;

// Define sort order type
export type SortOrder = 'asc' | 'desc' | null;

export interface TableProps<T = Record<string, unknown>> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  bordered?: boolean;
  striped?: boolean;
  hover?: boolean;
  size?: 'sm' | 'md' | 'lg';
  sortable?: boolean;
  onSort?: (key: keyof T | string, order: SortOrder) => void;
  defaultSortKey?: keyof T | string;
  defaultSortOrder?: SortOrder;
  emptyText?: string;
  className?: string;
  rowClassName?: string | ((record: T, index: number) => string);
  rowKey?: keyof T | ((record: T) => string | number);
  onRowClick?: (record: T, index: number) => void;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
  scroll?: {
    x?: number | string;
    y?: number | string;
  };
}