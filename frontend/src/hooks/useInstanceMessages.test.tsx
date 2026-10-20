import {act, cleanup, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useInstanceMessages} from "./useInstanceMessages";

/**
 * Testy heartbeatu (docs/refactoring.md, sekce A + I): visibility, exponenciální
 * backoff, zachování zpráv při výpadku, „unavailable“ po třech selháních.
 * Fetch se mockuje přes vi.stubGlobal, čas běží na fake timerech.
 */

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {"Content-Type": "application/json"},
    });

/**
 * Nová Response pro každé volání – tělo Response je možné přečíst jen jednou,
 * sdílená instance by po prvním `.json()` dál vždy selhávala (gotcha testů).
 */
const respondWith = (payload: unknown) =>
    fetchMock.mockImplementation(async () => jsonResponse(payload));

/** Skrytá/viditelná záložka – document.hidden je v jsdom read-only proto přes getter. */
let hidden = false;

/** Nechá doběhnout celý async řetězec ticku (fetch → json → setState → schedule). */
const flush = async () => {
    await act(async () => {
        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
        }
    });
};

const advance = async (ms: number) => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
        }
    });
};

const setHidden = async (value: boolean) => {
    hidden = value;
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();
};

beforeEach(() => {
    vi.useFakeTimers();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    hidden = false;
    Object.defineProperty(document, "hidden", {configurable: true, get: () => hidden});
});

afterEach(() => {
    // Vitest bez globals: true nespouští auto-cleanup – renderHook instance by
    // jinak přežívaly mezi testy a jejich listenery jištěly cizí asserty.
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("useInstanceMessages", () => {
    it("loads messages on mount and polls every 30 s while visible", async () => {
        respondWith([{type: "warning", text: "Údržba"}]);
        const {result} = renderHook(() => useInstanceMessages());

        await flush();
        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(result.current.messages).toEqual([{type: "warning", text: "Údržba"}]);
        expect(result.current.unavailable).toBe(false);

        await advance(30_000);
        expect(fetchMock).toHaveBeenCalledTimes(2);

        await advance(30_000);
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(result.current.messages).toEqual([{type: "warning", text: "Údržba"}]);
    });

    it("stops polling while the tab is hidden and ticks immediately on return", async () => {
        respondWith([]);
        renderHook(() => useInstanceMessages());
        await flush();
        expect(fetchMock).toHaveBeenCalledTimes(1);

        await setHidden(true);
        await advance(90_000);
        expect(fetchMock).toHaveBeenCalledTimes(1); // skrytá záložka nepolluje

        await setHidden(false);
        expect(fetchMock).toHaveBeenCalledTimes(2); // návrat do záložky = hned tik
    });

    it("backs off exponentially on failures (60 s → 120 s) and keeps last messages", async () => {
        fetchMock
            .mockImplementationOnce(async () => jsonResponse([{type: "info", text: "zpráva"}]))
            .mockRejectedValue(new TypeError("Failed to fetch"));
        const {result} = renderHook(() => useInstanceMessages());
        await flush();
        expect(result.current.messages).toEqual([{type: "info", text: "zpráva"}]);

        await advance(30_000); // tik 2 – 1. selhání → další tik za 60 s
        expect(fetchMock).toHaveBeenCalledTimes(2);

        await advance(30_000); // stále čekáme (backoff)
        expect(fetchMock).toHaveBeenCalledTimes(2);

        await advance(30_000); // tik 3 – 2. selhání → další tik za 120 s
        expect(fetchMock).toHaveBeenCalledTimes(3);
        expect(result.current.messages).toEqual([{type: "info", text: "zpráva"}]); // zprávy zůstávají
        expect(result.current.unavailable).toBe(false); // teprve 2 selhání

        await advance(60_000); // stále čekáme (120 s backoff)
        expect(fetchMock).toHaveBeenCalledTimes(3);

        await advance(60_000); // tik 4 – 3. selhání → unavailable
        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(result.current.messages).toEqual([{type: "info", text: "zpráva"}]); // ani teď se nemažou
        expect(result.current.unavailable).toBe(true);
    });

    it("resets the interval after recovery", async () => {
        fetchMock
            .mockImplementationOnce(async () => jsonResponse([])) // mount – úspěch → 30 s
            .mockRejectedValueOnce(new TypeError("Failed to fetch")) // t=30 – selhání → 60 s
            .mockImplementationOnce(async () => jsonResponse([])) // t=90 – úspěch → 30 s
            .mockImplementationOnce(async () => jsonResponse([])); // t=120
        renderHook(() => useInstanceMessages());
        await flush();

        await advance(30_000); // 1. selhání → 60 s
        expect(fetchMock).toHaveBeenCalledTimes(2);

        await advance(60_000); // úspěch → zpět 30 s kadence
        expect(fetchMock).toHaveBeenCalledTimes(3);

        await advance(30_000);
        expect(fetchMock).toHaveBeenCalledTimes(4);
    });

    it("stops polling after unmount", async () => {
        respondWith([]);
        const {unmount} = renderHook(() => useInstanceMessages());
        await flush();

        unmount();
        await advance(120_000);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
