/**
 * MapLayer – layer subscribed to the layer state of the given map.
 *
 * Wraps the Layer dispatcher: it reads the layer visibility from the map's
 * layer state (useLayerState) and passes it to the Layer. Used by maps with
 * a LayerSwitcher; maps with fixed visibility render Layer directly.
 */

import {Layer} from './Layer';
import {useLayerState} from '../store/layerStore';
import type {LayerParams} from '../types';

export interface MapLayerProps {
    layerId: string;
    mapName: string;
    params?: LayerParams;
    onSquareDoubleClick?: (squareId: string) => void;
}

export function MapLayer({layerId, mapName, params, onSquareDoubleClick}: MapLayerProps) {
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
