/**
 * Viditelnost filtrů pokročilého vyhledávání – user setting perzistovaná
 * na backendu jako JSON seznam FilterId (vzor useRecordSourceVisibility /
 * useLayerManager). Skrytý filtr se nezobrazuje v řádce ani neposílá do
 * dotazu; jeho hodnota zůstává ve store a po znovuzobrazení se ukáže na chipu.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useUserSettings} from '@/hooks/useUserSettings';
import {getUserSetting} from '@/services/settingsApi';
import {FILTER_DEFINITIONS, filterAppliesToInstance} from './filterRegistry';
import type {FilterDefinition} from './filterRegistry';
import type {FilterId} from './types';

/** Backend klíč pro uložený výběr (snake_case konvence user settings). */
const FILTER_VISIBILITY_KEY = 'atlas_advancedsearch_filtersvisible';

/**
 * Parsování uloženého výběru. `null` = uložená hodnota neexistuje nebo je
 * nevalidní → použijí se defaulty. Explicitně prázdné pole (uživatel vypnul
 * všechny filtry) je legitimní stav; neznámá id (přejmenování, jiná instance)
 * se zahazují, a pokud nezbude žádné známé, vrátíme null (defaulty).
 */
export function parseVisibleFilters(saved: string | null, applicable: readonly FilterId[]): FilterId[] | null {
    if (!saved) {
        return null;
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(saved);
    } catch {
        return null;
    }
    if (!Array.isArray(parsed)) {
        return null;
    }
    if (parsed.length === 0) {
        return [];
    }
    const known = new Set(applicable);
    const ids = parsed.filter((id): id is FilterId => typeof id === 'string' && known.has(id as FilterId));
    return ids.length > 0 ? ids : null;
}

export function useFilterVisibility(isVascular: boolean) {
    /** Výběr uložený na backendu; null = ještě nenačteno / neexistuje → defaulty. */
    const [savedVisibleIds, setSavedVisibleIds] = useState<FilterId[] | null>(null);
    /** Načetlo se uložené nastavení (i s chybou)? – signál pro initial auto-vyhledávání. */
    const [loaded, setLoaded] = useState(false);
    const {saveSetting} = useUserSettings();
    const initialized = useRef(false);

    /** Filtry nabízené v řádce i „+" popoveru – aplikovatelné, bez companion filtrů. */
    const applicableFilters = useMemo<FilterDefinition[]>(
        () => FILTER_DEFINITIONS.filter((filter) => filterAppliesToInstance(filter, isVascular) && !filter.companionOf),
        [isVascular],
    );

    // Načtení uloženého výběru jednou při mountu; neexistující/nevalidní
    // hodnota → zůstává null → defaulty. Chyba načtení → také defaulty.
    useEffect(() => {
        if (initialized.current) {
            return;
        }
        initialized.current = true;

        getUserSetting(FILTER_VISIBILITY_KEY)
            .then((saved) => {
                const parsed = parseVisibleFilters(saved, applicableFilters.map((filter) => filter.id));
                if (parsed) {
                    setSavedVisibleIds(parsed);
                }
            })
            .catch(() => {/* chyba načtení → zůstávají defaulty */})
            .finally(() => setLoaded(true));
    }, [applicableFilters]);

    /** Efektivní výběr: vlastní nastavení uživatele, jinak defaultně viditelné filtry. */
    const visibleIds = useMemo<FilterId[]>(
        () => savedVisibleIds
            ?? applicableFilters.filter((filter) => filter.defaultVisible).map((filter) => filter.id),
        [savedVisibleIds, applicableFilters],
    );

    /**
     * Přepne viditelnost filtru, uloží nový seznam na backend a vrátí ho –
     * volající ho použije pro okamžitou aktualizaci (auto-vyhledávání bez
     * čekání na re-render).
     */
    const toggleFilter = useCallback((id: FilterId): FilterId[] => {
        const next = visibleIds.includes(id)
            ? visibleIds.filter((visibleId) => visibleId !== id)
            : [...visibleIds, id];
        setSavedVisibleIds(next);
        // optimistické uložení – stav se v UI mění okamžitě; chybu ukládání
        // hlásí useUserSettings centrální danger notifikací
        void saveSetting(FILTER_VISIBILITY_KEY, JSON.stringify(next));
        return next;
    }, [visibleIds, saveSetting]);

    return {applicableFilters, visibleIds, toggleFilter, loaded};
}
