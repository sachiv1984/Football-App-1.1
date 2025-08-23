// src/components/common/Table/Table.types.ts
export interface Column<T = any> {
  key: string;
  title: string;
  dataIndex: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  className?: string;
}

export type SortOrder = 'asc' | 'desc' | null;

export interface TableProps<T = any> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  bordered?: boolean;
  striped?: boolean;
  hover?: boolean;
  size?: 'sm' | 'md' | 'lg';
  sortable?: boolean;
  onSort?: (key: string, order: SortOrder) => void;
  defaultSortKey?: string;
  defaultSortOrder?: SortOrder;
  emptyText?: string;
  className?: string;
  rowClassName?: string | ((record: T, index: number) => string);
  onRowClick?: (record: T, index: number) => void;
}
