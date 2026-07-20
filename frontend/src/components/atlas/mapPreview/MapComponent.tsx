import { MapContainer } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { LatLngExpression } from 'leaflet';
import type { MapPreviewType } from '@/pages/atlas/MapPreview';
import { useLayerManager, Layer } from '@/core/mapLayers';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import type { TaxonMapSettings } from '@/components/atlas/taxaList/types';

interface MapComponentProps {
    type?: MapPreviewType;
    taxonId?: number;
}

interface TaxonMapSettingsResponse {
    data: TaxonMapSettings;
}

/**
 * Layer configuration for each map preview type
 * Each type shows a different combination of layers
 * 
 * Note: commonThreshold from taxon settings may affect layer visibility
 * - When commonThreshold is set, it indicates the taxon has common/rare status
 * - This can be used to show/hide certain occurrence layers based on business logic
 */
const MAP_TYPE_LAYERS: Record<MapPreviewType, string[]> = {
    1: [
        'osm',
        'technical_quadrants',
        'interactive_squares',
        'preprint_jisty',
        'preprint_nejisty',
        'preprint_common',
    ],
    2: [
        'osm',
        'technical_quadrants',
        'interactive_squares',
        'preprint_recent',
        'preprint_historical',
        'preprint_nejisty'
    ],
    3: [
        'osm',
        'technical_quadrants',
        'interactive_squares',
        'preprint_cultivated',
        'preprint_native',
        'preprint_introduced',
        'preprint_unknown'
    ],
    4: [
        'osm',
        'interactive_squares',
        'preprint_herb',
        'preprint_nonherb',
        'preprint_nejisty'

    ],
};

/**
 * Default visibility for each layer
 * Base layers always visible, occurrence layers depend on type
 */
const LAYER_DEFAULTS: Record<string, boolean> = { 
    osm: true,
    technical_quadrants: true,
    preprint_nejisty: true,
    preprint_jisty: true,
    preprint_common: true,
};

/**
 * Get layers for the specified map type
 * @param type - Map preview type (1-4)
 * @returns Array of layer IDs for this type
 */
function getLayersForType(type: MapPreviewType): string[] {
    return MAP_TYPE_LAYERS[type] || MAP_TYPE_LAYERS[1];
}

/**
 * Get visibility overrides based on taxon settings
 * @param commonThreshold - Threshold value from taxon settings (null if not set)
 * @param type - Map preview type
 * @returns Object with layer ID as key and visibility as value
 */
function getVisibilityOverrides(
    commonThreshold: number | null | undefined,
    type: MapPreviewType
): Record<string, boolean> {
    const overrides: Record<string, boolean> = {};
    
    // Type 1: Hide preprint_common for taxa without commonThreshold
    if (type === 1 && !commonThreshold) {
        overrides['preprint_common'] = false;
    }
    
    return overrides;
}

export function MapComponent({ type = 1, taxonId }: MapComponentProps) {
    const center: LatLngExpression = [49.8, 15.7];
    const initialZoom = 7.5;
    
    const [mapSettings, setMapSettings] = useState<TaxonMapSettings | null>(null);

    // Fetch taxon map settings when taxonId changes
    useEffect(() => {
        if (!taxonId) {
            setMapSettings(null);
            return;
        }
        
        axios.get<TaxonMapSettingsResponse>(`/api/react/atlas/taxonMapSettings/${taxonId}`)
            .then(response => {
                if (response.data?.data) {
                    setMapSettings(response.data.data);
                }
            })
            .catch(err => {
                console.error('Failed to load taxon map settings:', err);
                setMapSettings(null);
            });
    }, [taxonId]);

    // Get base layers for map type
    const baseLayers = useMemo(() => getLayersForType(type), [type]);
    
    // Get visibility overrides based on taxon settings
    const visibilityOverrides = useMemo(() => {
        if (!mapSettings) {
            return {};
        }
        return getVisibilityOverrides(mapSettings.commonThreshold, type);
    }, [mapSettings, type]);
    
    // Merge default visibility with overrides
    const layerVisibility = useMemo(() => {
        return {
            ...LAYER_DEFAULTS,
            ...visibilityOverrides,
        };
    }, [visibilityOverrides]);
    
    // CRITICAL FIX: Memoize layerParams to prevent WFS layer re-renders
    // Without this, a new object reference triggers WFS layer cleanup/re-fetch
    const layerParams = useMemo(
        () => taxonId !== undefined ? { taxonId } : undefined,
        [taxonId]
    );

    useLayerManager('previewMap', baseLayers, layerVisibility, layerParams);

    return (
        <div className="h-100 w-100">
            <MapContainer
                center={center as LatLngExpression}
                zoom={initialZoom}
                attributionControl={true}
                minZoom={6}
                maxZoom={11}
                scrollWheelZoom={true}
                style={{ height: '100%', width: '100%' }}
                key={String(taxonId ?? 'no-taxon')}
            >
                {/* Render layers from registry - encapsulation preserved */}
                {baseLayers.map(layerId => (
                    <Layer
                        key={layerId}
                        layerId={layerId}
                        params={layerParams}
                        visible={layerVisibility[layerId] ?? true}
                    />
                ))}
            </MapContainer>
        </div>
    );
}
