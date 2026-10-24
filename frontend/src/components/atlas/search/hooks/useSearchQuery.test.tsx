/**
 * Testy dotazu vyhledávání (useSearchQuery) nad service vrstvou:
 *  - submit nastaví záznamy, total i hlášku o počtu nálezech,
 *  - stránkování běží bez přepočtu total a posune currentPage,
 *  - selhání vyhledávání nastaví chybovou hlášku a stránka se neposune,
 *  - reset zahodí výsledky i řazení.
 *
 * `searchApi` (searchRecords/exportSearchExcel) je mocknuté; stav formuláře
 * se posílá jako payload entries – buildSearchFormData i resolvePageSize
 * zůstávají reálné (čisté funkce, vlastní testy v searchRequest.test.ts).
 */

import {act, cleanup, renderHook} from '@testing-library/react';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useSearchQuery, type SearchPayloadEntries} from './useSearchQuery';
import {searchRecords} from '@/services/searchApi';
import type {RecordPladias} from '@/models';
import '@/i18n/i18n';

vi.mock('@/services/searchApi', () => ({
    searchRecords: vi.fn(),
    exportSearchExcel: vi.fn(),
}));

const records = [
    {id: 1}, {id: 2},
] as unknown as RecordPladias[];

const payload: SearchPayloadEntries = [['taxon', 'Taraxacum']];

afterEach(() => {
    cleanup();
    vi.resetAllMocks();
});

describe('useSearchQuery', () => {
    it('search načte první stránku s přepočtem total a nastaví hlášku', async () => {
        vi.mocked(searchRecords).mockResolvedValueOnce({records, totalCount: 42});

        const {result} = renderHook(() => useSearchQuery());

        await act(async () => {
            await result.current.search(payload);
        });

        expect(result.current.records).toEqual(records);
        expect(result.current.totalCount).toBe(42);
        expect(result.current.currentPage).toBe(1);
        expect(result.current.submitMessage).toBe('Nalezeno 2 záznamů (celkem 42).');
        expect(result.current.isLoading).toBe(false);
        expect(searchRecords).toHaveBeenCalledWith(1, expect.anything(), true, expect.any(FormData));
    });

    it('changePage načte další stránku bez přepočtu total', async () => {
        vi.mocked(searchRecords)
            .mockResolvedValueOnce({records, totalCount: 42})
            .mockResolvedValueOnce({records: [{id: 3}] as unknown as RecordPladias[]});

        const {result} = renderHook(() => useSearchQuery());

        await act(async () => {
            await result.current.search(payload);
        });
        await act(async () => {
            await result.current.changePage(2);
        });

        expect(result.current.currentPage).toBe(2);
        // druhé volání: stránka 2, bez count
        expect(searchRecords).toHaveBeenLastCalledWith(2, expect.anything(), false, expect.any(FormData));
        // total zůstává z prvního dotazu
        expect(result.current.totalCount).toBe(42);
    });

    it('selhání vyhledávání nastaví chybovou hlášku a stránka se neposune', async () => {
        vi.mocked(searchRecords).mockRejectedValue(new Error('network'));

        const {result} = renderHook(() => useSearchQuery());

        await act(async () => {
            await result.current.search(payload);
        });
        // changePage po selhání se pokusí načíst znovu (payload je uložen),
        // ale neúspěšně – stránka zůstává na 1
        await act(async () => {
            await result.current.changePage(2);
        });

        expect(result.current.submitMessage).toBe('Nepodařilo se odeslat formulář.');
        expect(searchRecords).toHaveBeenCalledTimes(2);
        expect(result.current.currentPage).toBe(1);
    });

    it('changeSort vždy načítá první stránku s přepočtem total', async () => {
        vi.mocked(searchRecords)
            .mockResolvedValueOnce({records, totalCount: 42})
            .mockResolvedValueOnce({records, totalCount: 42})
            .mockResolvedValueOnce({records, totalCount: 42});

        const {result} = renderHook(() => useSearchQuery());

        await act(async () => {
            await result.current.search(payload);
        });
        await act(async () => {
            await result.current.changePage(2);
        });
        await act(async () => {
            await result.current.changeSort('locality', 'desc');
        });

        expect(result.current.currentPage).toBe(1);
        expect(result.current.sortBy).toBe('locality');
        expect(searchRecords).toHaveBeenLastCalledWith(1, expect.anything(), true, expect.any(FormData));
    });

    it('reset zahodí výsledky i řazení', async () => {
        vi.mocked(searchRecords).mockResolvedValueOnce({records, totalCount: 42});

        const {result} = renderHook(() => useSearchQuery());

        await act(async () => {
            await result.current.search(payload);
        });
        act(() => {
            result.current.reset();
        });

        expect(result.current.records).toEqual([]);
        expect(result.current.totalCount).toBeNull();
        expect(result.current.submitMessage).toBe('');
        expect(result.current.currentPage).toBe(1);
        expect(result.current.sortBy).toBe('taxonName');
        expect(result.current.isLoading).toBe(false);
    });
});
