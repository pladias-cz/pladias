/**
 * Testy viditelnosti filtrů: parsování uloženého user setting (čistá funkce)
 * a chování hooku – defaulty bez nastavení, uložený výběr je autoritativní,
 * toggle ukládá nový seznam jako JSON na backend.
 */

import {act, cleanup, renderHook, waitFor} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import '@/i18n/i18n';
import {getUserSetting} from '@/services/settingsApi';
import {parseVisibleFilters, useFilterVisibility} from './useFilterVisibility';
import type {FilterId} from './types';

const saveSettingMock = vi.hoisted(() => vi.fn());

vi.mock('@/services/settingsApi', () => ({
    getUserSetting: vi.fn(),
}));

vi.mock('@/hooks/useUserSettings', () => ({
    useUserSettings: () => ({saveSetting: saveSettingMock}),
}));

/** Defaultní filtry v pořadí registru (taxonName, localityDescription, year). */
const DEFAULTS: FilterId[] = ['taxonName', 'localityDescription', 'year'];

const APPLICABLE: FilterId[] = ['taxonName', 'town', 'localityDescription', 'year'];

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('parseVisibleFilters', () => {
    it('null / prázdný / nevalidní JSON / ne pole → null (defaulty)', () => {
        expect(parseVisibleFilters(null, APPLICABLE)).toBeNull();
        expect(parseVisibleFilters('', APPLICABLE)).toBeNull();
        expect(parseVisibleFilters('rozbité', APPLICABLE)).toBeNull();
        expect(parseVisibleFilters('{"a": 1}', APPLICABLE)).toBeNull();
    });

    it('prázdné pole = uživatel si vypnul všechny filtry', () => {
        expect(parseVisibleFilters('[]', APPLICABLE)).toEqual([]);
    });

    it('neznámá id se zahazují; když nezbydou žádná známá, defaulty', () => {
        expect(parseVisibleFilters('["neexistujici"]', APPLICABLE)).toBeNull();
        expect(parseVisibleFilters('["town", "cizi"]', APPLICABLE)).toEqual(['town']);
    });
});

describe('useFilterVisibility', () => {
    it('bez uloženého nastavení ukazuje defaultní filtry', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);

        const {result} = renderHook(() => useFilterVisibility(true));

        await waitFor(() => expect(result.current.visibleIds).toEqual(DEFAULTS));
    });

    it('uložené nastavení je autoritativní (přepisuje defaulty)', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(JSON.stringify(['town']));

        const {result} = renderHook(() => useFilterVisibility(true));

        await waitFor(() => expect(result.current.visibleIds).toEqual(['town']));
    });

    it('nevalidní uložená hodnota → defaulty', async () => {
        vi.mocked(getUserSetting).mockResolvedValue('rozbité');

        const {result} = renderHook(() => useFilterVisibility(true));

        await waitFor(() => expect(result.current.visibleIds).toEqual(DEFAULTS));
    });

    it('toggle přidá filtr do výběru a uloží nový seznam jako JSON', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);

        const {result} = renderHook(() => useFilterVisibility(true));
        await waitFor(() => expect(result.current.visibleIds).toEqual(DEFAULTS));

        act(() => result.current.toggleFilter('town'));

        expect(result.current.visibleIds).toContain('town');
        expect(saveSettingMock).toHaveBeenCalledWith(
            'atlas_advancedsearch_filtersvisible',
            JSON.stringify([...DEFAULTS, 'town']),
        );
    });

    it('toggle odebere filtr a uloží zmenšený seznam', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);

        const {result} = renderHook(() => useFilterVisibility(true));
        await waitFor(() => expect(result.current.visibleIds).toEqual(DEFAULTS));

        act(() => result.current.toggleFilter('year'));

        expect(result.current.visibleIds).not.toContain('year');
        expect(saveSettingMock).toHaveBeenCalledWith(
            'atlas_advancedsearch_filtersvisible',
            JSON.stringify(['taxonName', 'localityDescription']),
        );
    });

    it('po načtení nastavení (i chybném) je loaded true', async () => {
        vi.mocked(getUserSetting).mockRejectedValue(new Error('network'));

        const {result} = renderHook(() => useFilterVisibility(true));

        await waitFor(() => expect(result.current.loaded).toBe(true));
        // chyba načtení → defaulty
        expect(result.current.visibleIds).toEqual(DEFAULTS);
    });
});
