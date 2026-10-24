/**
 * Jediný HTTP klient aplikace.
 *
 * Centralizuje: fetch volání, query parametry, parsování odpovědí, reakci na
 * 401 (přesměrování na /login), 403 (injectable handler – sekce F), síťové
 * chyby (injectable handler, `silent` pro background požadavky), centrální
 * logování všech ApiError přes `services/logger` (sekce F – observability),
 * HTTP chyby a známé backendové gotchasy (docs/gotchas.md):
 *  - obálka `JsonResult` se parsuje na jednom místě; širší odpovědi (tabulky,
 *    user settings) typují service moduly přes `ApiResult<T>`,
 *  - `apiPostFormUrlencoded` – taxon seznamy se posílají urlencoded; backend
 *    dělí řádky podle `\R`, proto zůstává LF sémantika `URLSearchParams`,
 *  - `apiGetLegacyString` – TraitsController vrací čistý string místo obálky,
 *  - `apiDownload` – souborové endpointy můžou místo souboru vrátit JSON chybu,
 *    takže se Content-Type kontroluje před čtením těla,
 *  - FormData se posílá bez Content-Type – boundary doplní prohlížeč (stejný
 *    tvar na drátě jako dosud).
 *
 * Zrušení requestu: fetch vyhazuje `DOMException` s `name === "AbortError"`,
 * detekuje `isAbortError`.
 */

import type {ApiResult} from '@/models/ApiResponse';
import {logError} from './logger';

/** Chyba HTTP komunikace – včetně 401/403 a chybových obálek `JsonResult`. */
export class ApiError extends Error {
    /** HTTP status, pokud chyba s odpovědí souvisí (`undefined` = síť / obálka). */
    readonly status?: number;
    /** Parsované tělo odpovědi (kvůli extra polím, např. `invalidTaxa` u exportu). */
    readonly payload?: unknown;
    /**
     * Centrální notifikace už proběhla (403 přes forbiddenHandler, síťová chyba
     * přes networkErrorHandler – sekce F). Volající pak `notifyApiError` přeskočí,
     * aby se stejná hláška nezobrazila dvakrát.
     */
    notified = false;

    constructor(message: string, status?: number, payload?: unknown) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.payload = payload;
    }
}

export interface ApiOptions {
    signal?: AbortSignal;
    headers?: Record<string, string>;
    /** Query parametry sestavené přes `URLSearchParams`. */
    params?: Record<string, string>;
    /** Hláška pro chybu, když odpověď žádnou vlastní zprávu nese. */
    errorMessage?: string;
    /**
     * Background požadavek (heartbeat, název projektu) – potlačí centrální
     * notifikaci síťové chyby; selhání má vlastní graceful zpracování.
     */
    silent?: boolean;
}

/**
 * Zrušení requestu (AbortController) – fetch vyhazuje
 * DOMException s name "AbortError" (v Node/jsdom DOMException nedědí z Error,
 * proto duck typing podle name).
 */
export function isAbortError(err: unknown): boolean {
    return typeof err === 'object' && err !== null && (err as { name?: unknown }).name === 'AbortError';
}

let forbiddenHandler: ((message: string) => void) | null = null;
let networkErrorHandler: ((error: ApiError) => void) | null = null;

/**
 * Centrální reakce na 403. Chyba se vždy loguje (`services/logger`); notifikační
 * store (sekce F, fáze 4) se zapojuje přes `setForbiddenHandler` bez zásahu do
 * volajících.
 */
export function setForbiddenHandler(handler: ((message: string) => void) | null): void {
    forbiddenHandler = handler;
}

/**
 * Centrální reakce na síťové chyby (fetch selhal – sekce F, fáze 4). Výchozí
 * stav jen vyhodí ApiError; handlery zapojuje App (notifikace). Background
 * požadavky (`ApiOptions.silent` – heartbeat) se nehlásí, selhání řeší samy.
 */
export function setNetworkErrorHandler(handler: ((error: ApiError) => void) | null): void {
    networkErrorHandler = handler;
}

