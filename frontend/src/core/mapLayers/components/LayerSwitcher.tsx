/**
 * LayerSwitcher Component
 *
 * Přepínač vrstev mapy. Sbalený zabírá jen malou poloprůhlednou ikonku v levém
 * horním rohu mapy; panel se stromem vrstev (skupina → vrstva) se rozbalí při
 * najetí myší, kliknutím na ikonku nebo získáním fokusu a po opuštění myší
 * (fokusem mimo) se vždy zase sbalí. Panel je podmíněně vykreslený, takže
 * sbalený přepínač nezabírá žádnou plochu mapy (dříve zůstával roztáhnutý
 * na výšku skrytého stromu).
 *
 * Podporuje skupiny vrstev:
 * - mutuallyExclusive (radio) – např. Base Maps
 * - ostatní (checkbox) – např. Occurrences, Projects
 * - dynamické vrstvy (project_*) mimo statický registr
 *
 * Skupina s alespoň jednou zapnutou vrstvou je zvýrazněná barvou (obdoba
 * ExportTraitList); jako celek se zaškrtnout nedá.
 */

import { useState, useCallback, useMemo, type FocusEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLayerManager, type LayerDefinition, layerGroups, getLayerDefinition, useLayerStore } from '../index';

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
    const { t } = useTranslation();
    const layerManager = useLayerManager(mapName, layerIds, defaultVisibility);
    const [isExpanded, setIsExpanded] = useState(false);
    // Stavy vrstev dané mapy: titulky dynamických vrstev (project_*) se do store
    // dostanou až asynchronně (useProjectLayers je registruje v effectu), proto
    // hodnotu čteme přímo – musí být i v deps groupItems mema, aby se změna
    // store (nový titulek) projevila v panelu, nejen vyvolala re-render.
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
            // (registered asynchronously by useProjectLayers once projects load)
            const stateTitle = layerStates?.[id]?.title;
            let title: string;

            if (id.startsWith('project_')) {
                // Titulek projektové vrstvy: i18n termín „Projekt“ + název projektu
                // (a počet záznamů) ze stavu vrstvy. Dokud useProjectLayers vrstvu
                // ve store nezaregistrovalo, fallback na ID projektu.
                const name = stateTitle ?? id.replace('project_', '');
                title = `${t('atlas.layerSwitcher.project')} ${name}`;
            } else {
                title = stateTitle ?? id;
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
    }, [layerIds, layerStates, t]);

    const toggleGroup = (groupId: string) => {
        setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const handleLayerToggle = useCallback((layerId: string) => {
        layerManager.toggleLayer(layerId);
        // Auto-save immediately after toggle
        layerManager.saveState();
    }, [layerManager]);

    // Focus zůstal uvnitř přepínače (např. přechod z ikonky do panelu) – panel necháme otevřený.
    const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
        if (event.currentTarget.contains(event.relatedTarget)) return;
        setIsExpanded(false);
    };

    const renderLayerItem = (layer: LayerDefinition, groupId: string, isMutuallyExclusive: boolean = false) => {
        const isVisible = layerManager.isLayerVisible(layer.id);

        return (
            <label
                key={layer.id}
                className={`layer-switcher__layer${isVisible ? ' layer-switcher__layer--selected' : ''}`}
            >
                <input
                    type={isMutuallyExclusive ? 'radio' : 'checkbox'}
                    className="form-check-input"
                    name={isMutuallyExclusive ? `layer-switcher-${mapName}-${groupId}` : undefined}
                    checked={isVisible}
                    onChange={() => handleLayerToggle(layer.id)}
                />
                <span className="layer-switcher__layer-title" title={layer.title}>
                    {layer.title}
                </span>
            </label>
        );
    };

    const renderGroupItem = (group: LayerGroupItem) => {
        const isOpen = openGroups[group.id] ?? group.defaultExpanded ?? false;
        if (group.children.length === 0) return null;

        // Skupina s alespoň jednou zapnutou vrstvou je zvýrazněná barvou
        // (obdoba ExportTraitList); jako celek se zaškrtnout nedá.
        const hasActiveLayer = group.children.some(layer => layerManager.isLayerVisible(layer.id));

        return (
            <div key={group.id} className="layer-switcher__group">
                <button
                    type="button"
                    className={`layer-switcher__group-header${hasActiveLayer ? ' layer-switcher__group-header--selected' : ''}`}
                    onClick={() => toggleGroup(group.id)}
                    aria-expanded={isOpen}
                    title={group.description ?? group.title}
                >
                    <i className="bi bi-chevron-right layer-switcher__chevron" aria-hidden="true"></i>
                    <span className="layer-switcher__group-title">{group.title}</span>
                </button>
                {isOpen && (
                    <div className="layer-switcher__layers">
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
            className={`layer-switcher${isExpanded ? ' layer-switcher--expanded' : ''}`}
            onMouseEnter={() => setIsExpanded(true)}
            onMouseLeave={() => setIsExpanded(false)}
            onFocus={() => setIsExpanded(true)}
            onBlur={handleBlur}
        >
            <button
                type="button"
                className="layer-switcher__toggle"
                onClick={() => setIsExpanded(true)}
                aria-expanded={isExpanded}
                aria-label={t('atlas.layerSwitcher.toggle')}
                title={t('atlas.layerSwitcher.toggle')}
            >
                <i className="bi bi-stack" aria-hidden="true"></i>
            </button>
            {isExpanded && (
                <div className="layer-switcher__panel">
                    {groupItems.map(renderGroupItem)}
                </div>
            )}
        </div>
    );
}

export default LayerSwitcher;
