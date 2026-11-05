import {useQuery} from '@tanstack/react-query';
import {getUserProjects} from '@/services/importApi';

/**
 * Projekty přidělené uživateli (import) – TanStack Query bez cache
 * (sekce J). Tvar návratu zachován: (projects, isLoading, error, refetch).
 */
export function useProjectsData() {
    const {data, isPending, error, refetch} = useQuery({
        queryKey: ['userProjects'],
        queryFn: getUserProjects,
    });

    return {
        projects: data ?? [],
        isLoading: isPending,
        error: error ? error.message : null,
        refetch: () => void refetch(),
    };
}
