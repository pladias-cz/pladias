/**
 * Sdílená notifikace chyby načtení `useQuery` – React Query v5 nemá per-query
 * `onError` callback, chyba se notifikuje efektem nad `error` stavem query
 * (vzor `TaxaAdministration`, `MapDetail`, `Data`). Centralizace kvůli desítkám
 * migrovaných komponent (P1 konsistence); loguje centrálně QueryCache
 * (`queryClient.ts`), uživateli chybu ukáže `notifyApiError` – ta přeskakuje
 * chyby už oznámené apiClientem (403, síť) a přerušené requesty.
 */

import {useEffect} from 'react';
import {notifyApiError} from '@/stores/notificationStore';

/**
 * @param error `error` stav useQuery (unknown | null)
 * @param fallbackMessage lokalizovaný fallback – v konzumentovi `t("…")`
 */
export function useQueryErrorNotify(error: unknown, fallbackMessage: string): void {
    useEffect(() => {
        if (error) {
            notifyApiError(error, fallbackMessage);
        }
    }, [error, fallbackMessage]);
}
