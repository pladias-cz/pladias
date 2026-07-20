/**
 * Layer Factory
 */

import L from 'leaflet';
import type { LayerParams, MapContext } from '../types';
import { getLayerDefinition } from '../registry/layerRegistry';
import { layerCache } from '../cache/layerCache';
import { UniversalLayerAdapter } from './adapters/universalAdapter';

const adapters = {
    universal: new UniversalLayerAdapter(),
};

const defaultAdapter = adapters.universal;

export function createLayer(
    layerId: string,
    params: LayerParams = {}
): L.Layer | null {
    const cacheKey = generateCacheKey(layerId, params);
    const cached = layerCache.get(cacheKey);
    
    if (cached) {
        return cached;
    }
    
    const definition = getLayerDefinition(layerId);
    
    if (!definition) {
        console.warn(`Layer definition not found: ${layerId}`);
        return null;
    }
    
    const adapter = defaultAdapter;  // Always use UniversalLayerAdapter now
    const layer = adapter.createLayer(definition, params);
    
    layerCache.set(cacheKey, layer);
    
    return layer;
}

export function createLayerFromContext(
    layerId: string,
    context: MapContext
): L.Layer | null {
    const params: LayerParams = {};
    
    if (context.taxonId) params.taxonId = context.taxonId;
    if (context.year) params.year = context.year;
    else if (context.yearFrom || context.yearTo) {
        params.yearFrom = context.yearFrom;
        params.yearTo = context.yearTo;
    }
    if (context.projectId) params.projectId = context.projectId;
    
    return createLayer(layerId, params);
}

export function createLayers(
    layerIds: string[],
    params: LayerParams = {}
): L.Layer[] {
    return layerIds
        .map(id => createLayer(id, params))
        .filter((layer): layer is L.Layer => layer !== null);
}

export function removeLayerFromCache(layerId: string, params: LayerParams = {}): void {
    const cacheKey = generateCacheKey(layerId, params);
    layerCache.remove(cacheKey);
}

export function clearLayerCache(): void {
    layerCache.clear();
}

export function getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
} {
    return layerCache.getStats();
}

function generateCacheKey(layerId: string, params: LayerParams): string {
    const paramParts = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join(':');
    
    return paramParts ? `${layerId}:${paramParts}` : layerId;
}

// Removed getAdapterForSource - now using universal adapter for everything

export default {
    createLayer,
    createLayerFromContext,
    createLayers,
    removeLayerFromCache,
    clearLayerCache,
    getCacheStats,
};
