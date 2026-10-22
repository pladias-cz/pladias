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
 */

import {QueryClient} from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 0,
                gcTime: 0,
                refetchOnMount: "always",
                refetchOnWindowFocus: false,
                refetchOnReconnect: false,
                retry: false,
            },
        },
    });
}
