// src/components/common/Table/Table.types.ts
export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T | string;
  title: string;
  dataIndex?: keyof T | string;
  render?: (value: unknown, record: T, index: number) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  fixed?: 'left' | 'right';
}

export interface TableProps<T = Record<string, unknown>> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  className?: string;
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
