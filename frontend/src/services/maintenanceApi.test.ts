import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {createMaintenanceMessage, deleteMaintenanceMessage, getMaintenanceMessages} from './maintenanceApi';

/**
 * Testy maintenanceApi (sekce F.4): rozbalování obálky JsonResult u seznamu,
 * vytvoření a smazání zprávy o údržbě (public.maintenance).
 * Fetch se mockuje přes vi.stubGlobal (vzor apiClient.test.ts).
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

describe('getMaintenanceMessages', () => {
    it('returns all maintenance messages', async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            data: [
                {id: 1, type: 'warning', text: 'Právě probíhá údržba.'},
                {id: 2, type: 'info', text: 'Plánovaná odstávka.'},
            ],
        }));

        await expect(getMaintenanceMessages()).resolves.toEqual([
            {id: 1, type: 'warning', text: 'Právě probíhá údržba.'},
            {id: 2, type: 'info', text: 'Plánovaná odstávka.'},
        ]);
        expect(fetchMock).toHaveBeenCalledWith('/api/react/maintenance/all', expect.anything());
    });

    it('propagates HTTP errors', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: 'Forbidden'}, 403));

        await expect(getMaintenanceMessages()).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Forbidden',
        });
    });
});

describe('createMaintenanceMessage', () => {
    it('posts the new message', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: 'Maintenance message created'}));

        await expect(createMaintenanceMessage({type: 'danger', text: 'Výpadek databáze.'})).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/maintenance',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({type: 'danger', text: 'Výpadek databáze.'}),
            }),
        );
    });

    it('propagates validation errors', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: 'Invalid type'}, 400));

        await expect(createMaintenanceMessage({type: 'purple', text: 'x'})).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Invalid type',
        });
    });
});

describe('deleteMaintenanceMessage', () => {
    it('deletes the message by id', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: 'Maintenance message deleted'}));

        await expect(deleteMaintenanceMessage(7)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            '/api/react/maintenance/7',
            expect.objectContaining({method: 'DELETE'}),
        );
    });

    it('propagates not-found errors', async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: 'Maintenance message not found'}, 404));

        await expect(deleteMaintenanceMessage(42)).rejects.toMatchObject({
            name: 'ApiError',
            message: 'Maintenance message not found',
        });
    });
});
