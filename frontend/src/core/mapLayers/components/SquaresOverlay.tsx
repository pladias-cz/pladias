/**
 * Squares Overlay Component
 *
 * Interactive WFS layer for square grid with hover/click support.
 * Displays polygons with light blue borders, highlights on hover (red),
 * and shows popup with square name and coordinates.
 *
 * Features:
 * - Load GeoJSON from GeoServer WFS (common:squares) – stáhne se jednou za mount
 * - Zoom-dependent interactivity (active from zoom level 10+)
 * - Hover: highlight border red + show popup
 * - Click: show popup with square info (name, WGS coords, DMS coords)
 * - Double-click: trigger callback with square ID for navigation
 * - Right-click: show popup with link to the square detail page (same target as double-click)
 * - Visibility control via opacity (layer stays mounted)
 *
 * Interakční listnery se vážou jedenkrát při založení vrstvy a hodnoty, které se
 * v průběhu života komponenty mění (`params.taxonId`, `onSquareDoubleClick`,
 * `navigate`), čtou z `latestRef`. Kdyby byly v deps effectu, GeoJSON se stahuje
 * podruhé souběžně s prvním požadavkem a odpověď, která dorazí jako poslední,
 * nainstaluje své (už zastaralé) handlery – dvojklik ani pravý klik pak na nic
 * nesáhnou. O pozdní odpovědi se stará `responseGuard.ts` + AbortController.
 */

import {useMap} from 'react-leaflet';
import * as L from 'leaflet';
import {useEffect, useRef, useCallback} from 'react';
import {fetchWfsGeoJson} from '@/services/mapApi';
import {createResponseGuard} from './responseGuard';
import {logError} from '@/services/logger';
import type {LayerParams} from '../types';
import {useNavigate} from 'react-router-dom';
import type {LatLngExpression, Popup} from 'leaflet';

interface SquaresOverlayProps {
    visible: boolean;
    params?: LayerParams;
    minZoom?: number;
    onSquareDoubleClick?: (squareId: string) => void;
}

/**
 * GeoJSON path vrstva nese feature a cleanup funkci – leaflet typy `L.Path`
 * tyto properties nemodelují (přidávají je GeoJSON event handlery).
 */
type FeaturePath = L.Path & {
    feature: SquareFeature;
    _squaresCleanup?: () => void;
};

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

/**
 * Prodleva, po níž se po kliknutí na čtverec otevře popup se souřadnicemi.
 * Musí být delší než systémový interval dvojitého kliknutí (Windows/macOS
 * 400–500 ms): jinak se popup stihne otevřít mezi oběma kliky a jeho kontejner
 * (Leaflet na něm vypíná propagaci kliků) sebere ten druhý – dvojklik se
 * vůbec nerezignuje a navigace se nekoná.
 */
const SQUARE_CLICK_POPUP_DELAY_MS = 350;

