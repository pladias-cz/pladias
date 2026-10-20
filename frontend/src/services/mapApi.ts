/**
 * Mapové vrstvy – WFS/GeoJSON dotazy na GeoServer (mapLayers registry →
 * factory → adaptery, SquaresOverlay). Nejde o endpoint backendu: odpověď je
 * GeoJSON bez `JsonResult` obálky, session ani 401/403 handshake, proto se
 * nepoužívá apiClient. Jediné místo, kde se WFS dotazy posílají a typují.
 */

/** Stažení GeoJSON dat z WFS endpointu (GeoServer). */
export async function fetchWfsGeoJson<T = GeoJSON.FeatureCollection>(url: string, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, {signal});

    if (!response.ok) {
        throw new Error(`WFS request failed: HTTP ${response.status} ${response.statusText}`);
    }

    return await response.json() as T;
}
