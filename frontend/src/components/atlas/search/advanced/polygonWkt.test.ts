/**
 * Testy převodu polygonu na WKT a zpět (filtr „je v polygonu"): uzavřený
 * prstenec s opačným pořadím souřadnic (Leaflet [lat, lon] ↔ WKT (lon lat)),
 * validace minimálního počtu vrcholů a nevalidních vstupů.
 */

import {describe, expect, it} from 'vitest';
import {polygonToWkt, wktToPolygon, type PolygonPoint} from './polygonWkt';

describe('polygonWkt', () => {
    it('sestaví uzavřený prstenec WKT s pořadím lon lat', () => {
        const points: PolygonPoint[] = [[49.5, 14.1], [49.6, 14.2], [49.4, 14.3]];

        expect(polygonToWkt(points)).toBe(
            'POLYGON ((14.100000 49.500000, 14.200000 49.600000, 14.300000 49.400000, 14.100000 49.500000))',
        );
    });

    it('méně než tři vrcholy → null', () => {
        expect(polygonToWkt([[49.5, 14.1], [49.6, 14.2]])).toBeNull();
        expect(polygonToWkt([])).toBeNull();
    });

    it('zpětný parse vrací body [lat, lon] bez uzavíracího duplikátu', () => {
        expect(wktToPolygon('POLYGON ((14.1 49.5, 14.2 49.6, 14.3 49.4, 14.1 49.5))'))
            .toEqual([[49.5, 14.1], [49.6, 14.2], [49.4, 14.3]]);
    });

    it('kruhový převod body → WKT → body zachová vrcholy', () => {
        const points: PolygonPoint[] = [[49.8, 15.1], [49.9, 15.2], [49.7, 15.3], [49.6, 15.2]];

        expect(wktToPolygon(polygonToWkt(points) ?? '')).toEqual(points);
    });

    it('nevalidní WKT → null', () => {
        expect(wktToPolygon('')).toBeNull();
        expect(wktToPolygon('POINT (14.1 49.5)')).toBeNull();
        expect(wktToPolygon('POLYGON ((14.1 49.5, 14.2 49.6, 14.1 49.5))')).toBeNull(); // neuzavřený prstenec
        expect(wktToPolygon('POLYGON ((14.1 49.5, 14.2 49.6, 14.3 49.4, 14.1 49.6))')).toBeNull(); // první != poslední
        expect(wktToPolygon('POLYGON ((14.1 49.5, 14.2, 14.3 49.4, 14.1 49.5))')).toBeNull(); // rozbité páry
    });
});