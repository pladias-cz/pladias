/**
 * Universal Layer Adapter
 * 
 * Single adapter that can create any type of layer based on configuration.
 * Replaces the need for multiple adapter classes by using service configurations.
 */

import L from 'leaflet';
import type { 
    LayerDefinition, 
    LayerParams,
    ServiceConfig,
    GeoServerConfig,
    TileConfig,
    ApiConfig,
    StaticConfig,
} from '../../types';

export class UniversalLayerAdapter {
    /**
     * Create a Leaflet layer from a layer definition and parameters
     */
    createLayer(definition: LayerDefinition, params: LayerParams = {}): L.Layer {
        // Use new service config if available, fall back to legacy source handling
        if (definition.service) {
            return this.createFromServiceConfig(definition, definition.service, params);
        }
        
        // Legacy fallback for existing layers
        return this.createLegacyLayer(definition, params);
    }

    /**
     * Create layer using new service configuration system
     */
    private createFromServiceConfig(
        definition: LayerDefinition, 
        serviceConfig: ServiceConfig, 
        params: LayerParams
    ): L.Layer {
        const interpolatedUrl = this.interpolateTemplate(serviceConfig.baseUrl, params);
        
        switch (serviceConfig.type) {
            case 'geoserver':
                return this.createGeoServerLayer(definition, interpolatedUrl, serviceConfig.config, params);
                
            case 'tile':
                return this.createTileLayer(definition, interpolatedUrl, serviceConfig.config, params);
                
            case 'api':
                return this.createApiLayer(definition, interpolatedUrl, serviceConfig.config, params);
                
            case 'static':
                return this.createStaticLayer(definition, interpolatedUrl, serviceConfig.config, params);
                
            default:
                throw new Error(`Unsupported service type: ${(serviceConfig as any).type}`);
        }
    }

    /**
     * Create GeoServer layer (WMS/WFS)
     */
    private createGeoServerLayer(
        _definition: LayerDefinition,
        baseUrl: string,
        config: GeoServerConfig['config'],
        params: LayerParams
    ): L.Layer {
        const queryParams = this.buildGeoServerParams(config, params);
        
        if (config.service === 'WFS') {
            return this.createWfsLayer(baseUrl, queryParams);
        } else {
            // Build WMS params - use layers from config, not typeName
            const wmsParams: L.WMSParams = {
                layers: config.layers || (queryParams.layers as string) || 'default',
                format: config.format || 'image/png',
                transparent: config.transparent !== undefined ? config.transparent : true,
                version: config.version || '1.1.1',
                styles: config.styles,
            };
            return L.tileLayer.wms(baseUrl, wmsParams);
        }
    }

    /**
     * Build GeoServer query parameters
     */
    private buildGeoServerParams(
        config: GeoServerConfig['config'], 
        params: LayerParams
    ): Record<string, string | number | boolean> {
        const result: Record<string, string | number | boolean> = {
            service: config.service,
            version: config.version || (config.service === 'WFS' ? '1.0.0' : '1.1.1'),
            request: config.service === 'WFS' ? 'GetFeature' : 'GetMap',
            format: config.outputFormat || (config.service === 'WFS' ? 'application/json' : 'image/png'),
        };

        if (config.typeName) result.typeName = config.typeName;
        if (config.layers) result.layers = this.interpolateTemplate(config.layers, params);

        if (config.viewParams && config.viewParams.length > 0) {
            const viewParamsStr = config.viewParams
                .map(param => this.interpolateTemplate(param, params))
                .filter(param => !param.includes('{'))
                .join(';');
            if (viewParamsStr) result.viewparams = viewParamsStr;
        }

        if (config.cqlFilter) {
            const interpolatedFilter = this.interpolateTemplate(config.cqlFilter, params);
            if (!interpolatedFilter.includes('{')) {
                result.cql_filter = interpolatedFilter;
            }
        }

        // Add bbox parameter for WFS layers if bounds are provided
        // This enables spatial filtering to avoid downloading all data
        if (config.service === 'WFS' && params.bounds) {
            const { north, south, east, west } = params.bounds;
            // Format: minLon,minLat,maxLon,maxLat,CRS:EPSG:4326
            result.bbox = `${west.toFixed(6)},${south.toFixed(6)},${east.toFixed(6)},${north.toFixed(6)},EPSG:4326`;
        }

        return result;
    }

