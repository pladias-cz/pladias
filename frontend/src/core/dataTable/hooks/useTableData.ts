/**
 * Hook for fetching and managing table data with server-side pagination
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import type {SetStateAction} from 'react';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {apiGet, apiPost} from '@/services/apiClient';
import type {ServerSideDataResponse, CustomDataFetcher, HttpMethod} from '../types';
import {buildTableParams} from '../utils/tableParams';

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
    }) => Record<string, unknown>;
}

/** Normalizovaná odpověď endpointu – jediný tvar uložený do query cache. */
interface TableDataEnvelope<T> {
    data: T[];
    totalCount: number;
    filteredCount: number;
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
    } = options;

    /**
     * Optimistická vrstva checkboxů (viz DataTable): přepnutí se v UI projeví
     * okamžitě a žije až do nejbližší nové odpovědi serveru.
     */
    const [localData, setLocalData] = useState<T[] | null>(null);

    /**
     * Generate stable serialized keys (so the query identity survives
     * re-renders of the parent with fresh array/object identities)
     */
    const sortingKey = useMemo(
        () => sorting.map((s) => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join('|'),
        [sorting],
    );
    const filtersKey = useMemo(() => {
        if (!columnFilters || columnFilters.length === 0) return '';
        const pairs = columnFilters.map((f) => [f.id, f.value]);
        pairs.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
        return JSON.stringify(pairs);
    }, [columnFilters]);
    const additionalParamsKey = useMemo(() => JSON.stringify(additionalParams), [additionalParams]);

    /**
     * Query key captures every fetch input; its change triggers a new request
     * (the role the manual fetch effect used to have).
     */
    const queryKey = useMemo(
        () => ['tableData', endpoint, method, page, pageSize, sortingKey, filtersKey, additionalParamsKey] as const,
        [endpoint, method, page, pageSize, sortingKey, filtersKey, additionalParamsKey],
    );

    /**
     * Fetch data from server – request params identical to the pre-migration
     * manual fetch; the AbortSignal is now owned by the query.
     */
    const queryFn = useCallback(async ({signal}: {signal: AbortSignal}): Promise<TableDataEnvelope<T>> => {
        if (customFetcher) {
            // Use custom fetcher function if provided
            const result = await customFetcher({
                page,
                pageSize,
                sorting,
                columnFilters,
                additionalParams,
                signal,
            });

            return {
                data: result?.data || [],
                totalCount: result?.totalCount || 0,
                filteredCount: result?.filteredCount ?? result?.totalCount ?? 0,
            };
        }

        if (method === 'POST') {
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

            const payload = await apiPost<ServerSideDataResponse<T>>(endpoint, bodyData, {
                signal,
            });

            return {
                data: payload?.data || [],
                totalCount: payload?.totalCount || 0,
                filteredCount: payload?.filteredCount ?? payload?.totalCount ?? 0,
            };
        }

        // GET request (default behavior)
        const params = buildTableParams({page, pageSize, sorting, columnFilters, additionalParams});

        const payload = await apiGet<ServerSideDataResponse<T>>(endpoint, {
            params,
            signal,
        });

        return {
            data: payload?.data || [],
            totalCount: payload?.totalCount || 0,
            filteredCount: payload?.filteredCount ?? payload?.totalCount ?? 0,
        };
    }, [endpoint, page, pageSize, sorting, columnFilters, additionalParams, method, customFetcher, transformRequest]);

    const {data: queryData, isPending, isFetching, refetch, error} = useQuery({
        queryKey,
        queryFn,
        // Rows of the previous page/filters stay visible while the next ones load (as before)
        placeholderData: keepPreviousData,
    });

    /**
     * Fresh data from the server discards the optimistic checkbox layer.
     */
    useEffect(() => {
        setLocalData(null);
    }, [queryData]);

    const data = useMemo(
        () => localData ?? queryData?.data ?? [],
        [localData, queryData],
    );

    /**
     * Manual refresh trigger. Po dokončení refetche zahodí optimistickou vrstvu –
     * odpověď serveru je autoritativní i tehdy, když refetch vrátí nezměněná
     * data a React Query (structural sharing) zachová původní referenci
     * (efekt na queryData by se v takovém případě neprovedl).
     */
    const refresh = useCallback(async () => {
        await refetch();
        setLocalData(null);
    }, [refetch]);

    /**
     * Aktuálně vykreslované řádky v refu: setData tak zůstává stabilní identitou
     * (rodič si ji přes DataTable.onDataUpdater zaregistruje jednou po mountu)
     * a přece vždy aplikuje updater na čerstvá data (base při prev === null).
     */
    const dataRef = useRef<T[]>([]);
    dataRef.current = data;

    /**
     * Optimistic setData (checkboxes) – functional updates over the rendered rows.
     */
    const setData = useCallback((updater: SetStateAction<T[]>) => {
        setLocalData((prev) => {
            const base = prev ?? dataRef.current;
            return typeof updater === 'function' ? updater(base) : updater;
        });
    }, []);

    return {
        data,
        totalCount: queryData?.totalCount ?? 0,
        filteredCount: queryData?.filteredCount ?? 0,
        loading: isPending || isFetching,
        error,
        refresh,
        setData,
    };
}
