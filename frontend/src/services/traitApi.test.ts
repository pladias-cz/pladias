import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ApiError} from './apiClient';
import {
    backupTraits,
    deleteTrait,
    downloadTraitAttachment,
    downloadTraitBackup,
    downloadTraitData,
    exportTraitDetails,
    exportTraits,
    getFeature,
    getTraitBackups,
    getTraitDatatypes,
    importTrait,
    setDefaultTrait,
} from './traitApi';

/**
 * Testy traitApi (measurement doména): rozbalování obálek, nestandardní tvary
 * odpovědí mutací (JSON string hlášení, plain text backup, HTTP 200 s
 * `success: false` u setDefault) a POST download komplexního exportu včetně
 * `invalidTaxa`. Fetch se mockuje přes vi.stubGlobal (vzor apiClient.test.ts).
 */

const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {'Content-Type': 'application/json'},
    });

const textResponse = (message: string, status = 200) =>
    new Response(message, {
        status,
        headers: {'Content-Type': 'text/plain'},
    });

const fileResponse = (body: string, filename: string) =>
    new Response(body, {
        status: 200,
        headers: {
            'Content-Type': 'application/x-download',
            'Content-disposition': `attachment; filename=${filename}`,
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

describe('getTraitDatatypes', () => {
    it('returns the datatypes from the JsonResult envelope', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 1, name: 'ordinal'}]}));

        await expect(getTraitDatatypes()).resolves.toEqual([{id: 1, name: 'ordinal'}]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/measurement/datatypes', expect.anything());
    });
});

describe('getFeature', () => {
    it('returns the feature from the envelope', async () => {
        const feature = {id: 3, name: 'Rod', datatype: 1, inheritance: 2};
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: feature}));

        await expect(getFeature(3)).resolves.toEqual(feature);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/measurement/features/3', expect.anything());
    });

    it('throws ApiError with the backend message for a missing feature (400)', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: 'No feature'}, 400));

        await expect(getFeature(42)).rejects.toMatchObject({name: 'ApiError', message: 'No feature'});
    });
});

describe('getTraitBackups', () => {
    it('returns the snapshots from the envelope', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 7, createdAt: '2026-02-09T10:15:30'}]}));

        await expect(getTraitBackups()).resolves.toEqual([{id: 7, createdAt: '2026-02-09T10:15:30'}]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/measurement/backups', expect.anything());
    });
});

describe('backupTraits', () => {
    it('sends the description urlencoded and returns the plain text message', async () => {
        fetchMock.mockResolvedValue(textResponse('Záloha byla započata'));

        await expect(backupTraits('poznámka')).resolves.toBe('Záloha byla započata');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/measurement/backup',
            expect.objectContaining({
                method: 'POST',
                body: new URLSearchParams({description: 'poznámka'}),
                headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
            }),
        );
    });

    it('throws ApiError with the plain text message on HTTP 400', async () => {
        fetchMock.mockResolvedValue(textResponse('K operaci nemáte oprávnění.', 400));

        await expect(backupTraits('poznámka')).rejects.toMatchObject({
            name: 'ApiError',
            message: 'K operaci nemáte oprávnění.',
        });
    });
});

describe('importTrait', () => {
    it('posts the multipart form (no Content-Type, browser adds the boundary) and unwraps the JSON string message', async () => {
        fetchMock.mockResolvedValue(jsonResponse('Import proběhl – 120 záznamů.'));

        const formData = new FormData();
        formData.append('operation', 'import');

        await expect(importTrait(formData)).resolves.toBe('Import proběhl – 120 záznamů.');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/measurement/trait',
            expect.objectContaining({method: 'POST', body: formData}),
        );
        const [, init] = fetchMock.mock.calls[0];
        expect(init?.headers ?? {}).not.toHaveProperty('Content-Type');
    });

    it('throws ApiError with the envelope message on HTTP 400', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: 'Neplatný vstupní soubor'}, 400));

        await expect(importTrait(new FormData())).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Neplatný vstupní soubor',
        });
    });

    it('returns an empty message for a non-string body (defensive)', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await expect(importTrait(new FormData())).resolves.toBe('');
    });
});

describe('deleteTrait', () => {
    it('deletes by id and returns the JSON string message', async () => {
        fetchMock.mockResolvedValue(jsonResponse('Datová řada byla smazána.'));

        await expect(deleteTrait(11)).resolves.toBe('Datová řada byla smazána.');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/measurement/trait/11',
            expect.objectContaining({method: 'DELETE'}),
        );
    });

    it('throws ApiError with the envelope message on HTTP 400', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: 'Řada je odkazovaná z importu'}, 400));

        await expect(deleteTrait(11)).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Řada je odkazovaná z importu',
        });
    });
});

