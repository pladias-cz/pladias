/**
 * TileLayerView – renders XYZ tile layer from TileConfig in the layer registry.
 *
 * It is a thin wrapper over the react-leaflet TileLayer: it only maps
 * the registry config to props and keeps the layer mounted even when
 * invisible (visibility is handled via opacity) to prevent tile request
 * cancellations when toggling visibility.
 */

import {TileLayer} from 'react-leaflet';
import type {CrossOrigin} from 'leaflet';
import type {TileConfig} from '../../types/serviceConfig';

export interface TileLayerViewProps {
    /** Service configuration – the dispatcher in Layer.tsx guarantees type: 'tile' */
    service: TileConfig;
    /** zIndex from layer definition for proper stacking */
    zIndex: number;
    /** Attribution text from layer definition */
    attribution?: string;
    /** Visibility – the layer stays mounted, it only hides via opacity */
    visible: boolean;
}

export function TileLayerView({service, zIndex, attribution, visible}: TileLayerViewProps) {
    const config = service.config;

    // Build TileLayer props - only include defined values
    const tileProps: React.ComponentProps<typeof TileLayer> = {
        url: service.baseUrl,
        maxZoom: config.maxZoom,
        minZoom: config.minZoom,
        attribution: config.attribution || attribution,
        // Keep layer mounted but hide with opacity to prevent tile cancellations
        opacity: visible ? 1 : 0,
        // Use zIndex from definition for proper stacking
        zIndex: zIndex,
    };

    // Only add optional props if they have valid values
    if (config.subdomains && config.subdomains.length > 0) {
        tileProps.subdomains = config.subdomains;
    }

    if (config.detectRetina !== undefined) {
        tileProps.detectRetina = config.detectRetina;
    }

    if (config.crossOrigin !== undefined) {
        tileProps.crossOrigin = config.crossOrigin as CrossOrigin;
    }

    return <TileLayer {...tileProps} />;
}
