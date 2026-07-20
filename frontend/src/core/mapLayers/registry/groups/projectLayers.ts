/**
 * Project Layers
 * 
 * Dynamic WMS layers showing taxon occurrences filtered by specific projects.
 * These layers are created dynamically based on the projects that have records for the current taxon.
 * 
 * Note: Project layers are rendered via the ProjectLayers component which fetches
 * project data from the API and creates WMS layers dynamically.
 */

import type { LayerDefinition } from '../../types';

/**
 * Base template for project layers
 * This is used as a reference for dynamically created project layers
 */
export const PROJECT_LAYER_TEMPLATE: Omit<LayerDefinition, 'id' | 'title'> = {
    type: 'wms',
    service: {
        type: 'geoserver',
        baseUrl: 'https://geoserver.ibot.cas.cz/validation/ows',
        config: {
            service: 'WMS',
            version: '1.3.0',
            layers: 'validation:project_per_quadrant',
            transparent: true,
            format: 'image/png',
        }
    },
    defaultVisible: true,
    supportsTaxon: true,
    supportsYear: false,
    attribution: 'PLADIAS contributors',
    description: 'Project-based occurrence data',
    zIndex: 9,
};

/**
 * Static placeholder layer definition for project layers group
 * The actual project layers are created dynamically by the ProjectLayers component
 */
export const PROJECT_LAYERS: LayerDefinition[] = [
    {
        id: 'project_placeholder',
        title: 'Project Layers (Dynamic)',
        ...PROJECT_LAYER_TEMPLATE,
        description: 'Dynamic project layers - actual layers are created based on taxon projects',
    },
];
