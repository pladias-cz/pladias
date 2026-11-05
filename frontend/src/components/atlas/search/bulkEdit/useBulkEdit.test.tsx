/**
 * Testy logiky hromadných úprav (useBulkEdit) nad mocknutou service vrstvou:
 *  - guardy (bez vyhledávání / bez hodnoty pole) nastaví hlášku a nespustí dávku,
 *  - úspěšný běh dávky vyvolá operaci pro každý záznam, nastaví souhrn
 *    a zavolá onBulkEditComplete,
 *  - limit 1000 záznamů dávku zastaví s hláškou tooManyRecords,
 *  - parsování souřadnic předplní Lat/Lon (čisté parsery z valueParsing).
 *
 * `bulkEditApi`/`searchApi`/`recordApi`/`TaxaImportableProvider` jsou mocknuté;
 * runBulkOperationSequential i useConfirm zůstávají reálné.
 */

import {act, cleanup, renderHook} from '@testing-library/react';
import {useState, type ReactNode} from 'react';
import {QueryClientProvider} from '@tanstack/react-query';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {useBulkEdit} from './useBulkEdit';
import {
    fetchRecordEditTimestamps,
    updateDate,
} from '@/services/bulkEditApi';
import {createQueryClient} from '@/query/queryClient';
import type {RecordPladias} from '@/models';
import '@/i18n/i18n';

vi.mock('@/services/bulkEditApi', () => ({
    fetchRecordEditTimestamps: vi.fn(),
    moveCoordinates: vi.fn(),
    updateCoordsPrecision: vi.fn(),
    updateDate: vi.fn(),
    updatePhytochorion: vi.fn(),
    updateLocality: vi.fn(),
    updateNearestTownName: vi.fn(),
    updateSource: vi.fn(),
    updateNote: vi.fn(),
    updateFinder: vi.fn(),
    updateTaxon: vi.fn(),
    updateValidationStatus: vi.fn(),
}));
vi.mock('@/services/searchApi', () => ({
    getPhytochorions: vi.fn(async () => []),
}));
vi.mock('@/services/recordApi', () => ({
    getUnassignedAuthors: vi.fn(async () => []),
}));
vi.mock('@/components/autocomplete/TaxaImportableProvider', () => ({
    createTaxaImportableProvider: vi.fn(() => ({
        loadOptions: vi.fn(),
        minLength: 2,
    })),
}));

const records = [
    {id: 1}, {id: 2},
] as unknown as RecordPladias[];
const searchPayloadEntries = [['taxon', 'Taraxacum']] as Array<[string, FormDataEntryValue]>;

/** Každý renderHook dostane vlastního klienta s produkční konfigurací. */
function QueryClientWrapper({children}: { children?: ReactNode }) {
    const [client] = useState(() => createQueryClient());
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function renderBulkEdit(overrides?: { records?: RecordPladias[]; searchPayloadEntries?: Array<[string, FormDataEntryValue]> }) {
    const onBulkEditComplete = vi.fn();
    const {result} = renderHook(
        () => useBulkEdit({
            records: overrides?.records ?? records,
            searchPayloadEntries: overrides?.searchPayloadEntries ?? searchPayloadEntries,
            onBulkEditComplete,
        }),
        {wrapper: QueryClientWrapper},
    );
    return {result, onBulkEditComplete};
}

afterEach(() => {
    cleanup();
    vi.resetAllMocks();
});

describe('useBulkEdit', () => {
    it('bez výsledků vyhledávání dávka neběží a zobrazí hlášku noRecords', async () => {
        const {result} = renderBulkEdit({records: [], searchPayloadEntries: []});

        act(() => {
            result.current.changeBufferSingle('200');
        });
        await act(async () => {
            await result.current.submitBufferChange();
        });

        expect(result.current.formMessage).toBe('Nejsou k dispozici žádné záznamy pro hromadnou úpravu.');
        expect(fetchRecordEditTimestamps).not.toHaveBeenCalled();
    });

    it('semafor bez vybrané hodnoty vyhlásí chybu pole a dávku nespustí', async () => {
        const {result} = renderBulkEdit();

        await act(async () => {
            await result.current.submitSemafor();
        });

        expect(result.current.semaforError).toBe(true);
        expect(result.current.formMessage).toBe('Vyberte nový semafor.');
        expect(fetchRecordEditTimestamps).not.toHaveBeenCalled();
    });

    it('úspěšná dávka projde všechny záznamy, nastaví souhrn a zavolá onBulkEditComplete', async () => {
        vi.mocked(fetchRecordEditTimestamps).mockResolvedValueOnce([
            {id: 1, lastEditTimestampNum: 100},
            {id: 2, lastEditTimestampNum: 200},
        ]);
        vi.mocked(updateDate).mockResolvedValue(undefined);

        const {result, onBulkEditComplete} = renderBulkEdit();

        act(() => {
            result.current.changeNewDate('2020');
        });
        await act(async () => {
            await result.current.submitDateChange();
        });

        // operace proběhla pro každý záznam postupně
        expect(updateDate).toHaveBeenCalledTimes(2);
        expect(result.current.batchSummary).toEqual({
            operationName: 'Akce (změna data na 2020) připravena.',
            successIds: [1, 2],
            failed: [],
        });
        expect(result.current.formMessage).toContain('Hotovo: 2 úspěšně');
        expect(result.current.isRunning).toBe(false);
        expect(result.current.batchProgress).toEqual({processed: 2, total: 2});
        expect(onBulkEditComplete).toHaveBeenCalledTimes(1);
    });

    it('limit 1000 záznamů dávku zastaví s hláškou tooManyRecords', async () => {
        vi.mocked(fetchRecordEditTimestamps).mockResolvedValueOnce(
            Array.from({length: 1001}, (_, i) => ({id: i + 1, lastEditTimestampNum: 1})),
        );

        const {result} = renderBulkEdit();

        act(() => {
            result.current.changeNewDate('2020');
        });
        await act(async () => {
            await result.current.submitDateChange();
        });

        expect(result.current.formMessage).toContain('Hromadně lze upravit maximálně 1000 záznamů.');
        expect(result.current.batchSummary).toBeNull();
        expect(result.current.isRunning).toBe(false);
        expect(updateDate).not.toHaveBeenCalled();
    });

    it('parseRawCoords předplní Lat/Lon z platných souřadnic', async () => {
        const {result} = renderBulkEdit();

        act(() => {
            result.current.changeRawCoords('50.12345,16.67890');
        });
        act(() => {
            result.current.parseRawCoords();
        });

        expect(result.current.rawCoordsError).toBe('');
        expect(result.current.newLat).toBe('50.12345');
        // formatCoord ořezává koncové nuly
        expect(result.current.newLon).toBe('16.6789');
        expect(result.current.formMessage).toBe('Souřadnice byly předvyplněny do polí Lat/Lon.');
    });

    it('nevalidní souřadnice zobrazí chybu a nic nepředplní', async () => {
        const {result} = renderBulkEdit();

        act(() => {
            result.current.changeRawCoords('abc');
        });
        act(() => {
            result.current.parseRawCoords();
        });

        expect(result.current.rawCoordsError).toBe('Souřadnice nelze automaticky rozparsovat. Použijte formát lat,lon nebo vyplňte Lat/Lon ručně.');
        expect(result.current.newLat).toBe('');
        expect(result.current.newLon).toBe('');
    });
});

