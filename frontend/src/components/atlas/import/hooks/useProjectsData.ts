import {useCallback, useState, useEffect} from 'react';
import type {Project} from '../types';

export function useProjectsData() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/react/projects/user');
            
            if (!response.ok) {
                throw new Error('Failed to fetch projects');
            }

            const data = await response.json();
            if (data.success && data.projects) {
                setProjects(data.projects);
            } else {
                throw new Error('Invalid response format');
            }
        } catch (err: any) {
            setError(err.message || 'Unknown error');
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
