/**
 * Enterprise-grade DataTable component with server-side pagination, sorting, and filtering
 */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {Card, Table, Form, Alert} from 'react-bootstrap';
import {useTranslation} from 'react-i18next';
import {
    useTableFilters,
    useTableSorting,
    useServerPagination,
    useTableData,
} from './hooks';
import {
    DataTableFilterRow,
    DataTableHeaderCell,
    DataTablePagination,
    DataRowCount,
    DataTableBody,
} from './components';
import type {DataTableConfig, DataTableColumnDef} from './types.ts';
import {canSort} from './utils';
import styles from './DataTable.module.css';

export function DataTable<T extends object>(config: DataTableConfig<T>) {
    const {
        endpoint,
        columns,
        initialPageSize = 20,
        pageSizeOptions = [10, 20, 50, 100],
        additionalParams,
        className,
        showPagination = true,
        method = 'GET',
        fetchData: customFetcher,
        transformRequest,
        onRowUpdate,
        renderCustomFilters,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        externalState: _externalState,
    } = config;

    // Memoize default empty object to prevent infinite re-renders
    const defaultAdditionalParams = useMemo(() => ({}), []);
    const resolvedAdditionalParams = additionalParams ?? defaultAdditionalParams;

    const {t} = useTranslation();

    // Error state for displaying error messages
    const [error, setError] = useState<string | null>(null);

    const {
        columnFilters,
        setFilterValue,
        setColumnFilters,
        clearFilters,
        hasActiveFilters,
    } = useTableFilters({});

    const {
        sorting,
        setSorting,
        getSortIndicator,
    } = useTableSorting();

    // Initial pagination state (will be updated after data fetch)
    const {
        page,
        pageSize,
        setPage,
        setPageSize,
        totalPages,
        updateTotals,
    } = useServerPagination({
        initialPageSize,
        pageSizeOptions,
    });

    const {
        data,
        totalCount,
        filteredCount,
        loading,
        setData: setLocalData,
    } = useTableData<T>({
        endpoint,
        page,
        pageSize,
        sorting,
        columnFilters,
        additionalParams: resolvedAdditionalParams,
        method,
        fetchData: customFetcher,
        transformRequest,
    });

    // Update pagination totals when data changes
    useEffect(() => {
        updateTotals(totalCount, filteredCount);
    }, [totalCount, filteredCount, updateTotals]);

    const handleSort = useCallback((columnId: string) => {
        setSorting((prev) => {
            const currentSort = prev.find(s => s.id === columnId);
            if (!currentSort) {
                return [{id: columnId, desc: false}];
            } else if (currentSort.desc) {
                return [];
            } else {
                return [{id: columnId, desc: true}];
            }
        });
        setPage(1);
    }, [setSorting, setPage]);

    const handleFilterChange = useCallback((columnId: string, value: string) => {
        setFilterValue(columnId, value);
        setPage(1);
    }, [setFilterValue, setPage]);

    const renderCell = useCallback((column: DataTableColumnDef<T>, row: T): React.ReactNode => {
        switch (column.type) {
            case 'text':
                if (column.cellRenderer) {
                    return column.cellRenderer(row[column.accessor] as any, row);
                }
                return (row[column.accessor] as string) ?? '-';

            case 'boolean':
                if (column.cellRenderer) {
                    return column.cellRenderer(row[column.accessor] as boolean, row);
                }
                const boolValue = row[column.accessor] as boolean;
                return boolValue 
                    ? (column.trueLabel ?? t("common.table.yes"))
                    : (column.falseLabel ?? t("common.table.no"));

            case 'checkbox':
                // Checkbox columns always have an onToggle handler
                const isChecked = row[column.accessor] as boolean;
                const isDisabled = column.isDisabled?.(row) ?? false;
                return (
                    <Form.Check
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={async (e) => {
                            const newValue = e.target.checked;
                            
                            // Optimistically update the local data first for instant UI feedback
                            setLocalData((prevData: T[]) => 
                                prevData.map((item: T) => 
                                    item === row || (item as any).id === (row as any).id
                                        ? { ...item, [column.accessor]: newValue } as T
                                        : item
                                )
                            );
                            
                            try {
                                // Call the onToggle handler from the column definition
                                await column.onToggle(row, newValue);
                                // Call onRowUpdate if provided (for custom update logic)
                                if (onRowUpdate) {
                                    await onRowUpdate(row, column.accessor as keyof T, newValue);
                                }
                                // Note: We don't refresh here to avoid pagination jumps.
                                // The optimistic update provides instant feedback.
                                // Data consistency will be ensured on next full refresh (page change, filter change, etc.)
                            } catch (error) {
                                console.error('Checkbox toggle failed:', error);
                                // Rollback the optimistic update - revert to original value
                                setLocalData((prevData: T[]) => 
                                    prevData.map((item: T) => 
                                        item === row || (item as any).id === (row as any).id
                                            ? { ...item, [column.accessor]: !newValue } as T
                                            : item
                                    )
                                );
                                // Show error message to user
                                setError(error instanceof Error ? error.message : 'Failed to update');
                                // Clear error after 5 seconds
                                setTimeout(() => setError(null), 5000);
                            }
                        }}
                    />
                );

            case 'number':
                if (column.cellRenderer) {
                    return column.cellRenderer(row[column.accessor] as number, row);
                }
                const numValue = row[column.accessor] as number;
                if (column.formatOptions) {
                    return new Intl.NumberFormat('cs', column.formatOptions).format(numValue);
                }
                return String(numValue ?? '-');

            case 'date':
                if (column.cellRenderer) {
                    return column.cellRenderer(row[column.accessor] as Date | string, row);
                }
                const dateValue = row[column.accessor] as Date | string;
                if (!dateValue) return '-';
                const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
                return date.toLocaleString('cs');

            case 'timestamp':
                if (column.cellRenderer) {
                    return column.cellRenderer(row[column.accessor] as Date | string, row);
                }
                const timestampValue = row[column.accessor] as Date | string;
                if (!timestampValue) return '-';
                const timestamp = typeof timestampValue === 'string' ? new Date(timestampValue) : timestampValue;
                const format = column.dateFormat ?? 'dd.MM.yyyy HH:mm';
                // Use Intl.DateTimeFormat for proper formatting
                const options: Intl.DateTimeFormatOptions = {};
                if (format.includes('dd')) options.day = '2-digit';
                if (format.includes('MM')) options.month = '2-digit';
                if (format.includes('yyyy')) options.year = 'numeric';
                if (format.includes('HH')) options.hour = '2-digit';
                if (format.includes('mm')) options.minute = '2-digit';
                return new Intl.DateTimeFormat('cs-CZ', options).format(timestamp);

            case 'action':
                return column.cellRenderer(row);

            default:
                return null;
        }
    }, [t]);

    return (
        <Card className={className}>
            <Card.Body>
                {/* Error message display */}
                {error && (
                    <Alert variant="danger" className="mb-3">
                        {error}
                    </Alert>
                )}
                
                {showPagination && (
                    <DataTablePagination
                        page={page}
                        pageSize={pageSize}
                        totalPages={totalPages}
                        totalCount={totalCount}
                        filteredCount={filteredCount ?? totalCount}
                        hasActiveFilters={hasActiveFilters}
                        pageSizeOptions={pageSizeOptions}
                        onPageChange={setPage}
                        onPageSizeChange={setPageSize}
                    />
                )}

                <div className="d-flex align-items-center justify-content-between mb-3">
                    <DataRowCount
                        fromIndex={(page - 1) * pageSize + 1}
                        toIndex={Math.min(page * pageSize, filteredCount > 0 ? filteredCount : totalCount)}
                        total={filteredCount > 0 ? filteredCount : totalCount}
                        loading={loading}
                    />
                    {hasActiveFilters && (
                        <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={clearFilters}
                        >
                            {t("common.table.clearFilters")}
                        </button>
                    )}
                </div>

                <Table striped bordered hover responsive size="sm" className={styles.tableStable}>
                    <thead>
                        <tr>
                            {columns.map((column) => (
                                <DataTableHeaderCell
                                    key={String(column.id)}
                                    label={column.header}
                                    columnId={String(column.id)}
                                    sortIndicator={getSortIndicator(String(column.id))}
                                    canSort={canSort(column)}
                                    onSort={handleSort}
                                    width={column.width}
                                    minWidth={column.minWidth}
                                />
                            ))}
                        </tr>

                        {renderCustomFilters ? (
                            <tr>{renderCustomFilters({columnFilters, setColumnFilters})}</tr>
                        ) : (
                            <DataTableFilterRow
                                columns={columns}
                                filters={columnFilters}
                                onFilterChange={handleFilterChange}
                            />
                        )}
                    </thead>

                    <tbody>
                        <DataTableBody
                            data={data}
                            columns={columns}
                            loading={loading}
                            cellRenderer={renderCell}
                        />
                    </tbody>
                </Table>
            </Card.Body>
        </Card>
    );
}

export default DataTable;
