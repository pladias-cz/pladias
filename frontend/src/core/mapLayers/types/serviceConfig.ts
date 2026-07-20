/**
 * Service Configuration Types
 * 
 * These types define how to build requests for different service types.
 * This enables a configuration-driven approach instead of hard-coded adapters.
 */

import type { LayerParams } from './layerDefinition';

/**
 * Base interface for all service configurations
 */
export interface BaseServiceConfig {
    type: 'geoserver' | 'tile' | 'api' | 'static';
    baseUrl: string;  // URL template with parameter substitution: "/geoserver?taxon={taxonId}"
}

/**
 * GeoServer service configuration (WMS/WFS)
 */
export interface GeoServerConfig extends BaseServiceConfig {
    type: 'geoserver';
    config: {
        service: 'WMS' | 'WFS';
        version?: string;           // Default: '1.0.0' for WFS, '1.1.1' for WMS
        typeName?: string;          // e.g., "public:preprint_jisty"
        layers?: string;            // e.g., "public:grid_cells" or "taxon:{taxonId}"
        outputFormat?: string;      // e.g., "application/json", "image/png"
        format?: string;            // e.g., "image/png" for WMS
        viewParams?: string[];      // e.g., ["TAXON_ID:{taxonId}", "YEAR:{year}"]
        cqlFilter?: string;         // e.g., "year BETWEEN {yearFrom} AND {yearTo}"
        styles?: string;            // e.g., "default", "highlight"
        transparent?: boolean;      // For WMS layers
        srs?: string;               // Spatial reference system
        bbox?: string;              // Bounding box template
        width?: number;             // Image width for WMS
        height?: number;            // Image height for WMS
    };
}

/**
 * Tile service configuration (XYZ tiles)
 */
export interface TileConfig extends BaseServiceConfig {
    type: 'tile';
    config: {
        maxZoom?: number;
        minZoom?: number;
        tileSize?: number;
        attribution?: string;
        subdomains?: string[];      // e.g., ["a", "b", "c"]
        detectRetina?: boolean;
        crossOrigin?: boolean | string;
        errorTileUrl?: string;
    };
}

/**
 * REST API service configuration
 */
export interface ApiConfig extends BaseServiceConfig {
    type: 'api';
    config: {
        method?: 'GET' | 'POST';
        queryParams?: Record<string, string>;   // e.g., {"format": "json", "limit": "1000"}
        headers?: Record<string, string>;       // e.g., {"Authorization": "Bearer {token}"}
        body?: string;              // Request body template for POST
        responseFormat?: 'geojson' | 'json' | 'xml';
        dataPath?: string;          // JSONPath to extract features from response
    };
}

/**
 * Static file service configuration
 */
export interface StaticConfig extends BaseServiceConfig {
    type: 'static';
    config: {
        format: 'geojson' | 'topojson' | 'kml';
        attribution?: string;
    };
}

/**
 * Union type for all service configurations
 */
export type ServiceConfig = GeoServerConfig | TileConfig | ApiConfig | StaticConfig;

/**
 * Helper type to extract config type based on service type
 */
export type ServiceConfigType<T extends ServiceConfig['type']> = 
    T extends 'geoserver' ? GeoServerConfig :
    T extends 'tile' ? TileConfig :
    T extends 'api' ? ApiConfig :
    T extends 'static' ? StaticConfig :
    never;

/**
 * Parameter interpolation function type
 */
export type ParameterInterpolator = (template: string, params: LayerParams) => string;

/**
 * Layer creation result
 */
export interface LayerCreationResult {
    layer: L.Layer;
    metadata?: {
        actualUrl?: string;
        queryParams?: Record<string, unknown>;
        serviceType?: string;
    };
}