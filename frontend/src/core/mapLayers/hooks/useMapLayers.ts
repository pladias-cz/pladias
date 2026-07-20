/**
 * useMapLayers Hook
 *
 * Produces Leaflet TileLayer instances for the visible layers
 * of a given map instance.  Reacts to visibility changes in the
 * scoped Zustand store so layers update automatically.
 */

import { useEffect, useMemo, useRef } from 'react';
import { useLayerStore } from '../store/layerStore';
import { createLayer } from '../factory';
import type { MapContext, LayerState } from '../types';
import type { Layer as LeafletLayer } from 'leaflet';

export interface UseMapLayersReturn {
    layers: LeafletLayer[];
    updateContext: (context: Partial<MapContext>) => void;
}

export function useMapLayers(
    mapName: string,
    defaultContext: Partial<MapContext> = {},
    layerIds?: string[],
): UseMapLayersReturn {
    const {
        getLayerState,
        setMapContext,
    } = useLayerStore();

    // Stabilise the array reference
    const managedLayers = useMemo(
        () => layerIds ?? ['osm', 'opentopo'],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [layerIds?.join(',')],
    );

    // Set mapContext for other consumers
    const prevContextRef = useRef<string>('');
    useEffect(() => {
        if (Object.keys(defaultContext).length === 0) return;
        const contextKey = JSON.stringify(defaultContext);
        if (contextKey !== prevContextRef.current) {
            setMapContext(defaultContext);
            prevContextRef.current = contextKey;
        }
    }, [defaultContext, setMapContext]);

    // Subscribe to the scoped slice so React re-renders on visibility changes
    const mapLayers = useLayerStore(s => s.layers[mapName]);


    const visibleLayerIds = useMemo(() => {
        if (!mapLayers) return [];
        const visible = Object.entries(mapLayers)
            .filter(([id, s]) => s.visible && managedLayers.includes(id))
            .map(([id]) => id);
        return visible;
    }, [mapLayers, managedLayers]);

    const layers = useMemo(() => {
        const result = visibleLayerIds
            .map((layerId): LeafletLayer | null => {
                const layerState = getLayerState(mapName, layerId) as LayerState | undefined;
                if (!layerState) return null;
                try {
                    return createLayer(layerId, layerState.params);
                } catch (error) {
                    console.error(`Failed to create layer ${layerId}:`, error);
                    return null;
                }
            })
            .filter((layer): layer is LeafletLayer => layer !== null);
        
        return result;
    }, [visibleLayerIds, mapName, getLayerState]);

    const updateContext = (context: Partial<MapContext>) => {
        setMapContext(context);
    };

    return {
        layers,
        updateContext,
    };
}
