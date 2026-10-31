/**
 * Výběr aktivních widgetů dashboardu výsledků – user setting perzistovaná na
 * backendu jako JSON seznam DashboardWidgetId (vzor useFilterVisibility /
 * useRecordSourceVisibility). Neaktivní widget se nezobrazí ani neposílá do
 * dotazu na agregace (form.aggregates); jeho zapnutí vrátí data refetchem.
 */

import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {useUserSettings} from '@/hooks/useUserSettings';
import {getUserSetting} from '@/services/settingsApi';
import {DASHBOARD_WIDGETS} from './dashboardWidgets';
import type {DashboardWidgetId} from './dashboardWidgets';

/** Backend klíč pro uložený výběr (snake_case konvence user settings). */
const DASHBOARD_WIDGETS_KEY = 'atlas_advancedsearch_dashboardwidgets';

/**
 * Parsování uloženého výběru. `null` = uložená hodnota neexistuje nebo je
 * nevalidní → defaulty (všechny widgety). Explicitně prázdné pole (uživatel si
 * vypnul všechny přehledy) je legitimní stav; neznámá id (novější widgety, jiné
 * verze backendu) se zahazují, a pokud nezbude žádné známé, vrátíme null (defaulty).
 */
export function parseActiveWidgets(saved: string | null): DashboardWidgetId[] | null {
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
    const known = new Set(DASHBOARD_WIDGETS.map((widget) => widget.id));
    const ids = parsed.filter((id): id is DashboardWidgetId =>
        typeof id === 'string' && known.has(id as DashboardWidgetId));
    return ids.length > 0 ? ids : null;
}

export function useDashboardWidgets() {
    /** Výběr uložený na backendu; null = ještě nenačteno / neexistuje → defaulty. */
    const [savedActiveIds, setSavedActiveIds] = useState<DashboardWidgetId[] | null>(null);
    /** Načetlo se uložené nastavení (i s chybou)? – teprve pak smí vyjet dotaz na agregace. */
    const [loaded, setLoaded] = useState(false);
    const {saveSetting} = useUserSettings();
    const initialized = useRef(false);

    // Načtení uloženého výběru jednou při mountu; neexistující/nevalidní hodnota
    // ani chyba načtení mění nic – zůstávají defaulty (všechny widgety).
    useEffect(() => {
        if (initialized.current) {
            return;
        }
        initialized.current = true;

        getUserSetting(DASHBOARD_WIDGETS_KEY)
            .then((saved) => {
                const parsed = parseActiveWidgets(saved);
                if (parsed) {
                    setSavedActiveIds(parsed);
                }
            })
            .catch(() => {/* chyba načtení → zůstávají defaulty */})
            .finally(() => setLoaded(true));
    }, []);

    /** Efektivní výběr: vlastní nastavení uživatele, jinak všechny widgety. */
    const activeIds = useMemo<DashboardWidgetId[]>(
        () => savedActiveIds ?? DASHBOARD_WIDGETS.map((widget) => widget.id),
        [savedActiveIds],
    );

    /**
     * Přepne widget, uloží nový seznam na backend (optimisticky – chybu ukládání
     * hlásí useUserSettings centrální danger notifikací) a vrátí ho volajícímu.
     */
    const toggleWidget = useCallback((id: DashboardWidgetId): DashboardWidgetId[] => {
        const next = activeIds.includes(id)
            ? activeIds.filter((activeId) => activeId !== id)
            : [...activeIds, id];
        setSavedActiveIds(next);
        void saveSetting(DASHBOARD_WIDGETS_KEY, JSON.stringify(next));
        return next;
    }, [activeIds, saveSetting]);

    return {widgets: DASHBOARD_WIDGETS, activeIds, toggleWidget, loaded};
}