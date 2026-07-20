/**
 * Hook for managing table filters with stable key generation
 */

import {useCallback, useMemo, useState} from 'react';

export interface UseTableFiltersOptions {
    initialFilters?: Array<{id: string; value: string}>;
    onFiltersChange?: () => void;
}

export function useTableFilters(options: UseTableFiltersOptions = {}) {
    const {initialFilters = [], onFiltersChange} = options;
    
    const [columnFilters, setColumnFilters] = useState<Array<{id: string; value: string}>>(initialFilters);

    /**
     * Get filter value for a specific column
     */
    const getFilterValue = useCallback((columnId: string): string => {
        const filter = columnFilters.find(f => f.id === columnId);
        return filter?.value ?? '';
    }, [columnFilters]);

    /**
     * Set filter value for a specific column
     */
    const setFilterValue = useCallback((columnId: string, value: string) => {
        setColumnFilters(prev => {
            const exists = prev.find(f => f.id === columnId);
            if (exists) {
                return prev.map(f => f.id === columnId ? {...f, value} : f);
            }
            return [...prev, {id: columnId, value}];
        });
        onFiltersChange?.();
    }, [onFiltersChange]);

    /**
     * Clear all filters
     */
    const clearFilters = useCallback(() => {
        setColumnFilters([]);
        onFiltersChange?.();
    }, [onFiltersChange]);

    /**
     * Check if any filters are active (non-empty values)
     */
    const hasActiveFilters = useMemo(() => {
        return columnFilters.some(f => f.value && f.value.trim() !== '');
    }, [columnFilters]);

    return {
        columnFilters,
        setColumnFilters,
        getFilterValue,
        setFilterValue,
        clearFilters,
        hasActiveFilters,
    };
}