/**
 * Hook for fetching taxa data with server-side pagination and filtering
 */

import {useCallback} from 'react';
import axios from 'axios';
import type {TaxonMapSettings} from '../types';

export interface UseTaxaDataOptions {
    onSuccess?: (data: TaxonMapSettings[], totalCount: number, filteredCount: number) => void;
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
            const response = await axios.get('/api/react/atlasadmin/taxa', {
                params: {page, pageSize, ...extractTaxaFilters(columnFilters)},
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
