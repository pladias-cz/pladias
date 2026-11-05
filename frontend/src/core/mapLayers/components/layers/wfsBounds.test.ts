import {describe, it, expect} from 'vitest';
import * as L from 'leaflet';
import {getBboxWithBuffer, shouldReloadBbox} from './wfsBounds';

/** Mapa s pevnými hranicemi – netřeba reálné DOM/leaflet rozhraní */
function mapWithBounds(west: number, south: number, east: number, north: number): L.Map {
    return {getBounds: () => L.latLngBounds([south, west], [north, east])} as unknown as L.Map;
}

describe('getBboxWithBuffer', () => {
    it('vrátí bbox s ~30% bufferem ve formátu pro GeoServer', () => {
        const map = mapWithBounds(13.5, 49.5, 14.5, 50.5);
        // extent 1°, buffer 1.3 → rozsah ±0.65° od středu
        expect(getBboxWithBuffer(map)).toBe('13.350000,49.350000,14.650000,50.650000,EPSG:4326');
    });

    it('ořízne souřadnice na platné rozsahy lat/lng', () => {
        const map = mapWithBounds(179.5, 89.5, 180.0, 90.0);
        // sever 90.075 → 90, východ 180.075 → 180
        expect(getBboxWithBuffer(map)).toBe('179.425000,89.425000,180.000000,90.000000,EPSG:4326');
    });
});

describe('shouldReloadBbox', () => {
    const base = '13.350000,49.350000,14.650000,50.650000,EPSG:4326';

    it('vrátí false pro identický bbox', () => {
        expect(shouldReloadBbox(base, base)).toBe(false);
    });

    it('vrátí false pro posun pod prahem (~0.1°)', () => {
        const shifted = '13.400000,49.350000,14.650000,50.650000,EPSG:4326';
        expect(shouldReloadBbox(base, shifted)).toBe(false);
    });

    it('vrátí true pro posun nad prahem', () => {
        const shifted = '13.500000,49.350000,14.650000,50.650000,EPSG:4326';
        expect(shouldReloadBbox(base, shifted)).toBe(true);
    });
});
