import {useCallback, useState, useEffect} from 'react';
import {getUserProjects, type UserProject} from '@/services/importApi';

export function useProjectsData() {
    const [projects, setProjects] = useState<UserProject[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            setProjects(await getUserProjects());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch projects');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    return {
        projects,
        isLoading,
        error,
        refetch: fetchProjects,
    };
}
