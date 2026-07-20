/**
 * Layer State Store (Zustand)
 * 
 * Centralized state management for layer visibility and parameters.
 * State is scoped by map name so multiple map instances can have
 * independent visibility for the same layer definition.
 */

import { create } from 'zustand';
import type { LayerState as ILayerState, LayerParams } from '../types';
import { getLayerDefinition } from '../registry/layerRegistry';

/**
 * Nested state: mapName → layerId → LayerState
 */
type ScopedLayers = Record<string, Record<string, ILayerState>>;

interface LayerStoreState {
    layers: ScopedLayers;
    mapContext: {
        taxonId?: number;
        year?: number;
        yearFrom?: number;
        yearTo?: number;
        projectId?: string;
    };
    addLayer: (mapName: string, layerId: string, initialState?: Partial<ILayerState>) => void;
    removeLayer: (mapName: string, layerId: string) => void;
    toggleLayerVisibility: (mapName: string, layerId: string) => void;
    setLayerVisibility: (mapName: string, layerId: string, visible: boolean) => void;
    setLayerParams: (mapName: string, layerId: string, params: LayerParams) => void;
    updateLayerParams: (mapName: string, layerId: string, params: Partial<LayerParams>) => void;
    getVisibleLayers: (mapName: string) => string[];
    getLayerState: (mapName: string, layerId: string) => ILayerState | undefined;
    setMapContext: (context: Partial<LayerStoreState['mapContext']>) => void;
}

export function getVisibilityStorageKey(mapName: string): string {
    return `atlas_layervisibility_${mapName}`;
}

export const useLayerStore = create<LayerStoreState>((set, get) => ({
    layers: {},
    mapContext: {},

    addLayer: (mapName, layerId, initialState = {}) => {
        set(state => {
            const mapLayers = state.layers[mapName] ?? {};
            
            const definition = getLayerDefinition(layerId);
            
            // Start with empty params or provided initialState.params
            const baseParams: LayerParams = { ...(initialState.params ?? {}) };

            // If mapContext has taxonId/year etc., merge them into initial params
            // This ensures layers are created with context values from the start
            const params: LayerParams = {
                ...baseParams,
                ...(state.mapContext.taxonId !== undefined && { taxonId: state.mapContext.taxonId }),
                ...(state.mapContext.year !== undefined && { year: state.mapContext.year }),
                ...(state.mapContext.yearFrom !== undefined && { yearFrom: state.mapContext.yearFrom }),
                ...(state.mapContext.yearTo !== undefined && { yearTo: state.mapContext.yearTo }),
                ...(state.mapContext.projectId !== undefined && { projectId: state.mapContext.projectId }),
            };

            // If layer already exists, preserve its visibility state
            const existing = mapLayers[layerId];
            const layerState = {
                visible: existing?.visible ?? initialState.visible ?? definition?.defaultVisible ?? false,
                params,
                title: initialState.title,
            };

            // If layer already exists, update only title and params (skip if unchanged)
            if (existing) {
                if (existing.title === initialState.title && existing.params === params) {
                    return state; // No change needed
                }
                return {
                    layers: {
                        ...state.layers,
                        [mapName]: {
                            ...mapLayers,
                            [layerId]: { ...existing, ...layerState },
                        },
                    },
                };
            }

            // Layer doesn't exist yet, create it
            return {
                layers: {
                    ...state.layers,
                    [mapName]: {
                        ...mapLayers,
                        [layerId]: layerState,
                    },
                },
            };
        });
    },

    removeLayer: (mapName, layerId) => {
        set(state => {
            const mapLayers = state.layers[mapName];
            if (!mapLayers) return state;
            const { [layerId]: _, ...rest } = mapLayers;
            return { layers: { ...state.layers, [mapName]: rest } };
        });
    },

    toggleLayerVisibility: (mapName, layerId) => {
        set(state => {
            const layer = state.layers[mapName]?.[layerId];
            if (!layer) return state;
            return {
                layers: {
                    ...state.layers,
                    [mapName]: {
                        ...state.layers[mapName],
                        [layerId]: { ...layer, visible: !layer.visible },
                    },
                },
            };
        });
    },

    setLayerVisibility: (mapName, layerId, visible) => {
        set(state => {
            const layer = state.layers[mapName]?.[layerId];
            if (!layer) return state;
            return {
                layers: {
                    ...state.layers,
                    [mapName]: {
                        ...state.layers[mapName],
                        [layerId]: { ...layer, visible },
                    },
                },
            };
        });
    },

    setLayerParams: (mapName, layerId, params) => {
        set(state => {
            const layer = state.layers[mapName]?.[layerId];
            if (!layer) return state;
            return {
                layers: {
                    ...state.layers,
                    [mapName]: {
                        ...state.layers[mapName],
                        [layerId]: { ...layer, params },
                    },
                },
            };
        });
    },

    updateLayerParams: (mapName, layerId, params) => {
        set(state => {
            const layer = state.layers[mapName]?.[layerId];
            if (!layer) return state;
            return {
                layers: {
                    ...state.layers,
                    [mapName]: {
                        ...state.layers[mapName],
                        [layerId]: { ...layer, params: { ...layer.params, ...params } },
                    },
                },
            };
        });
    },

    getVisibleLayers: (mapName) => {
        const mapLayers = get().layers[mapName];
        if (!mapLayers) return [];
        return Object.entries(mapLayers)
            .filter(([, s]) => s.visible)
            .map(([id]) => id);
    },

    getLayerState: (mapName, layerId) => get().layers[mapName]?.[layerId],

    setMapContext: (context) => {
        set(state => ({ mapContext: { ...state.mapContext, ...context } }));
    },
}));

export const useVisibleLayers = (mapName: string) =>
    useLayerStore(s => s.getVisibleLayers(mapName));

export const useLayerState = (mapName: string, layerId: string) =>
    useLayerStore(s => s.getLayerState(mapName, layerId));

export const useAllLayers = (mapName: string) =>
    useLayerStore(s => s.layers[mapName] ?? {});
