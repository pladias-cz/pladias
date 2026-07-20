/**
 * useLayerManager Hook
 *
 * Manages layer visibility for a specific map instance.
 * Supports per-component default visibility overrides via `defaultVisibility`.
 * Persists user visibility choices to the backend.
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLayerStore, getVisibilityStorageKey } from '../store/layerStore';
import { useUserSettings } from '@/hooks/useUserSettings';
import { getLayerGroup, layerGroups } from '../registry/layerRegistry';
import type { LayerParams } from '../types';

export interface LayerManagerReturn {
    toggleLayer: (layerId: string) => void;
    setLayerVisible: (layerId: string, visible: boolean) => void;
    isLayerVisible: (layerId: string) => boolean;
    visibleLayers: string[];
    saveState: () => Promise<void>;
    saving: boolean;
}

/**
 * Helper: Find which group a layer belongs to
 */
function findLayerGroup(layerId: string): string | null {
    for (const group of layerGroups) {
        if (group.children?.some(layer => layer.id === layerId)) {
            return group.id;
        }
    }
    // Check if it's a dynamic project layer
    if (layerId.startsWith('project_')) {
        return 'project';
    }
    return null;
}

/**
 * @param mapName        Unique name for this map instance (used as store scope key)
 * @param layerIds       Which layers this map should manage
 * @param defaultVisibility  Per-layer default visibility overrides for THIS component.
 *                           Keys are layer IDs, values are booleans.
 *                           Falls back to `LayerDefinition.defaultVisible` when omitted.
 * @param initialParams  Optional initial params (e.g., taxonId) to apply to all layers
 */