describe('setDefaultTrait', () => {
    it('puts to the default endpoint and resolves on a success envelope', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await expect(setDefaultTrait(11)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/measurement/trait/11/default',
            expect.objectContaining({method: 'PUT'}),
        );
    });

    it('throws on HTTP 200 with success:false (gotcha: failure arrives as 200)', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: 'Vlastnost nemá žádnou datovou řadu'}));

        await expect(setDefaultTrait(11)).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Vlastnost nemá žádnou datovou řadu',
        });
    });
});

describe('exportTraits', () => {
    it('posts the urlencoded form and returns the downloaded file', async () => {
        fetchMock.mockResolvedValue(fileResponse('csv-bytes', 'export-2026-02-09.csv'));

        const params = new URLSearchParams({taxonList: 'Acer campestre\nQuercus robur'});
        const file = await exportTraits(params);

        expect(file.filename).toBe('export-2026-02-09.csv');
        expect(file.contentType).toContain('application/x-download');
        await expect(file.blob.text()).resolves.toBe('csv-bytes');
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/measurement/complexExport',
            expect.objectContaining({method: 'POST', body: params}),
        );
    });

    it('uses the fallback filename when Content-disposition carries no filename', async () => {
        fetchMock.mockResolvedValue(
            new Response('data', {
                headers: {'Content-Type': 'application/octet-stream', 'Content-disposition': 'attachment'},
            }),
        );

        await expect(exportTraits(new URLSearchParams())).resolves.toMatchObject({
            filename: 'complexExport.csv',
        });
    });

    it('throws ApiError with invalidTaxa in the payload when the export is rejected', async () => {
        fetchMock.mockResolvedValue(
            jsonResponse({
                success: false,
                message: 'Některé taxony nebyly nalezeny',
                invalidTaxa: ['Quercus robur', 'Fagus silvatica'],
            }),
        );

        const error: unknown = await exportTraits(new URLSearchParams()).catch((err: unknown) => err);

        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).message).toBe('Některé taxony nebyly nalezeny');
        expect((error as ApiError).payload).toMatchObject({invalidTaxa: ['Quercus robur', 'Fagus silvatica']});
    });
});

describe('downloadTraitData', () => {
    it('downloads the trait data in the given language', async () => {
        fetchMock.mockResolvedValue(fileResponse('xlsx', 'radek_5.xlsx'));

        const file = await downloadTraitData(5, 'en');

        expect(file.filename).toBe('radek_5.xlsx');
        await expect(file.blob.text()).resolves.toBe('xlsx');
        expect(fetchMock).toHaveBeenCalledWith('/api/react/measurement/trait/download/5/lang/en', expect.anything());
    });

    it('defaults to Czech', async () => {
        fetchMock.mockResolvedValue(fileResponse('data', 'radek.xlsx'));

        await downloadTraitData(5);

        expect(fetchMock).toHaveBeenCalledWith('/api/react/measurement/trait/download/5/lang/cs', expect.anything());
    });

    it('translates a legacy plain text error (HTTP 200 without Content-disposition) to ApiError', async () => {
        fetchMock.mockResolvedValue(textResponse('export se nezdaril'));

        await expect(downloadTraitData(5)).rejects.toMatchObject({
            name: 'ApiError',
            message: 'export se nezdaril',
        });
    });
});

describe('downloadTraitAttachment', () => {
    it('downloads the trait attachment', async () => {
        fetchMock.mockResolvedValue(fileResponse('pdf', 'priloha_5.pdf'));

        const file = await downloadTraitAttachment(5);

        expect(file.filename).toBe('priloha_5.pdf');
        expect(fetchMock).toHaveBeenCalledWith('/api/react/measurement/trait/downloadAttachment/5', expect.anything());
    });
});

describe('exportTraitDetails', () => {
    it('downloads the detailed trait export', async () => {
        fetchMock.mockResolvedValue(fileResponse('xlsx', 'detail_5.xlsx'));

        const file = await exportTraitDetails(5);

        expect(file.filename).toBe('detail_5.xlsx');
        expect(fetchMock).toHaveBeenCalledWith('/api/react/measurement/trait/export/5', expect.anything());
    });
});

describe('downloadTraitBackup', () => {
    it('downloads the backup snapshot by id', async () => {
        fetchMock.mockResolvedValue(fileResponse('csv', 'backup.csv'));

        const file = await downloadTraitBackup(7);

        expect(file.filename).toBe('backup.csv');
        expect(fetchMock).toHaveBeenCalledWith('/api/react/measurement/backup/7', expect.anything());
    });
});
