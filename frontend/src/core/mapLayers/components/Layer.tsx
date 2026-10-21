/**
 * Layer Component
 *
 * Renders a map layer as a React-leaflet component based on layer definition from registry.
 * It is a dispatcher: based on service.type it delegates to a subcomponent
 * (TileLayerView / WmsLayerView / WfsLayerView), which receives a narrowed
 * service configuration – subcomponents therefore don't re-check the ServiceConfig union.
 *
 * IMPORTANT: Layers use a lazy-mount strategy to avoid loading invisible layers:
 * - A layer is only mounted when it becomes visible for the FIRST time, so layers
 *   that are never enabled never issue tile/WFS requests to the backend.
 * - Once mounted, a layer stays mounted even when invisible (using opacity) to
 *   prevent tile request cancellations when toggling visibility.
 */

import { useEffect, useState } from 'react';
import { getLayerDefinition } from '../registry/layerRegistry';
import type { LayerParams } from '../types';
import { SquaresOverlay } from './SquaresOverlay';
import { TileLayerView } from './layers/TileLayerView';
import { WmsLayerView } from './layers/WmsLayerView';
import { WfsLayerView } from './layers/WfsLayerView';

export interface LayerProps {
    layerId: string;
    params?: LayerParams;
    visible?: boolean;
    onSquareDoubleClick?: (squareId: string) => void;
}

/**
 * Render a layer from the registry as a react-leaflet component
 * Always keeps the layer mounted to prevent tile cancellations
 */
export function Layer({ layerId, params = {}, visible = true, onSquareDoubleClick }: LayerProps) {
    // Lazy mount: create the layer only once it has been visible for the first time.
    // Hidden layers therefore never load tiles/data from the backend. After the first
    // activation the layer stays mounted (hidden via opacity) so toggling visibility
    // back and forth never cancels or re-issues tile requests.
    const [mounted, setMounted] = useState(visible);
    useEffect(() => {
        if (visible) setMounted(true);
    }, [visible]);

    if (!mounted) {
        return null;
    }

    const definition = getLayerDefinition(layerId);

    if (!definition || !definition.service) {
        console.warn(`Layer definition not found: ${layerId}`);
        return null;
    }

    // Handle different service types
    switch (definition.service.type) {
        case 'tile':
            return (
                <TileLayerView
                    service={definition.service}
                    zIndex={definition.zIndex}
                    attribution={definition.attribution}
                    visible={visible}
                />
            );
        case 'geoserver': {
            const service = definition.service;
            if (service.config.service === 'WMS') {
                return (
                    <WmsLayerView
                        service={service}
                        zIndex={definition.zIndex}
                        attribution={definition.attribution}
                        params={params}
                        visible={visible}
                    />
                );
            }
            if (service.config.service === 'WFS') {
                // Check if this is the interactive squares layer with custom component
                if (definition.customComponent === 'SquaresOverlay') {
                    return <SquaresOverlay visible={visible} params={params} onSquareDoubleClick={onSquareDoubleClick} />;
                }
                return (
                    <WfsLayerView
                        id={definition.id}
                        service={service}
                        zIndex={definition.zIndex}
                        wfsStyle={definition.wfsStyle}
                        params={params}
                        visible={visible}
                    />
                );
            }
            // Handle other geoserver services if needed
            return null;
        }
        default:
            console.warn(`Unsupported service type: ${definition.service.type}`);
            return null;
    }
}

export default Layer;
