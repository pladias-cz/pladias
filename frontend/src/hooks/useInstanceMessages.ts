/**
 * Heartbeat zpráv o stavu instance (docs/refactoring.md, sekce A).
 *
 * Jediný majitel pollingu `GET /api/react/infoGlobal`:
 *  - **Respekt k viditelnosti:** při `document.hidden` se čekání pozastaví;
 *    návrat do záložky provede ihned jeden tik.
 *  - **Exponenciální backoff:** po selhání se interval prodlužuje
 *    (30 s → 1 min → 2 min → 5 min strop), po úspěchu reset na 30 s.
 *  - **Selhání nemaže zprávy:** poslední známé zprávy zůstávají v UI;
 *    až po třech po sobě jdoucích selháních se ukáže varování o nedostupnosti.
 *  - **401:** vypršení session řeší apiClient (přesměrování na /login).
 */

import {useEffect, useState} from "react";
import {loadInstanceMessages} from "@/services/instanceApi";
import type {InstanceMessage} from "@/models/InstanceMessage";

/** Čekání před dalším tikem podle počtu po sobě jdoucích selhání (index 0 = po úspěchu). */
const FAILURE_DELAYS_MS = [30_000, 60_000, 120_000, 300_000] as const;

/** Po tolika po sobě jdoucích selháních se zobrazí „zprávy jsou nedostupné“. */
const UNAVAILABLE_AFTER_FAILURES = 3;

export interface InstanceMessagesState {
    messages: InstanceMessage[];
    /** Backend opakovaně neodpovídá (zprávy o stavu instance jsou nedostupné). */
    unavailable: boolean;
}

export function useInstanceMessages(): InstanceMessagesState {
    const [messages, setMessages] = useState<InstanceMessage[]>([]);
    const [unavailable, setUnavailable] = useState(false);

    useEffect(() => {
        let cancelled = false;
        let timeoutId: number | undefined;
        let failures = 0;
        let tickInFlight = false;

        const schedule = (delayMs: number) => {
            timeoutId = window.setTimeout(() => {
                void tick();
            }, delayMs);
        };

        const tick = async () => {
            if (cancelled || tickInFlight) {
                return;
            }
            // Skrytá záložka nepolluje – pozastavení řeší visibilitychange,
            // návrat do záložky tik spustí ihned.
            if (document.hidden) {
                return;
            }

            tickInFlight = true;
            try {
                const loaded = await loadInstanceMessages();
                if (cancelled) {
                    return;
                }
                failures = 0;
                setUnavailable(false);
                setMessages(loaded);
                schedule(FAILURE_DELAYS_MS[0]);
            } catch (err) {
                if (cancelled) {
                    return;
                }
                failures += 1;
                setUnavailable(failures >= UNAVAILABLE_AFTER_FAILURES);
                console.error("Načtení zpráv o stavu instance selhalo:", err);
                schedule(FAILURE_DELAYS_MS[Math.min(failures, FAILURE_DELAYS_MS.length - 1)]);
            } finally {
                tickInFlight = false;
            }
        };

        const handleVisibilityChange = () => {
            if (cancelled) {
                return;
            }
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
                timeoutId = undefined;
            }
            if (!document.hidden) {
                // návrat do záložky – okamžitý tik (ať už čekal cokoliv)
                void tick();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        void tick();

        return () => {
            cancelled = true;
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            if (timeoutId !== undefined) {
                window.clearTimeout(timeoutId);
            }
        };
    }, []);

    return {messages, unavailable};
}
