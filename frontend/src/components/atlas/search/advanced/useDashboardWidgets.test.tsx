/**
 * Testy výběru widgetů dashboardu: parsování uloženého user setting (čistá
 * funkce) a chování hooku – defaulty bez nastavení (všechny widgety), uložený
 * výběr autoritativní, toggle ukládá nový seznam jako JSON na backend
 * (vzor useFilterVisibility.test).
 */

import {act, cleanup, renderHook, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import '@/i18n/i18n';
import {getUserSetting} from '@/services/settingsApi';
import {parseActiveWidgets, useDashboardWidgets} from './useDashboardWidgets';
import type {DashboardWidgetId} from './dashboardWidgets';

const saveSettingMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/settingsApi', () => ({
    getUserSetting: vi.fn(),
}));

vi.mock('@/hooks/useUserSettings', () => ({
    useUserSettings: () => ({saveSetting: saveSettingMock}),
}));

/** Default: všechny widgety v pořadí registru. */
const DEFAULTS: DashboardWidgetId[] = ['year', 'altitude', 'license', 'herbarium'];

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('parseActiveWidgets', () => {
    it('null / prázdný / nevalidní JSON / ne pole → null (defaulty)', () => {
        expect(parseActiveWidgets(null)).toBeNull();
        expect(parseActiveWidgets('')).toBeNull();
        expect(parseActiveWidgets('rozbité')).toBeNull();
        expect(parseActiveWidgets('{"a": 1}')).toBeNull();
    });

    it('prázdné pole = uživatel si vypnul všechny přehledy', () => {
        expect(parseActiveWidgets('[]')).toEqual([]);
    });

    it('neznámá id se zahazují; když nezbydou žádná známá, defaulty', () => {
        expect(parseActiveWidgets('["neexistujici"]')).toBeNull();
        expect(parseActiveWidgets('["license", "cizi"]')).toEqual(['license']);
    });
});

describe('useDashboardWidgets', () => {
    it('bez uloženého nastavení ukazuje všechny widgety', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);

        const {result} = renderHook(() => useDashboardWidgets());

        await waitFor(() => expect(result.current.activeIds).toEqual(DEFAULTS));
    });

    it('uložené nastavení je autoritativní (přepisuje defaulty)', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(JSON.stringify(['year']));

        const {result} = renderHook(() => useDashboardWidgets());

        await waitFor(() => expect(result.current.activeIds).toEqual(['year']));
    });

    it('nevalidní uložená hodnota → defaulty', async () => {
        vi.mocked(getUserSetting).mockResolvedValue('rozbité');

        const {result} = renderHook(() => useDashboardWidgets());

        await waitFor(() => expect(result.current.activeIds).toEqual(DEFAULTS));
    });

    it('po načtení nastavení (i chybném) je loaded true a defaulty zůstávají', async () => {
        vi.mocked(getUserSetting).mockRejectedValue(new Error('network'));

        const {result} = renderHook(() => useDashboardWidgets());

        await waitFor(() => expect(result.current.loaded).toBe(true));
        // chyba načtení → defaulty
        expect(result.current.activeIds).toEqual(DEFAULTS);
    });

    it('toggle odebere widget a uloží zmenšený seznam jako JSON', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);

        const {result} = renderHook(() => useDashboardWidgets());
        await waitFor(() => expect(result.current.activeIds).toEqual(DEFAULTS));

        act(() => result.current.toggleWidget('license'));

        expect(result.current.activeIds).not.toContain('license');
        expect(saveSettingMock).toHaveBeenCalledWith(
            'atlas_advancedsearch_dashboardwidgets',
            JSON.stringify(['year', 'altitude', 'herbarium']),
        );
    });
});