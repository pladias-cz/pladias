import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {getPlayMessage, getPlayMessagesForLanguage, savePlayMessages} from "./playMessageApi";

/**
 * Testy playMessageApi (sekce F.4, krok A.9): rozbalování obálky,
 * 404 = nenalezený klíč → `null` (fallback volajícího) a hromadné uložení.
 * Fetch se mockuje přes vi.stubGlobal (vzor apiClient.test.ts).
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

describe("getPlayMessage", () => {
    it("returns the message value for the key and language", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            data: {id: 1, key: "login_page_texts", language: "cs", value: "<p>Vítejte</p>"},
        }));

        await expect(getPlayMessage("login_page_texts", "cs")).resolves.toBe("<p>Vítejte</p>");
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/playmessage/login_page_texts?lang=cs",
            expect.anything(),
        );
    });

    it("returns null for a missing key (HTTP 404 → fallback)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "PlayMessage not found for key: x"}, 404));

        await expect(getPlayMessage("x", "cs")).resolves.toBeNull();
    });

    it("returns null when the data has no value", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: null}));

        await expect(getPlayMessage("x", "cs")).resolves.toBeNull();
    });

    it("propagates other HTTP errors", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: false,
            message: "Missing required query parameter: lang"
        }, 400));

        await expect(getPlayMessage("x", "")).rejects.toMatchObject({
            name: "ApiError",
            message: "Missing required query parameter: lang",
        });
    });
});

describe("getPlayMessagesForLanguage", () => {
    it("returns all entries for the language", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            data: [{id: 1, key: "a", language: "cs", value: "x"}],
        }));

        await expect(getPlayMessagesForLanguage("cs")).resolves.toEqual([
            {id: 1, key: "a", language: "cs", value: "x"},
        ]);
        expect(fetchMock).toHaveBeenCalledWith("/api/react/playmessage/admin/all?lang=cs", expect.anything());
    });
});

describe("savePlayMessages", () => {
    it("puts the values for one language", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: ""}));

        await expect(savePlayMessages("en", [{key: "a", value: "hello"}])).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/playmessage/admin/save",
            expect.objectContaining({
                method: "PUT",
                body: JSON.stringify({lang: "en", values: [{key: "a", value: "hello"}]}),
            }),
        );
    });
});
