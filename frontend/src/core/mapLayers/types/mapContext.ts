/**
 * Map Context Types
 * 
 * Defines the context in which layers are rendered.
 * This allows the layer factory to derive parameters automatically.
 */

/**
 * Types of map views in the application
 */
export type MapType = 'mainMap' | 'previewMap' | 'detailMap' | 'recordMap';

/**
 * Map context provides runtime information about the current map view
 * The layer factory uses this to derive layer parameters automatically
 */
export interface MapContext {
    /** Type of map view */
    mapType: MapType;
    
    /** Currently selected taxon ID (if applicable) */
    taxonId?: number;
    
    /** Year filter (single year) */
    year?: number;
    
    /** Year range filters */
    yearFrom?: number;
    yearTo?: number;
    
    /** Quadrant/grid ID for detail maps */
    quadrantId?: string;
    
    /** List of quadrant IDs for multi-quadrant views */
    quadrantIds?: string[];
    
    /** Project filter ID */
    projectId?: string;
    
    /** Center coordinates for the map */
    center?: [number, number];
    
    /** Current zoom level */
    zoom?: number;
    
    /** Bounding box (for future use) */
    bounds?: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
}

/**
 * Helper function to create a map context with defaults
 */
export function createMapContext(overrides: Partial<MapContext>): MapContext {
    return {
        mapType: 'mainMap',
        ...overrides,
    };
}
