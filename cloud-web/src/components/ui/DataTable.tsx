"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ArrowUpDown, Search, ChevronDown, ChevronUp } from "lucide-react";

interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  className?: string;
  cellClassName?: string;
  render?: (item: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKey?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  onRowClick?: (item: T) => void;
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((item: T, index: number) => string);
  loading?: boolean;
  selectable?: boolean;
  selectedKeys?: string[];
  onSelectionChange?: (keys: string[]) => void;
  footer?: React.ReactNode;
}

type SortDirection = "asc" | "desc" | null;

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "No data",
  emptyIcon,
  searchable = false,
  searchPlaceholder = "Search...",
  searchKey,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [10, 20, 50],
  onRowClick,
  className,
  headerClassName,
  rowClassName,
  loading = false,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  footer,
}: DataTableProps<T>) {
  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<SortDirection>(null);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(initialPageSize);

  // Filter
  const filtered = React.useMemo(() => {
    if (!query || !searchKey) return data;
    const q = query.toLowerCase();
    return data.filter((item) => {
      const val = (item as Record<string, unknown>)[searchKey];
      return val !== null && val !== undefined && String(val).toLowerCase().includes(q);
    });
  }, [data, query, searchKey]);

  // Sort
  const sorted = React.useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortKey];
      const bVal = (b as Record<string, unknown>)[sortKey];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  // Paginate
  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice((page - 1) * pageSize, page * pageSize);

  React.useEffect(() => {
    setPage(1);
  }, [query, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortKey(null);
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const allSelected = selectable && paginated.length > 0 && paginated.every((item) => selectedKeys.includes(keyExtractor(item)));

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(selectedKeys.filter((k) => !paginated.some((item) => keyExtractor(item) === k)));
    } else {
      const newKeys = paginated.map((item) => keyExtractor(item));
      onSelectionChange([...new Set([...selectedKeys, ...newKeys])]);
    }
  };

  const toggleSelect = (key: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(
      selectedKeys.includes(key) ? selectedKeys.filter((k) => k !== key) : [...selectedKeys, key]
    );
  };

  return (
    <div className={cn("w-full", className)}>
      {/* Toolbar */}
      {(searchable || pageSizeOptions.length > 1) && (
        <div className="flex items-center justify-between gap-3 mb-3">
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-lg border border-border bg-surface py-1.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-muted focus:outline-none"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>{size} per page</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className={cn("border-b border-border bg-card", headerClassName)}>
            <tr>
              {selectable && (
                <th className="w-10 px-3 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border bg-surface"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold text-muted uppercase tracking-wider",
                    col.sortable && "cursor-pointer select-none hover:text-foreground",
                    col.className
                  )}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                    {col.sortable && sortKey !== col.key && (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {selectable && <td className="px-3 py-3"><div className="h-4 w-4 rounded skeleton" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3", col.className)}>
                      <div className="h-4 rounded skeleton" style={{ width: `${50 + Math.random() * 40}%` }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center"
                >
                  {emptyIcon && <div className="mx-auto mb-2 text-muted">{emptyIcon}</div>}
                  <p className="text-sm text-muted">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              paginated.map((item, index) => {
                const key = keyExtractor(item);
                const isSelected = selectedKeys.includes(key);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                    className={cn(
                      "transition-colors hover:bg-surface",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-surface",
                      typeof rowClassName === "function" ? rowClassName(item, index) : rowClassName
                    )}
                  >
                    {selectable && (
                      <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(key)}
                          className="h-4 w-4 rounded border-border bg-surface"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3 text-foreground", col.cellClassName, col.className)}>
                        {col.render ? col.render(item, index) : String((item as Record<string, unknown>)[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-xs text-muted">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    "h-8 w-8 rounded-md text-xs font-medium transition-colors",
                    pageNum === page
                      ? "accent-bg"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md p-1.5 text-muted hover:bg-surface hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  );
}
