/**
 * Squares Overlay Component
 * 
 * Interactive WFS layer for square grid with hover/click support.
 * Displays polygons with light blue borders, highlights on hover (red),
 * and shows popup with square name and coordinates.
 * 
 * Features:
 * - Load GeoJSON from GeoServer WFS (common:squares)
 * - Zoom-dependent interactivity (active from zoom level 10+)
 * - Hover: highlight border red + show popup
 * - Click: show popup with square info (name, WGS coords, DMS coords)
 * - Double-click: trigger callback with square ID for navigation
 * - Visibility control via opacity (layer stays mounted)
 */

import { useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { useEffect, useRef, useCallback } from 'react';
import type { LatLngExpression, Popup } from 'leaflet';

interface SquaresOverlayProps {
    visible: boolean;
    params?: Record<string, any>;
    minZoom?: number;
    onSquareDoubleClick?: (squareId: string) => void;
}

interface SquareFeature {
    type: 'Feature';
    id: string;
    geometry: {
        type: 'Polygon';
        coordinates: number[][][];
    };
    properties: {
        id: number;
        name: string;
    };
}

interface WFSResponse {
    type: 'FeatureCollection';
    features: SquareFeature[];
}

/**
 * Convert decimal degrees to DMS format
 */
function decimalToDMS(decimal: number, isLatitude: boolean): string {
    const absolute = Math.abs(decimal);
    const degrees = Math.floor(absolute);
    const minutesNotTruncated = (absolute - degrees) * 60;
    const minutes = Math.floor(minutesNotTruncated);
    const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(2);

    const direction = isLatitude
        ? decimal >= 0 ? 'N' : 'S'
        : decimal >= 0 ? 'E' : 'W';

    return `${degrees}°${minutes}'${seconds}" ${direction}`;
}

/**
 * Calculate centroid of a polygon
 */
function getPolygonCentroid(coordinates: number[][][]): LatLngExpression {
    let latSum = 0;
    let lngSum = 0;
    let count = 0;

    for (const ring of coordinates) {
        for (const [lng, lat] of ring) {
            latSum += lat;
            lngSum += lng;
            count++;
        }
    }

    return [latSum / count, lngSum / count];
}

export function SquaresOverlay({ visible, minZoom = 8, onSquareDoubleClick }: SquaresOverlayProps) {
    const map = useMap();
    const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
    const currentPopupRef = useRef<Popup | null>(null);
    const currentLabelRef = useRef<L.Marker | null>(null);
    const visibleRef = useRef(visible);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        visibleRef.current = visible;
    }, [visible]);

    /**
     * Build WFS URL for GeoServer
     */
    const buildWfsUrl = useCallback(() => {
        const baseUrl = 'https://geoserver.ibot.cas.cz/common/ows';
        const queryParams: Record<string, string> = {
            service: 'WFS',
            version: '1.0.0',
            request: 'GetFeature',
            typeName: 'common:squares',
            outputFormat: 'application/json',
        };

        const url = new URL(baseUrl, window.location.origin);
        Object.entries(queryParams).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });

        return url.toString();
    }, []);

    /**
     * Create popup content for coordinates
     */
    const createPopupContent = useCallback((latlng: LatLngExpression) => {
        const [lat, lng] = Array.isArray(latlng) ? latlng : [latlng.lat, latlng.lng];
        
        return `
            <div style="font-size: 13px; padding: 5px;">
                <span style="color: #666;">WGS: ${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E</span><br/>
                <span style="color: #666;">DMS: ${decimalToDMS(lat, true)}, ${decimalToDMS(lng, false)}</span>
            </div>
        `;
    }, []);

    /**
     * Handle double-click on a square feature - cancel pending click popup and navigate
     */
    const handleDoubleClick = useCallback((e: L.LeafletEvent) => {
        const layer = e.target as L.Path;
        const feature = (layer as any).feature as SquareFeature;
        
        // Cancel any pending click popup
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
        }
        
        if (!feature || !onSquareDoubleClick) return;
        
        // Get square ID from feature properties
        const squareId = feature.properties.name;
        if (squareId) {
            onSquareDoubleClick(squareId);
        }
    }, [onSquareDoubleClick]);

    /**
     * Handle mouseover on a square feature - highlight + show label (from zoom 10+)
     */
    const handleMouseOver = useCallback((e: L.LeafletEvent) => {
        const layer = e.target as L.Path;
        const feature = (layer as any).feature as SquareFeature;
        
        // Don't show anything if layer is not visible
        if (!visibleRef.current) {
            return;
        }
        
        // Highlight: change to red border
        layer.setStyle({
            color: '#ff0000',
            weight: 2,
        });

        // Only show label from zoom level 10+
        const currentZoom = map.getZoom();
        if (currentZoom < minZoom) {
            return;
        }

        // Get centroid for label position
        const geom = feature.geometry;
        const centroid = getPolygonCentroid(geom.coordinates);

        // Remove existing label if any
        if (currentLabelRef.current) {
            map.removeLayer(currentLabelRef.current);
            currentLabelRef.current = null;
        }

        // Create label as a marker with custom HTML icon
        const labelIcon = L.divIcon({
            className: 'square-label',
            html: `<div style="
                font-size: 11px;
                color: #333;
                /*background: rgba(255, 255, 255, 0.8);*/
                padding: 2px 6px;
                border-radius: 3px;
                white-space: nowrap;
                pointer-events: none;
                font-weight: 600;
                text-align: center;
                transform: translate(-150%, -60%);
            ">${feature.properties.name}</div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
        });

        const label = L.marker(centroid, {
            icon: labelIcon,
            interactive: false,
        }).addTo(map);

        currentLabelRef.current = label;
    }, [map, minZoom]);

    /**
     * Handle mouseout on a square feature - reset highlight and remove label
     */
    const handleMouseOut = useCallback((e: L.LeafletEvent) => {
        const layer = e.target as L.Path;

        // Reset to default light blue border
        layer.setStyle({
            color: '#66b3ff',
            weight: 1,
        });

        // Remove label
        if (currentLabelRef.current) {
            map.removeLayer(currentLabelRef.current);
            currentLabelRef.current = null;
        }
    }, [map]);

    /**
     * Handle click on a square feature - show popup with square info after a short delay
     * If dblclick occurs within the delay, the popup is cancelled
     * Uses the click coordinates for popup position, not the centroid
     */
    const handleFeatureClick = useCallback((e: L.LeafletEvent) => {
        const layer = e.target as L.Path;
        const feature = (layer as any).feature as SquareFeature;
        
        if (!feature) {
            return;
        }

        // Clear any existing timeout
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
        }

        // Set a timeout to show the popup - if dblclick occurs first, it will be cancelled
        clickTimeoutRef.current = setTimeout(() => {
            // Close existing popup if any
            if (currentPopupRef.current) {
                map.closePopup(currentPopupRef.current);
                currentPopupRef.current = null;
            }

            // Use the click coordinates
            const clickLatLng = (e as L.LeafletMouseEvent).latlng;

            // Create and open popup at click location
            const popup = L.popup({ closeOnClick: false })
                .setLatLng(clickLatLng)
                .setContent(createPopupContent(clickLatLng))
                .openOn(map);

            currentPopupRef.current = popup;
            clickTimeoutRef.current = null;
        }, 250);
    }, [map, createPopupContent]);

    /**
     * Handle click on empty map area (not on any feature) - show popup with coordinates
     */
    const handleMapBackgroundClick = useCallback((e: L.LeafletMouseEvent) => {
        // Close existing popup if any
        if (currentPopupRef.current) {
            map.closePopup(currentPopupRef.current);
            currentPopupRef.current = null;
        }

        // Use the click coordinates
        const clickLatLng = e.latlng;

        // Create and open popup at click location
        const popup = L.popup({ closeOnClick: false })
            .setLatLng(clickLatLng)
            .setContent(createPopupContent(clickLatLng))
            .openOn(map);

        currentPopupRef.current = popup;
    }, [map, createPopupContent]);

    /**
     * Fetch and load WFS data
     */
    useEffect(() => {
        const fetchWfsData = async () => {
            if (!map || !visibleRef.current) return;

            try {
                const wfsUrl = buildWfsUrl();
                const response = await fetch(wfsUrl);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data: WFSResponse = await response.json();

                // Remove existing layer if any
                if (geoJsonLayerRef.current) {
                    map.removeLayer(geoJsonLayerRef.current);
                }

                // Create GeoJSON layer with styling and events
                const geoJsonLayer = L.geoJSON(undefined, {
                    style: () => ({
                        color: '#66b3ff',      // Light blue border
                        weight: 1,              // Thin line
                        fillOpacity: 0.05,      // Very subtle fill
                        fillColor: '#ffffff',
                    }),
                    onEachFeature: (feature: SquareFeature, layer: L.Layer) => {

                        // Get the actual path layer(s) - layer could be a FeatureGroup
                        const getPathLayers = (lyr: L.Layer): L.Path[] => {
                            if ('getLayers' in lyr) {
                                // FeatureGroup or LayerGroup - get all child layers
                                return (lyr as L.LayerGroup).getLayers() as L.Path[];
                            }
                            return [lyr as L.Path];
                        };

                        const pathLayers = getPathLayers(layer);

                        // Attach events to each path layer
                        pathLayers.forEach((pathLayer) => {
                            // Store feature reference on the layer for use in handlers
                            (pathLayer as any).feature = feature;

                            // Attach event listeners
                            pathLayer.on('mouseover', handleMouseOver);
                            pathLayer.on('mouseout', handleMouseOut);
                            pathLayer.on('click', handleFeatureClick, { bubblingMouseEvents: false });
                            pathLayer.on('dblclick', handleDoubleClick, { bubblingMouseEvents: false });

                            // Store cleanup function on the layer
                            (pathLayer as any)._squaresCleanup = () => {
                                pathLayer.off('mouseover', handleMouseOver);
                                pathLayer.off('mouseout', handleMouseOut);
                                pathLayer.off('click', handleFeatureClick);
                                pathLayer.off('dblclick', handleDoubleClick);
                            };
                        });
                    },
                });

                // Add data to layer
                if (data.features && data.features.length > 0) {
                    geoJsonLayer.addData(data);
                }

                // Apply visibility
                if (!visibleRef.current) {
                    geoJsonLayer.setStyle({ opacity: 0, fillOpacity: 0 });
                }

                // Add to map
                geoJsonLayer.addTo(map);
                geoJsonLayerRef.current = geoJsonLayer;

                // Add map click listener for showing popup on background (empty area)
                map.on('click', handleMapBackgroundClick);

            } catch (error) {
                console.error('[SquaresOverlay] Failed to load WFS data:', error);
            }
        };

        fetchWfsData();

        // Cleanup on unmount
        return () => {
            // Remove map click listener
            map.off('click', handleMapBackgroundClick);
            
            // Clear any pending click timeout
            if (clickTimeoutRef.current) {
                clearTimeout(clickTimeoutRef.current);
                clickTimeoutRef.current = null;
            }
            
            if (geoJsonLayerRef.current) {
                // Clean up event listeners on all layers (including nested)
                const cleanupLayer = (layer: L.Layer) => {
                    const cleanup = (layer as any)._squaresCleanup;
                    if (cleanup) cleanup();
                    
                    // If it's a group, clean up child layers too
                    if ('getLayers' in layer) {
                        (layer as L.LayerGroup).getLayers().forEach(cleanupLayer);
                    }
                };
                
                geoJsonLayerRef.current.eachLayer((layer) => {
                    cleanupLayer(layer);
                });

                if (currentPopupRef.current) {
                    map.closePopup();
                }

                if (currentLabelRef.current) {
                    map.removeLayer(currentLabelRef.current);
                }

                map.removeLayer(geoJsonLayerRef.current);
                geoJsonLayerRef.current = null;
            }
        };
    }, [map, buildWfsUrl, minZoom, handleMouseOver, handleMouseOut, handleFeatureClick, handleDoubleClick, handleMapBackgroundClick, createPopupContent]);

    /**
     * Update visibility when prop changes
     */
    useEffect(() => {
        if (geoJsonLayerRef.current) {
            if (visible) {
                geoJsonLayerRef.current.setStyle({ opacity: 1, fillOpacity: 0.05 });
            } else {
                geoJsonLayerRef.current.setStyle({ opacity: 0, fillOpacity: 0 });
                // Remove label when layer is hidden
                if (currentLabelRef.current) {
                    map.removeLayer(currentLabelRef.current);
                    currentLabelRef.current = null;
                }
            }
        }
    }, [visible, map]);

    return null;
}

export default SquaresOverlay;
