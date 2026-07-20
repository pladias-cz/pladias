/**
 * Layer Component
 * 
 * Renders a map layer as a React-leaflet component based on layer definition from registry.
 * This preserves the factory encapsulation while using react-leaflet's native components.
 * 
 * IMPORTANT: Layers are kept mounted even when invisible (using opacity) to prevent
 * tile request cancellations when toggling visibility.
 */

import { TileLayer, WMSTileLayer, useMap } from 'react-leaflet';
import type { CrossOrigin } from 'leaflet';
import { getLayerDefinition } from '../registry/layerRegistry';
import type { LayerParams } from '../types';
import { useEffect, useRef, useState, useMemo } from 'react';
import * as L from 'leaflet';
import { SquaresOverlay } from './SquaresOverlay';

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
    const definition = getLayerDefinition(layerId);
    
    if (!definition || !definition.service) {
        console.warn(`Layer definition not found: ${layerId}`);
        return null;
    }

    // Handle different service types
    switch (definition.service.type) {
        case 'tile':
            return renderTileLayer(definition, visible);
        case 'geoserver':
            if (definition.service.config.service === 'WMS') {
                return renderWMSLayer(definition, params, visible);
            } else if (definition.service.config.service === 'WFS') {
                // Check if this is the interactive squares layer with custom component
                if (definition.customComponent === 'SquaresOverlay') {
                    return <SquaresOverlay visible={visible} params={params} onSquareDoubleClick={onSquareDoubleClick} />;
                }
                return renderWFSLayer(definition, params, visible);
            }
            // Handle other geoserver services if needed
            return null;
        default:
            console.warn(`Unsupported service type: ${(definition.service as any).type}`);
            return null;
    }
}

