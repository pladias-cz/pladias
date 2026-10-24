/**
 * WmsLayerView – renders WMS layer from GeoServerConfig (service: 'WMS') in the registry.
 *
 * The standard path only maps the config to the react-leaflet WMSTileLayer.
 * Layers with configured viewParams use the imperative variant
 * (WmsLayerWithParams) that updates viewparams via setParams
 * without having to re-create the layer.
 */

import {WMSTileLayer, useMap} from 'react-leaflet';
import {useEffect, useMemo, useRef} from 'react';
import * as L from 'leaflet';
import type {GeoServerConfig} from '../../types/serviceConfig';
import type {LayerParams} from '../../types';

export interface WmsLayerViewProps {
    /** GeoServer service configuration – the dispatcher in Layer.tsx guarantees service: 'WMS' */
    service: GeoServerConfig;
    /** zIndex from layer definition for proper stacking */
    zIndex: number;
    /** Attribution text from layer definition */
    attribution?: string;
    params: LayerParams;
    /** Visibility – the layer stays mounted, it only hides via opacity */
    visible: boolean;
}

export function WmsLayerView({service, zIndex, attribution, params, visible}: WmsLayerViewProps) {
    const config = service.config;

    // If viewParams are specified, use custom component that can handle them properly
    if (config.viewParams && config.viewParams.length > 0) {
        return <WmsLayerWithParams service={service} zIndex={zIndex} attribution={attribution} params={params}
                                   visible={visible}/>;
    }

    // Standard WMS without viewParams
    const layers = config.layers?.replace(/\{(\w+)\}/g, (_: string, key: string) => {
        return params[key] !== undefined ? String(params[key]) : '';
    });

    const wmsProps: React.ComponentProps<typeof WMSTileLayer> = {
        url: service.baseUrl,
        layers: layers || config.typeName || '',
        format: config.format || 'image/png',
        transparent: config.transparent ?? true,
        version: config.version || '1.1.1',
        attribution: attribution,
        opacity: visible ? 1 : 0,
        zIndex: zIndex,
    };

    if (config.styles) {
        wmsProps.styles = config.styles;
    }

    return <WMSTileLayer {...wmsProps} />;
}

/**
 * Custom WMS component that supports viewParams (e.g., for GeoServer)
 */
function WmsLayerWithParams({service, zIndex, attribution, params, visible}: WmsLayerViewProps) {
    const map = useMap();
    const layerRef = useRef<L.TileLayer.WMS | null>(null);
    const visibleRef = useRef(visible);

    const config = service.config;

    // Interpolate layers string
    const layers = config.layers?.replace(/\{(\w+)\}/g, (_: string, key: string) => {
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
        if (!map || !layers) return;

        // `viewparams` je GeoServer rozšíření WMS (filtrování dat na serveru),
        // které leaflet typy nemodelují – proto rozšířený typ proměnné
        const wmsOptions: L.WMSOptions & { viewparams?: string } = {
            layers: layers || '',
            format: config.format || 'image/png',
            transparent: config.transparent ?? true,
            version: config.version || '1.1.1',
            attribution: attribution,
            zIndex: zIndex,
            ...(config.styles && {styles: config.styles}),
        };
        if (viewParamsStr) {
            wmsOptions.viewparams = viewParamsStr;
        }
        const wmsLayer = L.tileLayer.wms(service.baseUrl, wmsOptions);

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
    }, [map, layers, service, config, viewParamsStr, zIndex, attribution]);

    // Update viewParams when they change
    useEffect(() => {
        if (!layerRef.current || !viewParamsStr) return;
        const nextParams: L.WMSParams & { viewparams?: string } = {layers: layers || '', viewparams: viewParamsStr};
        layerRef.current.setParams(nextParams);
    }, [viewParamsStr, layers]);

    // Update visibility
    useEffect(() => {
        visibleRef.current = visible;
        if (layerRef.current) {
            layerRef.current.setOpacity(visible ? 1 : 0);
        }
    }, [visible]);

    return null;
}
