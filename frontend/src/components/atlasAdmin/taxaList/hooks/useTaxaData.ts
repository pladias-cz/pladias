/**
 * Hook for fetching taxa data with server-side pagination and filtering
 */

import {useCallback} from 'react';
import {apiGet, isAbortError} from '@/services/apiClient';
import type {ApiResult} from '@/models/ApiResponse';
import type {TaxonMapSettings} from '../types';

export interface UseTaxaDataOptions {
    onSuccess?: (data: TaxonMapSettings[], totalCount: number, filteredCount: number) => void;
}

/** Odpověď /api/react/atlasadmin/taxa – řádky nese pole `taxa` (širší obálka). */
interface TaxaTableResponse extends ApiResult {
    taxa?: TaxonMapSettings[];
    totalCount?: number;
    filteredCount?: number;
}

/**
 * Query params of the taxa endpoint for the filters typed into the table filter row. Empty inputs
 * are not filters, so they are left out. Shared by the paginated fetch and the XLSX export.
 */
export function extractTaxaFilters(columnFilters: Array<{id: string; value: string}>): Record<string, string> {
    const valueOf = (columnId: string) => columnFilters.find(f => f.id === columnId)?.value || '';
    const filters: Record<string, string> = {
        nameLatFilter: valueOf('taxonNameLat'),
        isMappedFilter: valueOf('isMapped'),
        commonThresholdFilter: valueOf('commonThreshold'),
        isProtectedFilter: valueOf('isProtected'),
        presliaFilter: valueOf('preslia'),
        revisorsFilter: valueOf('revisors'),
        revisionStatusFilter: valueOf('revisionStatusId'),
        publicationStatusFilter: valueOf('publicationStatusId'),
    };
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value.trim() !== '')
    );
}

export function useTaxaData(options?: UseTaxaDataOptions) {
    const {onSuccess} = options || {};

    /**
     * Fetch taxa from API with server-side filtering
     */
    const fetchTaxa = useCallback(async (params: {
        page: number;
        pageSize: number;
        sorting: Array<{id: string; desc: boolean}>;
        columnFilters: Array<{id: string; value: string}>;
        additionalParams: Record<string, string>;
        signal?: AbortSignal;
    }) => {
        const {page, pageSize, columnFilters, signal} = params;

        try {
            const payload = await apiGet<TaxaTableResponse>('/api/react/atlasadmin/taxa', {
                params: {page: String(page), pageSize: String(pageSize), ...extractTaxaFilters(columnFilters)},
                signal,
            });

            if (payload.success) {
                const data = payload.taxa || [];
                const totalCount = payload.totalCount || 0;
                const filteredCount = payload.filteredCount || totalCount;

                onSuccess?.(data, totalCount, filteredCount);

                return {
                    data,
                    totalCount,
                    filteredCount,
                };
            } else {
                return {
                    data: [],
                    totalCount: 0,
                    filteredCount: 0,
                };
            }
        } catch (err) {
            if (isAbortError(err)) {
                // Aborted - ignore
            } else {
                console.error('Error fetching taxa:', err);
            }
            return {
                data: [],
                totalCount: 0,
                filteredCount: 0,
            };
        }
    }, [onSuccess]);

    return {
        fetchTaxa,
    };
}
