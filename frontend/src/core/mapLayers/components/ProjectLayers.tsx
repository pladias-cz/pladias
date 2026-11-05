/**
 * ProjectLayers Component
 *
 * Dynamically renders WMS layers for each project that has records for the current taxon.
 * Fetches project data from the API and creates WMS layers with appropriate parameters.
 * Integrates with the layer management system for visibility control.
 */

import {useMemo, useState} from 'react';
import {WMSTileLayer} from 'react-leaflet';
import type {WMSParams} from 'leaflet';
import {useQuery} from '@tanstack/react-query';
import {getTaxonRecordsByProject} from '@/services/taxonApi';
import {useLayerState} from '../store/layerStore';
import {PROJECT_LAYER_TEMPLATE} from '../registry/groups/projectLayers';

export interface ProjectLayersProps {
    taxonId?: number;
    mapName: string;
}

interface GeoServerWMSParams extends WMSParams {
    viewparams?: string;
    tiled?: boolean;
}

/**
 * Component that dynamically creates WMS layers for each project
 * and manages their visibility through the layer store
 */
export function ProjectLayers({taxonId, mapName}: ProjectLayersProps) {
    // projekty taxonu pro dynamické WMS vrstvy – bez cache (sekce J)
    const {data} = useQuery({
        queryKey: ['taxonRecordsByProject', taxonId],
        queryFn: () => getTaxonRecordsByProject(taxonId!),
        enabled: taxonId !== undefined,
    });
    // memoizace i pro prázdný fallback – jinak by identita pole měnila deps
    // useMemo níže (eslint-plugin-react-hooks/exhaustive-deps) při každém renderu
    const projects = useMemo(() => data ?? [], [data]);

    // Build WMS configs for each project - memoized to prevent re-renders
    const layerConfigs = useMemo(() => {
        if (!taxonId || projects.length === 0) {
            return [];
        }

        return projects.map((projectRecord) => {
            const projectId = projectRecord.project.id;
            const viewParams = `TAXON_ID:${taxonId};PROJECT_ID:${projectId}`;
            const params: GeoServerWMSParams = {
                layers: 'validation:project_per_quadrant',
                format: 'image/png',
                transparent: true,
                version: '1.3.0',
                tiled: true,
                viewparams: viewParams,
            };

            return {
                id: `project_${projectId}`,
                url: '/geoserver/validation/ows',
                params,
            };
        });
    }, [taxonId, projects]);

    if (!taxonId || layerConfigs.length === 0) {
        return null;
    }

    return (
        <>
            {layerConfigs.map(config => (
                <ProjectLayer
                    key={config.id}
                    layerId={config.id}
                    url={config.url}
                    params={config.params}
                    mapName={mapName}
                />
            ))}
        </>
    );
}

/**
 * Individual project layer component that subscribes to visibility state.
 * Uses lazy mounting: the WMS layer is only created once it has been enabled,
 * so disabled project layers never request tiles from GeoServer.
 */
function ProjectLayer({
                          layerId,
                          url,
                          params,
                          mapName,
                      }: {
    layerId: string;
    url: string;
    params: GeoServerWMSParams;
    mapName: string;
}) {
    // Default to false while the layer has not been registered in the store yet
    // (registration in useProjectLayers applies the saved visibility).
    const layerState = useLayerState(mapName, layerId);
    const visible = layerState?.visible ?? false;

    // Lazy mount: create the layer only after it is enabled for the first time.
    // Once mounted it stays mounted and is hidden via opacity, so toggling
    // visibility does not cancel or re-issue tile requests. Render-phase update
    // guarded by comparison (React docs: adjusting state when a prop changes).
    const [mounted, setMounted] = useState(visible);
    if (visible && !mounted) {
        setMounted(true);
    }

    if (!mounted) {
        return null;
    }

    return (
        <WMSTileLayer
            key={layerId}
            url={url}
            params={params}
            opacity={visible ? 1 : 0}
            zIndex={PROJECT_LAYER_TEMPLATE.zIndex}
            attribution="PLADIAS contributors"
        />
    );
}

export default ProjectLayers;
