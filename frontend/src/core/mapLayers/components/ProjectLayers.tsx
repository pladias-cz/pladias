/**
 * ProjectLayers Component
 * 
 * Dynamically renders WMS layers for each project that has records for the current taxon.
 * Fetches project data from the API and creates WMS layers with appropriate parameters.
 * Integrates with the layer management system for visibility control.
 */

import { useEffect, useState, useMemo } from 'react';
import { WMSTileLayer } from 'react-leaflet';
import type { WMSParams } from 'leaflet';
import axios from 'axios';
import { useLayerState } from '../store/layerStore';

interface TaxonStatisticsResponse {
    data: TaxonStatisticsDto;
}

interface TaxonStatisticsDto {
    recordsByProject: ProjectRecordCountDto[];
}

interface ProjectRecordCountDto {
    project: {
        id: number;
    };
    recordCount: number;
}

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
export function ProjectLayers({ taxonId, mapName }: ProjectLayersProps) {
    const [projects, setProjects] = useState<ProjectRecordCountDto[]>([]);

    // Fetch projects when taxonId changes
    useEffect(() => {
        if (!taxonId) {
            setProjects([]);
            return;
        }

        axios.get<TaxonStatisticsResponse>(`/api/react/taxonStatistics/${taxonId}`)
            .then(response => {
                if (response.data && response.data.data) {
                    setProjects(response.data.data.recordsByProject || []);
                } else {
                    setProjects([]);
                }
            })
            .catch(err => {
                console.error('Failed to load taxon projects:', err);
                setProjects([]);
            });
    }, [taxonId]);

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
 * Individual project layer component that subscribes to visibility state
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
    const layerState = useLayerState(mapName, layerId);
    const visible = layerState?.visible ?? true;

    return (
        <WMSTileLayer
            key={layerId}
            url={url}
            params={params}
            opacity={visible ? 1 : 0}
            attribution="PLADIAS contributors"
        />
    );
}

export default ProjectLayers;
