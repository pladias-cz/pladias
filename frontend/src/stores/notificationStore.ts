/**
 * Globální notifikační store (fáze 4 UX).
 *
 * Jednorázové uživatelské hlášky (úspěch/nezdar akcí, chyby komunikace) –
 * jedna odpovědnost pro celou SPA: notifikace přežijí navigaci mezi routes
 * a mizí sjednoceně (success/info/warning po 5 s, danger drží, dokud ho
 * uživatel nezavře). Zprávy o údržbě instance (sekce A) posílá do store
 * `FlashMessages` z dat heartbeatu `useInstanceMessages` – Toast se ukáže
 * při prvním načtení, návratu do záložky a při změně obsahu.
 *
 * Ochranu proti hromadění „visících“ hlášek řeší store sám (docs/gotchas.md):
 *  - identická zobrazená notifikace se nezduplikuje, jen jí resetuje timer,
 *  - stack má strop (`MAX_VISIBLE`) – přebývající nejstarší se zavře,
 *  - návrat ze skryté záložky dorovná expirace (prohlížeč throttluje setTimeout
 *    ve skryté záložce, toast tak „déle visí“, než měl).
 *
 * Kdo smí volat push (conventions.md, „Error Handling & Resilience“):
 *  - komponenta/service po dokončení user akce (úspěch i kontextové chyby),
 *  - apiClient centrálně 403 a síťové chyby (handlery zapojuje App),
 *  - `html` výhradně pro důvěryhodný rich-text z backendu (import hlášky
 *    s odkazy – docs/gotchas.md); vykresluje ho `RichTextMessage`.
 *
 * Referenční implementace pravidla 2 state managementu (sekce L): globální
 * klientský state patří do zustand store (vedle `layerStore`).
 */

import {create} from 'zustand';
import {ApiError, apiErrorMessage, isAbortError} from '@/services/apiClient';
import {logError} from '@/services/logger';

export type NotificationType = 'success' | 'danger' | 'warning' | 'info';

/** Vstup push – `message` (plain text) nebo `html` (backend rich-text). */
export interface NotificationInput {
    type: NotificationType;
    /** Plain text – lokalizovaná i backendová hláška bez HTML. */
    message?: string;
    /** Důvěryhodný rich-text z backendu (odkazy na sešity s chybami importu). */
    html?: string;
    /** Auto-dismiss v ms; 0 = držet. Default: danger drží, ostatní mizí po 5 s. */
    timeout?: number;
}

export interface Notification {
    id: number;
    type: NotificationType;
    message?: string;
    html?: string;
}

interface NotificationStore {
    notifications: Notification[];
    push: (input: NotificationInput) => number;
    dismiss: (id: number) => void;
    clear: () => void;
}

/** Výchozí auto-dismiss pro success/info/warning. */
const DEFAULT_TIMEOUT_MS = 5000;

/** Strop současně viditelných notifikací – při přetečení se zavře nejstarší. */
const MAX_VISIBLE = 5;

/** id čítač a běžící timeouty mimo React state (akce jsou stabilní). */
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();
/** Plánovaný konec auto-dismiss (absolutní čas) – korekce skryté záložky. */
const expiries = new Map<number, number>();

/** Zruší auto-dismiss timer notifikace (zavření rukou, clear, nové nastavení). */
function clearTimer(id: number): void {
    const timer = timers.get(id);
    if (timer) {
        clearTimeout(timer);
        timers.delete(id);
    }
    expiries.delete(id);
}

/** Nastaví auto-dismiss; `timeout <= 0` (danger drží) jen zruší starý timer. */
function armTimer(id: number, timeout: number): void {
    clearTimer(id);
    if (timeout <= 0) {
        return;
    }
    expiries.set(id, Date.now() + timeout);
    timers.set(id, setTimeout(() => useNotificationStore.getState().dismiss(id), timeout));
}

