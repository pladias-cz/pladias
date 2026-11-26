/**
 * Export z tabu Download hlídá i tichá selhání backendu: 0B tělo ani nulový
 * počet exportovaných řádků se nesmí navenek tvářit jako úspěšný export.
 * (Generování sešitu padá před odesláním odpovědi → HTTP 500; pojistka níže
 * chytá zbylé způsoby přerušení přenosu.)
 */

import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {downloadBlob} from '@/core/dataTable/export';
import {ApiError} from '@/services/apiClient';
import {notifyApiError} from '@/stores/notificationStore';
import {exportSearchExcel, type SearchExcelExport} from '@/services/searchApi';
import {useAdvancedSearchExport} from './useAdvancedSearchExport';
import '@/i18n/i18n';

vi.mock('@/core/dataTable/export', () => ({
    downloadBlob: vi.fn(),
}));

vi.mock('@/services/searchApi', () => ({
    exportSearchExcel: vi.fn(),
}));

vi.mock('@/stores/notificationStore', () => ({
    notifyApiError: vi.fn(),
}));

/** Odpověď exportu; `bytes = 0` věrně simuluje tělo bez jediného bajtu. */
function excelFile(bytes: number, recordsExported: number, totalRecords: number | null): SearchExcelExport {
    return {
        blob: new Blob(bytes > 0 ? ['x'.repeat(bytes)] : []),
        filename: 'PladiasExport.xlsx',
        recordsExported,
        totalRecords,
    };
}

afterEach(() => {
    cleanup();
    vi.resetAllMocks();
});

describe('useAdvancedSearchExport', () => {
    it('0B odpověď neuloží na disk a oznámí chybu', async () => {
        vi.mocked(exportSearchExcel).mockResolvedValueOnce(excelFile(0, 120, 120));

        const {result} = renderHook(() => useAdvancedSearchExport());

        await act(async () => {
            await result.current.run(new FormData());
        });

        expect(downloadBlob).not.toHaveBeenCalled();
        expect(notifyApiError).toHaveBeenCalledWith(expect.any(ApiError), expect.any(String));
        expect(vi.mocked(notifyApiError).mock.calls[0][0]).toHaveProperty(
            'message',
            'Export se nezdařil - server vrátil prázdný soubor. Zkuste to prosím znovu.',
        );
        expect(result.current.message).toBe('');
        expect(result.current.isLoading).toBe(false);
    });

    it('nulový počet exportovaných řádků neohlásí úspěch', async () => {
        vi.mocked(exportSearchExcel).mockResolvedValueOnce(excelFile(4096, 0, 2000));

        const {result} = renderHook(() => useAdvancedSearchExport());

        await act(async () => {
            await result.current.run(new FormData());
        });

        // soubor s hlavičkou se stáhne, ale hláška musí prozradit, že neobsahuje data
        expect(downloadBlob).toHaveBeenCalled();
        expect(notifyApiError).not.toHaveBeenCalled();
        expect(result.current.message)
            .toBe('Export neobsáhl žádný záznam - filtr neodpovídá žádnému nálezu, nebo se nepodařilo načíst data.');
    });

    it('plný export hlásí počet záznamů a částečný export hlásí obě čísla', async () => {
        vi.mocked(exportSearchExcel)
            .mockResolvedValueOnce(excelFile(4096, 150, 150))
            .mockResolvedValueOnce(excelFile(4096, 10000, 15000));

        const {result} = renderHook(() => useAdvancedSearchExport());

        await act(async () => {
            await result.current.run(new FormData());
        });
        expect(result.current.message).toBe('Bylo exportováno všech 150 záznamů.');

        await act(async () => {
            await result.current.run(new FormData());
        });
        expect(result.current.message).toBe('Exportováno 10000 z 15000 záznamů.');
        expect(downloadBlob).toHaveBeenCalledTimes(2);
    });
});
