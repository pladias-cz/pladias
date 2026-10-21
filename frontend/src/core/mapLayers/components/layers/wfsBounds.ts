/**
 * Pure helpers for working with WFS layer bbox.
 *
 * They are extracted from the WfsLayerView component so that they can be tested
 * without React/leaflet DOM and the component itself stays readable.
 *
 * Bbox carries a buffer of ~30 % of the view extent – it reduces the number
 * of WFS reloads when moving the map (reload happens only after crossing
 * a significant-change threshold).
 */

import type * as L from 'leaflet';

/**
 * Calculates bbox with buffer to avoid frequent reloads.
 * Buffer is approximately 30% of the current view extent.
 * Returns the bbox in EPSG:4326 format for GeoServer:
 * minLon,minLat,maxLon,maxLat,CRS:EPSG:4326
 */
export function getBboxWithBuffer(map: L.Map): string | null {
    const bounds = map.getBounds();
    if (!bounds) return null;

    const southWest = bounds.getSouthWest();
    const northEast = bounds.getNorthEast();

    // Calculate center and extent
    const latCenter = (southWest.lat + northEast.lat) / 2;
    const lngCenter = (southWest.lng + northEast.lng) / 2;
    const latExtent = northEast.lat - southWest.lat;
    const lngExtent = northEast.lng - southWest.lng;

    // Add 30% buffer on each side (total 60% increase in each dimension)
    const bufferFactor = 1.3;
    const bufferedLatExtent = latExtent * bufferFactor;
    const bufferedLngExtent = lngExtent * bufferFactor;

    // Calculate buffered bounds
    const bufferedSouth = latCenter - bufferedLatExtent / 2;
    const bufferedNorth = latCenter + bufferedLatExtent / 2;
    const bufferedWest = lngCenter - bufferedLngExtent / 2;
    const bufferedEast = lngCenter + bufferedLngExtent / 2;

    // Clamp to valid ranges
    const clampedSouth = Math.max(-90, Math.min(90, bufferedSouth));
    const clampedNorth = Math.max(-90, Math.min(90, bufferedNorth));
    const clampedWest = Math.max(-180, Math.min(180, bufferedWest));
    const clampedEast = Math.max(-180, Math.min(180, bufferedEast));

    // Return bbox in EPSG:4326 format for GeoServer
    // Format: minLon,minLat,maxLon,maxLat,CRS:EPSG:4326
    return `${clampedWest.toFixed(6)},${clampedSouth.toFixed(6)},${clampedEast.toFixed(6)},${clampedNorth.toFixed(6)},EPSG:4326`;
}

/**
 * Check if bounds have changed significantly enough to warrant a reload.
 * Uses a threshold to avoid reloading on tiny movements.
 */
export function shouldReloadBbox(oldBbox: string, newBbox: string): boolean {
    const oldCoords = oldBbox.split(',').slice(0, 4).map(Number);
    const newCoords = newBbox.split(',').slice(0, 4).map(Number);

    // Check if any coordinate changed by more than ~0.1 degrees (~11km)
    const threshold = 0.1;
    for (let i = 0; i < 4; i++) {
        if (Math.abs(newCoords[i] - oldCoords[i]) > threshold) {
            return true;
        }
    }

    return false;
}
