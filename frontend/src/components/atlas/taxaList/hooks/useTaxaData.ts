/**
 * Hook for fetching taxa data with server-side pagination and filtering
 */

import {useCallback} from 'react';
import {apiGet} from '@/services/apiClient';
import {notifyApiError} from '@/stores/notificationStore';
import i18n from '@/i18n/i18n';
import type {ApiResult} from '@/models/ApiResponse';
import type {TaxonMapSettings} from '../types';

export interface UseTaxaDataOptions {
    onSuccess?: (data: TaxonMapSettings[], totalCount: number, filteredCount: number) => void;
}

/** Odpověď /api/react/atlasadmin/taxa/user – řádky nese pole `taxa` (širší obálka). */
interface TaxaTableResponse extends ApiResult {
    taxa?: TaxonMapSettings[];
    totalCount?: number;
    filteredCount?: number;
}

export function useTaxaData(options?: UseTaxaDataOptions) {
    const {onSuccess} = options || {};

    /**
     * Fetch taxa from API with server-side filtering
     */
    const fetchTaxa = useCallback(async (params: {
        page: number;
        pageSize: number;
        sorting: Array<{ id: string; desc: boolean }>;
        columnFilters: Array<{ id: string; value: string }>;
        additionalParams: Record<string, string>;
        signal?: AbortSignal;
    }) => {
        const {page, pageSize, sorting, columnFilters, signal} = params;

        // Extract filters
        const nameLatFilter = columnFilters.find(f => f.id === 'taxonNameLat')?.value || '';
        const isMappedFilter = columnFilters.find(f => f.id === 'isMapped')?.value || '';
        const commonThresholdFilter = columnFilters.find(f => f.id === 'commonThreshold')?.value || '';
        const isProtectedFilter = columnFilters.find(f => f.id === 'isProtected')?.value || '';
        const presliaFilter = columnFilters.find(f => f.id === 'preslia')?.value || '';
        const revisorsFilter = columnFilters.find(f => f.id === 'revisors')?.value || '';
        const revisionStatusFilter = columnFilters.find(f => f.id === 'revisionStatusId')?.value || '';
        const publicationStatusFilter = columnFilters.find(f => f.id === 'publicationStatusId')?.value || '';

        // Extract sorting
        const sortField = sorting.length > 0 ? sorting[0].id : '';
        const sortDirection = sorting.length > 0 ? (sorting[0].desc ? 'DESC' : 'ASC') : '';

        try {
            const payload = await apiGet<TaxaTableResponse>('/api/react/atlasadmin/taxa/user', {
                params: {
                    page: String(page),
                    pageSize: String(pageSize),
                    sortField,
                    sortDirection,
                    nameLatFilter,
                    isMappedFilter,
                    commonThresholdFilter,
                    isProtectedFilter,
                    presliaFilter,
                    revisorsFilter,
                    revisionStatusFilter,
                    publicationStatusFilter,
                },
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
            // aborted i centrálně ohlášené chyby notifyApiError tiše ignoruje
            notifyApiError(err, i18n.t("common.loadFailed"));
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
