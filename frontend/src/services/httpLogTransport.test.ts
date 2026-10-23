import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {createHttpLogTransport} from "./httpLogTransport";
import type {LogEntry} from "./logger";

/**
 * Testy HTTP transportu loggeru: batchování na časovači, zahození dávky při
 * selhání (žádné retry), limit bufferu a spláchnutí přes sendBeacon při
 * pagehide. Transport je zatím v aplikaci nezapojený (sekce F – future).
 */

const entry = (message: string): LogEntry => ({
    level: "error",
    message,
    timestamp: "2026-10-23T00:00:00.000Z",
});

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
});

describe("createHttpLogTransport", () => {
    it("bufferuje záznamy a po intervalu je pošle jedním POSTem", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal("fetch", fetchMock);

        const transport = createHttpLogTransport({url: "/api/react/logs", flushIntervalMs: 5000});
        transport.send(entry("první"));
        transport.send(entry("druhý"));
        expect(fetchMock).not.toHaveBeenCalled();

        await vi.advanceTimersByTimeAsync(5000);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
        expect(url).toBe("/api/react/logs");
        expect(init.method).toBe("POST");
        expect((init.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
        expect(JSON.parse(String(init.body))).toEqual([entry("první"), entry("druhý")]);
    });

    it("po vyprázdnění neplánuje další spláchnutí bez nových záznamů", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal("fetch", fetchMock);

        const transport = createHttpLogTransport({url: "/logs", flushIntervalMs: 1000});
        transport.send(entry("a"));
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(5000);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("při selhání POSTu dávku zahodí – žádné retry", async () => {
        const fetchMock = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
        vi.stubGlobal("fetch", fetchMock);

        const transport = createHttpLogTransport({url: "/logs", flushIntervalMs: 1000});
        transport.send(entry("a"));
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(10_000);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("při ne-OK odpovědi dávku taky zahodí", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: false, status: 500});
        vi.stubGlobal("fetch", fetchMock);

        const transport = createHttpLogTransport({url: "/logs", flushIntervalMs: 1000});
        transport.send(entry("a"));
        await vi.advanceTimersByTimeAsync(1000);
        await vi.advanceTimersByTimeAsync(10_000);

        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("při přetečení bufferu zahodí nejstarší záznamy", async () => {
        const fetchMock = vi.fn().mockResolvedValue({ok: true});
        vi.stubGlobal("fetch", fetchMock);

        const transport = createHttpLogTransport({url: "/logs", flushIntervalMs: 1000, maxBufferSize: 2});
        transport.send(entry("a"));
        transport.send(entry("b"));
        transport.send(entry("c"));
        await vi.advanceTimersByTimeAsync(1000);

        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect(JSON.parse(String(init.body))).toEqual([entry("b"), entry("c")]);
    });

    it("při pagehide odešle zbytek bufferu přes navigator.sendBeacon", async () => {
        const fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
        const beacon = vi.fn().mockReturnValue(true);
        vi.stubGlobal("navigator", {sendBeacon: beacon});

        const transport = createHttpLogTransport({url: "/logs", flushIntervalMs: 60_000});
        transport.send(entry("a"));

        window.dispatchEvent(new Event("pagehide"));

        expect(fetchMock).not.toHaveBeenCalled();
        expect(beacon).toHaveBeenCalledTimes(1);
        const [url, blob] = beacon.mock.calls[0] as [string, Blob];
        expect(url).toBe("/logs");
        await expect(blob.text()).resolves.toBe(JSON.stringify([entry("a")]));
    });
});
