/**
 * Enterprise Layer Stack Architecture
 * 
 * Central export for all layer management functionality.
 * 
 * Architecture Flow:
 * Layer Registry → Layer State Store → Layer Factory → Source Adapters → Leaflet Renderer
 * 
 * Usage:
 * ```typescript
 * import { createLayer, useLayerManager, useProjectLayers } from '@/core/mapLayers';
 * 
 * // In a React component
 * const { toggleLayer, visibleLayers } = useLayerManager('mapMain');
 * const { projectLayerIds } = useProjectLayers('mapMain', taxonId);
 * ```
 */

// Types
export type {
    LayerType,
    LayerSource,
    LayerParams,
    LayerDefinition,
    LayerGroup,
    LayerRegistry,
    MapType,
    MapContext,
    LayerInstance,
    LayerState,
} from './types';

export { createMapContext, createLayerInstance, generateCacheKey } from './types';

// Registry
export {
    layerRegistry,
    layerGroups,
    BASE_LAYERS,
    PREPRINT_LAYERS,
    OCCURRENCE_LAYERS,
    GENERAL_LAYERS,
    PROJECT_LAYERS,
    getLayerDefinition,
    getAllLayerDefinitions,
    getLayersBySource,
    hasLayer,
    getLayerGroup,
    getAllLayerGroups,
} from './registry/layerRegistry';

// Factory
export {
    createLayer,
    createLayerFromContext,
    createLayers,
    removeLayerFromCache,
    clearLayerCache,
    getCacheStats,
} from './factory';

// Store
export {
    useLayerStore,
    useVisibleLayers,
    useLayerState,
    useAllLayers,
    getVisibilityStorageKey,
} from './store/layerStore';

// Hooks
export { useLayerManager, useMapLayers, useProjectLayers } from './hooks';

// Cache
export { layerCache, LayerCache } from './cache/layerCache';

// Adapters
export { BaseLayerAdapter } from './factory/adapters';
export { UniversalLayerAdapter } from './factory/adapters/universalAdapter';

// Components
export { LayerSwitcher, Layer, SquaresOverlay, ProjectLayers } from './components';
