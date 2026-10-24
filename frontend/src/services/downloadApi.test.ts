import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {downloadDynamicFile, getDownloads} from './downloadApi';
import type {DownloadDto} from '@/models/Download';

/**
 * Testy downloadApi (sekce F.4, krok A.9). Fetch se mockuje přes
 * vi.stubGlobal (vzor apiClient.test.ts).
 */

const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {'Content-Type': 'application/json'},
    });

const fileResponse = (body: string, filename: string) =>
    new Response(body, {
        headers: {
            'Content-Type': 'application/x-download',
            'Content-disposition': `attachment; filename="${filename}"`,
        },
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

describe('getDownloads', () => {
    it('returns the bare download list (no JsonResult envelope)', async () => {
        fetchMock.mockResolvedValue(jsonResponse([
            {description: 'Metodika', manager: 'Pladias', version: '1.0', url: '/files/m.pdf', dynamic: false},
            {
                description: 'Seznam taxonů',
                manager: 'admin',
                version: '1. 1. 2025 (dynamic)',
                url: '/api/react/downloads/taxa',
                dynamic: true
            },
        ]));

        await expect(getDownloads()).resolves.toEqual([
            {description: 'Metodika', manager: 'Pladias', version: '1.0', url: '/files/m.pdf', dynamic: false},
            {
                description: 'Seznam taxonů',
                manager: 'admin',
                version: '1. 1. 2025 (dynamic)',
                url: '/api/react/downloads/taxa',
                dynamic: true
            },
        ]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/downloads', expect.anything());
    });

    it('throws ApiError with fallback message when the response is not an array', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: []}));

        await expect(getDownloads()).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Načtení souborů ke stažení selhalo.',
        });
    });

    it('throws ApiError on HTTP 500', async () => {
        fetchMock.mockResolvedValue(jsonResponse({error: 'boom'}, 500));

        await expect(getDownloads()).rejects.toMatchObject({name: 'ApiError', message: 'boom'});
    });
});

describe('downloadDynamicFile', () => {
    const taxonList: DownloadDto = {
        description: 'Seznam taxonů',
        manager: 'admin',
        version: '1. 1. 2025 (dynamic)',
        url: '/api/react/downloads/taxa',
        dynamic: true,
    };

    it('downloads the xlsx from the dto url and resolves the server filename', async () => {
        fetchMock.mockResolvedValue(fileResponse('xlsx-bytes', 'taxonList.xlsx'));

        const file = await downloadDynamicFile(taxonList);

        expect(file.filename).toBe('taxonList.xlsx');
        expect(await file.blob.text()).toBe('xlsx-bytes');
        expect(fetchMock).toHaveBeenCalledWith('/api/react/downloads/taxa', expect.anything());
    });

    it('throws ApiError with the backend message when the export fails (JSON instead of file)', async () => {
        fetchMock.mockResolvedValue(jsonResponse({error: 'Vygenerování seznamu taxonů se nezdařilo.'}, 500));

        await expect(downloadDynamicFile(taxonList)).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Vygenerování seznamu taxonů se nezdařilo.',
        });
    });

    it('falls back to export.xlsx when Content-disposition carries no filename', async () => {
        fetchMock.mockResolvedValue(new Response('xlsx-bytes', {
            headers: {'Content-Type': 'application/x-download'},
        }));

        const file = await downloadDynamicFile(taxonList);

        expect(file.filename).toBe('export.xlsx');
    });
});

