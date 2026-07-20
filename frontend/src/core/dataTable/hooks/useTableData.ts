/**
 * Hook for fetching and managing table data with server-side pagination
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import axios from 'axios';
import type {ServerSideDataResponse, CustomDataFetcher, HttpMethod} from '../types.ts';

export interface UseTableDataOptions<T> {
    endpoint: string;
    page: number;
    pageSize: number;
    sorting: Array<{id: string; desc: boolean}>;
    columnFilters: Array<{id: string; value: string}>;
    additionalParams?: Record<string, string>;
    method?: HttpMethod;
    fetchData?: CustomDataFetcher<T>;
    transformRequest?: (data: {
        page: number;
        pageSize: number;
        sorting: Array<{id: string; desc: boolean}>;
        columnFilters: Array<{id: string; value: string}>;
        additionalParams: Record<string, string>;
    }) => Record<string, any>;
    onSuccess?: (data: T[], totalCount: number, filteredCount: number) => void;
}

export function useTableData<T>(options: UseTableDataOptions<T>) {
    const {
        endpoint,
        page,
        pageSize,
        sorting,
        columnFilters,
        additionalParams = {},
        method = 'GET',
        fetchData: customFetcher,
        transformRequest,
        onSuccess,
    } = options;

    const [data, setData] = useState<T[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [filteredCount, setFilteredCount] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // Alias for setData to be exported
    const setLocalData = setData;
    
    const abortControllerRef = useRef<AbortController | null>(null);

    /**
     * Generate stable key for filters (for useEffect dependencies)
     */
    const filtersKey = useMemo(() => {
        if (!columnFilters || columnFilters.length === 0) return '';
        const pairs = columnFilters.map((f) => [f.id, f.value]);
        pairs.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
        return JSON.stringify(pairs);
    }, [columnFilters]);

    /**
     * Fetch data from server
     */
    const fetchData = useCallback(async () => {
        // Cancel previous request if any
        if (abortControllerRef.current) {
            try {
                abortControllerRef.current.abort();
            } catch (e) {
                // ignore
            }
            abortControllerRef.current = null;
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        setLoading(true);

        try {
            let result: {data: T[]; totalCount: number; filteredCount?: number};

            if (customFetcher) {
                // Use custom fetcher function if provided
                result = await customFetcher({
                    page,
                    pageSize,
                    sorting,
                    columnFilters,
                    additionalParams,
                    signal: controller.signal,
                });
            } else if (method === 'POST') {
                // POST request with transformed body
                const bodyData = transformRequest ? transformRequest({
                    page,
                    pageSize,
                    sorting,
                    columnFilters,
                    additionalParams,
                }) : {
                    page: String(page),
                    pageSize: String(pageSize),
                    ...additionalParams,
                    sortBy: sorting.length > 0 ? sorting[0].id : '',
                    sortOrder: sorting.length > 0 ? (sorting[0].desc ? 'desc' : 'asc') : 'asc',
                    ...(columnFilters.reduce((acc, filter) => {
                        const paramName = `${filter.id.charAt(0).toUpperCase() + filter.id.slice(1)}Filter`;
                        acc[paramName] = filter.value;
                        return acc;
                    }, {} as Record<string, string>)),
                };

                const response = await axios.post<ServerSideDataResponse<T>>(endpoint, bodyData, {
                    signal: controller.signal,
                });

                result = {
                    data: response.data?.data || [],
                    totalCount: response.data?.totalCount || 0,
                    filteredCount: response.data?.filteredCount,
                };
            } else {
                // GET request (default behavior)
                const params: Record<string, string> = {
                    page: String(page),
                    pageSize: String(pageSize),
                    ...additionalParams,
                };

                if (sorting && sorting.length > 0) {
                    const s = sorting[0];
                    params.sortBy = s.id;
                    params.sortOrder = s.desc ? 'desc' : 'asc';
                }

                columnFilters.forEach(filter => {
                    const paramName = `${filter.id.charAt(0).toUpperCase() + filter.id.slice(1)}Filter`;
                    params[paramName] = filter.value;
                });

                const response = await axios.get<ServerSideDataResponse<T>>(endpoint, {
                    params,
                    signal: controller.signal,
                });

                result = {
                    data: response.data?.data || [],
                    totalCount: response.data?.totalCount || 0,
                    filteredCount: response.data?.filteredCount,
                };
            }

            const newData = result.data || [];
            const newTotalCount = result.totalCount || 0;
            const newFilteredCount = result.filteredCount ?? newTotalCount;

            setData(newData);
            setTotalCount(newTotalCount);
            setFilteredCount(newFilteredCount);

            onSuccess?.(newData, newTotalCount, newFilteredCount);
        } catch (err) {
            if (axios.isCancel(err) || err instanceof Error && err.name === 'CanceledError') {
                // Request cancelled - ignore
            } else {
                console.error('Error fetching table data:', err);
                setData([]);
                setTotalCount(0);
                setFilteredCount(0);
            }
        } finally {
            setLoading(false);
            if (abortControllerRef.current === controller) {
                abortControllerRef.current = null;
            }
        }
    }, [endpoint, page, pageSize, sorting, filtersKey, additionalParams, method, customFetcher, transformRequest, onSuccess]);

    /**
     * Effect to fetch data when dependencies change
     */
    useEffect(() => {
        fetchData();

        return () => {
            if (abortControllerRef.current) {
                try {
                    abortControllerRef.current.abort();
                } catch (e) {
                    // ignore
                }
                abortControllerRef.current = null;
            }
        };
    }, [fetchData]);

    /**
     * Manual refresh trigger
     */
    const refresh = useCallback(() => {
        return fetchData();
    }, [fetchData]);

    return {
        data,
        totalCount,
        filteredCount,
        loading,
        fetchData,
        refresh,
        setData: setLocalData,
    };
}