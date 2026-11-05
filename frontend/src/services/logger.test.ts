import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {ApiError} from './apiClient';
import {
    addLogTransport,
    createConsoleTransport,
    getRecentLogEntries,
    installGlobalErrorHandlers,
    logError,
    logInfo,
    logWarn,
    resetLogger,
    type LogEntry,
    type LogTransport,
} from './logger';

/**
 * Testy centrálního loggeru: normalizace LogEntry, deduplikace per Error
 * instance, ring buffer, transporty a globální handlery nezachycených chyb.
 */

/** Mock transport, který si pamatuje doručené záznamy. */
function recordingTransport(): { transport: LogTransport; sent: LogEntry[] } {
    const sent: LogEntry[] = [];
    return {transport: {name: 'test', send: (entry) => sent.push(entry)}, sent};
}

beforeEach(() => {
    resetLogger();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('logger', () => {
    it('normalizuje Error na LogEntry (message, name, stack, timestamp)', () => {
        const {transport, sent} = recordingTransport();
        addLogTransport(transport);

        const error = new TypeError('boom');
        logError(error);

        expect(sent).toHaveLength(1);
        expect(sent[0]).toMatchObject({level: 'error', message: 'boom', name: 'TypeError'});
        expect(sent[0].stack).toBe(error.stack);
        expect(sent[0].timestamp).toEqual(expect.any(String));
    });

    it('vytáhne HTTP status z ApiError (duck typing, bez importu apiClientu)', () => {
        const {transport, sent} = recordingTransport();
        addLogTransport(transport);

        logError(new ApiError('Požadavek selhal (HTTP 404).', 404));

        expect(sent[0].status).toBe(404);
    });

    it('zaloguje tutéž Error instanci jen jednou (více integračních bodů)', () => {
        const {transport, sent} = recordingTransport();
        addLogTransport(transport);

        const error = new Error('boom');
        logError(error, {source: 'apiClient'});
        logError(error, {source: 'notifyApiError'});
        expect(sent).toHaveLength(1);

        // jiná instance téže hlášky už je nová chyba
        logError(new Error('boom'));
        expect(sent).toHaveLength(2);
    });

    it('logWarn a logInfo nesou svou úroveň a kontext', () => {
        const {transport, sent} = recordingTransport();
        addLogTransport(transport);

        logWarn('Neznámá role', {role: 'xxx'});
        logInfo('Location selected', {lat: 49.8});

        expect(sent.map((entry) => entry.level)).toEqual(['warn', 'info']);
        expect(sent[0].context).toEqual({role: 'xxx'});
    });

    it('ring buffer drží jen posledních 50 záznamů', () => {
        for (let i = 0; i < 55; i++) {
            logInfo(`záznam ${i}`);
        }

        const recent = getRecentLogEntries();
        expect(recent).toHaveLength(50);
        expect(recent[49].message).toBe('záznam 54');
    });

    it('polyká výjimky z transportu a nezabije další transporty', () => {
        addLogTransport({
            name: 'broken', send: () => {
                throw new Error('transport exploded');
            }
        });
        const {transport, sent} = recordingTransport();
        addLogTransport(transport);

        expect(() => logError(new Error('boom'))).not.toThrow();
        expect(sent).toHaveLength(1);
    });

    it('addLogTransport vrací odregistraci transportu', () => {
        const {transport, sent} = recordingTransport();
        const remove = addLogTransport(transport);
        remove();

        logError(new Error('boom'));

        expect(sent).toHaveLength(0);
        // záznam zůstává v bufferu i bez transportu
        expect(getRecentLogEntries()).toHaveLength(1);
    });

    it('konzolový transport formátuje úroveň, jméno, kontext a stack', () => {
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
        });
        addLogTransport(createConsoleTransport());

        logError(new TypeError('boom'), {source: 'test'});

        expect(consoleError).toHaveBeenCalledWith(
            '[pladias] TypeError: boom',
            {source: 'test'},
            expect.stringContaining('TypeError: boom'),
        );
    });
});

describe('installGlobalErrorHandlers', () => {
    it('loguje nezachycené výjimky z window.onerror', () => {
        const {transport, sent} = recordingTransport();
        addLogTransport(transport);
        installGlobalErrorHandlers();

        window.dispatchEvent(new ErrorEvent('error', {error: new Error('render boom')}));

        expect(sent[0]).toMatchObject({message: 'render boom', context: {source: 'window.onerror'}});
    });

    it('loguje odmítnuté promisy z unhandledrejection', () => {
        const {transport, sent} = recordingTransport();
        addLogTransport(transport);
        installGlobalErrorHandlers();

        // PromiseRejectionEvent nemusí být v jsdom k dispozici – reason se
        // přiřadí ručně na obyčejný Event
        const event = new Event('unhandledrejection');
        Object.defineProperty(event, 'reason', {value: new Error('async boom')});
        window.dispatchEvent(event);

        expect(sent[0]).toMatchObject({message: 'async boom', context: {source: 'unhandledrejection'}});
    });
});
