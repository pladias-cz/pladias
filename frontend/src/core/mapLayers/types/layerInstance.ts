/**
 * Layer Instance Types
 */

import type { LayerParams } from './layerDefinition';

export interface LayerInstance {
    layerId: string;
    params: LayerParams;
    cacheKey?: string;
}

export interface LayerState {
    visible: boolean;
    params: LayerParams;
    title?: string;  // Optional title for dynamic layers (e.g., project layers)
}

export function createLayerInstance(layerId: string, params: LayerParams = {}): LayerInstance {
    const cacheKey = generateCacheKey(layerId, params);
    return { layerId, params, cacheKey };
}

export function generateCacheKey(layerId: string, params: LayerParams): string {
    const paramParts = Object.entries(params)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, value]) => `${key}:${value}`)
        .join(':');
    return paramParts ? `${layerId}:${paramParts}` : layerId;
}