/** Vytáhne chybovou hlášku z parsovaného těla – obálka nese `message`, `error` (JsonResult) nebo `errorMessage` (import kontrolery), výjimečně plain text. */
function extractErrorMessage(payload: unknown): string | undefined {
    if (payload !== null && typeof payload === 'object') {
        const {message, error, errorMessage} = payload as {
            message?: unknown;
            error?: unknown;
            errorMessage?: unknown
        };
        if (typeof message === 'string' && message !== '') return message;
        if (typeof error === 'string' && error !== '') return error;
        if (typeof errorMessage === 'string' && errorMessage !== '') return errorMessage;
        return undefined;
    }
    if (typeof payload === 'string' && payload !== '') return payload;
    return undefined;
}

function withParams(url: string, params: Record<string, string>): string {
    const query = new URLSearchParams(params).toString();
    if (!query) return url;
    return `${url}${url.includes('?') ? '&' : '?'}${query}`;
}

/**
 * HTTP status 401 znamená expirovanou session – přesměrování na legacy
 * přihlašovací stránku (centrální místo, sekce A/G).
 */
function handleUnauthorized(): never {
    if (typeof window !== 'undefined') {
        window.location.assign('/login');
    }
    throw new ApiError('Neautentizovaný požadavek (401) – přesměrování na přihlášení.', 401);
}

/**
 * Vytvoří ApiError, zaloguje ji centrálním loggerem a vrátí k vyhození –
 * invariant: každou ApiError vzniklou v apiClientu vidí i log (sekce F).
 * Výjimka: 401 z `handleUnauthorized` (expirovaná session je očekávaný tok
 * s redirectem, ne běhová chyba).
 */
function loggedApiError(message: string, status?: number, payload?: unknown, context?: Record<string, unknown>): ApiError {
    const error = new ApiError(message, status, payload);
    logError(error, context);
    return error;
}

/** Společné pro všechny metody: fetch, 401/403, HTTP chyby s hláškou z těla. */
async function performRequest(
    url: string,
    method: string,
    init: { body?: BodyInit; headers?: Record<string, string> },
    options: ApiOptions = {},
): Promise<Response> {
    const requestUrl = options.params ? withParams(url, options.params) : url;

    let response: Response;
    try {
        response = await fetch(requestUrl, {
            method,
            headers: {...options.headers, ...init.headers},
            body: init.body,
            signal: options.signal,
        });
    } catch (err) {
        if (isAbortError(err)) throw err;
        const apiError = new ApiError(err instanceof Error ? err.message : 'Síťová chyba.', undefined);
        // silent potlačuje jen uživatelskou notifikaci, ne log – z kontextu je
        // vidět, že jde o background požadavek (heartbeat offline generuje
        // hluk záměrně; HTTP transport si ho umí odfiltrovat)
        logError(apiError, {
            source: 'apiClient',
            kind: 'network',
            method,
            url: requestUrl,
            silent: options.silent ?? false,
        });
        if (!options.silent && networkErrorHandler) {
            networkErrorHandler(apiError);
            apiError.notified = true;
        }
        throw apiError;
    }

    if (response.status === 401) {
        handleUnauthorized();
    }

    if (response.status === 403) {
        const payload = await parseBody(response);
        const message = extractErrorMessage(payload) ?? 'K operaci nemáte oprávnění.';
        if (forbiddenHandler) {
            forbiddenHandler(message);
        }
        const error = loggedApiError(message, 403, payload, {source: 'apiClient', method, url: requestUrl});
        error.notified = forbiddenHandler !== null;
        throw error;
    }

    if (!response.ok) {
        const payload = await parseBody(response);
        throw loggedApiError(
            extractErrorMessage(payload) ?? options.errorMessage ?? `Požadavek selhal (HTTP ${response.status}).`,
            response.status,
            payload,
            {source: 'apiClient', method, url: requestUrl},
        );
    }

    return response;
}