/** Stejný obsah jako vstup push – klíč deduplikace (typ + message/html). */
function isDuplicate(notification: Notification, input: NotificationInput): boolean {
    return notification.type === input.type &&
        notification.message === input.message &&
        notification.html === input.html;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
    notifications: [],

    push: (input) => {
        const timeout = input.timeout ?? (input.type === 'danger' ? 0 : DEFAULT_TIMEOUT_MS);

        // Identická zobrazená hláška se nezduplikuje – jen jí resetuje timer
        // (N selhavších paralelních requestů = jedna notifikace, ne sloupec kopií).
        const duplicate = get().notifications.find((notification) => isDuplicate(notification, input));
        if (duplicate) {
            armTimer(duplicate.id, timeout);
            return duplicate.id;
        }

        const id = nextId++;
        set((state) => ({
            notifications: [...state.notifications, {id, type: input.type, message: input.message, html: input.html}],
        }));
        armTimer(id, timeout);

        // Strop stacku – přebývající nejstarší se zavře, aby hromada hlášek
        // (opakované chyby) nepřerostla obrazovku; vidět je vždy aktuální konec.
        get().notifications.slice(0, -MAX_VISIBLE).forEach((oldest) => get().dismiss(oldest.id));

        return id;
    },

    dismiss: (id) => {
        clearTimer(id);
        set((state) => ({notifications: state.notifications.filter((notification) => notification.id !== id)}));
    },

    clear: () => {
        timers.forEach((timer) => clearTimeout(timer));
        timers.clear();
        expiries.clear();
        set({notifications: []});
    },
}));

/**
 * Návrat do záložky: prohlížeč throttluje setTimeout ve skryté záložce
 * (Chrome po 5 min max 1×/min, Safari záložku úplně uspí) – auto-dismiss
 * tak mohl být odložen a toast, jenž měl expirovat, po návratu visí.
 * Prošlé notifikace se zavřou okamžitě, zbývajícím se timer pře-rozejče
 * zbytkem času. (Maintenance zprávy řeší stejný problém resyncem ve
 * `FlashMessages`; tady je to pro celý zbytek store.)
 */
if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') {
            return;
        }
        const now = Date.now();
        const overdue: number[] = [];
        const rearm: Array<[id: number, ms: number]> = [];
        for (const [id, expiresAt] of expiries) {
            const ms = expiresAt - now;
            if (ms <= 0) {
                overdue.push(id);
            } else {
                rearm.push([id, ms]);
            }
        }
        overdue.forEach((id) => useNotificationStore.getState().dismiss(id));
        for (const [id, ms] of rearm) {
            const timer = timers.get(id);
            if (timer) {
                clearTimeout(timer);
            }
            timers.set(id, setTimeout(() => useNotificationStore.getState().dismiss(id), ms));
        }
    });
}

/** Akce store pro použití v komponentách (push je stabilní referencí). */
export function useNotifications() {
    const push = useNotificationStore((state) => state.push);
    const dismiss = useNotificationStore((state) => state.dismiss);
    const clear = useNotificationStore((state) => state.clear);
    return {push, dismiss, clear};
}

/** Imperativní push mimo React (apiClient handlery v App, service vrstva). */
export function pushNotification(input: NotificationInput): number {
    return useNotificationStore.getState().push(input);
}

/**
 * Chyba z user akce → danger notifikace s hláškou z backendu nebo fallbackem
 * + centrální log (`services/logger`). Chyby už centrálně oznámené apiClientem
 * (403, síťová chyba – `ApiError.notified`) se nepřehrávají podruhé; přerušené
 * requesty (AbortController) se ignorují.
 */
export function notifyApiError(err: unknown, fallback: string): void {
    if (isAbortError(err)) return;
    // Centrální log i pro chyby vzniklé mimo apiClient (custom throw v catchi);
    // ApiError z apiClientu už je zalogovaná – logError je idempotentní
    // per instance (WeakSet v loggeru).
    logError(err, {source: 'notifyApiError', fallback});
    if (err instanceof ApiError && err.notified) return;
    pushNotification({type: 'danger', message: apiErrorMessage(err, fallback)});
}