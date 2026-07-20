/**
 * Layer Registry
 * 
 * Central registry containing all available layer definitions.
 * This is the single source of truth for map layers.
 * 
 * Map components should NEVER contain hardcoded layer URLs -
 * they should only reference layers by ID from this registry.
 * 
 * Layer groups are organized in separate files under ./groups/
 */

import type { LayerDefinition, LayerGroup, LayerRegistry } from '../types';
import { BASE_LAYERS, PREPRINT_LAYERS, OCCURRENCE_LAYERS, GENERAL_LAYERS, PROJECT_LAYERS, GBIF_LAYERS } from './groups';

/**
 * Complete layer registry - single source of truth
 * Combines all layer groups into a single registry object
 */
export const layerRegistry: LayerRegistry = {
    ...BASE_LAYERS.reduce((acc, layer) => ({ ...acc, [layer.id]: layer }), {} as LayerRegistry),
    ...PREPRINT_LAYERS.reduce((acc, layer) => ({ ...acc, [layer.id]: layer }), {} as LayerRegistry),
    ...OCCURRENCE_LAYERS.reduce((acc, layer) => ({ ...acc, [layer.id]: layer }), {} as LayerRegistry),
    ...GENERAL_LAYERS.reduce((acc, layer) => ({ ...acc, [layer.id]: layer }), {} as LayerRegistry),
    ...PROJECT_LAYERS.reduce((acc, layer) => ({ ...acc, [layer.id]: layer }), {} as LayerRegistry),
    ...GBIF_LAYERS.reduce((acc, layer) => ({ ...acc, [layer.id]: layer }), {} as LayerRegistry),
};

/**
 * Hierarchical layer group structure for the layer manager UI
 */
export const layerGroups: LayerGroup[] = [
    {
        id: 'baseMaps',
        title: 'Base Maps',
        description: 'Foundation map layers',
        defaultExpanded: false,
        mutuallyExclusive: true,
        children: BASE_LAYERS,
    },
    {
        id: 'preprint',
        title: 'Preprint',
        description: 'Preview for map revisors',
        defaultExpanded: false,
        children: PREPRINT_LAYERS,
    },
    {
        id: 'occurrences',
        title: 'Occurrences (grid)',
        description: 'Taxon occurrence data and visualizations',
        defaultExpanded: false,
        children: OCCURRENCE_LAYERS,
    },
    {
        id: 'project',
        title: 'Projects',
        description: 'Project-based occurrence data',
        defaultExpanded: false,
        children: PROJECT_LAYERS,
    },
    {
        id: 'general',
        title: 'General',
        description: 'Boundaries, grids, and reference layers',
        defaultExpanded: false,
        children: GENERAL_LAYERS,
    },
    {
        id: 'gbif',
        title: 'GBIF',
        description: 'GBIF occurrence data',
        defaultExpanded: false,
        children: GBIF_LAYERS,
    },
];

/**
 * Get a layer definition by ID
 * @param layerId - The unique identifier of the layer
 * @returns The layer definition or undefined if not found
 */
export function getLayerDefinition(layerId: string): LayerDefinition | undefined {
    return layerRegistry[layerId];
}

/**
 * Get all layer definitions
 * @returns Array of all layer definitions
 */
export function getAllLayerDefinitions(): LayerDefinition[] {
    return Object.values(layerRegistry);
}

/**
 * Get layers by source type
 * @param source - The layer source to filter by
 * @returns Array of layer definitions from that source
 */
export function getLayersBySource(source: string): LayerDefinition[] {
    return Object.values(layerRegistry).filter(layer => layer.source === source);
}

/**
 * Check if a layer exists in the registry
 * @param layerId - The layer ID to check
 * @returns True if the layer exists
 */
export function hasLayer(layerId: string): boolean {
    return layerId in layerRegistry;
}

/**
 * Get a layer group by ID
 * @param groupId - The group ID to find
 * @returns The layer group or undefined if not found
 */
export function getLayerGroup(groupId: string): LayerGroup | undefined {
    return layerGroups.find(group => group.id === groupId);
}

/**
 * Get all layer groups
 * @returns Array of all layer groups
 */
export function getAllLayerGroups(): LayerGroup[] {
    return layerGroups;
}

// Re-export layer groups for direct access
export { BASE_LAYERS, PREPRINT_LAYERS, OCCURRENCE_LAYERS, GENERAL_LAYERS, PROJECT_LAYERS, GBIF_LAYERS };
