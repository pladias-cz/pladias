/**
 * Hook for managing server-side pagination state
 */

import {useCallback, useEffect, useMemo, useState} from 'react';

export interface UseServerPaginationOptions {
    initialPage?: number;
    initialPageSize?: number;
    pageSizeOptions?: number[];
    totalCount?: number;
    filteredCount?: number;
}

export interface UseServerPaginationReturn {
    page: number;
    pageSize: number;
    totalPages: number;
    setPage: (page: number) => void;
    setPageSize: (size: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    isFirstPage: boolean;
    isLastPage: boolean;
    pageSizeOptions: number[];
    updateTotals: (totalCount: number, filteredCount?: number) => void;
}

export function useServerPagination(options: UseServerPaginationOptions = {}): UseServerPaginationReturn {
    const {
        initialPage = 1,
        initialPageSize = 20,
        pageSizeOptions = [10, 20, 50, 100],
        totalCount: initialTotalCount = 0,
        filteredCount: initialFilteredCount = 0,
    } = options;

    const [page, setPage] = useState(initialPage);
    const [pageSize, setPageSizeState] = useState(initialPageSize);

    // Allow totalCount and filteredCount to be updated externally
    const [totalCount, setTotalCount] = useState(initialTotalCount);
    const [filteredCount, setFilteredCount] = useState(initialFilteredCount);

    /**
     * Update counts when they change from parent
     */
    useEffect(() => {
        setTotalCount(initialTotalCount);
    }, [initialTotalCount]);

    useEffect(() => {
        setFilteredCount(initialFilteredCount);
    }, [initialFilteredCount]);

    /**
     * Calculate total pages based on current count
     */
    const totalPages = useMemo(() => {
        const count = filteredCount > 0 ? filteredCount : totalCount;
        if (pageSize === 0) return 1;
        return Math.max(1, Math.ceil(count / pageSize));
    }, [totalCount, filteredCount, pageSize]);

    /**
     * Clamp page to valid range when totals change
     */
    const currentPage = useMemo(() => {
        if (page < 1) return 1;
        if (page > totalPages) return totalPages;
        return page;
    }, [page, totalPages]);

    /**
     * Set page with validation
     */
    const setPageValidated = useCallback((newPage: number) => {
        if (newPage < 1) {
            setPage(1);
        } else if (newPage > totalPages) {
            setPage(totalPages);
        } else {
            setPage(newPage);
        }
    }, [totalPages]);

    /**
     * Set page size and reset to first page
     */
    const setPageSize = useCallback((size: number) => {
        setPageSizeState(size);
        setPage(1);
    }, []);

    /**
     * Navigate to next page
     */
    const nextPage = useCallback(() => {
        setPage(prev => Math.min(prev + 1, totalPages));
    }, [totalPages]);

    /**
     * Navigate to previous page
     */
    const prevPage = useCallback(() => {
        setPage(prev => Math.max(prev - 1, 1));
    }, []);

    /**
     * Check if on first page
     */
    const isFirstPage = currentPage === 1;

    /**
     * Check if on last page
     */
    const isLastPage = currentPage === totalPages;

    /**
     * Update totals externally (for when data is fetched after initial render)
     */
    const updateTotals = useCallback((newTotalCount: number, newFilteredCount?: number) => {
        setTotalCount(newTotalCount);
        if (newFilteredCount !== undefined) {
            setFilteredCount(newFilteredCount);
        }
    }, []);

    return {
        page: currentPage,
        pageSize,
        totalPages,
        setPage: setPageValidated,
        setPageSize,
        nextPage,
        prevPage,
        isFirstPage,
        isLastPage,
        pageSizeOptions,
        updateTotals,
    };
}