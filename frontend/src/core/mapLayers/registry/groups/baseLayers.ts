/**
 * Base Layers
 * 
 * Foundational base map layers for the atlas mapping feature.
 * These are the underlying map tiles that provide geographic context.
 */

import type { LayerDefinition } from '../../types';

export const BASE_LAYERS: LayerDefinition[] = [
    {
        id: 'osm',
        title: 'OpenStreetMap',
        type: 'tile',
        service: {
            type: 'tile',
            baseUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            config: {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                subdomains: ['a', 'b', 'c'],
                detectRetina: true,
            }
        },
        defaultVisible: true,
        zIndex: 1,
        supportsTaxon: false,
        supportsYear: false,
        description: 'Standard OpenStreetMap tile layer',
    },
    {
        id: 'opentopo',
        title: 'OpenTopoMap',
        type: 'tile',
        service: {
            type: 'tile',
            baseUrl: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
            config: {
                maxZoom: 17,
                attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a> contributors',
                detectRetina: true,
            }
        },
        defaultVisible: false,
        zIndex: 2,
        supportsTaxon: false,
        supportsYear: false,
        description: 'Topographic map layer based on SRTM data',
    },
    {
        id: 'ztm',
        title: 'ZTM',
        type: 'tile',
        service: {
            type: 'tile',
            baseUrl: 'https://ags.cuzk.gov.cz/arcgis1/rest/services/ZTM_WM/MapServer/tile/{z}/{y}/{x}?blankTile=false',
            config: {
                maxZoom: 23,
                attribution: '&copy; ČUZK',
                detectRetina: true,
            }
        },
        defaultVisible: false,
        zIndex: 2,
        supportsTaxon: false,
        supportsYear: false,
        description: 'Topographic map layer based on ČUZK data',
    },
];
