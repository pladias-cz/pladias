/**
 * Enterprise DataTable - Main entry point
 */

export { DataTable } from './DataTable.tsx';
export type { default as DefaultDataTable } from './DataTable.tsx';

// Type exports
export type {
    DataTableConfig,
    DataTableColumnDef,
    TextColumnDef,
    BooleanColumnDef,
    CheckboxColumnDef,
    NumberColumnDef,
    DateColumnDef,
    TimestampColumnDef,
    ActionColumnDef,
    ServerSideDataResponse,
    SortConfig,
    BaseColumnDef,
    PaginationState,
    TableState,
} from './types.ts';

// Hook exports
export {
    useTableFilters,
    useTableSorting,
    useServerPagination,
    useTableData,
} from './hooks';

// Component exports
export {
    DataTableFilterRow,
    DataTableHeaderCell,
    DataTablePagination,
    DataRowCount,
    DataTableBody,
} from './components';

// Column factory exports
export {
    createTextColumn,
    createBooleanColumn,
    createCheckboxColumn,
    createNumberColumn,
    createDateColumn,
    createTimestampColumn,
    createActionColumn,
} from './utils';

// Utility exports
export {
    getVisiblePages,
    calculateTotalPages,
    clampPage,
    canFilter,
    canSort,
    getFilterPlaceholder,
} from './utils';