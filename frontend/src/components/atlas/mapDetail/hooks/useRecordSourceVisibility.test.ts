import {cleanup, renderHook, waitFor, act} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useRecordSourceVisibility} from './useRecordSourceVisibility';
import {getUserSetting, saveUserSetting} from '@/services/settingsApi';
import '@/i18n/i18n';

/**
 * Testy persistence viditelnosti zdrojů záznamů: uložený JSON seznam se
 * načte při mountu, toggle optimisticky změní stav a uloží aktuální výběr.
 * `@/services/settingsApi` je mocknuté, aby hook běžel bez síťových volání.
 */

vi.mock('@/services/settingsApi', () => ({
    getUserSetting: vi.fn(async () => null),
    saveUserSetting: vi.fn(async (_key: string, value: string) => value),
    resetUserSettings: vi.fn(async () => undefined),
    isBooleanSetting: vi.fn(() => false),
    mapBackendKeyToStateKey: vi.fn((key: string) => key),
}));

const SETTING_KEY = 'atlas_recordsourcevisibility_mapdetail';

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('useRecordSourceVisibility', () => {
    it('načte uložený výběr z user settings', async () => {
        vi.mocked(getUserSetting).mockResolvedValue('["pladias"]');
        const {result} = renderHook(() => useRecordSourceVisibility());
        await waitFor(() => {
            expect(result.current.visibleProjects).toEqual({pladias: true, gbif: false, inaturalist: false});
        });
        expect(getUserSetting).toHaveBeenCalledWith(SETTING_KEY);
    });

    it('bez uložené hodnoty použije výchozí stav (vše viditelné)', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);
        const {result} = renderHook(() => useRecordSourceVisibility());
        await waitFor(() => expect(getUserSetting).toHaveBeenCalledTimes(1));
        expect(result.current.visibleProjects).toEqual({pladias: true, gbif: true, inaturalist: true});
    });

    it('nevalidní uložená hodnota znamená výchozí stav', async () => {
        vi.mocked(getUserSetting).mockResolvedValue('{"pladias":true}');
        const {result} = renderHook(() => useRecordSourceVisibility());
        await waitFor(() => expect(getUserSetting).toHaveBeenCalledTimes(1));
        expect(result.current.visibleProjects).toEqual({pladias: true, gbif: true, inaturalist: true});
    });

    it('toggle přepne stav a uloží JSON seznam viditelných zdrojů', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);
        const {result} = renderHook(() => useRecordSourceVisibility());
        await waitFor(() => expect(getUserSetting).toHaveBeenCalledTimes(1));

        act(() => result.current.toggleProjectVisibility('gbif'));
        expect(result.current.visibleProjects).toEqual({pladias: true, gbif: false, inaturalist: true});
        expect(saveUserSetting).toHaveBeenCalledWith(
            SETTING_KEY,
            JSON.stringify(['pladias', 'inaturalist']),
        );
    });

    it('chyba ukládání nevrátí stav zpět (optimistická aktualizace)', async () => {
        vi.mocked(getUserSetting).mockResolvedValue(null);
        vi.mocked(saveUserSetting).mockRejectedValue(new Error('network'));
        const {result} = renderHook(() => useRecordSourceVisibility());
        await waitFor(() => expect(getUserSetting).toHaveBeenCalledTimes(1));

        act(() => result.current.toggleProjectVisibility('inaturalist'));
        expect(result.current.visibleProjects).toEqual({pladias: true, gbif: true, inaturalist: false});
        // chybu hlásí centrálně useUserSettings (notifikace), stav zůstává
    });
});