/**
 * Parsování těla odpovědi. JSON se parsuje tolerantně (poškozené/prázdné tělo
 * vrátí text), ne-JSON (legacy string odpovědi) zůstane textem. Binární obsah
 * (soubory) čtou specializované helpery (`apiDownload`), ne json endpointy.
 */
async function parseBody(response: Response): Promise<unknown> {
    if (response.status === 204) return undefined;
    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');
    if (!isJson && contentType !== '' && !contentType.startsWith('text/')) {
        return undefined;
    }
    const text = await response.text();
    if (!isJson) return text;
    try {
        return text ? JSON.parse(text) : undefined;
    } catch {
        return text;
    }
}

/** Tělo požadavku: JSON objekty se serializují, FormData/URLSearchParams/string procházejí beze změny. */
async function request<T>(method: string, url: string, body: unknown, options?: ApiOptions): Promise<T> {
    let requestBody: BodyInit | undefined;
    let requestHeaders: Record<string, string> | undefined;

    if (body !== undefined) {
        if (body instanceof FormData || body instanceof URLSearchParams || typeof body === 'string') {
            // FormData: Content-Type nastaví prohlížeč (multipart + boundary),
            // urlencoded/text: hlavičku řeší specializovaný helper/volající
            requestBody = body;
        } else {
            requestBody = JSON.stringify(body);
            requestHeaders = {'Content-Type': 'application/json'};
        }
    }

    const response = await performRequest(url, method, {body: requestBody, headers: requestHeaders}, options);
    return (await parseBody(response)) as T;
}

/** GET vracející JSON (včetně širších obálek – typuje service modul, viz `ApiResult`). */
export function apiGet<T = unknown>(url: string, options?: ApiOptions): Promise<T> {
    return request<T>('GET', url, undefined, options);
}

/** POST s JSON tělem; `FormData` posílá multipart (Content-Type doplní prohlížeč). */
export function apiPost<T = unknown>(url: string, body?: unknown, options?: ApiOptions): Promise<T> {
    return request<T>('POST', url, body, options);
}

export function apiPut<T = unknown>(url: string, body?: unknown, options?: ApiOptions): Promise<T> {
    return request<T>('PUT', url, body, options);
}

export function apiPatch<T = unknown>(url: string, body?: unknown, options?: ApiOptions): Promise<T> {
    return request<T>('PATCH', url, body, options);
}

export function apiDelete<T = unknown>(url: string, options?: ApiOptions): Promise<T> {
    return request<T>('DELETE', url, undefined, options);
}

/**
 * POST s `application/x-www-form-urlencoded` (gotcha LF: backend dělí
 * víceřádkové hodnoty podle `\R` – `URLSearchParams` posílá LF, stejně jako
 * dosavadní `fetch` + `URLSearchParams`; nativní form submit by poslal CRLF).
 */
export async function apiPostFormUrlencoded<T = unknown>(url: string, params: Record<string, string> | URLSearchParams, options?: ApiOptions): Promise<T> {
    const body = params instanceof URLSearchParams ? params : new URLSearchParams(params);
    return request<T>('POST', url, body, {
        ...options,
        headers: {'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8', ...options?.headers},
    });
}

/**
 * GET endpointu, který místo `JsonResult` obálky vrací čistý JSON string
 * (TraitsController.delete / importResult – gotcha, nekopírovat). Chyby stejně
 * jako jinde přichází přes HTTP status s obálkou.
 */
export async function apiGetLegacyString(url: string, options?: ApiOptions): Promise<string> {
    const response = await performRequest(url, 'GET', {}, options);
    const text = await response.text();
    try {
        return JSON.parse(text) as string;
    } catch {
        return text;
    }
}

export interface DownloadedFile {
    blob: Blob;
    filename: string;
    contentType: string;
    /** Hlavičky odpovědi – custom metadata endpointů (např. `X-Excel-*` exportu vyhledávání). */
    headers: Headers;
}

export interface DownloadOptions extends ApiOptions {
    /** Použije se, když odpověď nese Content-disposition bez jména souboru. */
    fallbackFilename?: string;
    /** HTTP metoda (default GET) – urlencoded formuláře se posílají POSTem. */
    method?: 'GET' | 'POST';
    /** Tělo požadavku pro POST (např. `URLSearchParams` formuláře exportu). */
    body?: BodyInit;
}

