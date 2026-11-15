/**
 * Nápovědy relačních filtrů tabulky MapUsers (projekty / dozorované taxony).
 *
 * Zdrojem je `GET /api/react/atlasadmin/userrights/options` – distinct labely
 * vztahů reálně přiřazených nezsmazaným uživatelům (backend vrací zkratku projektu,
 * pokud existuje, shodně s vykreslením v buňce; u taxonů latinský název). Filtr
 * sám hledá na serveru wildcardem do týchž názvů, nápověda je jen usnadnění.
 * Načtení přes `useCatalogQuery` selže-na-prázdnou – filter zůstane volný text.
 */

import {useMemo} from 'react';
import {useCatalogQuery} from '@/query/useCatalogQuery';
import {getUserRightOptions} from '@/services/mapAdminApi';

interface FilterSuggestion {
    value: string;
    label: string;
}

/** Čistí prázdné hodnoty a deduplikuje (backend řadí, pořadí necháváme). */
function toOptions(values: readonly string[]): FilterSuggestion[] {
    return Array.from(new Set(values.filter(value => value.trim() !== '')))
        .map(value => ({value, label: value}));
}

export function useMapUserRightsSuggestions(): {
    projectOptions: FilterSuggestion[];
    taxonOptions: FilterSuggestion[];
} {
    // loader musí vracet pole (kontrakt useCatalogQuery) – options obalíme jedním prvky
    const [options] = useCatalogQuery(['atlasAdminUserRightOptions'], async () => [await getUserRightOptions()]);

    return useMemo(() => ({
        projectOptions: toOptions(options?.projects ?? []),
        taxonOptions: toOptions(options?.taxa ?? []),
    }), [options]);
}