    /**
     * Create WFS layer (GeoJSON)
     */
    private createWfsLayer(baseUrl: string, queryParams: Record<string, unknown>): L.Layer {
        const url = this.buildQueryUrl(baseUrl, queryParams);
        
        console.log('[UniversalAdapter.createWfsLayer] Creating WFS layer with URL:', url);
        console.log('[UniversalAdapter.createWfsLayer] Query params:', queryParams);
        
        const geoJsonLayer = L.geoJSON(undefined, {
            pointToLayer: (_feature, latlng) => L.circleMarker(latlng, {
                radius: 8,
                fillColor: '#ff7800',
                color: '#000',
                weight: 2,
                opacity: 1,
                fillOpacity: 0.8
            }),
            style: {
                color: '#ff7800',
                weight: 2,
                opacity: 0.8
            }
        });

        fetch(url)
            .then(response => {
                console.log('[UniversalAdapter.createWfsLayer] Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('[UniversalAdapter.createWfsLayer] Received data:', data);
                if (data && data.features) {
                    console.log('[UniversalAdapter.createWfsLayer] Adding', data.features.length, 'features to map');
                    geoJsonLayer.addData(data);
                } else {
                    console.warn('[UniversalAdapter.createWfsLayer] No features in response:', data);
                }
            })
            .catch(error => {
                console.error('[UniversalAdapter.createWfsLayer] Failed to load WFS data:', error);
                console.error('[UniversalAdapter.createWfsLayer] URL was:', url);
            });

        return geoJsonLayer;
    }

    /**
     * Create tile layer (XYZ)
     */
    private createTileLayer(
        definition: LayerDefinition,
        url: string,
        config: TileConfig['config'],
        _params: LayerParams
    ): L.TileLayer {
        const options: L.TileLayerOptions = {};

        // Only set options that have valid values
        if (definition.attribution || config.attribution) {
            options.attribution = definition.attribution || config.attribution;
        }
        
        if (config.maxZoom !== undefined) {
            options.maxZoom = config.maxZoom;
        } else {
            options.maxZoom = 19; // Default
        }
        
        if (config.minZoom !== undefined) {
            options.minZoom = config.minZoom;
        } else {
            options.minZoom = 0; // Default
        }
        
        if (config.detectRetina !== undefined) {
            options.detectRetina = config.detectRetina;
        }
        
        if (config.subdomains && config.subdomains.length > 0) {
            options.subdomains = config.subdomains;
        }
        
        if (config.crossOrigin !== undefined) {
            options.crossOrigin = config.crossOrigin as L.CrossOrigin;
        }
        
        if (config.errorTileUrl) {
            options.errorTileUrl = config.errorTileUrl;
        }
        
        if (config.tileSize) {
            options.tileSize = config.tileSize;
        }

        return L.tileLayer(url, options);
    }

    /**
     * Placeholder methods for other layer types
     */
    private createApiLayer(_definition: LayerDefinition, _baseUrl: string, _config: ApiConfig['config'], _params: LayerParams): L.Layer {
        console.warn('API layers not yet implemented');
        return L.geoJSON();
    }

    private createStaticLayer(_definition: LayerDefinition, _url: string, _config: StaticConfig['config'], _params: LayerParams): L.Layer {
        console.warn('Static layers not yet implemented');
        return L.geoJSON();
    }

    /**
     * Legacy layer creation (for backward compatibility)
     */
    private createLegacyLayer(definition: LayerDefinition, params: LayerParams): L.Layer {
        const { TileLayerAdapter } = require('./tileLayerAdapter');
        const adapter = new TileLayerAdapter();
        return adapter.createLayer(definition, params);
    }

    /**
     * Interpolate template string with parameter values
     */
    private interpolateTemplate(template: string, params: LayerParams): string {
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            const value = params[key];
            return value !== undefined ? String(value) : match;
        });
    }

    /**
     * Build URL with query parameters
     */
    private buildQueryUrl(baseUrl: string, queryParams: Record<string, unknown>): string {
        const url = new URL(baseUrl, window.location.origin);
        
        Object.entries(queryParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        });
        
        return url.toString();
    }
}