/**
 * Stažení souboru (exporty XLSX, mapové výstupy). Gotcha: souborové endpointy
 * (`MapAdminImportController.getImports`, `TraitExportController`) můžou místo
 * souboru vrátit JSON chybu – Content-Type se kontroluje před čtením těla a
 * chyba končí jako `ApiError` s hláškou z obálky. Vrací i hlavičky odpovědi,
 * aby volající mohl číst custom metadata (např. `X-Excel-*`).
 */
export async function apiDownload(url: string, options: DownloadOptions = {}): Promise<DownloadedFile> {
    const response = await performRequest(url, options.method ?? 'GET', {body: options.body}, options);
    const contentType = response.headers.get('content-type') ?? '';

    if (contentType.includes('application/json')) {
        const payload = await parseBody(response);
        throw loggedApiError(
            extractErrorMessage(payload) ?? options.errorMessage ?? 'Stažení souboru selhalo.',
            response.status,
            payload,
            {source: 'apiClient', method: options.method ?? 'GET', url},
        );
    }

    return {
        blob: await response.blob(),
        filename: resolveFilename(response.headers.get('content-disposition'), options.fallbackFilename ?? 'export.bin'),
        contentType,
        headers: response.headers,
    };
}

/** Jméno souboru z Content-disposition (preferuje RFC 5987 `filename*`). */
export function resolveFilename(contentDisposition: string | null, fallback: string): string {
    const utf8Name = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
    if (utf8Name?.[1]) {
        return decodeURIComponent(utf8Name[1]);
    }
    const simpleName = contentDisposition?.match(/filename="?([^";]+)"?/i);
    return simpleName?.[1] ?? fallback;
}

/**
 * Ověří `JsonResult` obálku; neúspěch vyhodí jako `ApiError` s hláškou z
 * `message`/`error`. HTTP 200 s `success: false` totiž backend používá dvěma
 * způsoby – jako chybu (importy, ukládání) i jako „hodnota nenastavena"
 * (user settings); tam se `ensureSuccess` nevolá.
 */
export function ensureSuccess<T extends ApiResult>(payload: T, fallbackMessage = 'Požadavek selhal.'): T {
    if (payload?.success !== true) {
        throw loggedApiError(
            extractErrorMessage(payload) ?? fallbackMessage,
            undefined,
            payload,
            {source: 'apiClient', kind: 'envelope'},
        );
    }
    return payload;
}

/**
 * Ověří obálku `JsonResult` včetně úspěchu. Ne-obálkové tělo (HTML stránka po
 * redirectu, plain text) vzniká u některých mutací gotchasem „editor locked“ –
 * uživateli nemá co říct, použije se fallback hláška.
 */
export function requireEnvelope(payload: unknown, fallbackMessage: string): ApiResult {
    if (typeof payload !== 'object' || payload === null) {
        throw loggedApiError(fallbackMessage, undefined, undefined, {source: 'apiClient', kind: 'envelope'});
    }
    return ensureSuccess(payload as ApiResult, fallbackMessage);
}

/**
 * Obálka + povinná položka `data` – standard pro GET endpointy a mutace
 * vracející objekt. Sdílené pro všechny doménové service moduly.
 */
export function requireData<T>(payload: unknown, fallbackMessage: string): T {
    const envelope = requireEnvelope(payload, fallbackMessage) as ApiResult<T>;
    if (envelope.data === undefined) {
        throw loggedApiError(fallbackMessage, undefined, undefined, {source: 'apiClient', kind: 'envelope'});
    }
    return envelope.data;
}

/**
 * Hláška chyby pro UI: zpráva z backendu (obálka/HTTP s tělem) nebo lokalizovaný
 * fallback pro síťové chyby. Plnohodnotné zpracování chyb přináší sekce F/G (fáze 4).
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
    return err instanceof ApiError && err.payload !== undefined ? err.message : fallback;
}
