/**
 * Column helper functions for type-safe column creation
 */

import type {DataTableColumnDef, TextColumnDef, BooleanColumnDef, CheckboxColumnDef, NumberColumnDef, DateColumnDef, TimestampColumnDef, ActionColumnDef} from '../types.ts';

/**
 * Create a text column definition with strict typing
 */
export function createTextColumn<T extends object>(
    accessor: keyof T,
    header: string,
    options?: {
        enableSorting?: boolean;
        enableFiltering?: boolean;
        filterPlaceholder?: string;
        width?: string | number;
        minWidth?: string | number;
        cellRenderer?: (value: any, row: T) => React.ReactNode;
    }
): TextColumnDef<T> {
    return {
        type: 'text',
        id: String(accessor),
        accessor,
        header,
        enableSorting: options?.enableSorting ?? true,
        enableFiltering: options?.enableFiltering ?? true,
        filterPlaceholder: options?.filterPlaceholder,
        width: options?.width,
        minWidth: options?.minWidth,
        cellRenderer: options?.cellRenderer,
    };
}

/**
 * Create a boolean column definition with strict typing
 */
export function createBooleanColumn<T extends object>(
    accessor: keyof T,
    header: string,
    options?: {
        enableSorting?: boolean;
        enableFiltering?: boolean;
        trueLabel?: string;
        falseLabel?: string;
        width?: string | number;
        minWidth?: string | number;
        cellRenderer?: (value: boolean, row: T) => React.ReactNode;
    }
): BooleanColumnDef<T> {
    return {
        type: 'boolean',
        id: String(accessor),
        accessor,
        header,
        enableSorting: options?.enableSorting ?? true,
        enableFiltering: options?.enableFiltering ?? true,
        trueLabel: options?.trueLabel,
        falseLabel: options?.falseLabel,
        width: options?.width,
        minWidth: options?.minWidth,
        cellRenderer: options?.cellRenderer,
    };
}

/**
 * Create a number column definition with strict typing
 */
export function createNumberColumn<T extends object>(
    accessor: keyof T,
    header: string,
    options?: {
        enableSorting?: boolean;
        enableFiltering?: boolean;
        formatOptions?: Intl.NumberFormatOptions;
        width?: string | number;
        minWidth?: string | number;
        cellRenderer?: (value: number, row: T) => React.ReactNode;
    }
): NumberColumnDef<T> {
    return {
        type: 'number',
        id: String(accessor),
        accessor,
        header,
        enableSorting: options?.enableSorting ?? true,
        enableFiltering: options?.enableFiltering ?? true,
        formatOptions: options?.formatOptions,
        width: options?.width,
        minWidth: options?.minWidth,
        cellRenderer: options?.cellRenderer,
    };
}

/**
 * Create a date column definition with strict typing
 */
export function createDateColumn<T extends object>(
    accessor: keyof T,
    header: string,
    options?: {
        enableSorting?: boolean;
        enableFiltering?: boolean;
        dateFormat?: string;
        width?: string | number;
        minWidth?: string | number;
        cellRenderer?: (value: Date | string, row: T) => React.ReactNode;
    }
): DateColumnDef<T> {
    return {
        type: 'date',
        id: String(accessor),
        accessor,
        header,
        enableSorting: options?.enableSorting ?? true,
        enableFiltering: options?.enableFiltering ?? true,
        dateFormat: options?.dateFormat ?? 'dd.MM.yyyy',
        width: options?.width,
        minWidth: options?.minWidth,
        cellRenderer: options?.cellRenderer,
    };
}

/**
 * Create a timestamp column definition with strict typing
 * Provides built-in support for date range filtering
 */
export function createTimestampColumn<T extends object>(
    accessor: keyof T,
    header: string,
    options?: {
        enableSorting?: boolean;
        enableFiltering?: boolean;
        enableRangeFilter?: boolean;
        dateFormat?: string;
        width?: string | number;
        minWidth?: string | number;
        cellRenderer?: (value: Date | string, row: T) => React.ReactNode;
    }
): TimestampColumnDef<T> {
    return {
        type: 'timestamp',
        id: String(accessor),
        accessor,
        header,
        enableSorting: options?.enableSorting ?? true,
        enableFiltering: options?.enableFiltering ?? true,
        enableRangeFilter: options?.enableRangeFilter ?? true,
        dateFormat: options?.dateFormat ?? 'dd.MM.yyyy HH:mm',
        width: options?.width,
        minWidth: options?.minWidth,
        cellRenderer: options?.cellRenderer,
    };
}

/**
 * Create an action column definition (no sorting/filtering)
 */
export function createActionColumn<T extends object>(
    id: string,
    header: string,
    cellRenderer: (row: T) => React.ReactNode,
    options?: {
        width?: string | number;
        minWidth?: string | number;
    }
): ActionColumnDef<T> {
    return {
        type: 'action',
        id,
        header,
        cellRenderer,
        width: options?.width,
        minWidth: options?.minWidth,
    };
}

/**
 * Create a checkbox column definition with strict typing
 * Provides an interactive checkbox for boolean values with onToggle callback
 */
export function createCheckboxColumn<T extends object>(
    accessor: keyof T,
    header: string,
    onToggle: (row: T, checked: boolean) => Promise<void>,
    options?: {
        enableSorting?: boolean;
        enableFiltering?: boolean;
        isDisabled?: (row: T) => boolean;
        width?: string | number;
        minWidth?: string | number;
    }
): CheckboxColumnDef<T> {
    return {
        type: 'checkbox',
        id: String(accessor),
        accessor,
        header,
        onToggle,
        isDisabled: options?.isDisabled,
        enableSorting: options?.enableSorting ?? true,
        enableFiltering: options?.enableFiltering ?? true,
        width: options?.width,
        minWidth: options?.minWidth,
    };
}

/**
 * Get the filter placeholder for a column based on its type
 * Uses generic i18n keys that work for all columns
 */
export function getFilterPlaceholder<T>(column: DataTableColumnDef<T>, t: (key: string) => string): string {
    switch (column.type) {
        case 'text':
            return t("common.table.filter.all");
        case 'boolean':
            return t("common.table.filter.all");
        case 'number':
            return t("common.table.filter.all");
        case 'date':
            return t("common.table.filter.all");
        case 'action':
            return '';
        default:
            return '';
    }
}

/**
 * Check if a column can be filtered
 */
export function canFilter<T>(column: DataTableColumnDef<T>): boolean {
    if (column.type === 'action') return false;
    return column.enableFiltering ?? true;
}

/**
 * Check if a column can be sorted
 */
export function canSort<T>(column: DataTableColumnDef<T>): boolean {
    if (column.type === 'action') return false;
    return column.enableSorting ?? true;
}
