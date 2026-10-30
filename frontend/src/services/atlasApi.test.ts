import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    getNearbyExternalRecords,
    getNearbyExternalRecordsBySources,
    getNearbyPladiasRecords,
    getRecordsWithComments,
    getSquareExternalRecords,
    getSquareExternalRecordsBySources,
    getSquarePladiasRecords,
} from './atlasApi';

/**
 * Testy atlasApi (sekce F.4, krok A.3): rozbalování obálky záznamů mapového
 * detailu, doplnění diskriminátoru `project` u externích záznamů, konverze
 * lastEditTimestamp na lastEditTimestampNum a `data.records` u záznamů s
 * komentáři. Fetch se mockuje přes vi.stubGlobal (vzor apiClient.test.ts).
 */

const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {'Content-Type': 'application/json'},
    });

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('getNearbyPladiasRecords', () => {
    it('returns the minimal records for the map from the envelope', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 1, latitude: 50.1}]}));

        await expect(getNearbyPladiasRecords('6152', 5)).resolves.toEqual([{id: 1, latitude: 50.1}]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlas/records/6152/5/pladias', expect.anything());
    });

    it('throws ApiError with the backend message on HTTP 400', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, error: 'Invalid square'}, 400));

        await expect(getNearbyPladiasRecords('XXXX', 5)).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Invalid square',
        });
    });
});

describe('getNearbyExternalRecords', () => {
    it('adds the project discriminator to gbif records', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 11, latitude: 50.1}]}));

        await expect(getNearbyExternalRecords('6152', 5, 'gbif')).resolves.toEqual([
            {id: 11, latitude: 50.1, project: 'gbif'},
        ]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlas/records/6152/5/gbif', expect.anything());
    });

    it('adds the project discriminator to inaturalist records', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 12}]}));

        await expect(getNearbyExternalRecords('6152', 5, 'inaturalist')).resolves.toEqual([{
            id: 12,
            project: 'inaturalist'
        }]);
    });
});

describe('getSquarePladiasRecords', () => {
    it('returns table records and converts lastEditTimestamp to ms', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            data: [{id: 1, lastEditTimestamp: '2026-02-09T10:00:00Z'}],
        }));

        const records = await getSquarePladiasRecords('6152', 5);

        expect(records).toEqual([{
            id: 1,
            lastEditTimestamp: '2026-02-09T10:00:00Z',
            lastEditTimestampNum: Date.parse('2026-02-09T10:00:00Z')
        }]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlas/records-square/6152/5/pladias', expect.anything());
    });

    it('keeps lastEditTimestampNum at 0 when the record has no timestamp', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 2}]}));

        await expect(getSquarePladiasRecords('6152', 5)).resolves.toEqual([{id: 2, lastEditTimestampNum: 0}]);
    });
});

describe('getSquareExternalRecords', () => {
    it('adds the project discriminator to square gbif records', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 13, squareCode: '6152'}]}));

        await expect(getSquareExternalRecords('6152', 5, 'gbif')).resolves.toEqual([
            {id: 13, squareCode: '6152', project: 'gbif'},
        ]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlas/records-square/6152/5/gbif', expect.anything());
    });
});

describe('getNearbyExternalRecordsBySources', () => {
    it('stáhne jen nakonfigurované zdroje a nedostupné doplní prázdnými poli', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 21}]}));

        await expect(getNearbyExternalRecordsBySources('6152', 5, ['inaturalist'])).resolves.toEqual({
            gbif: [],
            inaturalist: [{id: 21, project: 'inaturalist'}],
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlas/records/6152/5/inaturalist', expect.anything());
    });

    it('bez zdrojů nevolá žádný endpoint a vrací prázdná pole', async () => {
        await expect(getNearbyExternalRecordsBySources('6152', 5, [])).resolves.toEqual({
            gbif: [],
            inaturalist: [],
        });
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe('getSquareExternalRecordsBySources', () => {
    it('stáhne oba dostupné zdroje souběžně pod svými klíči', async () => {
        // nová Response pro každé volání – paralelní requesty nesdílejí body
        fetchMock.mockImplementation(async () => jsonResponse({success: true, data: [{id: 22}]}));

        await expect(getSquareExternalRecordsBySources('6152', 5, ['gbif', 'inaturalist'])).resolves.toEqual({
            gbif: [{id: 22, project: 'gbif'}],
            inaturalist: [{id: 22, project: 'inaturalist'}],
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlas/records-square/6152/5/gbif', expect.anything());
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlas/records-square/6152/5/inaturalist', expect.anything());
    });
});

describe('getRecordsWithComments', () => {
    it('returns data.records from the search envelope', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: {records: [{id: 1}, {id: 2}]}}));

        await expect(getRecordsWithComments()).resolves.toEqual([{id: 1}, {id: 2}]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlas/search/records-with-comments', expect.anything());
    });

    it('returns an empty list when data.records is missing', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: {}}));

        await expect(getRecordsWithComments()).resolves.toEqual([]);
    });

    it('throws ApiError with the backend message on HTTP 400', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, error: 'User not authorized to view comments'}, 400));

        await expect(getRecordsWithComments()).rejects.toMatchObject({
            name: 'ApiError',
            message: 'User not authorized to view comments',
        });
    });
});
