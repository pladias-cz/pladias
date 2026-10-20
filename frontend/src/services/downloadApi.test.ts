import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {getDownloads} from "./downloadApi";

/**
 * Testy downloadApi (sekce F.4, krok A.9). Fetch se mockuje přes
 * vi.stubGlobal (vzor apiClient.test.ts).
 */

const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {"Content-Type": "application/json"},
    });

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("getDownloads", () => {
    it("returns the download list from the envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            data: [{description: "Metodika", manager: "Pladias", version: "1.0", url: "/files/m.pdf"}],
        }));

        await expect(getDownloads()).resolves.toEqual([
            {description: "Metodika", manager: "Pladias", version: "1.0", url: "/files/m.pdf"},
        ]);
        expect(fetchMock).toHaveBeenCalledWith("/api/react/downloads", expect.anything());
    });

    it("throws ApiError on HTTP 500", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "boom"}, 500));

        await expect(getDownloads()).rejects.toMatchObject({name: "ApiError", message: "boom"});
    });
});
