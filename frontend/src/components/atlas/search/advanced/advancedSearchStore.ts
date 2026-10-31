/**
 * Hodnoty filtrů pokročilého vyhledávání – globální klientský stav (zustand,
 * pravidlo 2 state managementu) persistovaný do sessionStorage: přežijí reload
 * i odchod ze stránky v rámci session prohlížeče, dokud uživatel neklikne
 * Reset. Výsledky hledání se neukládají (server data zůstávají v
 * useSearchQuery); viditelnost filtrů je user setting (useFilterVisibility).
 *
 * Persistovaná hodnota nese i userId – sessionStorage přežije reload po
 * odhlášení, takže po přihlášení jiného uživatele ve stejném tabu se cizí
 * hodnoty zahodí (useAdvancedSearchUserGuard).
 */

import {useEffect} from 'react';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {defaultFilterValues, isEmptyFilterValue} from './filterRegistry';
import type {FilterId, FilterValue, FilterValues} from './types';

interface AdvancedSearchStoreState {
    /** Uživatel, kterému hodnoty patří (guard proti sdílenému tabu). */
    userId: number | null;
    values: FilterValues;
    setFilterValue: (id: FilterId, value: FilterValue) => void;
    clearFilter: (id: FilterId) => void;
    /** Reset – hodnoty zpět na výchozí (stejné jako po prvním otevření). */
    resetFilterValues: () => void;
}

export const useAdvancedSearchStore = create<AdvancedSearchStoreState>()(
    persist(
        (set) => ({
            userId: null,
            values: defaultFilterValues(),
            setFilterValue: (id, value) =>
                set((state) => {
                    if (isEmptyFilterValue(value)) {
                        if (!(id in state.values)) {
                            return state;
                        }
                        const {[id]: _, ...values} = state.values;
                        return {values};
                    }
                    return {values: {...state.values, [id]: value}};
                }),
            clearFilter: (id) =>
                set((state) => {
                    if (!(id in state.values)) {
                        return state;
                    }
                    const {[id]: _, ...values} = state.values;
                    return {values};
                }),
            resetFilterValues: () => set({values: defaultFilterValues()}),
        }),
        {
            name: 'atlas_advancedsearch_filters',
            storage: createJSONStorage(() => sessionStorage),
            version: 1,
        },
    ),
);

/**
 * Pojistka proti úniku hodnot mezi uživateli: po odhlášení a přihlášení
 * jiného uživatele ve stejném tabu se persistované userId neshoduje –
 * hodnoty se zahodí a uloží se id nového uživatele.
 */
export function useAdvancedSearchUserGuard(userId: number) {
    useEffect(() => {
        const state = useAdvancedSearchStore.getState();
        if (state.userId != null && state.userId !== userId) {
            state.resetFilterValues();
        }
        if (state.userId !== userId) {
            useAdvancedSearchStore.setState({userId});
        }
    }, [userId]);
}