export function SquaresOverlay({visible, minZoom = 8, params, onSquareDoubleClick}: SquaresOverlayProps) {
    const map = useMap();
    const navigate = useNavigate();
    const geoJsonLayerRef = useRef<L.GeoJSON | null>(null);
    const currentPopupRef = useRef<Popup | null>(null);
    const currentLabelRef = useRef<L.Marker | null>(null);
    const visibleRef = useRef(visible);
    const clickTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Čerstvé hodnoty pro listnery, které jsou navázané po celou dobu života
     * vrstvy (proto je nesmí zachytit closure renderu, ve kterém vznikla).
     */
    const latestRef = useRef({taxonId: params?.taxonId, onSquareDoubleClick, navigate});

    useEffect(() => {
        latestRef.current = {taxonId: params?.taxonId, onSquareDoubleClick, navigate};
    }, [params?.taxonId, onSquareDoubleClick, navigate]);

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
     * Zavře otevíravé popupy. `map.closePopup()` bez argumentu zavře i ty, které
     * z `currentPopupRef` vypadly – dřív jich mohlo zůstat otevřených víc (každá
     * odpověď WFS si zaregistrovala vlastní `map.on('click')`) a jejich kontejner
     * pak polykal kliky na mapu pod sebou.
     */
    const closeAllPopups = useCallback(() => {
        map.closePopup();
        currentPopupRef.current = null;
    }, [map]);

    /**
     * Zruší popup plánovaný po kliknutí – volá se při dvojkliku a pravém kliku.
     */
    const cancelPendingPopup = useCallback(() => {
        if (clickTimeoutRef.current) {
            clearTimeout(clickTimeoutRef.current);
            clickTimeoutRef.current = null;
        }
    }, []);

    /**
     * Handle double-click on a square feature - cancel pending click popup and navigate
     */
    const handleDoubleClick = useCallback((e: L.LeafletEvent) => {
        const layer = e.target as FeaturePath;
        const feature = layer.feature;

        // Cancel any pending click popup
        cancelPendingPopup();
        closeAllPopups();

        // Callback se bere z latestRef: listner je navázaný při založení vrstvy a
        // s closure z tehdejšího renderu by měl navěky `taxonId === undefined`.
        const navigateToSquare = latestRef.current.onSquareDoubleClick;
        if (!feature || !navigateToSquare) return;

        // Get square ID from feature properties
        const squareId = feature.properties.name;
        if (squareId) {
            navigateToSquare(squareId);
        }
    }, [cancelPendingPopup, closeAllPopups]);

    /**
     * Handle right-click (contextmenu) on a square feature - show popup with link to detail page.
     * Navigates to the same location as double-click, for users who can't double-click fast enough.
     */
    const handleContextMenu = useCallback((e: L.LeafletEvent) => {
        // Suppress the browser's native context menu
        (e as L.LeafletMouseEvent).originalEvent.preventDefault();

        const layer = e.target as FeaturePath;
        const feature = layer.feature;
        if (!feature) return;

        const squareId = feature.properties.name;
        if (!squareId) return;

        // Cancel any pending single-click popup (defensive - browsers don't fire 'click' for right button)
        cancelPendingPopup();

        // Close existing popup if any
        closeAllPopups();

        // taxonId i navigate se čtou z latestRef – listner žije celou dobu vrstvy
        const {taxonId, navigate: navigateTo} = latestRef.current;
        const latlng = (e as L.LeafletMouseEvent).latlng;

        // Without a taxon there is no detail page to link to - show square name only
        if (!taxonId) {
            currentPopupRef.current = L.popup({closeOnClick: false})
                .setLatLng(latlng)
                .setContent(`<div style="font-size: 13px; padding: 5px;"><b>${squareId}</b></div>`)
                .openOn(map);
            return;
        }

        const detailUrl = `/atlas/mapDetail/${taxonId}/${squareId}`;

        // Create and open popup with link at right-click location
        const popup = L.popup({closeOnClick: false})
            .setLatLng(latlng)
            .setContent(`
                <div style="font-size: 13px; padding: 5px;">
                    <b>${squareId}</b><br/>
                    <a href="${detailUrl}" style="color: #1976d2; text-decoration: underline; cursor: pointer;">Open square detail &rarr;</a>
                </div>
            `)
            .openOn(map);
        currentPopupRef.current = popup;

        // Intercept link click for SPA navigation (href stays as fallback for middle-click / open in new tab)
        const link = popup.getElement()?.querySelector('a');
        link?.addEventListener('click', (ev) => {
            ev.preventDefault();
            map.closePopup(popup);
            currentPopupRef.current = null;
            navigateTo(detailUrl);
        });
    }, [map, cancelPendingPopup, closeAllPopups]);

    /**
     * Handle mouseover on a square feature - highlight + show label (from zoom 10+)
     */
    const handleMouseOver = useCallback((e: L.LeafletEvent) => {
        const layer = e.target as FeaturePath;
        const feature = layer.feature;

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
     * Handle click on a square feature - show popup with square info after a delay
     * If dblclick occurs within the delay, the popup is cancelled
     * Uses the click coordinates for popup position, not the centroid
     */
    const handleFeatureClick = useCallback((e: L.LeafletEvent) => {
        const layer = e.target as FeaturePath;
        const feature = layer.feature;

        if (!feature) {
            return;
        }

        // Druhý (a další) klik dvojitého kliknutí popup neovlivní – navigaci už
        // vyřídil listner na dblclick.
        if ((e as L.LeafletMouseEvent).originalEvent.detail > 1) {
            return;
        }

        // Use the click coordinates
        const clickLatLng = (e as L.LeafletMouseEvent).latlng;

        // Clear any existing timeout
        cancelPendingPopup();

        // Set a timeout to show the popup - if dblclick occurs first, it will be cancelled
        clickTimeoutRef.current = setTimeout(() => {
            // Close existing popup if any
            closeAllPopups();

            // Create and open popup at click location
            const popup = L.popup({closeOnClick: false})
                .setLatLng(clickLatLng)
                .setContent(createPopupContent(clickLatLng))
                .openOn(map);

            currentPopupRef.current = popup;
            clickTimeoutRef.current = null;
        }, SQUARE_CLICK_POPUP_DELAY_MS);
    }, [map, cancelPendingPopup, closeAllPopups, createPopupContent]);

    /**
     * Handle click on empty map area (not on any feature) - show popup with coordinates.
     * Na čtverec sem děj nedorazí, ty mají `bubblingMouseEvents: false`.
     */
    const handleMapBackgroundClick = useCallback((e: L.LeafletMouseEvent) => {
        // Druhý klik dvojitého kliknutí nic nového nepřináší – popup by se jen
        // otevřel v okamžiku, kdy uživatel dvojklikuje (a zavřel tak výsledek).
        if (e.originalEvent.detail > 1) {
            return;
        }

        // Close existing popup if any
        closeAllPopups();

        // Use the click coordinates
        const clickLatLng = e.latlng;

        // Create and open popup at click location
        const popup = L.popup({closeOnClick: false})
            .setLatLng(clickLatLng)
            .setContent(createPopupContent(clickLatLng))
            .openOn(map);

        currentPopupRef.current = popup;
    }, [map, closeAllPopups, createPopupContent]);

    /**
     * Fetch and load WFS data
     *
     * Běží jednou za mount – interakční listnery čtou proměnlivé hodnoty z
     * `latestRef`, takže se vrstva kvůli `params` ani callbackům nemusí zakládat
     * podruhé. I kdyby přece jen běželo víc požadavků, `guard` s `AbortController`
     * zamezí, aby se na mapě objevila odpověď toho staršího.
     */
    useEffect(() => {
        const guard = createResponseGuard();
        const controller = new AbortController();

        // Klik na prázdné místo mapy se registruje hned (ne až po dotazu), aby
        // cleanup vždy odpovídal registraci – i když se fetch zruší před odpovědí.
        map.on('click', handleMapBackgroundClick);

        const fetchWfsData = async () => {
            if (!map || !visibleRef.current) return;

            const wfsUrl = buildWfsUrl();
            const token = guard.begin(wfsUrl);

            try {
                const data = await fetchWfsGeoJson<WFSResponse>(wfsUrl, controller.signal);

                // Pozdní odpověď (po zrušení efektu nebo po spuštění novějšího
                // požadavku) se zahodí – jinak by na mapu vrátila vrstvu, jejíž
                // cleanup už proběhl.
                if (!guard.isCurrent(token, wfsUrl)) return;

                // Remove existing layer if any
                if (geoJsonLayerRef.current) {
                    map.removeLayer(geoJsonLayerRef.current);
                }

                // Create GeoJSON layer with styling and events
                const geoJsonLayer = L.geoJSON(undefined, {
                    // Vypnutí bubrování patří sem: Leaflet se dívá na options vrstvy
                    // (`_findEventTargets`). Jako třetí argument `on()` by hodnota
                    // šla jako kontext handleru a klik na čtverec by navíc spustil
                    // i popup na pozadí.
                    bubblingMouseEvents: false,
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
                            (pathLayer as FeaturePath).feature = feature;

                            // Attach event listeners (třetí argument `on()` je kontext
                            // handleru, ne options – `bubblingMouseEvents` se nastavuje
                            // u vrstvy)
                            pathLayer.on('mouseover', handleMouseOver);
                            pathLayer.on('mouseout', handleMouseOut);
                            pathLayer.on('click', handleFeatureClick);
                            pathLayer.on('dblclick', handleDoubleClick);
                            pathLayer.on('contextmenu', handleContextMenu);

                            // Store cleanup function on the layer
                            (pathLayer as FeaturePath)._squaresCleanup = () => {
                                pathLayer.off('mouseover', handleMouseOver);
                                pathLayer.off('mouseout', handleMouseOut);
                                pathLayer.off('click', handleFeatureClick);
                                pathLayer.off('dblclick', handleDoubleClick);
                                pathLayer.off('contextmenu', handleContextMenu);
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
                    geoJsonLayer.setStyle({opacity: 0, fillOpacity: 0});
                }

                // Add to map
                geoJsonLayer.addTo(map);
                geoJsonLayerRef.current = geoJsonLayer;

            } catch (error) {
                // Zrušení při unmountu/re-run efektu není chyba uživatele
                if (controller.signal.aborted) return;
                logError(error, {source: 'SquaresOverlay'});
            }
        };

        fetchWfsData();

        // Cleanup on unmount
        return () => {
            // Zahodit i odpověď, která je už na lince
            guard.cancel();
            controller.abort();

            // Remove map click listener
            map.off('click', handleMapBackgroundClick);

            // Clear any pending click timeout
            cancelPendingPopup();

            if (geoJsonLayerRef.current) {
                // Clean up event listeners on all layers (including nested)
                const cleanupLayer = (layer: L.Layer) => {
                    const cleanup = (layer as FeaturePath)._squaresCleanup;
                    if (cleanup) cleanup();

                    // If it's a group, clean up child layers too
                    if ('getLayers' in layer) {
                        (layer as L.LayerGroup).getLayers().forEach(cleanupLayer);
                    }
                };

                geoJsonLayerRef.current.eachLayer((layer) => {
                    cleanupLayer(layer);
                });

                closeAllPopups();

                if (currentLabelRef.current) {
                    map.removeLayer(currentLabelRef.current);
                }

                map.removeLayer(geoJsonLayerRef.current);
                geoJsonLayerRef.current = null;
            }
        };
        // Deps jsou záměrně jen stabilní hodnoty (mapa, factory a handlery, které
        // čtou z latestRef) – effect se tedy nepřehrává při každém renderu ani po
        // dojití dotazu na taxon.
    }, [map, buildWfsUrl, minZoom, handleMouseOver, handleMouseOut, handleFeatureClick,
        handleDoubleClick, handleContextMenu, handleMapBackgroundClick, createPopupContent,
        cancelPendingPopup, closeAllPopups]);

    /**
     * Update visibility when prop changes
     */
    useEffect(() => {
        if (geoJsonLayerRef.current) {
            if (visible) {
                geoJsonLayerRef.current.setStyle({opacity: 1, fillOpacity: 0.05});
            } else {
                geoJsonLayerRef.current.setStyle({opacity: 0, fillOpacity: 0});
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
