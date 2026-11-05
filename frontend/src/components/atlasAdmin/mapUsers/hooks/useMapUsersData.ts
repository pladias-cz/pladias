/**
 * Hook for fetching MapUsers data with combined users and rights
 */

import {useCallback} from 'react';
import {apiGet} from '@/services/apiClient';
import type {MapUserTableRow, Project, SupervisedTaxon} from '../types';

export interface UseMapUsersDataOptions {
    onSuccess?: (data: MapUserTableRow[], totalCount: number, filteredCount: number) => void;
}

interface UsersApiResponse {
    success: boolean;
    data: Array<{
        id: number;
        name: string;
        surname: string;
        email: string;
    }>;
    totalCount: number;
    filteredCount?: number;
}

interface UserRightsApiResponse {
    success: boolean;
    data: Record<number, {
        contributionProjects: Project[];
        supervisedTaxa: SupervisedTaxon[];
    }>;
}

export function useMapUsersData(options: UseMapUsersDataOptions = {}) {
    const {onSuccess} = options;

    /**
     * Custom fetcher: fetch users + rights in one go
     */
    const fetchUsersWithRights = useCallback(async ({
                                                        page,
                                                        pageSize,
                                                        sorting,
                                                        columnFilters,
                                                        additionalParams = {},
                                                        signal
                                                    }: {
        page: number;
        pageSize: number;
        sorting: Array<{ id: string; desc: boolean }>;
        columnFilters: Array<{ id: string; value: string }>;
        additionalParams?: Record<string, string>;
        signal?: AbortSignal;
    }) => {
        // Build sort params
        const sortParams: Record<string, string> = {};
        if (sorting && sorting.length > 0) {
            const s = sorting[0];
            sortParams.sortBy = s.id;
            sortParams.sortOrder = s.desc ? 'desc' : 'asc';
        }

        // Extract filters
        const filters: Record<string, string> = {};
        columnFilters.forEach(filter => {
            const paramName = `${filter.id.charAt(0).toUpperCase() + filter.id.slice(1)}Filter`;
            filters[paramName] = filter.value;
        });

        // Fetch users
        const usersPayload = await apiGet<UsersApiResponse>('/api/react/atlasadmin/users', {
            params: {
                page: String(page),
                pageSize: String(pageSize),
                ...additionalParams,
                ...filters,
                ...sortParams,
            },
            signal,
        });

        const users = usersPayload?.data || [];
        const totalCount = usersPayload?.totalCount || 0;
        const filteredCount = usersPayload?.filteredCount ?? totalCount;

        if (users.length === 0) {
            return {data: [], totalCount, filteredCount};
        }

        // Fetch rights for these users
        const userIds = users.map(u => u.id);

        const rightsPayload = await apiGet<UserRightsApiResponse>('/api/react/atlasadmin/userrights', {
            params: {userIds: userIds.join(',')},
            signal,
        });

        const rightsData = rightsPayload?.data || {};

        // Merge users with their rights
        const mergedData: MapUserTableRow[] = users.map((user) => ({
            ...user,
            contributionProjects: rightsData[user.id]?.contributionProjects || [],
            supervisedTaxa: rightsData[user.id]?.supervisedTaxa || [],
        }));

        onSuccess?.(mergedData, totalCount, filteredCount);

        return {data: mergedData, totalCount, filteredCount};
    }, [onSuccess]);

    return {
        fetchUsersWithRights,
    };
}
