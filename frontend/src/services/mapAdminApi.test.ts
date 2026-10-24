import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {
    assignProjectToUser,
    assignUserTaxon,
    getPublicationStatuses,
    getRevisionStatuses,
    removeProjectFromUser,
    removeUserTaxonFromUser,
} from './mapAdminApi';

/**
 * Testy mapAdminApi (sekce F.4, krok A.8): obálky stavových číselníků,
 * urlencoded tělo assignUserTaxon a neúspěch mutací práv přes HTTP status
 * (MapReportsController posílá `{error}` bez obálky). Fetch se mockuje přes
 * vi.stubGlobal (vzor apiClient.test.ts).
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

describe('status options', () => {
    it('returns revision statuses from the envelope', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 1, description: 'Nový', priority: 1}]}));

        await expect(getRevisionStatuses()).resolves.toEqual([{id: 1, description: 'Nový', priority: 1}]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlasadmin/revision-statuses', expect.anything());
    });

    it('returns publication statuses from the envelope', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 2, priority: 2}]}));

        await expect(getPublicationStatuses()).resolves.toEqual([{id: 2, priority: 2}]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/atlasadmin/publication-statuses', expect.anything());
    });
});

describe('project rights', () => {
    it('assigns a project with a JSON body', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: ''}));

        await expect(assignProjectToUser(5, 3)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/atlasadmin/users/5/projects',
            expect.objectContaining({method: 'POST', body: JSON.stringify({projectId: 3})}),
        );
    });

    it('removes a project and resolves on success', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: ''}));

        await expect(removeProjectFromUser(5, 3)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/atlasadmin/users/5/projects/3',
            expect.objectContaining({method: 'DELETE'}),
        );
    });

    it('throws ApiError with the backend error field on HTTP 400', async () => {
        fetchMock.mockResolvedValue(jsonResponse({error: 'userOrProjectNotFound'}, 400));

        await expect(assignProjectToUser(5, 3)).rejects.toMatchObject({
            name: 'ApiError',
            message: 'userOrProjectNotFound',
        });
    });
});

describe('taxon rights', () => {
    it('assigns a taxon with an urlencoded body', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: ''}));

        await expect(assignUserTaxon(5, 9)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/atlasadmin/assignUserTaxon',
            expect.objectContaining({
                method: 'POST',
                body: new URLSearchParams({user: '5', taxon: '9'}),
                headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'},
            }),
        );
    });

    it('removes a taxon from a user', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: ''}));

        await expect(removeUserTaxonFromUser(5, 9)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/atlasadmin/removeUserTaxon/user/5/taxon/9',
            expect.objectContaining({method: 'DELETE'}),
        );
    });

    it('throws ApiError with the message from an error-only body (MapReportsController)', async () => {
        fetchMock.mockResolvedValue(jsonResponse({error: 'not allowed'}, 400));

        await expect(assignUserTaxon(5, 9)).rejects.toMatchObject({
            name: 'ApiError',
            message: 'not allowed',
        });
    });
});
