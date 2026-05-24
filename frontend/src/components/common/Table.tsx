import React, { useState } from 'react';
import { FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import clsx from 'clsx';

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: T, index: number) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  className?: string;
  rowKey?: string | ((row: T) => string);
}

function Table<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onSort,
  onRowClick,
  emptyMessage = 'No data found',
  className,
  rowKey = 'id',
}: TableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (key: string) => {
    const newOrder = sortKey === key && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortKey(key);
    setSortOrder(newOrder);
    onSort?.(key, newOrder);
  };

  const getRowKey = (row: T, index: number): string => {
    if (typeof rowKey === 'function') return rowKey(row);
    return row[rowKey] ?? index.toString();
  };

  return (
    <div className={clsx('overflow-hidden rounded-xl', className)}>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={clsx(
                    col.sortable && 'cursor-pointer select-none hover:text-gray-200',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={clsx(
                    'flex items-center gap-1',
                    col.align === 'center' && 'justify-center',
                    col.align === 'right' && 'justify-end'
                  )}>
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortOrder === 'asc'
                        ? <FiChevronUp size={14} />
                        : <FiChevronDown size={14} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      <div className="skeleton-text w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12">
                  <p className="text-gray-500">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={getRowKey(row, index)}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={clsx(
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right'
                      )}
                    >
                      {col.render
                        ? col.render(row, index)
                        : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-primary-700/30 bg-primary-800/20">
          <p className="text-sm text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} results
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-primary-800/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <FiChevronLeft size={16} />
            </button>
            {Array.from({ length: Math.min(5, pagination.totalPages) }).map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange?.(pageNum)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                    pageNum === pagination.page
                      ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                      : 'text-gray-400 hover:text-white hover:bg-primary-800/50'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            {pagination.totalPages > 5 && (
              <span className="text-gray-500 px-1">...</span>
            )}
            <button
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-primary-800/50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
