/**
 * General Layers
 * 
 * Administrative boundaries, grids, and other general reference layers.
 * These layers provide geographic context and administrative divisions.
 */

import type { LayerDefinition } from '../../types';

export const GENERAL_LAYERS: LayerDefinition[] = [
    {
        id: 'technical_quadrants',
        title: 'Grid (quadrants)',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: 'https://geoserver.ibot.cas.cz/common/ows',
            config: {
                service: 'WMS',
                version: '1.3.0',
                layers: 'common:quadrants',
                transparent: true,
                format: 'image/png',
            }
        },
        defaultVisible: true,
        zIndex: 5,
        supportsTaxon: false,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: 'Technical quadrant grid overlay',
    },
    {
        id: 'technical_squares',
        title: 'Grid (squares)',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: 'https://geoserver.ibot.cas.cz/common/ows',
            config: {
                service: 'WMS',
                version: '1.3.0',
                layers: 'common:squares',
                transparent: true,
                format: 'image/png',
            }
        },
        defaultVisible: true,
        zIndex: 5,
        supportsTaxon: false,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: 'Technical square grid overlay',
    },
    {
        id: 'technical_phytochorion',
        title: 'Phytochorions',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: 'https://geoserver.ibot.cas.cz/common/ows',
            config: {
                service: 'WMS',
                version: '1.3.0',
                layers: 'common:phytochorions',
                transparent: true,
                format: 'image/png',
            }
        },
        defaultVisible: false,
        zIndex: 5,
        supportsTaxon: false,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: 'Technical phytochorion overlay',
    },
    {
        id: 'technical_square',
        title: 'Grid (single square)',
        type: 'wms',
        service: {
            type: 'geoserver',
            baseUrl: 'https://geoserver.ibot.cas.cz/common/ows',
            config: {
                service: 'WMS',
                version: '1.3.0',
                layers: 'common:square',
                transparent: true,
                format: 'image/png',
                viewParams: ['SQUARE:{squareCode}'],
            }
        },
        defaultVisible: true,
        zIndex: 5,
        supportsTaxon: false,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: 'Technical square grid overlay',
    },
    {
        id: 'interactive_squares',
        title: 'Grid (squares) - Interactive',
        type: 'wfs',
        service: {
            type: 'geoserver',
            baseUrl: 'https://geoserver.ibot.cas.cz/common/ows',
            config: {
                service: 'WFS',
                version: '1.0.0',
                typeName: 'common:squares',
                outputFormat: 'application/json',
            }
        },
        defaultVisible: true,
        zIndex: 12,
        supportsTaxon: false,
        supportsYear: false,
        attribution: 'PLADIAS contributors',
        description: 'Interactive square grid with hover/click support',
        customComponent: 'SquaresOverlay',
    },
];
