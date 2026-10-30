import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ApiError} from '@/services/apiClient';
import {getRecentLogEntries, resetLogger} from '@/services/logger';
import {notifyApiError, pushNotification, useNotificationStore} from './notificationStore';

/**
 * Testy globálního notifikačního store: push, auto-dismiss timeouty
 * (danger drží), dedup identických hlášek, strop stacku, dorovnání
 * expirací při návratu do záložky, dismiss/clear a deduplikace centrálně
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

describe('notificationStore', () => {
    it('pushes a notification and returns its id', () => {
        const id = pushNotification({type: 'success', message: 'Uloženo'});

        expect(notifications()).toEqual([{id, type: 'success', message: 'Uloženo'}]);
    });

    it('auto-dismisses success after 5 s', () => {
        pushNotification({type: 'success', message: 'Uloženo'});

        vi.advanceTimersByTime(4999);
        expect(notifications()).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(notifications()).toHaveLength(0);
    });

    it('keeps danger until dismissed', () => {
        pushNotification({type: 'danger', message: 'Chyba'});

        vi.advanceTimersByTime(60_000);
        expect(notifications()).toHaveLength(1);
    });

    it('honors a custom timeout', () => {
        pushNotification({type: 'warning', message: 'Pozor', timeout: 1000});

        vi.advanceTimersByTime(999);
        expect(notifications()).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(notifications()).toHaveLength(0);
    });

    it('dismiss removes the notification', () => {
        const id = pushNotification({type: 'success', message: 'Uloženo'});

        useNotificationStore.getState().dismiss(id);
        expect(notifications()).toHaveLength(0);
    });

    it('clear removes everything and cancels pending timers', () => {
        pushNotification({type: 'success', message: 'Uloženo'});
        pushNotification({type: 'danger', message: 'Chyba'});

        useNotificationStore.getState().clear();
        expect(notifications()).toHaveLength(0);

        vi.advanceTimersByTime(10_000);
        expect(notifications()).toHaveLength(0);
    });

    it('merges an identical push into the visible notification and resets its timer', () => {
        const first = pushNotification({type: 'success', message: 'Uloženo'});
        vi.advanceTimersByTime(4_000);

        const second = pushNotification({type: 'success', message: 'Uloženo'});

        expect(second).toBe(first);
        expect(notifications()).toHaveLength(1);

        // timer běží znovu od druhého pushu (N stejných chyb = jedna hláška)
        vi.advanceTimersByTime(4_999);
        expect(notifications()).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(notifications()).toHaveLength(0);
    });

    it('keeps notifications that differ in type or content separate', () => {
        pushNotification({type: 'success', message: 'Uloženo'});
        pushNotification({type: 'info', message: 'Uloženo'});
        pushNotification({type: 'success', message: 'Změněno'});

        expect(notifications()).toHaveLength(3);
    });

    it('keeps at most five notifications and closes the oldest', () => {
        const ids = ['a', 'b', 'c', 'd', 'e', 'f']
            .map((mark) => pushNotification({type: 'success', message: `Zpráva ${mark}`}));

        expect(notifications()).toHaveLength(5);
        expect(notifications().map((notification) => notification.id)).not.toContain(ids[0]);
        expect(notifications()[0].id).toBe(ids[1]);
    });

    it('trims the oldest even when it is a sticky danger', () => {
        const dangerId = pushNotification({type: 'danger', message: 'Chyba'});
        for (let i = 1; i <= 5; i++) {
            pushNotification({type: 'info', message: `Info ${i}`});
        }

        expect(notifications()).toHaveLength(5);
        expect(notifications().map((notification) => notification.id)).not.toContain(dangerId);
    });

    it('closes overdue notifications on return to the tab (throttled timer never fired)', () => {
        pushNotification({type: 'success', message: 'Uloženo'});

        // skrytá záložka: hodiny pokročily o 10 s, throttlovaný timer se nespustil
        vi.setSystemTime(Date.now() + 10_000);
        expect(notifications()).toHaveLength(1);

        document.dispatchEvent(new Event('visibilitychange'));

        expect(notifications()).toHaveLength(0);
    });

    it('re-arms the remaining time on return to the tab', () => {
        pushNotification({type: 'success', message: 'Uloženo'});
        vi.advanceTimersByTime(4_000);

        document.dispatchEvent(new Event('visibilitychange'));

        vi.advanceTimersByTime(999);
        expect(notifications()).toHaveLength(1);

        vi.advanceTimersByTime(1);
        expect(notifications()).toHaveLength(0);
    });
});

describe('notifyApiError', () => {
    it('pushes danger with the backend message', () => {
        notifyApiError(new ApiError('Neplatný vstup', 400, {message: 'Neplatný vstup'}), 'Fallback');

        expect(notifications()).toHaveLength(1);
        expect(notifications()[0]).toMatchObject({type: 'danger', message: 'Neplatný vstup'});
    });

    it('falls back to the provided text when the error carries no payload', () => {
        notifyApiError(new ApiError('Failed to fetch', undefined), 'Uložení selhalo');

        expect(notifications()[0]).toMatchObject({type: 'danger', message: 'Uložení selhalo'});
    });

    it('skips errors already centrally notified by apiClient', () => {
        const error = new ApiError('K operaci nemáte oprávnění.', 403);
        error.notified = true;

        notifyApiError(error, 'Fallback');

        expect(notifications()).toHaveLength(0);
    });

    it('ignores aborted requests', () => {
        notifyApiError(new DOMException('Aborted', 'AbortError'), 'Fallback');

        expect(notifications()).toHaveLength(0);
        expect(getRecentLogEntries()).toHaveLength(0);
    });

    it('logs the error through the central logger before the dedup check', () => {
        notifyApiError(new Error('boom'), 'Uložení selhalo');

        expect(getRecentLogEntries()[0]).toMatchObject({
            message: 'boom',
            context: {source: 'notifyApiError', fallback: 'Uložení selhalo'},
        });
    });
});