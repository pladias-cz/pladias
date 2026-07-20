/**
 * LayerSwitcher Component - Redesigned with Bootstrap 5
 * 
 * Supports multiple groups:
 * - mutuallyExclusive groups (radio buttons) - e.g., Base Maps
 * - non-mutuallyExclusive groups (checkboxes) - e.g., Administrative, Occurrences, Projects
 * 
 * Also supports dynamic layers (e.g., project layers) that are not in the static registry.
 */

import { useState, useCallback, useMemo } from 'react';
import { useLayerManager, type LayerDefinition, layerGroups, getLayerDefinition, useLayerStore } from '../index';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { FiLayers } from 'react-icons/fi';

interface LayerSwitcherProps {
    mapName: string;
    layerIds?: string[];
    defaultVisibility?: Record<string, boolean>;
}

interface LayerGroupItem {
    id: string;
    title: string;
    description?: string;
    children: LayerDefinition[];
    mutuallyExclusive?: boolean;
    defaultExpanded?: boolean;
}

export function LayerSwitcher({ mapName, layerIds, defaultVisibility }: LayerSwitcherProps) {
    const layerManager = useLayerManager(mapName, layerIds, defaultVisibility);
    const [isExpanded, setIsExpanded] = useState(false);
    const getLayerState = useLayerStore(state => state.getLayerState);
    // Subscribe to layer states to trigger re-render when title updates
    const layerStates = useLayerStore(state => state.layers[mapName]);
    
    // Initialize open groups based on layerGroups config
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        layerGroups.forEach(group => {
            initial[group.id] = group.defaultExpanded ?? false;
        });
        return initial;
    });

    // Build groups based on requested layer IDs and layerGroups structure
    const groupItems = useMemo(() => {
        if (!layerIds || layerIds.length === 0) return [];

        // Create a map of layerId -> groupId by iterating through layerGroups
        const layerToGroupMap = new Map<string, string>();
        layerGroups.forEach(group => {
            group.children?.forEach(layer => {
                layerToGroupMap.set(layer.id, group.id);
            });
        });

        // Build layer definitions, handling both static and dynamic layers
        const layersToShow: LayerDefinition[] = layerIds.map(id => {
            // Try to get from registry first
            const staticDef = getLayerDefinition(id);
            if (staticDef) return staticDef;
            
            // For dynamic layers (e.g., project_*), get title from layer state
            const layerState = getLayerState(mapName, id);
            let title = layerState?.title;
            
            // Fallback: derive title from ID
            if (!title && id.startsWith('project_')) {
                const projectId = id.replace('project_', '');
                title = `Projddect ${projectId}`;
            } else if (!title) {
                title = id;
            }
            
            // Create minimal layer definition for dynamic layers
            // Only display properties - actual rendering is handled by ProjectLayers component
            return {
                id,
                title,
                type: 'wms',
                service: {
                    type: 'geoserver',
                    baseUrl: '',
                    config: {
                        service: 'WMS',
                        version: '1.3.0',
                        layers: '',
                        transparent: true,
                        format: 'image/png',
                    }
                },
                defaultVisible: true,
                supportsTaxon: false,
                supportsYear: false,
                attribution: '',
                description: 'Dynamic project layer',
                zIndex: 9,
            };
        });

        // Group layers by their assigned group
        const groupsMap = new Map<string, LayerDefinition[]>();
        
        for (const layer of layersToShow) {
            let groupId = layerToGroupMap.get(layer.id);
            
            // Assign dynamic project layers to 'project' group
            if (!groupId && layer.id.startsWith('project_')) {
                groupId = 'project';
            }
            
            groupId = groupId || 'other';
            const existing = groupsMap.get(groupId) || [];
            existing.push(layer);
            groupsMap.set(groupId, existing);
        }

        // Build final group items with metadata from layerGroups
        return Array.from(groupsMap.entries())
            .map(([id, children]) => {
                const group = layerGroups.find(g => g.id === id);
                return {
                    id,
                    title: group?.title || id,
                    description: group?.description,
                    children,
                    mutuallyExclusive: group?.mutuallyExclusive ?? false,
                    defaultExpanded: group?.defaultExpanded ?? false,
                };
            })
            .filter(group => group.children.length > 0); // Only show groups with layers
    }, [layerIds, mapName, getLayerState, layerStates]);

    const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const handleLayerToggle = useCallback((layerId: string) => {
        layerManager.toggleLayer(layerId);
        // Auto-save immediately after toggle
        layerManager.saveState();
    }, [layerManager]);

    const renderLayerItem = (layer: LayerDefinition, groupId: string, isMutuallyExclusive: boolean = false) => {
        const isVisible = layerManager.isLayerVisible(layer.id);
        const inputType = isMutuallyExclusive ? "radio" : "checkbox";
        const groupName = isMutuallyExclusive ? `group-${groupId}` : undefined;

        return (
            <div key={layer.id} className="d-flex align-items-center gap-2 py-2 border-bottom border-light-subtle">
                <div className="form-check mb-0" style={{ minWidth: '24px' }}>
                    <input
                        type={inputType}
                        className="form-check-input"
                        id={`layer-${layer.id}`}
                        name={groupName}
                        checked={isVisible}
                        onChange={() => handleLayerToggle(layer.id)}
                        style={{ cursor: 'pointer' }}
                    />
                </div>
                <label 
                    htmlFor={`layer-${layer.id}`} 
                    className="flex-grow-1 mb-0 small text-truncate"
                    style={{ cursor: 'pointer', fontSize: '12px' }}
                    title={layer.title}
                >
                    {layer.title}
                </label>
            </div>
        );
    };

    const renderGroupItem = (group: LayerGroupItem) => {
        const isOpen = openGroups[group.id] ?? group.defaultExpanded ?? false;
        if (group.children.length === 0) return null;

        return (
            <div key={group.id} className="layer-group border rounded mb-2 overflow-hidden">
                <div 
                    className="layer-group-header d-flex align-items-center px-3 py-2 bg-light"
                    onClick={() => toggleGroup(group.id)}
                    style={{ cursor: 'pointer' }}
                >
                    <span className={`group-arrow me-2 ${isOpen ? 'open' : ''}`}>
                        <FaChevronRight size={10} />
                    </span>
                    <span className="group-title small fw-semibold">{group.title}</span>
                </div>
                {isOpen && (
                    <div className="layer-group-content px-2">
                        {group.children.map(layer => 
                            renderLayerItem(layer, group.id, group.mutuallyExclusive)
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div
            className={`layer-switcher shadow-sm ${isExpanded ? 'expanded' : 'collapsed'}`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
        >
            <div 
                className="layer-switcher-toggle d-flex align-items-center justify-content-center"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {isExpanded ? <FaChevronLeft size={14} /> : <FiLayers size={16} />}
            </div>
            <div className="layer-switcher-content">
                <h6 className="layer-switcher-title small fw-bold">Map Layers</h6>
                <div className="layer-switcher-groups">
                    {groupItems.map(renderGroupItem)}
                </div>
            </div>
        </div>
    );
}

export default LayerSwitcher;
