import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {fetchWfsGeoJson} from './mapApi';

/**
 * Testy mapApi (sekce F.4, krok A.5): WFS GeoJSON se neparsuje přes obálku
 * (GeoServer), jen se kontroluje HTTP status. Fetch se mockuje přes
 * vi.stubGlobal (vzor apiClient.test.ts).
 */

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('fetchWfsGeoJson', () => {
    it('returns the parsed GeoJSON on success', async () => {
        fetchMock.mockResolvedValue(new Response(
            JSON.stringify({type: 'FeatureCollection', features: [{type: 'Feature'}]}),
            {headers: {'Content-Type': 'application/json'}},
        ));

        const data = await fetchWfsGeoJson('/geoserver/wfs?service=WFS');

        expect(data).toEqual({type: 'FeatureCollection', features: [{type: 'Feature'}]});
        expect(fetchMock).toHaveBeenCalledWith('/geoserver/wfs?service=WFS', {signal: undefined});
    });

    it('throws with the HTTP status when GeoServer fails', async () => {
        fetchMock.mockResolvedValue(new Response('ows exception', {status: 500}));

        await expect(fetchWfsGeoJson('/geoserver/wfs')).rejects.toThrow('WFS request failed: HTTP 500');
    });

    it('passes the abort signal through to fetch', async () => {
        fetchMock.mockResolvedValue(new Response('{}', {headers: {'Content-Type': 'application/json'}}));
        const controller = new AbortController();

        await fetchWfsGeoJson('/geoserver/wfs', controller.signal);

        const [, init] = fetchMock.mock.calls[0];
        expect(init?.signal).toBe(controller.signal);
    });
});
