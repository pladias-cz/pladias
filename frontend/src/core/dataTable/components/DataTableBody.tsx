/**
 * Table body component for DataTable
 */

import React from 'react';
import {useTranslation} from 'react-i18next';
import type {DataTableColumnDef} from '../types.ts';

interface DataTableBodyProps<T> {
    data: T[];
    columns: DataTableColumnDef<T>[];
    loading: boolean;
    cellRenderer: (column: DataTableColumnDef<T>, row: T) => React.ReactNode;
}

export function DataTableBody<T>(props: DataTableBodyProps<T>) {
    const {data, columns, loading, cellRenderer} = props;
    const {t} = useTranslation();

    if (loading && data.length === 0) {
        return (
            <tr>
                <td colSpan={columns.length} className="text-center py-4">
                    <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">{t("common.loading")}</span>
                    </div>
                </td>
            </tr>
        );
    }

    if (data.length === 0) {
        return (
            <tr>
                <td colSpan={columns.length} className="text-center text-muted py-4">
                    <p className="mb-0">{t("common.table.noData")}</p>
                </td>
            </tr>
        );
    }

    return (
        <>
            {data.map((row, rowIndex) => (
                <tr key={rowIndex}>
                    {columns.map((column) => (
                        <td key={String(column.id)}>
                            {cellRenderer(column, row)}
                        </td>
                    ))}
                </tr>
            ))}
        </>
    );
}