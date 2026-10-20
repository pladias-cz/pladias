import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
    ApiError,
    apiDownload,
    apiGet,
    apiGetLegacyString,
    apiPost,
    apiPostFormUrlencoded,
    ensureSuccess,
    isAbortError,
    setForbiddenHandler,
} from "./apiClient";

/**
 * Testy apiClientu (docs/refactoring.md, sekce I): parsování obálky, 401/403
 * větve, blob helper, urlencoded s LF. Fetch se mockuje přes vi.stubGlobal –
 * žádné patchování knihovny.
 */

const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {"Content-Type": "application/json"},
    });

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

let assignMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    // jsdom neumí navigaci – location se stubuje, apiClient na 401 přesměrovává
    assignMock = vi.fn();
    Object.defineProperty(window, "location", {
        configurable: true,
        value: {assign: assignMock, href: "http://localhost/"},
    });
});

afterEach(() => {
    setForbiddenHandler(null);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("apiGet", () => {
    it("returns the parsed JsonResult envelope untouched (services own the shape)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: {token: "abc"}}));

        await expect(apiGet("/api/react/user/createToken")).resolves.toEqual({
            success: true,
            data: {token: "abc"},
        });
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/user/createToken",
            expect.objectContaining({method: "GET", body: undefined}),
        );
    });

    it("appends params as a query string", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await apiGet("/api/react/taxa/queryAll", {params: {prefix: "Ace", page: "2"}});

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/taxa/queryAll?prefix=Ace&page=2",
            expect.anything(),
        );
    });

    it("keeps soft envelope failures (success: false with HTTP 200) visible to the caller", async () => {
        // user settings: success:false znamená „hodnota nenastavena", ne chybu
        fetchMock.mockResolvedValue(jsonResponse({success: false, value: ""}));

        await expect(apiGet("/api/react/user/settings/application_language")).resolves.toEqual({
            success: false,
            value: "",
        });
    });
});

describe("apiPost", () => {
    it("sends JSON bodies with Content-Type application/json", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await apiPost("/api/react/users", {name: "Jan", surname: "Novák"});

        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/users",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({name: "Jan", surname: "Novák"}),
                headers: {"Content-Type": "application/json"},
            }),
        );
    });

    it("sends FormData without Content-Type (the browser adds the multipart boundary)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        const formData = new FormData();
        formData.append("taxonId", "1");
        await apiPost("/api/react/atlas/pngMap/taxon/1", formData);

        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect(init.body).toBeInstanceOf(FormData);
        expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    });
});

describe("HTTP error branches", () => {
    it("redirects to /login and throws ApiError on 401", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "unauthorized"}, 401));

        await expect(apiGet("/api/react/atlasadmin/imports")).rejects.toBeInstanceOf(ApiError);
        expect(assignMock).toHaveBeenCalledWith("/login");
    });

    it("calls the forbidden handler and throws ApiError on 403", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Nedostatečná oprávnění"}, 403));
        const handler = vi.fn();
        setForbiddenHandler(handler);

        const promise = apiGet("/api/react/atlasadmin/imports");
        await expect(promise).rejects.toMatchObject({status: 403, message: "Nedostatečná oprávnění"});
        expect(handler).toHaveBeenCalledWith("Nedostatečná oprávnění");
    });

    it("throws ApiError with the message from the error payload on HTTP 400", async () => {
        fetchMock.mockResolvedValue(jsonResponse({error: "Email již existuje"}, 400));

        await expect(apiPost("/api/react/user/changeEmail", {password: "x", newEmail: "a@b.cz"})).rejects.toMatchObject({
            status: 400,
            message: "Email již existuje",
        });
    });

    it("falls back to the caller-provided errorMessage when the payload has none", async () => {
        fetchMock.mockResolvedValue(jsonResponse({}, 500));

        await expect(apiGet("/x", {errorMessage: "Export selhal."})).rejects.toMatchObject({
            status: 500,
            message: "Export selhal.",
        });
    });

    it("wraps network failures as ApiError", async () => {
        fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

        await expect(apiGet("/x")).rejects.toBeInstanceOf(ApiError);
    });
});

