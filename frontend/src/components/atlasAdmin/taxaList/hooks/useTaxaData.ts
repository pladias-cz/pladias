/**
 * Hook for fetching taxa data with server-side pagination and filtering
 */

import {useCallback} from 'react';
import axios from 'axios';
import type {TaxonMapSettings} from '../types';

export interface UseTaxaDataOptions {
    onSuccess?: (data: TaxonMapSettings[], totalCount: number, filteredCount: number) => void;
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

        // Extract filters
        const nameLatFilter = columnFilters.find(f => f.id === 'taxonNameLat')?.value || '';
        const isMappedFilter = columnFilters.find(f => f.id === 'isMapped')?.value || '';
        const commonThresholdFilter = columnFilters.find(f => f.id === 'commonThreshold')?.value || '';
        const isProtectedFilter = columnFilters.find(f => f.id === 'isProtected')?.value || '';
        const presliaFilter = columnFilters.find(f => f.id === 'preslia')?.value || '';
        const revisorsFilter = columnFilters.find(f => f.id === 'revisors')?.value || '';
        const revisionStatusFilter = columnFilters.find(f => f.id === 'revisionStatusId')?.value || '';
        const publicationStatusFilter = columnFilters.find(f => f.id === 'publicationStatusId')?.value || '';

        try {
            const response = await axios.get('/api/react/atlasadmin/taxa', {
                params: {
                    page,
                    pageSize,
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

            if (response.data?.success) {
                const data = response.data.taxa || [];
                const totalCount = response.data.totalCount || 0;
                const filteredCount = response.data.filteredCount || totalCount;

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
            if (axios.isCancel(err) || (err as any).name === 'CanceledError') {
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
