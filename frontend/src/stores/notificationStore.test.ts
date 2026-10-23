import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ApiError} from "@/services/apiClient";
import {getRecentLogEntries, resetLogger} from "@/services/logger";
import {notifyApiError, pushNotification, useNotificationStore} from "./notificationStore";

/**
 * Testy globálního notifikačního store: push,
 * auto-dismiss timeouty (danger drží), dismiss/clear a deduplikace centrálně
 * oznámených chyb (`notifyApiError`). Timeouty se řídí fake timers.
 */

const notifications = () => useNotificationStore.getState().notifications;

beforeEach(() => {
    vi.useFakeTimers();
    useNotificationStore.getState().clear();
    resetLogger();
});

afterEach(() => {
    useNotificationStore.getState().clear();
    vi.useRealTimers();
});

describe("notificationStore", () => {
    it("pushes a notification and returns its id", () => {
        const id = pushNotification({type: "success", message: "Uloženo"});

        expect(notifications()).toEqual([{id, type: "success", message: "Uloženo"}]);
    });

    it("auto-dismisses success after 5 s", () => {
        pushNotification({type: "success", message: "Uloženo"});

        vi.advanceTimersByTime(4999);
        expect(notifications()).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(notifications()).toHaveLength(0);
    });

    it("keeps danger until dismissed", () => {
        pushNotification({type: "danger", message: "Chyba"});

        vi.advanceTimersByTime(60_000);
        expect(notifications()).toHaveLength(1);
    });

    it("honors a custom timeout", () => {
        pushNotification({type: "warning", message: "Pozor", timeout: 1000});

        vi.advanceTimersByTime(999);
        expect(notifications()).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(notifications()).toHaveLength(0);
    });

    it("dismiss removes the notification", () => {
        const id = pushNotification({type: "success", message: "Uloženo"});

        useNotificationStore.getState().dismiss(id);
        expect(notifications()).toHaveLength(0);
    });

    it("clear removes everything and cancels pending timers", () => {
        pushNotification({type: "success", message: "Uloženo"});
        pushNotification({type: "danger", message: "Chyba"});

        useNotificationStore.getState().clear();
        expect(notifications()).toHaveLength(0);

        vi.advanceTimersByTime(10_000);
        expect(notifications()).toHaveLength(0);
    });
});

describe("notifyApiError", () => {
    it("pushes danger with the backend message", () => {
        notifyApiError(new ApiError("Neplatný vstup", 400, {message: "Neplatný vstup"}), "Fallback");

        expect(notifications()).toHaveLength(1);
        expect(notifications()[0]).toMatchObject({type: "danger", message: "Neplatný vstup"});
    });

    it("falls back to the provided text when the error carries no payload", () => {
        notifyApiError(new ApiError("Failed to fetch", undefined), "Uložení selhalo");

        expect(notifications()[0]).toMatchObject({type: "danger", message: "Uložení selhalo"});
    });

    it("skips errors already centrally notified by apiClient", () => {
        const error = new ApiError("K operaci nemáte oprávnění.", 403);
        error.notified = true;

        notifyApiError(error, "Fallback");

        expect(notifications()).toHaveLength(0);
    });

    it("ignores aborted requests", () => {
        notifyApiError(new DOMException("Aborted", "AbortError"), "Fallback");

        expect(notifications()).toHaveLength(0);
        expect(getRecentLogEntries()).toHaveLength(0);
    });

    it("logs the error through the central logger before the dedup check", () => {
        notifyApiError(new Error("boom"), "Uložení selhalo");

        expect(getRecentLogEntries()[0]).toMatchObject({
            message: "boom",
            context: {source: "notifyApiError", fallback: "Uložení selhalo"},
        });
    });
});