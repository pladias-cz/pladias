/**
 * Layer Definition Types
 * 
 * Core interfaces for defining map layers in the enterprise layer stack architecture.
 * These definitions are independent of any specific map rendering library.
 */

import type { MapContext } from './mapContext';

/**
 * Supported layer types based on GIS protocols
 */
export type LayerType = 'wms' | 'wfs' | 'geojson' | 'tile';

/**
 * Supported GIS data source adapters
 */
export type LayerSource = 'atlas' | 'pladias' | 'gbif' | 'opentopo' | 'osm';

/**
 * Parameter keys that can be applied to layers
 */
export interface LayerParams {
    taxonId?: number;
    squareCode?: number;
    year?: number;
    yearFrom?: number;
    yearTo?: number;
    projectId?: string;
    quadrants?: string[];
    /** Bounding box for spatial filtering (WFS layers) */
    bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
    [key: string]: string | number | string[] | { north: number; south: number; east: number; west: number } | undefined;
}

import type { ServiceConfig } from './serviceConfig';

/**
 * WFS layer styling options
 */
export interface WfsStyleOptions {
    /** Style for point features */
    pointStyle?: {
        radius?: number;
        /** Radius at different zoom levels (zoom: radius) */
        radiusByZoom?: Record<number, number>;
        fillColor?: string;
        color?: string;
        weight?: number;
        opacity?: number;
        fillOpacity?: number;
    };
    /** Style for line/polygon features */
    pathStyle?: L.PathOptions;
    /** Custom pointToLayer function override */
    pointToLayer?: (feature: GeoJSON.Feature, latlng: L.LatLngExpression) => L.Layer;
    /** Custom style function for paths */
    style?: (feature: GeoJSON.Feature) => L.PathOptions;
    /** Function called when each feature is added */
    onEachFeature?: (feature: GeoJSON.Feature, layer: L.Layer) => void;
}

/**
 * Base layer definition interface
 * This is the single source of truth for all available layers
 */
export interface LayerDefinition {
    /** Unique identifier for the layer */
    id: string;
    
    /** Human-readable title (can be i18n key) */
    title: string;
    
    /** Type of GIS protocol used */
    type: LayerType;
    
    /** DEPRECATED: Use service.type instead */
    source?: LayerSource;
    
    /** NEW: Service configuration (replaces hard-coded URLs) */
    service?: ServiceConfig;
    
    /** Parent group ID for hierarchical organization */
    parentId?: string;
    
    /** Whether this layer supports taxon filtering */
    supportsTaxon: boolean;
    
    /** Whether this layer supports year filtering */
    supportsYear: boolean;
    
    /** Default visibility state */
    defaultVisible: boolean;
    
    /** Z-index for layer stacking order */
    zIndex: number;
    
    /** Attribution text for the layer */
    attribution?: string;
    
    /** Optional description */
    description?: string;
    
    /** Optional WFS styling options (for WFS type layers) */
    wfsStyle?: WfsStyleOptions;
    
    /** Optional custom component name for special rendering (e.g., 'SquaresOverlay') */
    customComponent?: string;
}

/**
 * Group definition for hierarchical layer organization
 */
export interface LayerGroup {
    id: string;
    title: string;
    description?: string;
    children: Array<LayerGroup | LayerDefinition>;
    defaultExpanded?: boolean;
    /** If true, only one layer in this group can be active at a time (radio behavior) */
    mutuallyExclusive?: boolean;
}

/**
 * Utility type to get a layer definition by ID from a registry
 */
export type LayerRegistry = Record<string, LayerDefinition>;

/**
 * Function type for deriving layer parameters from map context
 */
export type ParamDeriver = (context: MapContext) => Partial<LayerParams>;
