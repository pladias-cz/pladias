/**
 * HTTP transport pro logger – odesílání logů na backend endpoint (future).
 *
 * ZATÍM NEZAPOJENÝ: sběrný endpoint zatím backend nemá. Implementace je
 * připravená, aby aktivace byla jeden řádek v `index.tsx` (před render):
 *
 *     addLogTransport(createHttpLogTransport("/api/react/logs"));
 *
 * Chování (observability nesmí škodit aplikaci):
 *  - záznamy se bufferují a odesílají po dávkách POSTem (JSON pole `LogEntry`),
 *  - při `pagehide` se zbytek bufferu pokusí odeslat `navigator.sendBeacon`,
 *  - CSRF (docs/security.md M1): až endpoint jednou vznikne, musí řešit token –
 *    `sendBeacon` neumí custom hlavičky (`Csrf-Token` jako apiClient), aktivace
 *    tedy předpokládá fetch path s hlavičkou nebo `nocsrf` route modifier,
 *  - selhání odeslání = zahození dávky – žádné retry (logování chyb nesmí
 *    generovat další chyby ani provoz),
 *  - transport se vytváří jednou při startu aplikace a žije po celou session
 *    (bez dispose API – transporty se v runtime neodebírají).
 */

import type {LogEntry, LogTransport} from './logger';

export interface HttpLogTransportOptions {
    /** URL endpointu, který přijímá POST s JSON polem `LogEntry`. */
    url: string;
    /** Interval spláchnutí bufferu v ms. Default 5000. */
    flushIntervalMs?: number;
    /** Maximální počet záznamů ve bufferu; přetečení zahodí nejstarší. Default 100. */
    maxBufferSize?: number;
}

const DEFAULT_FLUSH_INTERVAL_MS = 5000;
const DEFAULT_MAX_BUFFER_SIZE = 100;

export function createHttpLogTransport(options: HttpLogTransportOptions): LogTransport {
    const url = options.url;
    const flushIntervalMs = options.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL_MS;
    const maxBufferSize = options.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE;
    const buffer: LogEntry[] = [];
    let timer: ReturnType<typeof setTimeout> | null = null;

    function scheduleFlush(): void {
        if (timer === null) {
            timer = setTimeout(() => {
                timer = null;
                void flush();
            }, flushIntervalMs);
        }
    }

    /** Spláchne buffer jedním POSTem; dávku vezme ze sebe i při selhání. */
    async function flush(): Promise<void> {
        if (buffer.length === 0) return;
        const batch = buffer.splice(0, buffer.length);
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(batch),
                keepalive: true,
            });
            if (!response.ok) {
                // dávka je už venku z bufferu – zahozená, viz hlavička
            }
        } catch {
            // síťové selhání – dávka zahozená, záměrně bez retry
        }
    }

    /** pagehide: sendBeacon (fire-and-forget), fallback keepalive fetch. */
    function flushOnPageHide(): void {
        if (buffer.length === 0) return;
        const batch = buffer.splice(0, buffer.length);
        const payload = JSON.stringify(batch);
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            navigator.sendBeacon(url, new Blob([payload], {type: 'application/json'}));
            return;
        }
        void fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: payload,
            keepalive: true,
        }).catch(() => {
            // i tady platí: selhání = zahození
        });
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('pagehide', flushOnPageHide);
    }

    return {
        name: 'http',
        send(entry) {
            buffer.push(entry);
            while (buffer.length > maxBufferSize) {
                buffer.shift();
            }
            scheduleFlush();
        },
    };
}
