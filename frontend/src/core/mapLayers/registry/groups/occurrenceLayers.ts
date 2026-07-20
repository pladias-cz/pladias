/**
 * Occurrence Layers
 * 
 * Additional taxon occurrence data layers beyond preprint.
 * Includes grid cells, temporal distributions, and other occurrence visualizations.
 */

import type { LayerDefinition } from '../../types';

export const OCCURRENCE_LAYERS: LayerDefinition[] = [
    // Grid cells by time period
    {
        id: 'validation_semafor',
        title: 'Semafor',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: '/geoserver/validation/wms',
            config: {
                service: 'WMS',
                version: '1.1.1',
                layers: 'validation:taxon_per_quadrant',
                transparent: true,
                viewParams: ['TAXON_ID:{taxonId}'],
               //cqlFilter: 'year BETWEEN {yearFrom} AND {yearTo}',
            }
        },
        defaultVisible: false,
        zIndex: 8,
        supportsTaxon: true,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: 'Grid cells showing semafor',
    },
    {
        id: 'validation_common_1',
        title: 'Quadrant with minimal 1 nonrevised',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: '/geoserver/validation/wms',
            config: {
                service: 'WMS',
                version: '1.3.0',
                layers: 'validation:taxon_quadrant_count_1',
                transparent: true,
                viewParams: ['TAXON_ID:{taxonId}'],
            }
        },
        defaultVisible: false,
        zIndex: 8,
        supportsTaxon: true,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: 'Grid cells showing semafor',
    },
    {
        id: 'validation_common_2',
        title: 'Quadrant with minimal 2 nonrevised',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: '/geoserver/validation/wms',
            config: {
                service: 'WMS',
                version: '1.3.0',
                layers: 'validation:taxon_quadrant_count_2',
                transparent: true,
                viewParams: ['TAXON_ID:{taxonId}'],
            }
        },
        defaultVisible: false,
        zIndex: 8,
        supportsTaxon: true,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: 'Grid cells showing semafor',
    },
    {
        id: 'validation_common_3',
        title: 'Quadrant with minimal 3 nonrevised',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: '/geoserver/validation/wms',
            config: {
                service: 'WMS',
                version: '1.3.0',
                layers: 'validation:taxon_quadrant_count_3',
                transparent: true,
                viewParams: ['TAXON_ID:{taxonId}'],
            }
        },
        defaultVisible: false,
        zIndex: 8,
        supportsTaxon: true,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: 'Grid cells showing semafor',
    },

];
