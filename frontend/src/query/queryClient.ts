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
 * Výjimka (24. 10. 2026): stabilní číselníky se cachují dle mapy
 * CACHED_CATALOGS níže; zbytek appky (záznamy, taxony, uživatelská data)
 * zůstává bez cache.
 *
 * Chyby query/mutací se logují centrálně (`services/logger` – sekce F);
 * uživatelskou notifikaci řeší konkrétní komponenta přes `notifyApiError`
 * (logError je idempotentní per instance, duplikát v logu nevznikne).
 */

import {MutationCache, QueryCache, QueryClient} from '@tanstack/react-query';
import {logError} from '@/services/logger';

/** Den v ms – základní krok TTL číselníků. */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Číselníky s výjimkou z bez-cache politiky (24. 10. 2026): stabilní data
 * se při přecházení mezi obrazovkami nenačítají znovu. Klíč mapy = první
 * prvek queryKey, hodnota = TTL v ms (Infinity = celá session prohlížeče;
 * reload stránky vždy načte znovu, selhaný prvotní fetch se při dalším
 * mountu zopakuje – error query je vždy stale). Expiraci jednotlivých
 * číselníků doladíš změnou jedné hodnoty.
 */
const CACHED_CATALOGS: Record<string, number> = {
    // v historii projektu se nikdy nezměnily – cache na celou session:
    phytochorions: Infinity,
    revisionStatuses: Infinity,
    publicationStatuses: Infinity,
    projects: Infinity,
    institutions: Infinity,
    licenses: Infinity,
    taxonRanks: Infinity,
    // mění se zřídka – 24 h:
    herbariums: DAY_MS,
};

export function createQueryClient(): QueryClient {
    const client = new QueryClient({
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

    // Cache číselníků dle CACHED_CATALOGS. `refetchOnMount: true` přepisuje
    // globální 'always' – mount refetche až po vypršení TTL (globální
    // varianta by cachování zrušila). `gcTime = TTL` zahodí nepoužívaná data
    // z paměti současně s jejich zestárnutím.
    for (const [key, ttl] of Object.entries(CACHED_CATALOGS)) {
        client.setQueryDefaults([key], {
            staleTime: ttl,
            gcTime: ttl,
            refetchOnMount: true,
        });
    }

    return client;
}
