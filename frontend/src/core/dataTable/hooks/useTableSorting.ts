/**
 * Hook for managing table sorting state
 */

import {useCallback, useState} from 'react';
import type {ColumnSort} from '@tanstack/react-table';

export function useTableSorting() {
    const [sorting, setSorting] = useState<ColumnSort[]>([]);

    /**
     * Get sort indicator for a specific column
     */
    const getSortIndicator = useCallback((columnId: string): 'asc' | 'desc' | null => {
        const sortState = sorting.find(s => s.id === columnId);
        if (!sortState) return null;
        return sortState.desc ? 'desc' : 'asc';
    }, [sorting]);

    /**
     * Handle sort click on a column
     */
    const handleSort = useCallback((columnId: string) => {
        setSorting(prev => {
            const currentSort = prev.find(s => s.id === columnId);
            
            if (!currentSort) {
                // First time sorting this column - ascending
                return [{id: columnId, desc: false}];
            } else if (currentSort.desc) {
                // Was descending, now clear sort
                return [];
            } else {
                // Was ascending, now descending
                return [{id: columnId, desc: true}];
            }
        });
    }, []);

    return {
        sorting,
        setSorting,
        getSortIndicator,
        handleSort,
    };
}