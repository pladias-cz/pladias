import {useCallback} from 'react';
import axios from 'axios';
import type {ImportRecord} from '../types';

export interface UseImportsDataOptions {
    onSuccess?: (data: ImportRecord[], totalCount: number, filteredCount: number) => void;
}

export function useImportsData(options: UseImportsDataOptions = {}) {
    const {onSuccess} = options;

    const fetchImports = useCallback(async ({
        page,
        pageSize,
        sorting,
        columnFilters,
        additionalParams = {},
        signal
    }: {
        page: number;
        pageSize: number;
        sorting: Array<{id: string; desc: boolean}>;
        columnFilters: Array<{id: string; value: string}>;
        additionalParams?: Record<string, string>;
        signal?: AbortSignal;
    }) => {
        // Build sort params
        const sortParams: Record<string, string> = {};
        if (sorting && sorting.length > 0) {
            const s = sorting[0];
            sortParams.sortBy = s.id;
            sortParams.sortOrder = s.desc ? "desc" : "asc";
        }

        // Extract filters
        const filters: Record<string, string> = {};
        columnFilters.forEach(filter => {
            const paramName = `${filter.id.charAt(0).toUpperCase() + filter.id.slice(1)}Filter`;
            filters[paramName] = filter.value;
        });

        const response = await axios.get("/api/react/atlasadmin/imports", {
            params: {
                page: String(page),
                pageSize: String(pageSize),
                ...additionalParams,
                ...filters,
                ...sortParams,
            },
            signal,
        });

        const responseData = response.data;
        const data = responseData?.data || [];
        const totalCount = responseData?.totalCount || 0;
        const filteredCount = responseData?.filteredCount ?? totalCount;

        if (data.length === 0) {
            return {data: [], totalCount, filteredCount};
        }

        onSuccess?.(data, totalCount, filteredCount);

        return {data, totalCount, filteredCount};
    }, [onSuccess]);

    return {
        fetchImports,
    };
}
