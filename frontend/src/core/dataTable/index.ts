/**
 * Enterprise DataTable - Main entry point
 */

export {DataTable} from './DataTable';
export type {default as DefaultDataTable} from './DataTable';

// Type exports
export type {
    DataTableConfig,
    DataTableColumnDef,
    TableDataUpdater,
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
} from './types';

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

// XLSX export exports
export {ExcelExportButtons, XlsxAcceptHeader} from './export';
export {buildTableParams} from './utils/tableParams';
export type {TableParamsOptions} from './utils/tableParams';

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
