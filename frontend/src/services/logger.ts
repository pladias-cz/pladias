/**
 * Centrální logování běhových chyb (sekce F – observability).
 *
 * Jediný směr pro chyby celé SPA: apiClient (každá ApiError vzniklá v něm),
 * ErrorBoundary (chyby renderu), globální handlery z `installGlobalErrorHandlers`
 * (`window.onerror` / `unhandledrejection`), react-query cache (queryClient)
 * a service/komponentní kód (místo roztroušených `console.*`).
 *
 * Architektura: chyba se normalizuje na `LogEntry` a rozešle do registrovaných
 * transportů. Jediný výchozí transport je konzole – fallback, dokud backend
 * nenabídne sběrný endpoint; jeho aktivace je pak jeden řádek v `index.tsx`
 * (`httpLogTransport.ts` je připravený, ale záměrně nezapojený).
 *
 * Vlastnosti:
 *  - idempotence per Error instance (WeakSet) – tatáž chyba, která projde více
 *    integračními body (apiClient → notifyApiError → unhandledrejection),
 *    se zaloguje jen jednou,
 *  - ring buffer posledních záznamů pro ladění v konzoli (`getRecentLogEntries`),
 *  - výjimka z transportu se polyká – logování nikdy nesmí shodit aplikaci.
 */

export type LogLevel = 'error' | 'warn' | 'info';

/** Normalizovaný záznam logu – společný vstup všech transportů. */
export interface LogEntry {
    level: LogLevel;
    /** Hlavní hláška: `Error.message` nebo explicitní text. */
    message: string;
    /** Jméno chyby (`Error.name` – ApiError, TypeError, …). */
    name?: string;
    /** Stack chyby, pokud je k dispozici. */
    stack?: string;
    /** HTTP status (`ApiError.status`), pokud je k dispozici. */
    status?: number;
    /** Kontext místa vzniku (`source`, `url`, `method`, `queryKey`, …). */
    context?: Record<string, unknown>;
    /** ISO 8601 čas vzniku záznamu. */
    timestamp: string;
}

/** Konzument záznamů: konzole (výchozí fallback), HTTP endpoint, Sentry, … */
export interface LogTransport {
    /** Identifikace transportu (ladění). */
    name: string;

    /** Zpracuje záznam; vlastní výjimku logger polyká. */
    send(entry: LogEntry): void;
}

/**
 * Výchozí transport: formátovaný výstup do konzole prohlížeče – jediné povolené
 * místo s přímým `console.*` ve `src/`. Exportováno kvůli testům formátu.
 */
export function createConsoleTransport(): LogTransport {
    return {
        name: 'console',
        send(entry) {
            const method = entry.level === 'error' ? console.error : entry.level === 'warn' ? console.warn : console.info;
            const args: unknown[] = [`[pladias] ${entry.name ? `${entry.name}: ` : ''}${entry.message}`];
            if (entry.context !== undefined) {
                args.push(entry.context);
            }
            if (entry.stack !== undefined) {
                args.push(`\n${entry.stack}`);
            }
            method(...args);
        },
    };
}

/** Kapacita ring bufferu `getRecentLogEntries`. */
const MAX_RECENT_ENTRIES = 50;

/** Registrované transporty – startuje konzolový fallback. */
const transports: LogTransport[] = [createConsoleTransport()];

/** Ring buffer posledních záznamů (ladění, budoucí hlášení supportu). */
const recentEntries: LogEntry[] = [];

/** Již zalogované Error instance – logování je idempotentní per instance. */
const loggedErrors = new WeakSet<object>();

/** Reentrance guard: chyba vzniklá uvnitř transportu se do loggeru nevrací. */
let dispatching = false;

/** Hláška libovolné „chyby“ z catch bloku (Error, string, cokoliv jiného). */
function messageOf(err: unknown): string {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    return String(err);
}

/** HTTP status duck typingem (`ApiError.status`) – bez importu apiClientu. */
function statusOf(err: unknown): number | undefined {
    if (typeof err === 'object' && err !== null) {
        const status = (err as { status?: unknown }).status;
        if (typeof status === 'number') {
            return status;
        }
    }
    return undefined;
}

function toEntry(level: LogLevel, err: unknown, context?: Record<string, unknown>): LogEntry {
    return {
        level,
        message: messageOf(err),
        name: err instanceof Error ? err.name : undefined,
        stack: err instanceof Error ? err.stack : undefined,
        status: statusOf(err),
        context,
        timestamp: new Date().toISOString(),
    };
}

function dispatch(entry: LogEntry): void {
    recentEntries.push(entry);
    if (recentEntries.length > MAX_RECENT_ENTRIES) {
        recentEntries.splice(0, recentEntries.length - MAX_RECENT_ENTRIES);
    }
    if (dispatching) return;
    dispatching = true;
    try {
        for (const transport of transports) {
            try {
                transport.send(entry);
            } catch {
                // Transport nesmí shodit aplikaci – výjimka se polyká.
            }
        }
    } finally {
        dispatching = false;
    }
}

/**
 * Zaloguje chybu (`Error`, `ApiError`, string, cokoliv z catch bloku).
 * Idempotentní per Error instance – tatáž chyba z více integračních bodů
 * (apiClient → notifyApiError → unhandledrejection) se zapíše jen jednou.
 */
export function logError(err: unknown, context?: Record<string, unknown>): void {
    if (typeof err === 'object' && err !== null) {
        if (loggedErrors.has(err)) return;
        loggedErrors.add(err);
    }
    dispatch(toEntry('error', err, context));
}

/** Zaloguje varování (degradace, neočekávaný, ale ošetřený stav). */
export function logWarn(message: string, context?: Record<string, unknown>): void {
    dispatch(toEntry('warn', message, context));
}

/** Zaloguje informativní záznam (diagnostika, např. mapových vrstev). */
export function logInfo(message: string, context?: Record<string, unknown>): void {
    dispatch(toEntry('info', message, context));
}

/**
 * Registruje doplňkový transport (HTTP endpoint, Sentry, …). Vrací funkci pro
 * odregistraci. Výchozí konzolový transport zůstává – HTTP endpoint bude
 * doplňkem, ne náhradou.
 */
export function addLogTransport(transport: LogTransport): () => void {
    transports.push(transport);
    return () => {
        const index = transports.indexOf(transport);
        if (index >= 0) {
            transports.splice(index, 1);
        }
    };
}

/** Poslední záznamy z ring bufferu (kopie) – ladění v konzoli prohlížeče. */
export function getRecentLogEntries(): LogEntry[] {
    return [...recentEntries];
}

/** Smaže záznamy i všechny transporty – pouze pro testy (tichý logger). */
export function resetLogger(): void {
    transports.length = 0;
    recentEntries.length = 0;
    dispatching = false;
}

let globalHandlersInstalled = false;

/**
 * Globální handlery nezachycených chyb: `window.onerror` (runtime výjimky,
 * které neprošly ani Reactem, ani query) a `unhandledrejection` (promisy
 * bez catch). Volá se jednou z `index.tsx` před renderem; idempotentní.
 */
export function installGlobalErrorHandlers(): void {
    if (globalHandlersInstalled || typeof window === 'undefined') return;
    globalHandlersInstalled = true;

    window.addEventListener('error', (event) => {
        // ErrorEvent runtime výjimky; selhání resource loadu (img, script)
        // nenesou error ani message – do logu nepatří.
        const err = event.error ?? event.message;
        if (err !== undefined) {
            logError(err, {source: 'window.onerror'});
        }
    });

    window.addEventListener('unhandledrejection', (event) => {
        logError(event.reason, {source: 'unhandledrejection'});
    });
}
