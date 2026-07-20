/**
 * Base Layer Source Adapter
 */

import type { TileLayer } from 'leaflet';
import type { LayerDefinition, LayerParams } from '../../types';

export abstract class BaseLayerAdapter {
    abstract readonly source: string;
    
    abstract createLayer(
        definition: LayerDefinition,
        params: LayerParams
    ): TileLayer;
    
    protected getDefaultOptions(): Record<string, unknown> {
        return {};
    }
    
    protected mergeOptions(
        definition: LayerDefinition,
        userOptions: Record<string, unknown> = {}
    ): Record<string, unknown> {
        const defaults = this.getDefaultOptions();
        return {
            ...defaults,
            ...userOptions,
            attribution: definition.attribution ?? defaults.attribution,
        };
    }
}
