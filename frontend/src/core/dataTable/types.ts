/**
 * Core types for the enterprise DataTable component
 */

import type {ColumnSort} from '@tanstack/react-table';

/**
 * Server-side API response structure
 */
export interface ServerSideDataResponse<T> {
    success: boolean;
    data: T[];
    totalCount: number;
    filteredCount?: number;
}

/**
 * Sort configuration for server-side sorting
 */
export interface SortConfig {
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

/**
 * Base column definition with common properties
 */
export interface BaseColumnDef<T> {
    /** Unique identifier for the column */
    id: keyof T | string;
    /** Header label (translation key or string) */
    header: string;
    /** Whether this column can be sorted */
    enableSorting?: boolean;
    /** Whether this column can be filtered */
    enableFiltering?: boolean;
    /** Width of the column (supports px, %, rem, or auto) - e.g., '200px', '20%', '15rem' */
    width?: string | number;
    /** Minimum width to prevent collapse during filtering - supports px, rem, etc. */
    minWidth?: string | number;
}

/**
 * Text column definition
 */
export interface TextColumnDef<T> extends BaseColumnDef<T> {
    type: 'text';
    /** Field accessor path (dot notation for nested) */
    accessor: keyof T;
    /** Placeholder for filter input */
    filterPlaceholder?: string;
    /** Custom cell renderer */
    cellRenderer?: (value: any, row: T) => React.ReactNode;
}

/**
 * Boolean column definition
 */
export interface BooleanColumnDef<T> extends BaseColumnDef<T> {
    type: 'boolean';
    /** Field accessor path */
    accessor: keyof T;
    /** True label (for display when true) */
    trueLabel?: string;
    /** False label (for display when false) */
    falseLabel?: string;
    /** Custom cell renderer */
    cellRenderer?: (value: boolean, row: T) => React.ReactNode;
}

/**
 * Checkbox column definition (interactive boolean with onToggle callback)
 */
export interface CheckboxColumnDef<T> extends BaseColumnDef<T> {
    type: 'checkbox';
    /** Field accessor path */
    accessor: keyof T;
    /** Callback when checkbox is toggled */
    onToggle: (row: T, checked: boolean) => Promise<void>;
    /** Whether the checkbox is disabled */
    isDisabled?: (row: T) => boolean;
    /** Width of the column */
    width?: string | number;
    /** Minimum width of the column */
    minWidth?: string | number;
}

/**
 * Number column definition
 */
export interface NumberColumnDef<T> extends BaseColumnDef<T> {
    type: 'number';
    /** Field accessor path */
    accessor: keyof T;
    /** Number format options */
    formatOptions?: Intl.NumberFormatOptions;
    /** Custom cell renderer */
    cellRenderer?: (value: number, row: T) => React.ReactNode;
}

/**
 * Date column definition
 */
export interface DateColumnDef<T> extends BaseColumnDef<T> {
    type: 'date';
    /** Field accessor path */
    accessor: keyof T;
    /** Date format string (e.g., 'dd.MM.yyyy') */
    dateFormat?: string;
    /** Custom cell renderer */
    cellRenderer?: (value: Date | string, row: T) => React.ReactNode;
}

/**
 * Timestamp (datetime) column definition
 */
export interface TimestampColumnDef<T> extends BaseColumnDef<T> {
    type: 'timestamp';
    /** Field accessor path */
    accessor: keyof T;
    /** Date/time format string (e.g., 'dd.MM.yyyy HH:mm') */
    dateFormat?: string;
    /** Whether to use range filter (from/to dates) instead of text filter */
    enableRangeFilter?: boolean;
    /** Custom cell renderer */
    cellRenderer?: (value: Date | string, row: T) => React.ReactNode;
}

/**
 * Action column definition (no filtering/sorting)
 */
export interface ActionColumnDef<T> extends Omit<BaseColumnDef<T>, 'enableSorting' | 'enableFiltering'> {
    type: 'action';
    /** Cell renderer for action content */
    cellRenderer: (row: T) => React.ReactNode;
}

/**
 * Union type for all column types
 */
export type DataTableColumnDef<T> = 
    | TextColumnDef<T>
    | BooleanColumnDef<T>
    | CheckboxColumnDef<T>
    | NumberColumnDef<T>
    | DateColumnDef<T>
    | TimestampColumnDef<T>
    | ActionColumnDef<T>;

/**
 * Pagination state
 */
export interface PaginationState {
    pageIndex: number;
    pageSize: number;
}

/**
 * Table state for server-side operations
 */
export interface TableState<T> {
    /** Current page data */
    data: T[];
    /** Total count across all pages */
    totalCount: number;
    /** Filtered count (when filters are applied) */
    filteredCount: number;
    /** Current sort state */
    sorting: ColumnSort[];
    /** Current filter state */
    columnFilters: Array<{id: string; value: string}>;
    /** Loading state */
    loading: boolean;
}

/**
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST';

/**
 * Custom fetch function signature for advanced data fetching scenarios
 */
export type CustomDataFetcher<T> = (params: {
    page: number;
    pageSize: number;
    sorting: Array<{id: string; desc: boolean}>;
    columnFilters: Array<{id: string; value: string}>;
    additionalParams: Record<string, string>;
    signal?: AbortSignal;
}) => Promise<{data: T[]; totalCount: number; filteredCount?: number}>;

/**
 * External state control for controlled DataTable usage
 */
export interface ExternalTableState {
    page?: number;
    pageSize?: number;
    sorting?: Array<{id: string; desc: boolean}>;
    columnFilters?: Array<{id: string; value: string}>;
    onPageChange?: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    onSortingChange?: (sorting: Array<{id: string; desc: boolean}>) => void;
    onColumnFiltersChange?: (filters: Array<{id: string; value: string}>) => void;
}

/**
 * Configuration for DataTable component
 */
export interface DataTableConfig<T> {
    /** API endpoint for data fetching */
    endpoint: string;
    /** Column definitions */
    columns: DataTableColumnDef<T>[];
    /** Initial page size */
    initialPageSize?: number;
    /** Available page size options */
    pageSizeOptions?: number[];
    /** Callback when row data changes */
    onRowUpdate?: (row: T, field: keyof T, value: any) => Promise<void>;
    /** Additional query params to send with requests */
    additionalParams?: Record<string, string>;
    /** Custom class names */
    className?: string;
    /** Show pagination */
    showPagination?: boolean;
    /** HTTP method for data fetching (default: 'GET') */
    method?: HttpMethod;
    /** Custom data fetcher function (overrides endpoint/method if provided) */
    fetchData?: CustomDataFetcher<T>;
    /** Transform function for request body (only used with POST) */
    transformRequest?: (data: {
        page: number;
        pageSize: number;
        sorting: Array<{id: string; desc: boolean}>;
        columnFilters: Array<{id: string; value: string}>;
        additionalParams: Record<string, string>;
    }) => Record<string, any>;
    /** External state control for controlled component usage */
    externalState?: ExternalTableState;
    /** Custom filter row renderer - receives columnFilters and setColumnFilters */
    renderCustomFilters?: (props: {
        columnFilters: Array<{id: string; value: string}>;
        setColumnFilters: (filters: Array<{id: string; value: string}> | ((old: Array<{id: string; value: string}>) => Array<{id: string; value: string}>)) => void;
    }) => React.ReactNode;
}

/**
 * Hook return type for data fetching
 */
export interface UseTableDataReturn<T> {
    data: T[];
    totalCount: number;
    filteredCount: number;
    loading: boolean;
    fetchData: () => Promise<void>;
    refresh: () => Promise<void>;
}

/**
 * Hook return type for pagination
 */
export interface UsePaginationReturn {
    page: number;
    pageSize: number;
    totalPages: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    isFirstPage: boolean;
    isLastPage: boolean;
}

/**
 * Hook return type for sorting
 */
export interface UseSortingReturn {
    sorting: ColumnSort[];
    setSorting: (sorting: ColumnSort[] | ((old: ColumnSort[]) => ColumnSort[])) => void;
    getSortIndicator: (columnId: string) => 'asc' | 'desc' | null;
}

/**
 * Hook return type for filters
 */
export interface UseFiltersReturn {
    columnFilters: Array<{id: string; value: string}>;
    setColumnFilters: (filters: Array<{id: string; value: string}> | ((old: Array<{id: string; value: string}>) => Array<{id: string; value: string}>)) => void;
    getFilterValue: (columnId: string) => string;
    setFilterValue: (columnId: string, value: string) => void;
    clearFilters: () => void;
    hasActiveFilters: boolean;
}