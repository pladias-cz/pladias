/**
 * Requests the XLSX variant of a server-side table endpoint
 */

import {useCallback, useRef, useState} from 'react';
import axios, {type AxiosError} from 'axios';
import {buildTableParams} from '../utils/tableParams.ts';
import {downloadBlob, readErrorMessage, resolveFilename} from './downloadFile.ts';

export const XlsxAcceptHeader = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type ExcelExportVariant = 'all' | 'filtered';

export interface UseExcelExportOptions {
    endpoint: string;
    sorting: Array<{id: string; desc: boolean}>;
    columnFilters: Array<{id: string; value: string}>;
    /** Builds the filter params of endpoints that do not use the "<Column>Filter" convention */
    buildFilterParams?: (columnFilters: Array<{id: string; value: string}>) => Record<string, string>;
    additionalParams?: Record<string, string>;
    /** Used when the backend does not send a Content-disposition header */
    fallbackFilename?: string;
    /** Shown when the backend reports a failure without a message */
    errorMessage?: string;
}

export function useExcelExport({
    endpoint,
    sorting,
    columnFilters,
    buildFilterParams,
    additionalParams = {},
    fallbackFilename = 'export.xlsx',
    errorMessage = '',
}: UseExcelExportOptions) {
    const [exporting, setExporting] = useState<ExcelExportVariant | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Read at click time so the request always carries the state the table shows right now
    const tableState = useRef({sorting, columnFilters, additionalParams});
    tableState.current = {sorting, columnFilters, additionalParams};

    /**
     * Downloads the file the endpoint answers with for the current sorting and additional params.
     * No pagination is sent, so the backend returns all rows; only the "filtered" variant applies
     * the filters typed into the filter row, the "all" variant asks for the whole table.
     */
    const exportExcel = useCallback(async (variant: ExcelExportVariant) => {
        setExporting(variant);
        setError(null);

        const state = tableState.current;
        try {
            const response = await axios.get<Blob>(endpoint, {
                params: buildTableParams({
                    sorting: state.sorting,
                    columnFilters: variant === 'filtered' ? state.columnFilters : [],
                    buildFilterParams,
                    additionalParams: state.additionalParams,
                }),
                headers: {Accept: XlsxAcceptHeader},
                responseType: 'blob',
            });

            if (String(response.headers['content-type'] ?? '').includes('application/json')) {
                setError((await readErrorMessage(response.data)) || errorMessage);
            } else {
                downloadBlob(
                    response.data,
                    resolveFilename(response.headers['content-disposition'], fallbackFilename),
                );
            }
        } catch (err) {
            const failed = err as AxiosError<Blob>;
            setError((await readErrorMessage(failed.response?.data)) || errorMessage);
        } finally {
            setExporting(current => (current === variant ? null : current));
        }
    }, [endpoint, buildFilterParams, fallbackFilename, errorMessage]);

    return {exporting, error, exportExcel};
}
