/**
 * TanStack Query jednotný data-fetching aplikace.
 *
 * Rozhodnutí (21. 10. 2026): enterprise varianta, ale BEZ CACHE – všechna
 * data včetně číselníků jsou dynamická a načítají se při každém mountu
 * komponenty znovu:
 *  - `staleTime: 0` + `refetchOnMount: "always"` – mount nikdy nepoužije
 *    dosluživlou odpověď a vždy načte znovu,
 *  - `gcTime: 0` – se ztrátou posledního observera se cache zahodí; mezi
 *    obrazovkami se nic nesdílí (souběžně namontovaní observeré pouze
 *    sdílí jeden in-flight požadavek – deduplikace, nikoli cache),
 *  - `refetchOnWindowFocus`/`refetchOnReconnect: false` – předvídatelný
 *    objem požadavků (žádné refetche na přepnutí okna jako dosud),
 *  - `retry: false` – jeden pokus jako dosud; 403 a síťové chyby hlásí
 *    apiClient centrálně (sekce F), retry by hlášky duplikovalo.
 *
 * Chyby query/mutací se logují centrálně (`services/logger` – sekce F);
 * uživatelskou notifikaci řeší konkrétní komponenta přes `notifyApiError`
 * (logError je idempotentní per instance, duplikát v logu nevznikne).
 */

import {MutationCache, QueryCache, QueryClient} from '@tanstack/react-query';
import {logError} from '@/services/logger';

export function createQueryClient(): QueryClient {
    return new QueryClient({
        queryCache: new QueryCache({
            onError: (error, query) => logError(error, {source: 'react-query', queryKey: query.queryKey}),
        }),
        mutationCache: new MutationCache({
            // signatura: (error, variables, onMutateResult, mutation, context)
            onError: (error, _variables, _onMutateResult, mutation) =>
                logError(error, {source: 'react-query', mutationKey: mutation.options.mutationKey}),
        }),
        defaultOptions: {
            queries: {
                staleTime: 0,
                gcTime: 0,
                refetchOnMount: 'always',
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
                retry: false,
            },
        },
    });
}