export function useLayerManager(
    mapName: string,
    layerIds?: string[],
    defaultVisibility?: Record<string, boolean>,
    initialParams?: LayerParams,
): LayerManagerReturn {
    const {
        addLayer,
        toggleLayerVisibility,
        setLayerVisibility,
        getVisibleLayers,
        getLayerState,
    } = useLayerStore();

    const { saveSetting } = useUserSettings();
    const [saving, setSaving] = useState(false);
    const initialized = useRef(false);

    // Stabilise the array reference so it doesn't trigger effects every render
    const managedLayers = useMemo(
        () => layerIds ?? ['osm', 'opentopo'],
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [layerIds?.join(',')],
    );

    // Initialise layers & load saved visibility once per map instance
    useEffect(() => {
        if (initialized.current && managedLayers.length > 0) return; // Skip if already initialized with layers
        initialized.current = true;

        // 1. Register each layer with its per-component default visibility and initial params
        managedLayers.forEach(layerId => {
            const visible = defaultVisibility?.[layerId];
            addLayer(mapName, layerId, { 
                visible: visible !== undefined ? visible : true, // Default to true if not specified
                params: initialParams,
            });
        });

        // 2. Load saved visibility from backend (overrides defaults)
        const loadSavedVisibility = async () => {
            try {
                const response = await fetch(
                    `/api/react/user/settings/${getVisibilityStorageKey(mapName)}`,
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.value) {
                        const saved: string[] = JSON.parse(data.value);
                        managedLayers.forEach(layerId => {
                            setLayerVisibility(mapName, layerId, saved.includes(layerId));
                        });
                    } else {
                        // No saved value - apply component defaults
                        managedLayers.forEach(layerId => {
                            const defaultVisible = defaultVisibility?.[layerId];
                            if (defaultVisible !== undefined) {
                                setLayerVisibility(mapName, layerId, defaultVisible);
                            }
                        });
                    }
                } else {
                    // Request failed - apply component defaults
                    managedLayers.forEach(layerId => {
                        const defaultVisible = defaultVisibility?.[layerId];
                        if (defaultVisible !== undefined) {
                            setLayerVisibility(mapName, layerId, defaultVisible);
                        }
                    });
                }
                
                // 3. Ensure mutually exclusive groups have exactly one layer visible
                await ensureMutuallyExclusiveConstraints();
            } catch (error) {
                // Still ensure constraints even if loading failed
                await ensureMutuallyExclusiveConstraints();
            }
        };

        // Helper to ensure mutually exclusive groups have exactly one visible layer
        const ensureMutuallyExclusiveConstraints = async () => {
            // Wait a tick for state to settle
            setTimeout(() => {
                const groupsToCheck = new Set<string>();
                
                // Find all mutually exclusive groups among managed layers
                managedLayers.forEach(layerId => {
                    const groupId = findLayerGroup(layerId);
                    if (groupId) {
                        const group = getLayerGroup(groupId);
                        if (group?.mutuallyExclusive) {
                            groupsToCheck.add(groupId);
                        }
                    }
                });

                // Check each mutually exclusive group
                groupsToCheck.forEach(groupId => {
                    const group = getLayerGroup(groupId);
                    const layersInGroup = (group?.children || [])
                        .map(layer => layer.id)
                        .filter(id => managedLayers.includes(id));

                    const visibleInGroup = layersInGroup.filter(layerId => 
                        getLayerState(mapName, layerId)?.visible
                    );

                    // If no layers are visible, make the first one visible
                    if (visibleInGroup.length === 0 && layersInGroup.length > 0) {
                        setLayerVisibility(mapName, layersInGroup[0], true);
                    }
                    // If multiple layers are visible, keep only the first visible one
                    else if (visibleInGroup.length > 1) {
                        visibleInGroup.slice(1).forEach(layerId => {
                            setLayerVisibility(mapName, layerId, false);
                        });
                    }
                });
            }, 100);
        };

        loadSavedVisibility();
    }, [mapName, managedLayers, defaultVisibility, addLayer, setLayerVisibility, initialParams]);

    // Smart toggle that handles mutually exclusive groups
    const toggleLayer = useCallback((layerId: string) => {
        // Don't require layer definition - allow dynamic layers too
        // Check if layer exists in registry (optional, for debugging)

        const groupId = findLayerGroup(layerId);
        const group = groupId ? getLayerGroup(groupId) : null;
        
        if (group?.mutuallyExclusive) {
            const currentlyVisible = getLayerState(mapName, layerId)?.visible ?? false;
            
            if (currentlyVisible) {
                // Don't allow turning off the last visible layer in a mutually exclusive group
                const layersInGroup = (group.children || [])
                    .map(layer => layer.id)
                    .filter(id => managedLayers.includes(id));
                const visibleInGroup = layersInGroup.filter(id => 
                    getLayerState(mapName, id)?.visible
                );
                
                if (visibleInGroup.length <= 1) {
                    return;
                }
            }
            
            if (!currentlyVisible) {
                // Turn off all other layers in the group first
                const layersInGroup = (group.children || [])
                    .map(layer => layer.id)
                    .filter(id => managedLayers.includes(id) && id !== layerId);
                layersInGroup.forEach(id => {
                    setLayerVisibility(mapName, id, false);
                });
            }
        }
        
        toggleLayerVisibility(mapName, layerId);
    }, [mapName, managedLayers, toggleLayerVisibility, setLayerVisibility, getLayerState]);

    const setLayerVisible = useCallback(
        (layerId: string, visible: boolean) => setLayerVisibility(mapName, layerId, visible),
        [mapName, setLayerVisibility],
    );

    const isLayerVisible = useCallback(
        (layerId: string) => getLayerState(mapName, layerId)?.visible ?? false,
        [mapName, getLayerState],
    );

    const saveState = useCallback(async () => {
        setSaving(true);
        try {
            // Save all visible layers for this map (including dynamic layers like projects)
            const visible = getVisibleLayers(mapName);
            await saveSetting(
                getVisibilityStorageKey(mapName),
                JSON.stringify(visible),
                undefined,
                `atlasLayerVisibility${mapName.charAt(0).toUpperCase() + mapName.slice(1)}`,
            );
        } finally {
            setSaving(false);
        }
    }, [mapName, saveSetting, getVisibleLayers]);

    const visibleLayers = getVisibleLayers(mapName).filter(id => managedLayers.includes(id));

    return {
        toggleLayer,
        setLayerVisible,
        isLayerVisible,
        visibleLayers,
        saveState,
        saving,
    };
}