function renderTileLayer(definition: ReturnType<typeof getLayerDefinition>, visible: boolean) {
    if (!definition?.service || definition.service.type !== 'tile') {
        return null;
    }

    const config = definition.service.config;
    
    // Build TileLayer props - only include defined values
    const tileProps: any = {
        url: definition.service.baseUrl,
        maxZoom: config.maxZoom,
        minZoom: config.minZoom,
        attribution: config.attribution || definition.attribution,
        // Keep layer mounted but hide with opacity to prevent tile cancellations
        opacity: visible ? 1 : 0,
        // Use zIndex from definition for proper stacking
        zIndex: definition.zIndex,
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

function renderWMSLayer(
    definition: ReturnType<typeof getLayerDefinition>,
    params: LayerParams,
    visible: boolean
) {
    if (!definition?.service || definition.service.type !== 'geoserver') {
        return null;
    }

    const config = definition.service.config as any;
    
    // If viewParams are specified, use custom component that can handle them properly
    if (config.viewParams && config.viewParams.length > 0) {
        return <WmsLayerWithParams definition={definition} params={params} visible={visible} />;
    }
    
    // Standard WMS without viewParams
    const layers = (config.layers as string | undefined)?.replace(/\{(\w+)\}/g, (_: string, key: string) => {
        return params[key] !== undefined ? String(params[key]) : '';
    });

    const wmsProps: any = {
        url: definition.service.baseUrl,
        layers: layers || (config.typeName as string | undefined) || '',
        format: (config.format as string | undefined) || 'image/png',
        transparent: (config.transparent as boolean | undefined) ?? true,
        version: (config.version as string | undefined) || '1.1.1',
        attribution: definition.attribution,
        opacity: visible ? 1 : 0,
        zIndex: definition.zIndex,
    };
    
    if (config.styles) {
        wmsProps.styles = config.styles;
    }
    
    return <WMSTileLayer {...wmsProps} />;
}

/**
 * Custom WMS component that supports viewParams (e.g., for GeoServer)
 */
function WmsLayerWithParams({
    definition,
    params,
    visible,
}: {
    definition: NonNullable<ReturnType<typeof getLayerDefinition>>;
    params: LayerParams;
    visible: boolean;
}) {
    const map = useMap();
    const layerRef = useRef<L.TileLayer.WMS | null>(null);
    const visibleRef = useRef(visible);
    
    if (!definition.service) return null;
    const config = definition.service.config as any;
    
    // Interpolate layers string
    const layers = (config.layers as string | undefined)?.replace(/\{(\w+)\}/g, (_: string, key: string) => {
        return params[key] !== undefined ? String(params[key]) : '';
    });
    
    // Build viewParams
    const viewParamsStr = useMemo(() => {
        if (!config.viewParams || config.viewParams.length === 0) return '';
        
        return config.viewParams
            .map((paramParam: string) => {
                let result = paramParam;
                if (params.taxonId !== undefined) {
                    result = result.replace('{taxonId}', String(params.taxonId));
                }
                if (params.squareCode !== undefined) {
                    result = result.replace('{squareCode}', String(params.squareCode));
                }
                return result;
            })
            .filter((paramParam: string) => !paramParam.includes('{'))
            .join(';');
    }, [config.viewParams, params.taxonId, params.squareCode]);
    
    // Create layer on mount
    useEffect(() => {
        if (!map || !layers || !definition.service) return;
        
        const wmsLayer = L.tileLayer.wms(definition.service.baseUrl, {
            layers: layers || '',
            format: (config.format as string | undefined) || 'image/png',
            transparent: (config.transparent as boolean | undefined) ?? true,
            version: (config.version as string | undefined) || '1.1.1',
            attribution: definition.attribution,
            zIndex: definition.zIndex,
            ...(config.styles && { styles: config.styles }),
            // Add viewParams - cast to any to bypass TypeScript WMSParams limitation
            ...(viewParamsStr && { viewparams: viewParamsStr } as any),
        });
        
        // Set initial opacity
        if (!visibleRef.current) {
            wmsLayer.setOpacity(0);
        }
        
        wmsLayer.addTo(map);
        layerRef.current = wmsLayer;
        
        return () => {
            if (layerRef.current && map) {
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [map, layers, definition, config, viewParamsStr]);
    
    // Update viewParams when they change
    useEffect(() => {
        if (!layerRef.current || !viewParamsStr) return;
        layerRef.current.setParams({ viewparams: viewParamsStr } as any);
    }, [viewParamsStr]);
    
    // Update visibility
    useEffect(() => {
        visibleRef.current = visible;
        if (layerRef.current) {
            layerRef.current.setOpacity(visible ? 1 : 0);
        }
    }, [visible]);
    
    return null;
}

export default Layer;

/**
 * Component to render WFS (GeoJSON) layers
 * Fetches data from GeoServer WFS endpoint and renders as vector layer
 * Supports bbox parameter with buffer to reduce reloads on small map movements
 */
function WfsLayer({
    definition,
    params,
    visible,
}: {
    definition: any;
    params: LayerParams;
    visible: boolean;
}) {
    const map = useMap();
    const layerRef = useRef<any | null>(null);
    const [loaded, setLoaded] = useState(false);
    const visibleRef = useRef(visible);
    const paramsRef = useRef<LayerParams>(params);
    const lastBboxRef = useRef<string | null>(null);
    
    const config = definition.service.config;
    
    /**
     * Calculate bounding box with buffer to avoid frequent reloads
     * Buffer is approximately 30% of the current view extent
     */
    const getBboxWithBuffer = (): string | null => {
        if (!map) return null;
        
        const bounds = map.getBounds();
        if (!bounds) return null;
        
        const southWest = bounds.getSouthWest();
        const northEast = bounds.getNorthEast();
        
        // Calculate center and extent
        const latCenter = (southWest.lat + northEast.lat) / 2;
        const lngCenter = (southWest.lng + northEast.lng) / 2;
        const latExtent = northEast.lat - southWest.lat;
        const lngExtent = northEast.lng - southWest.lng;
        
        // Add 30% buffer on each side (total 60% increase in each dimension)
        const bufferFactor = 1.3;
        const bufferedLatExtent = latExtent * bufferFactor;
        const bufferedLngExtent = lngExtent * bufferFactor;
        
        // Calculate buffered bounds
        const bufferedSouth = latCenter - bufferedLatExtent / 2;
        const bufferedNorth = latCenter + bufferedLatExtent / 2;
        const bufferedWest = lngCenter - bufferedLngExtent / 2;
        const bufferedEast = lngCenter + bufferedLngExtent / 2;
        
        // Clamp to valid ranges
        const clampedSouth = Math.max(-90, Math.min(90, bufferedSouth));
        const clampedNorth = Math.max(-90, Math.min(90, bufferedNorth));
        const clampedWest = Math.max(-180, Math.min(180, bufferedWest));
        const clampedEast = Math.max(-180, Math.min(180, bufferedEast));
        
        // Return bbox in EPSG:4326 format for GeoServer
        // Format: minLon,minLat,maxLon,maxLat,CRS:EPSG:4326
        const bbox = `${clampedWest.toFixed(6)},${clampedSouth.toFixed(6)},${clampedEast.toFixed(6)},${clampedNorth.toFixed(6)},EPSG:4326`;
        
        return bbox;
    };
    
    /**
     * Check if bounds have changed significantly enough to warrant a reload
     * Uses a threshold to avoid reloading on tiny movements
     */
    const shouldReloadBbox = (newBbox: string): boolean => {
        if (!lastBboxRef.current) return true;
        
        const oldCoords = lastBboxRef.current.split(',').slice(0, 4).map(Number);
        const newCoords = newBbox.split(',').slice(0, 4).map(Number);
        
        // Check if any coordinate changed by more than ~0.1 degrees (~11km)
        const threshold = 0.1;
        for (let i = 0; i < 4; i++) {
            if (Math.abs(newCoords[i] - oldCoords[i]) > threshold) {
                return true;
            }
        }
        
        return false;
    };
    
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
            const newBbox = getBboxWithBuffer();
            if (!newBbox) return;
            
            // Check if bounds changed significantly
            if (shouldReloadBbox(newBbox)) {
                console.log('[WfsLayer] Bounds changed significantly, reloading data...');
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
        const initialBbox = getBboxWithBuffer();
        if (initialBbox) {
            lastBboxRef.current = initialBbox;
        }
        
        return () => {
            map.off('moveend', handleMoveEnd);
        };
    }, [map, loaded]);
    
    // Build WFS URL with parameters - memoized to avoid recalculating
    const wfsUrl = useMemo(() => {
        const baseUrl = definition.service.baseUrl;
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
        const bbox = getBboxWithBuffer();
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
    }, [config, definition.service.baseUrl, params]);
    
    // Fetch and create GeoJSON layer - ONLY depends on wfsUrl and map
    useEffect(() => {
        if (!wfsUrl || !map || layerRef.current) return;
        
        const fetchWfsData = async () => {
            try {
                const response = await fetch(wfsUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();

                // Get style options from layer definition metadata or use defaults
                const styleOptions = definition.wfsStyle;
                
                // Default styling for occurrence points
                const defaultPointStyle = {
                    radius: 6,
                    fillColor: '#e74c3c',
                    color: '#c0392b',
                    weight: 1,
                    opacity: 0.8,
                    fillOpacity: 0.7,
                };
                
                // Helper function to get radius based on current zoom level
                const getRadiusForZoom = (zoom: number): number => {
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
                };
                
                // Create GeoJSON layer with zoom-based radius
                const geoJsonLayer = L.geoJSON(undefined, {
                    pointToLayer: (_feature: any, latlng: any) => {
                        const currentZoom = map.getZoom();
                        const radius = getRadiusForZoom(currentZoom);
                        
                        return L.circleMarker(latlng, {
                            ...defaultPointStyle,
                            ...styleOptions?.pointStyle,
                            radius, // Override radius with zoom-based value
                        });
                    },
                    style: styleOptions?.pathStyle || styleOptions?.style,
                    onEachFeature: styleOptions?.onEachFeature,
                });
                
                // Listen to zoom events to update marker sizes
                const updateRadiusOnZoom = () => {
                    const currentZoom = map.getZoom();
                    geoJsonLayer.eachLayer((layer: any) => {
                        if (layer.setRadius) {
                            const radius = getRadiusForZoom(currentZoom);
                            layer.setRadius(radius);
                        }
                    });
                };
                
                map.on('zoomend', updateRadiusOnZoom);
                
                // Store cleanup function reference
                (geoJsonLayer as any)._zoomHandler = updateRadiusOnZoom;
                
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
                console.error('[WfsLayer] Failed to load WFS data:', error);
                console.error('[WfsLayer] URL was:', wfsUrl);
            }
        };
        
        fetchWfsData();
        
        // Cleanup on unmount
        return () => {
            if (layerRef.current) {
                // Remove zoom listener
                const handler = (layerRef.current as any)._zoomHandler;
                if (handler && map) {
                    map.off('zoomend', handler);
                }
                map.removeLayer(layerRef.current);
                layerRef.current = null;
            }
        };
    }, [wfsUrl, map, definition]);  // ← Removed 'visible' from dependencies!
    
    return null;
}

/**
 * Render WFS layer component
 */
function renderWFSLayer(
    definition: ReturnType<typeof getLayerDefinition>,
    params: LayerParams,
    visible: boolean
) {
    if (!definition?.service || definition.service.type !== 'geoserver' || definition.service.config.service !== 'WFS') {
        console.warn('[renderWFSLayer] Invalid service config');
        return null;
    }
    
    return <WfsLayer definition={definition} params={params} visible={visible} />;
}
