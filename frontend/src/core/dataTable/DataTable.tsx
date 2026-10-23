/**
 * Enterprise-grade DataTable component with server-side pagination, sorting, and filtering
 */

import React, {useCallback, useEffect, useMemo, useRef} from 'react';
import {Card, Table, Form} from 'react-bootstrap';
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
import {ExcelExportButtons} from './export';
import type {DataTableConfig, DataTableColumnDef} from './types';
import {canSort} from './utils';
import styles from './DataTable.module.scss';
import {notifyApiError} from '@/stores/notificationStore';
import {logError} from '@/services/logger';

export function DataTable<T extends object>(config: DataTableConfig<T>) {
    const {
        endpoint,
        columns,
        initialPageSize = 20,
        pageSizeOptions = [10, 20, 50, 100],
        additionalParams,
        className,
        showPagination = true,
        buildExportFilterParams,
        hasExcelExport = false,
        method = 'GET',
        fetchData: customFetcher,
        transformRequest,
        refreshKey,
        onRowUpdate,
        onDataUpdater,
        renderCustomFilters,
        externalState: _externalState,
    } = config;

    // Memoize default empty object to prevent infinite re-renders
    const defaultAdditionalParams = useMemo(() => ({}), []);
    const resolvedAdditionalParams = additionalParams ?? defaultAdditionalParams;

    const {t} = useTranslation();

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
        error,
        setData: setLocalData,
        refresh,
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

    // Rodič se přes onDataUpdater napojuje na optimistickou vrstvu řádků
    // (useTableData.setData): vlastní cellRenderery (status selecty atlasAdmin)
    // pak mění řádky okamžitě bez refetche. Identita setData je stabilní,
    // registrace proto proběhne jednou po mountu; při unmountu dostane rodič null.
    useEffect(() => {
        if (!onDataUpdater) return;
        onDataUpdater(setLocalData);
        return () => onDataUpdater(null);
    }, [onDataUpdater, setLocalData]);

    // Změna refreshKey vynutí refetch aktuální stránky (mutace mimo tabulku,
    // např. add/remove v modale). První render se přeskočí – data se právě načítají.
    const prevRefreshKeyRef = useRef(refreshKey);
    useEffect(() => {
        if (prevRefreshKeyRef.current !== refreshKey) {
            prevRefreshKeyRef.current = refreshKey;
            void refresh();
        }
    }, [refreshKey, refresh]);

    // chyba načtení řádků – globální notifikace (custom fetchery si chyby hlásí
    // samy a vracejí prázdná data, query pak error nemá)
    useEffect(() => {
        if (error) {
            notifyApiError(error, t("common.table.loadFailed"));
        }
    }, [error, t]);

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
            case 'text': {
                if (column.cellRenderer) {
                    return column.cellRenderer(row[column.accessor] as string, row);
                }
                return (row[column.accessor] as string) ?? '-';
            }

            case 'boolean': {
                if (column.cellRenderer) {
                    return column.cellRenderer(row[column.accessor] as boolean, row);
                }
                const boolValue = row[column.accessor] as boolean;
                return boolValue 
                    ? (column.trueLabel ?? t("common.table.yes"))
                    : (column.falseLabel ?? t("common.table.no"));
            }

            case 'checkbox': {
                // Checkbox columns always have an onToggle handler
                const isChecked = row[column.accessor] as boolean;
                const isDisabled = column.isDisabled?.(row) ?? false;
                // Řádky se porovnávají referenčně, případně podle `id` (optimistická
                // aktualizace i rollback). Bez `id` (rowId === undefined) smí matchnout
                // jen reference – fallback nesmí matchnout řádky bez identity,
                // undefined === undefined by jinak přepnul všechny řádky tabulky.
                const rowId = (row as {id?: unknown}).id;
                const isTargetRow = (item: T): boolean =>
                    item === row || (rowId !== undefined && rowId === (item as {id?: unknown}).id);
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
                                    isTargetRow(item)
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
                                logError(error, {source: 'DataTable', action: 'checkboxToggle'});
                                // Rollback the optimistic update - revert to original value
                                setLocalData((prevData: T[]) => 
                                    prevData.map((item: T) => 
                                        isTargetRow(item)
                                            ? { ...item, [column.accessor]: !newValue } as T
                                            : item
                                    )
                                );
                                // Chyba akce jde do globálního notifikačního store
                                // (toast) – hlášku z backendu nese ApiError.payload
                                notifyApiError(error, t("common.table.updateFailed"));
                            }
                        }}
                    />
                );
            }

            case 'number': {
                if (column.cellRenderer) {
                    return column.cellRenderer(row[column.accessor] as number, row);
                }
                const numValue = row[column.accessor] as number;
                if (column.formatOptions) {
                    return new Intl.NumberFormat('cs', column.formatOptions).format(numValue);
                }
                return String(numValue ?? '-');
            }

            case 'date': {
                if (column.cellRenderer) {
                    return column.cellRenderer(row[column.accessor] as Date | string, row);
                }
                const dateValue = row[column.accessor] as Date | string;
                if (!dateValue) return '-';
                const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
                return date.toLocaleString('cs');
            }

            case 'timestamp': {
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
            }

            case 'action':
                return column.cellRenderer(row);

            default:
                return null;
        }
    }, [t, onRowUpdate, setLocalData]);

    return (
        <Card className={className}>
            <Card.Body>
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

                <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-3">
                    <DataRowCount
                        fromIndex={(page - 1) * pageSize + 1}
                        toIndex={Math.min(page * pageSize, filteredCount > 0 ? filteredCount : totalCount)}
                        total={filteredCount > 0 ? filteredCount : totalCount}
                        loading={loading}
                    />
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                        {hasExcelExport && (
                            <ExcelExportButtons
                                endpoint={endpoint}
                                sorting={sorting}
                                columnFilters={columnFilters}
                                buildFilterParams={buildExportFilterParams}
                                additionalParams={resolvedAdditionalParams}
                            />
                        )}
                        {hasActiveFilters && (
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={clearFilters}
                            >
                                {t("common.table.clearFilters")}
                            </button>
                        )}
                    </div>
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
