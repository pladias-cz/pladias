/**
 * WfsLayerView – renders WFS (GeoJSON) layer from GeoServerConfig (service: 'WFS') in the registry.
 *
 * Fetches data from the GeoServer WFS endpoint and renders it as a vector layer.
 * Supports bbox parameter with buffer to reduce reloads on small map movements.
 *
 * The component is imperative (returns null): it creates an L.GeoJSON layer directly
 * on the map from the useMap() context, because react-leaflet does not offer a declarative
 * counterpart for dynamic GeoJSON with its own pane and zoom-dependent point radius.
 */

import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { useEffect, useRef, useState, useMemo } from 'react';
import { fetchWfsGeoJson } from '@/services/mapApi';
import { logError, logInfo } from '@/services/logger';
import type { LayerParams, WfsStyleOptions } from '../../types';
import type { GeoServerConfig } from '../../types/serviceConfig';
import { getBboxWithBuffer, shouldReloadBbox } from './wfsBounds';

export interface WfsLayerViewProps {
    /** Layer ID from the definition (basis for the pane name) */
    id: string;
    /** GeoServer service configuration – the dispatcher in Layer.tsx guarantees service: 'WFS' */
    service: GeoServerConfig;
    /** zIndex from layer definition – determines pane stacking */
    zIndex: number;
    /** Styling from layer definition (wfsStyle) */
    wfsStyle?: WfsStyleOptions;
    params: LayerParams;
    /** Visibility – the layer stays mounted, it only hides via style */
    visible: boolean;
}

/** Default styling for occurrence points */
const defaultPointStyle = {
    radius: 6,
    fillColor: '#e74c3c',
    color: '#c0392b',
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0.7,
};

/**
 * Point radius at the given zoom – from radiusByZoom it finds the largest
 * zoom level that is <= the current zoom.
 */
function getRadiusForZoom(styleOptions: WfsStyleOptions | undefined, zoom: number): number {
    const radiusByZoom = styleOptions?.pointStyle?.radiusByZoom;
    if (!radiusByZoom) {
        return styleOptions?.pointStyle?.radius ?? defaultPointStyle.radius;
    }

    // Find the appropriate radius for current zoom
    // Sort zoom levels and find the largest one <= current zoom
    const zoomLevels = Object.keys(radiusByZoom).map(Number).sort((a, b) => a - b);
    let radius = styleOptions?.pointStyle?.radius ?? defaultPointStyle.radius;

    for (const zoomLevel of zoomLevels) {
        if (zoom >= zoomLevel) {
            radius = radiusByZoom[zoomLevel];
        } else {
            break;
        }
    }

    return radius;
}

