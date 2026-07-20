/**
 * useProjectLayers Hook
 * 
 * Manages dynamic project layers for a map instance.
 * Fetches projects for the current taxon and registers them as layers.
 * Returns the list of project layer IDs for use with LayerSwitcher.
 */

import { useEffect, useState, useMemo } from 'react';
import { useLayerStore, getVisibilityStorageKey } from '../store/layerStore';
import axios from 'axios';

interface ProjectDto {
    id: number;
    name: string;
    abbrev: string;
}

interface ProjectRecordCountDto {
    project: ProjectDto;
    recordCount: number;
}

interface TaxonStatisticsResponse {
    data: TaxonStatisticsDto;
}

interface TaxonStatisticsDto {
    recordsByProject: ProjectRecordCountDto[];
}

export interface UseProjectLayersReturn {
    /** Array of project layer IDs (e.g., ['project_1', 'project_2']) */
    projectLayerIds: string[];
    /** Loading state */
    loading: boolean;
    /** Error state */
    error: string | null;
}

/**
 * Hook to manage dynamic project layers
 * @param mapName - The map instance name
 * @param taxonId - The current taxon ID
 * @returns Object with project layer IDs and state
 */
export function useProjectLayers(
    mapName: string,
    taxonId?: number
): UseProjectLayersReturn {
    const { addLayer } = useLayerStore();
    const [projects, setProjects] = useState<ProjectRecordCountDto[]>([]);
    const [savedVisibility, setSavedVisibility] = useState<Set<string> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch projects when taxonId changes
    useEffect(() => {
        if (!taxonId) {
            setProjects([]);
            return;
        }

        setLoading(true);
        setError(null);

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
                setError('Failed to load projects');
                setProjects([]);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [taxonId]);

    // Load saved visibility BEFORE adding layers
    useEffect(() => {
        if (!taxonId) return;

        const loadSavedVisibility = async () => {
            try {
                const response = await fetch(
                    `/api/react/user/settings/${getVisibilityStorageKey(mapName)}`,
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.value) {
                        const saved: string[] = JSON.parse(data.value);
                        setSavedVisibility(new Set(saved));
                        return;
                    }
                }
                // No saved value - use empty set (all layers will use default)
                setSavedVisibility(new Set());
            } catch (err) {
                console.error('Failed to load saved visibility:', err);
                setSavedVisibility(new Set());
            }
        };

        loadSavedVisibility();
    }, [mapName, taxonId]);

    // Register project layers only after we have saved visibility
    useEffect(() => {
        if (!taxonId || projects.length === 0 || savedVisibility === null) {
            return;
        }

        projects.forEach((projectRecord) => {
            const projectId = projectRecord.project.id;
            const layerId = `project_${projectId}`;
            // Use project name if available, otherwise use abbrev
            const projectName = projectRecord.project.name || projectRecord.project.abbrev;
            const recordCount = projectRecord.recordCount;

            // Determine visibility: saved state takes precedence, then default to false
            const isVisible = savedVisibility.has(layerId);

            // Add layer to store
            addLayer(mapName, layerId, {
                visible: isVisible,
                params: { taxonId, projectId: String(projectId) },
                title: `${projectName} (${recordCount})`,
            });
        });
    }, [mapName, taxonId, projects, savedVisibility, addLayer]);

    // Build list of project layer IDs
    const projectLayerIds = useMemo(() => {
        return projects.map(p => `project_${p.project.id}`);
    }, [projects]);

    return {
        projectLayerIds,
        loading,
        error,
    };
}

export default useProjectLayers;
