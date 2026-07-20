/**
 * GBIF Layers
 * 
 * Global Biodiversity Information Facility occurrence data layers.
 * These layers display taxon occurrence records from the GBIF database.
 */

import type { LayerDefinition } from '../../types';

export const GBIF_LAYERS: LayerDefinition[] = [
    {
        id: 'gbif_quadrants_inaturalist',
        title: 'iNaturalist via GBIF',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: 'https://geoserver.ibot.cas.cz/public/ows',
            config: {
                service: 'WMS',
                version: '1.3.0',
                layers: 'shared:gbif_quadrants_inaturalist',
                transparent: true,
                viewParams: ['TAXON_ID:{taxonId}'],
            }
        },
        defaultVisible: false,
        zIndex: 7,
        supportsTaxon: true,
        supportsYear: false,
        attribution: '© iNaturalist contributors',
        description: 'Occurrence records from GBIF database',
    },
    {
        id: 'gbif_quadrants_other',
        title: 'GBIF except iNaturalist',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: 'https://geoserver.ibot.cas.cz/public/ows',
            config: {
                service: 'WMS',
                version: '1.3.0',
                layers: 'shared:gbif_quadrants_other',
                transparent: true,
                viewParams: ['TAXON_ID:{taxonId}'],
            }
        },
        defaultVisible: false,
        zIndex: 6,
        supportsTaxon: true,
        supportsYear: false,
        attribution: '© GBIF contributors',
        description: 'Grid cells showing GBIF occurrence density',
    },
];
