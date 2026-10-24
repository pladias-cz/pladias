/**
 * Sdílený hook číselníků (sekce J): `useQuery` nad service loaderem.
 * Cache politika centrálně v `queryClient.ts` – výchozí je bez cache (číselníky
 * jsou dynamická, každý mount je načte znovu), stabilní výjimky se cachují
 * (viz CACHED_CATALOGS tamtéž). Selhání nechá číselník prázdný (select
 * zůstane použitelný); 403 a síťové chyby hlásí centrálně apiClient (sekce F).
 */

import {useQuery} from '@tanstack/react-query';

export function useCatalogQuery<T>(
    queryKey: readonly unknown[],
    loader: () => Promise<T[]>,
    options?: { enabled?: boolean },
): T[] {
    const {data} = useQuery({
        queryKey,
        queryFn: () => loader(),
        enabled: options?.enabled ?? true,
    });

    return data ?? [];
}
