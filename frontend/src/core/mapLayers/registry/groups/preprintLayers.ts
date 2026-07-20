/**
 * Preprint Layers
 * 
 * Occurrence data layers showing validated and nonvalidated records.
 * These layers display taxon occurrence points from the PLADIAS database.
 * 
 * Refactored with shared configuration to reduce duplication.
 */

import type { LayerDefinition } from '../../types';

/**
 * Shared radius configuration across zoom levels
 * Change here to update all preprint layers at once
 */
const DEFAULT_RADIUS_BY_ZOOM = {
    1: 1,
    6: 1,
    7: 3,
    8: 6,
    9: 10,
    10: 20,
    11: 40,
    12: 60,
    13: 100, // zoom 13+: 12px radius
} as const;

/**
 * Default style configuration for preprint point layers
 */
const DEFAULT_POINT_STYLE = {
    radius: 6,
    radiusByZoom: DEFAULT_RADIUS_BY_ZOOM,
    weight: 1,
    opacity: 0.9,
} as const;

/**
 * Interface for creating a preprint layer
 * Only requires the unique properties per layer
 */
interface PreprintLayerConfig {
    id: string;
    title: string;
    typeName: string;
    description: string;
    zIndex: number;
    fillColor: string;
    strokeColor: string;
    fillOpacity?: number;  // optional, defaults to 0.8
}

/**
 * Factory function to create a preprint layer with shared defaults
 * @param config - Layer-specific configuration
 * @returns Complete LayerDefinition
 */
function createPreprintLayer(config: PreprintLayerConfig): LayerDefinition {
    return {
        id: config.id,
        title: config.title,
        type: 'wfs',
        service: {
            type: 'geoserver',
            baseUrl: '/geoserver2/public/ows',
            config: {
                service: 'WFS',
                version: '1.0.0',
                typeName: config.typeName,
                outputFormat: 'application/json',
                viewParams: ['TAXON_ID:{taxonId}'],
            },
        },
        defaultVisible: true,
        supportsTaxon: true,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: config.description,
        zIndex: config.zIndex,
        wfsStyle: {
            pointStyle: {
                ...DEFAULT_POINT_STYLE,
                fillColor: config.fillColor,
                color: config.strokeColor,
                fillOpacity: config.fillOpacity ?? 0.8,
            },
        },
    };
}

/**
 * Preprint layer definitions
 * Each layer only specifies its unique properties
 */
export const PREPRINT_LAYERS: LayerDefinition[] = [
    createPreprintLayer({
        id: 'preprint_jisty',
        title: 'Accepted Occurrences',
        typeName: 'public:preprint_jisty',
        description: 'Accepted occurrence records from PLADIAS database',
        zIndex: 10,
        fillColor: '#111111',
        strokeColor: '#111111',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_nejisty',
        title: 'Nonvalidated Occurrences',
        typeName: 'public:preprint_nejisty',
        description: 'Nonvalidated occurrence records from PLADIAS database',
        zIndex: 7,
        fillColor: '#e67e22',
        strokeColor: '#d35400',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_common',
        title: 'Common Threshold Occurrences',
        typeName: 'public:preprint_common',
        description: 'Common threshold quadrants from PLADIAS database',
        zIndex: 6,
        fillColor: '#0000dd',
        strokeColor: '#1111dd',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_common_recent',
        title: 'Preprint Threshold Recent',
        typeName: 'public:preprint_common_recent',
        description: 'Common recent threshold quadrants from PLADIAS database',
        zIndex: 6,
        fillColor: '#111111',
        strokeColor: '#111111',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_common_zanik',
        title: 'Preprint Threshold Historical',
        typeName: 'public:preprint_common_zanik',
        description: 'Common historical threshold quadrants from PLADIAS database',
        zIndex: 5,
        fillColor: '#0000dd',
        strokeColor: '#1111dd',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_herb',
        title: 'Preprint herbarium-based',
        typeName: 'public:preprint_herb',
        description: 'Herbarium supported quadrants from PLADIAS database',
        zIndex: 10,
        fillColor: '#111111',
        strokeColor: '#111111',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_nonherb',
        title: 'Preprint non-herb',
        typeName: 'public:preprint_neherb',
        description: 'Quadrants without herbarium support from PLADIAS database',
        zIndex: 6,
        fillColor: '#eeee00',
        strokeColor: '#111111',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_cultivated',
        title: 'Preprint cultivated',
        typeName: 'public:preprint_pestovany',
        description: 'Cultivated',
        zIndex: 9,
        fillColor: '#eeee00',
        strokeColor: '#111111',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_native',
        title: 'Preprint = native',
        typeName: 'public:preprint_puvodni',
        description: 'Native',
        zIndex: 10,
        fillColor: '#111111',
        strokeColor: '#111111',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_introduced',
        title: 'Preprint = native',
        typeName: 'public:preprint_nepuvodni',
        description: 'Introduced',
        zIndex: 8,
        fillColor: '#aaaaaa',
        strokeColor: '#0a0a0a',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_unknown',
        title: 'Preprint = native',
        typeName: 'public:preprint_neurceny',
        description: 'Not decided',
        zIndex: 7,
        fillColor: '#e67e22',
        strokeColor: '#d35400',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_recent',
        title: 'Preprint = recent',
        typeName: 'public:preprint_recent',
        description: 'Recent occurrence',
        zIndex: 10,
        fillColor: '#111111',
        strokeColor: '#111111',
        fillOpacity: 1,
    }),
    createPreprintLayer({
        id: 'preprint_historical',
        title: 'Preprint = historical',
        typeName: 'public:preprint_zanik',
        description: 'Historical occurrences',
        zIndex: 6,
        fillColor: '#aaaaaa',
        strokeColor: '#0a0a0a',
        fillOpacity: 1,
    }),
];
