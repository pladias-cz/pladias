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
 * Kdo smí volat push (conventions.md, „Error Handling & Resilience“):
 *  - komponenta/service po dokončení user akce (úspěch i kontextové chyby),
 *  - apiClient centrálně 403 a síťové chyby (handlery zapojuje App),
 *  - `html` výhradně pro důvěryhodný rich-text z backendu (import hlášky
 *    s odkazy – docs/gotchas.md); vykresluje ho `RichTextMessage`.
 *
 * Referenční implementace pravidla 2 state managementu (sekce L): globální
 * klientský state patří do zustand store (vedle `layerStore`).
 */

import {create} from "zustand";
import {ApiError, apiErrorMessage, isAbortError} from "@/services/apiClient";

export type NotificationType = "success" | "danger" | "warning" | "info";

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

/** id čítač a běžící timeouty mimo React state (akce jsou stabilní). */
let nextId = 1;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const useNotificationStore = create<NotificationStore>((set) => ({
    notifications: [],

    push: (input) => {
        const id = nextId++;
        set((state) => ({
            notifications: [...state.notifications, {id, type: input.type, message: input.message, html: input.html}],
        }));

        const timeout = input.timeout ?? (input.type === "danger" ? 0 : DEFAULT_TIMEOUT_MS);
        if (timeout > 0) {
            timers.set(id, setTimeout(() => useNotificationStore.getState().dismiss(id), timeout));
        }
        return id;
    },

    dismiss: (id) => {
        const timer = timers.get(id);
        if (timer) {
            clearTimeout(timer);
            timers.delete(id);
        }
        set((state) => ({notifications: state.notifications.filter((notification) => notification.id !== id)}));
    },

    clear: () => {
        timers.forEach((timer) => clearTimeout(timer));
        timers.clear();
        set({notifications: []});
    },
}));

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
 * Chyba z user akce → danger notifikace s hláškou z backendu nebo fallbackem.
 * Chyby už centrálně oznámené apiClientem (403, síťová chyba – `ApiError.notified`)
 * se nepřehrávají podruhé; přerušené requesty (AbortController) se ignorují.
 */
export function notifyApiError(err: unknown, fallback: string): void {
    if (isAbortError(err)) return;
    if (err instanceof ApiError && err.notified) return;
    pushNotification({type: "danger", message: apiErrorMessage(err, fallback)});
}