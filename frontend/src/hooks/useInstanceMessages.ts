/**
 * Heartbeat zpráv o stavu instance.
 *
 * Jediný majitel pollingu `GET /api/react/infoGlobal` (přes useQuery):
 *  - **Respekt k viditelnosti:** skrytá záložka nepolluje (brána focusManageru),
 *    návrat do záložky provede ihned jeden dotaz (`refetchOnWindowFocus`).
 *  - **Exponenciální backoff:** po selhání se interval prodlužuje
 *    (60 s → 2 min → 5 min strop), po úspěchu reset na 30 s.
 *  - **Selhání nemaže zprávy:** poslední známé zprávy zůstávají v UI;
 *    až po třech po sobě jdoucích selháních se ukáže varování o nedostupnosti.
 *  - **401:** vypršení session řeší apiClient (přesměrování na /login).
 */

import {useRef} from 'react';
import {useQuery} from '@tanstack/react-query';
import {loadInstanceMessages} from '@/services/instanceApi';
import type {InstanceMessage} from '@/models/InstanceMessage';

/** Čekání před dalším dotazem podle počtu po sobě jdoucích selhání (index 0 = po úspěchu). */
const FAILURE_DELAYS_MS = [30_000, 60_000, 120_000, 300_000] as const;

/** Po tolika po sobě jdoucích selháních se zobrazí „zprávy jsou nedostupné“. */
const UNAVAILABLE_AFTER_FAILURES = 3;

export interface InstanceMessagesState {
    messages: InstanceMessage[];
    /** Backend opakovaně neodpovídá (zprávy o stavu instance jsou nedostupné). */
    unavailable: boolean;
}

export function useInstanceMessages(): InstanceMessagesState {
    // Po sobě jdoucí selhání nelze číst z `state.fetchFailureCount` – ten se
    // resetuje při každém startu fetche (počítá retry v rámci jednoho dotazu).
    // Místo toho sledujeme monotónní čítače dotazu (`errorUpdateCount` roste
    // o 1 s každým selháním a nerezetuje se startem fetche, `dataUpdateCount`
    // s každým úspěchem). Callback `refetchInterval` běží při každé změně
    // stavu dotazu (start fetche, úspěch, selhání), takže značky drží krok.
    const lastDataUpdateCountRef = useRef(-1);
    const errorsAtLastSuccessRef = useRef(0);
    const consecutiveFailuresRef = useRef(0);

    const {data} = useQuery({
        queryKey: ['instanceMessages'],
        // čtení `signal` zajišťuje zrušení rozjetého dotazu po odmontování
        queryFn: ({signal}) => loadInstanceMessages({signal}),
        // Kadence podle počtu po sobě jdoucích selhání (po úspěchu reset na 30 s).
        refetchInterval: (query) => {
            const {dataUpdateCount, errorUpdateCount} = query.state;
            if (dataUpdateCount > lastDataUpdateCountRef.current) {
                // přišla nová data → reset kadence i počítadla selhání
                lastDataUpdateCountRef.current = dataUpdateCount;
                errorsAtLastSuccessRef.current = errorUpdateCount;
                consecutiveFailuresRef.current = 0;
                return FAILURE_DELAYS_MS[0];
            }
            const failures = errorUpdateCount - errorsAtLastSuccessRef.current;
            consecutiveFailuresRef.current = failures;
            return FAILURE_DELAYS_MS[Math.min(failures, FAILURE_DELAYS_MS.length - 1)];
        },
        // Skrytá záložka intervalovým dotazům brání (refetchIntervalInBackground
        // zůstává false), návrat do záložky hned dotáhne – přebíjí klientský default.
        refetchOnWindowFocus: true,
        // Re-render po každé změně výsledku pollu (i při opakované stejné chybě,
        // kdy se instance chyby ani data nemusejí změnit) – `unavailable` se
        // jinak nemuselo přepočítat.
        notifyOnChangeProps: 'all',
    });

    return {
        messages: data ?? [],
        unavailable: consecutiveFailuresRef.current >= UNAVAILABLE_AFTER_FAILURES,
    };
}
