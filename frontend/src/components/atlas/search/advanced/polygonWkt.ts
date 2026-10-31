/**
 * Převod nakresleného polygonu na WKT a zpět pro filtr „je v polygonu".
 * Body držíme v pořadí Leafletu [lat, lon]; WKT používá (lon lat) a uzavřený
 * prstenec (první bod se opakuje jako poslední). SRID 4326 (WGS84) – stejné
 * jako coords_wgs záznamů na backendu.
 */

/** Vrchol polygonu v pořadí Leafletu [lat, lon]. */
export type PolygonPoint = [number, number];

/** minimum vrcholů polygonu */
export const MIN_POLYGON_POINTS = 3;

/** Body → WKT (uzavřený prstenec, 6 desetinných míst); méně než 3 vrcholy → null. */
export function polygonToWkt(points: readonly PolygonPoint[]): string | null {
    if (points.length < MIN_POLYGON_POINTS) {
        return null;
    }
    const ring = [...points, points[0]];
    const coordinates = ring.map(([lat, lon]) => `${lon.toFixed(6)} ${lat.toFixed(6)}`);
    return `POLYGON ((${coordinates.join(', ')}))`;
}

/** WKT → body [lat, lon] bez uzavíracího duplikátu; nevalidní vstup → null. */
export function wktToPolygon(wkt: string): PolygonPoint[] | null {
    const match = /^POLYGON \(\((.+)\)\)$/.exec(wkt.trim());
    if (match == null) {
        return null;
    }
    const pairs = match[1].split(',').map((token) => token.trim().split(/\s+/));
    if (pairs.some((pair) => pair.length !== 2 || pair.some((value) => Number.isNaN(Number(value))))) {
        return null;
    }
    // WKT (lon lat) → [lat, lon]; poslední pár musí být uzavírací duplikát prvního
    const points: PolygonPoint[] = pairs.map(([lon, lat]) => [Number(lat), Number(lon)]);
    if (points.length < MIN_POLYGON_POINTS + 1) {
        return null;
    }
    const first = points[0];
    const last = points[points.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
        return null;
    }
    return points.slice(0, -1);
}