export function WfsLayerView({ id, service, zIndex, wfsStyle, params, visible }: WfsLayerViewProps) {
    const map = useMap();
    const layerRef = useRef<L.GeoJSON | null>(null);
    const [loaded, setLoaded] = useState(false);
    const visibleRef = useRef(visible);
    const paramsRef = useRef<LayerParams>(params);
    const lastBboxRef = useRef<string | null>(null);

    const config = service.config;

    // Keep refs in sync
    useEffect(() => {
        visibleRef.current = visible;
        if (layerRef.current) {
            if (visible) {
                layerRef.current.setStyle({ opacity: 1, fillOpacity: 0.7 });
            } else {
                layerRef.current.setStyle({ opacity: 0, fillOpacity: 0 });
            }
        }
    }, [visible]);

    // Check if params actually changed (deep comparison)
    useEffect(() => {
        const oldParams = paramsRef.current;
        const newParams = params;

        const oldKeys = Object.keys(oldParams || {});
        const newKeys = Object.keys(newParams || {});

        // Quick check: different number of keys = different
        if (oldKeys.length !== newKeys.length) {
            paramsRef.current = newParams;
            // Only remove layer if we have one and it's loaded
            if (layerRef.current && loaded) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
                setLoaded(false);
            }
            return;
        }

        // Check if all values are the same
        const paramsChanged = oldKeys.some(key => oldParams[key] !== newParams[key]);

        if (paramsChanged) {
            paramsRef.current = newParams;
            // Only remove layer if we have one and it's loaded
            if (layerRef.current && loaded) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
                setLoaded(false);
            }
        }
    }, [params, map, loaded]);

    // Listen to map moveend events and reload WFS data when bounds change significantly
    useEffect(() => {
        if (!map) return;

        const handleMoveEnd = () => {
            const newBbox = getBboxWithBuffer(map);
            if (!newBbox) return;

            // Check if bounds changed significantly
            if (lastBboxRef.current === null || shouldReloadBbox(lastBboxRef.current, newBbox)) {
                logInfo('Bounds changed significantly, reloading data', {source: 'WfsLayerView'});
                lastBboxRef.current = newBbox;

                // Remove existing layer and trigger reload by updating a state or ref
                if (layerRef.current && loaded) {
                    map.removeLayer(layerRef.current);
                    layerRef.current = null;
                    setLoaded(false);
                }
            }
        };

        // Use moveend event which fires after drag/zoom ends
        map.on('moveend', handleMoveEnd);

        // Initial bbox setup
        const initialBbox = getBboxWithBuffer(map);
        if (initialBbox) {
            lastBboxRef.current = initialBbox;
        }

        return () => {
            map.off('moveend', handleMoveEnd);
        };
    }, [map, loaded]);

    // Build WFS URL with parameters - memoized to avoid recalculating
    const wfsUrl = useMemo(() => {
        const baseUrl = service.baseUrl;
        const queryParams: Record<string, string> = {
            service: config.service || 'WFS',
            version: config.version || '1.0.0',
            request: 'GetFeature',
            typeName: config.typeName || '',
            outputFormat: config.outputFormat || 'application/json',
        };

        // Add viewParams if specified
        if (config.viewParams && config.viewParams.length > 0) {
            const viewParamsStr = config.viewParams
                .map((param: string) => {
                    let result = param;
                    if (params.taxonId !== undefined) {
                        result = result.replace('{taxonId}', String(params.taxonId));
                    }
                    if (params.squareCode !== undefined) {
                        result = result.replace('{squareCode}', String(params.squareCode));
                    }
                    return result;
                })
                .filter((param: string) => !param.includes('{'))
                .join(';');
            if (viewParamsStr) {
                queryParams.viewparams = viewParamsStr;
            }
        }

        // Add bbox parameter if available (with buffer to reduce reloads)
        const bbox = getBboxWithBuffer(map);
        if (bbox) {
            queryParams.bbox = bbox;
        }

        // Build final URL
        const url = new URL(baseUrl, window.location.origin);
        Object.entries(queryParams).forEach(([key, value]) => {
            if (value) {
                url.searchParams.set(key, value);
            }
        });

        return url.toString();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getBboxWithBuffer čte stav mapy v každém renderu; závislost by přepočítávala URL při každém renderu
    }, [config, service.baseUrl, params]);

    // Fetch and create GeoJSON layer - ONLY depends on wfsUrl and map
    useEffect(() => {
        if (!wfsUrl || !map || layerRef.current) return;

        const fetchWfsData = async () => {
            try {
                const data = await fetchWfsGeoJson(wfsUrl);

                // Get style options from layer definition metadata or use defaults
                const styleOptions = wfsStyle;

                // Create a dedicated pane so layer stacking follows zIndex
                // (Leaflet vector layers have no zIndex option; within the default
                // overlayPane they stack by DOM insertion order, which is fetch-order)
                const paneName = `wfs-${id}`;
                if (!map.getPane(paneName)) {
                    const pane = map.createPane(paneName);
                    // 400 = default overlayPane z-index; offset by layer zIndex
                    pane.style.zIndex = String(400 + (zIndex ?? 0));
                }

                // Create GeoJSON layer with zoom-based radius
                const geoJsonLayer = L.geoJSON(undefined, {
                    pane: paneName,
                    pointToLayer: (_feature: GeoJSON.Feature, latlng: L.LatLngExpression) => {
                        const currentZoom = map.getZoom();
                        const radius = getRadiusForZoom(styleOptions, currentZoom);

                        return L.circleMarker(latlng, {
                            ...defaultPointStyle,
                            ...styleOptions?.pointStyle,
                            pane: paneName,
                            radius, // Override radius with zoom-based value
                        });
                    },
                    style: (styleOptions?.pathStyle || styleOptions?.style) as L.GeoJSONOptions["style"],
                    onEachFeature: styleOptions?.onEachFeature,
                });

                // Listen to zoom events to update marker sizes
                const updateRadiusOnZoom = () => {
                    const currentZoom = map.getZoom();
                    geoJsonLayer.eachLayer((layer: L.Layer) => {
                        if (layer instanceof L.CircleMarker) {
                            const radius = getRadiusForZoom(styleOptions, currentZoom);
                            layer.setRadius(radius);
                        }
                    });
                };

                map.on('zoomend', updateRadiusOnZoom);

                // Store cleanup function reference
                (geoJsonLayer as L.GeoJSON & {_zoomHandler?: () => void})._zoomHandler = updateRadiusOnZoom;

                if (data.features && data.features.length > 0) {
                    geoJsonLayer.addData(data);
                }

                // Apply initial visibility from ref before adding to map
                if (!visibleRef.current) {
                    geoJsonLayer.setStyle({ opacity: 0, fillOpacity: 0 });
                }

                geoJsonLayer.addTo(map);
                layerRef.current = geoJsonLayer;
                setLoaded(true);

            } catch (error) {
                logError(error, {source: 'WfsLayerView', url: wfsUrl});
            }
        };

        fetchWfsData();

        // Cleanup on unmount
        return () => {
            if (layerRef.current) {
                // Remove zoom listener
                const handler = (layerRef.current as L.GeoJSON & {_zoomHandler?: () => void})._zoomHandler;
                if (handler && map) {
                    map.off('zoomend', handler);
                }
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [wfsUrl, map, id, zIndex, wfsStyle]);  // ← Removed 'visible' from dependencies!

    return null;
}
