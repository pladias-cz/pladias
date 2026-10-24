/**
 * MapCanvas – common MapContainer wrapper for all map views.
 *
 * Unifies the leaflet map initialization (MapContainer) in one place – common props
 * (scrollWheelZoom, full-size style). leaflet.css is imported once in the entry point
 * (index.tsx, section M). The contents of the map
 * (layers, markers) are passed as children; the wrapper div and floating controls
 * remain with the specific map components.
 */

import {MapContainer} from 'react-leaflet';
import type {LatLngExpression, Map as LeafletMap} from 'leaflet';

export interface MapCanvasProps {
    center: LatLngExpression;
    zoom: number;
    minZoom?: number;
    maxZoom?: number;
    /** Remount key – a change re-creates the map (e.g. when switching square/taxon) */
    mapKey?: string | number;
    /** Ref to the leaflet map instance */
    mapRef?: React.Ref<LeafletMap>;
    children?: React.ReactNode;
}

export function MapCanvas({center, zoom, minZoom, maxZoom, mapKey, mapRef, children}: MapCanvasProps) {
    return (
        <MapContainer
            center={center}
            zoom={zoom}
            minZoom={minZoom}
            maxZoom={maxZoom}
            scrollWheelZoom={true}
            style={{height: '100%', width: '100%'}}
            key={mapKey}
            ref={mapRef}
        >
            {children}
        </MapContainer>
    );
}