describe("ensureSuccess", () => {
    it("passes successful envelopes through", () => {
        const payload = {success: true, message: "ok"};
        expect(ensureSuccess(payload)).toBe(payload);
    });

    it("throws ApiError with message from a failed envelope", () => {
        expect(() => ensureSuccess({success: false, message: "Novější verze existuje"})).toThrow(
            "Novější verze existuje",
        );
    });

    it("throws with the error field and a fallback message", () => {
        expect(() => ensureSuccess({success: false, error: "Import selhal"})).toThrow("Import selhal");
        expect(() => ensureSuccess({success: false}, "Výchozí hláška")).toThrow("Výchozí hláška");
    });
});

describe("apiPostFormUrlencoded", () => {
    it("sends urlencoded bodies and keeps LF line breaks (gotcha: backend splits on \\R)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await apiPostFormUrlencoded("/export", {taxa: "Acer campestre\nAcer platanoides"});

        const init = fetchMock.mock.calls[0][1] as RequestInit;
        expect(init.headers).toEqual({"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"});
        // LF zůstává LF (jako dosud u fetch + URLSearchParams) – viz gotchas
        // „Taxon lists are submitted as urlencoded form data"
        expect(String(init.body)).toBe(new URLSearchParams({taxa: "Acer campestre\nAcer platanoides"}).toString());
    });
});

describe("apiGetLegacyString", () => {
    it("unquotes JSON string responses (TraitsController)", async () => {
        fetchMock.mockResolvedValue(
            new Response('"Import proběhl"', {headers: {"Content-Type": "application/json"}}),
        );

        await expect(apiGetLegacyString("/api/react/trait/delete/1")).resolves.toBe("Import proběhl");
    });

    it("returns plain text bodies as-is", async () => {
        fetchMock.mockResolvedValue(new Response("Error during trait export", {headers: {"Content-Type": "text/plain"}}));

        await expect(apiGetLegacyString("/x")).resolves.toBe("Error during trait export");
    });
});

describe("apiDownload", () => {
    it("returns the blob with the filename from Content-disposition", async () => {
        fetchMock.mockResolvedValue(
            new Response("xlsx-bytes", {
                headers: {
                    "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    "Content-disposition": 'attachment; filename="exports.xlsx"',
                },
            }),
        );

        const file = await apiDownload("/api/react/atlasadmin/imports", {
            params: {page: "1"},
            fallbackFilename: "export.xlsx",
        });

        expect(file.filename).toBe("exports.xlsx");
        expect(file.contentType).toContain("spreadsheetml.sheet");
        await expect(file.blob.text()).resolves.toBe("xlsx-bytes");
    });

    it("throws ApiError with the message when the stream carries a JSON error (gotcha)", async () => {
        fetchMock.mockResolvedValue(
            new Response(JSON.stringify({success: false, message: "Import selhal"}), {
                status: 200,
                headers: {"Content-Type": "application/json"},
            }),
        );

        await expect(apiDownload("/export")).rejects.toMatchObject({
            message: "Import selhal",
        });
    });

    it("uses the fallback filename when Content-disposition is missing", async () => {
        fetchMock.mockResolvedValue(
            new Response(new Blob(["data"]), {headers: {"Content-Type": "application/octet-stream"}}),
        );

        const file = await apiDownload("/export", {fallbackFilename: "zaklad.xlsx"});
        expect(file.filename).toBe("zaklad.xlsx");
    });
});

describe("isAbortError", () => {
    it("detects fetch AbortError", () => {
        expect(isAbortError(new DOMException("Aborted", "AbortError"))).toBe(true);
        expect(isAbortError(new TypeError("Failed to fetch"))).toBe(false);
        expect(isAbortError(new ApiError("x"))).toBe(false);
    });
});
