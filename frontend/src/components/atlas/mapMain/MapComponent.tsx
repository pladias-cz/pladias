import { useMemo, useCallback } from 'react';
import { MapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';
import { useNavigate } from 'react-router-dom';

import { useLayerManager, useLayerState, Layer, ProjectLayers, useProjectLayers } from '@/core/mapLayers';
import { LayerSwitcher } from '@/core/mapLayers/components/LayerSwitcher';
import './MapComponent.scss';

interface MapComponentProps {
    mapName?: string;
    center?: [number, number];
    initialZoom?: number;
    taxonId?: number;
}

// Define which layers this map should show and their defaults
const MAP_MAIN_LAYERS = [
    'osm',
    'opentopo',
    'ztm',
    'technical_quadrants',
    'technical_phytochorion',
    'interactive_squares',
    'gbif_quadrants_inaturalist',
    'validation_semafor',
    'validation_common_3',
    'validation_common_2',
    'validation_common_1',
    'gbif_quadrants_other'];
const MAP_MAIN_DEFAULTS: Record<string, boolean> = { osm: true, opentopo: false, technical_quadrants: true, interactive_squares: true, gbif_quadrants_inaturalist: false, gbif_quadrants_other: false };

/**
 * Individual layer component that subscribes to visibility state
 */
function MapLayer({
    layerId,
    mapName,
    params,
    onSquareDoubleClick,
}: {
    layerId: string;
    mapName: string;
    params?: Record<string, any>;
    onSquareDoubleClick?: (squareId: string) => void;
}) {
    const layerState = useLayerState(mapName, layerId);
    const visible = layerState?.visible ?? false;

    return (
        <Layer
            layerId={layerId}
            params={params}
            visible={visible}
            onSquareDoubleClick={onSquareDoubleClick}
        />
    );
}

export function MapComponent({
    mapName = 'mapMain',
    center = [49.5, 15.7],
    initialZoom = 8,
    taxonId,
}: MapComponentProps) {
    const navigate = useNavigate();

    // Get project layers (dynamically loaded based on taxon)
    const { projectLayerIds } = useProjectLayers(mapName, taxonId);

    // Combine static and dynamic layer IDs for the layer switcher
    const allLayerIds = useMemo(() => {
        return [...MAP_MAIN_LAYERS, ...projectLayerIds];
    }, [projectLayerIds]);

    // Initialise static layers with per-component defaults
    useLayerManager(mapName, MAP_MAIN_LAYERS, MAP_MAIN_DEFAULTS);

    // Handle double-click on square - navigate to detail page
    const handleSquareDoubleClick = useCallback((squareId: string) => {
        if (taxonId) {
            navigate(`/atlas/mapDetail/${taxonId}/${squareId}`);
        }
    }, [taxonId, navigate]);

    // No need for useMapLayers - we render Layer components directly
    const mapContext = useMemo(() => (taxonId ? { taxonId } : {}), [taxonId]);

    return (
        <div className="h-100 w-100">
            <MapContainer
                center={center as LatLngExpression}
                zoom={initialZoom}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                key={mapName}
            >
                {/* Render static layers from registry with visibility subscription */}
                {MAP_MAIN_LAYERS.map(layerId => (
                    <MapLayer
                        key={layerId}
                        layerId={layerId}
                        mapName={mapName}
                        params={mapContext}
                        onSquareDoubleClick={layerId === 'interactive_squares' ? handleSquareDoubleClick : undefined}
                    />
                ))}
                
                {/* Dynamic project layers - rendered when taxonId is provided */}
                {taxonId && <ProjectLayers taxonId={taxonId} mapName={mapName} />}
            </MapContainer>
            
            {/* Layer Switcher - Shows all layer groups including dynamic project layers */}
            <LayerSwitcher
                mapName={mapName}
                layerIds={allLayerIds}
                defaultVisibility={MAP_MAIN_DEFAULTS}
            />
        </div>
    );
}

export default MapComponent;
