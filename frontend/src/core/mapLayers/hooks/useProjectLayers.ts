/**
 * useProjectLayers Hook
 *
 * Manages dynamic project layers for a map instance.
 * Fetches projects for the current taxon and registers them as layers.
 * Returns the list of project layer IDs for use with LayerSwitcher.
 */

import {useEffect, useMemo} from 'react';
import {useQuery} from '@tanstack/react-query';
import {useLayerStore, getVisibilityStorageKey} from '../store/layerStore';
import {getTaxonRecordsByProject} from '@/services/taxonApi';
import {getUserSetting} from '@/services/settingsApi';

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
    const {addLayer} = useLayerStore();

    // projekty taxonu – bez cache (sekce J), načtení při mountu
    const projectsQuery = useQuery({
        queryKey: ['taxonRecordsByProject', taxonId],
        queryFn: () => getTaxonRecordsByProject(taxonId!),
        enabled: taxonId !== undefined,
    });
    // memoizace i pro prázdný fallback – jinak by identita pole měnila deps
    // efektu i useMemo níže (eslint-plugin-react-hooks/exhaustive-deps) při každém renderu
    const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

    // Load saved visibility BEFORE adding layers; selhání tichý fallback na
    // prázdnou množinu jako dřív (vrstvy začí s výchozí viditelností)
    const visibilityKey = getVisibilityStorageKey(mapName);
    const visibilityQuery = useQuery({
        queryKey: ['userSetting', visibilityKey],
        queryFn: async () => {
            try {
                // `null` = uživatel nemá uloženou viditelnost → výchozí hodnoty vrstev
                const value = await getUserSetting(visibilityKey);
                return value ? new Set(JSON.parse(value) as string[]) : new Set<string>();
            } catch {
                return new Set<string>();
            }
        },
        enabled: taxonId !== undefined,
    });
    const savedVisibility = visibilityQuery.data ?? null;

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
                params: {taxonId, projectId: String(projectId)},
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
        loading: projectsQuery.isPending,
        error: projectsQuery.error ? 'Failed to load projects' : null,
    };
}

export default useProjectLayers;
