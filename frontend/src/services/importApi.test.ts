import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ApiError} from "./apiClient";
import {getUserProjects, importCsv, importExcel, prepareBatchDelete} from "./importApi";

/**
 * Testy importApi (sekce F.4, krok A.7): nestandardní obálka s `projects`,
 * plochá odpověď Excel importu, `errorMessage` v chybových tělech import
 * kontrolerů a HTTP 200 s `success: false` u prepareBatchDelete. Fetch se
 * mockuje přes vi.stubGlobal (vzor apiClient.test.ts).
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

describe("getUserProjects", () => {
    it("returns projects from the non-standard envelope (projects instead of data)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            projects: [{id: 1, name: "Pladias", abbrev: "PL"}],
        }));

        await expect(getUserProjects()).resolves.toEqual([{id: 1, name: "Pladias", abbrev: "PL"}]);
        expect(fetchMock).toHaveBeenCalledWith("/api/react/projects/user", expect.anything());
    });

    it("throws ApiError when the response has no projects", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await expect(getUserProjects()).rejects.toBeInstanceOf(ApiError);
    });
});

describe("importExcel", () => {
    it("posts the multipart form to the validation endpoint and returns the flat result", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            id: 8,
            filename: "batch.xlsx",
            records: 120,
            errors: 0,
            warnings: 2,
            imported: false,
        }));
        const file = new File(["xlsx"], "batch.xlsx");

        await expect(importExcel(file, "validation", 3)).resolves.toEqual({
            success: true,
            id: 8,
            filename: "batch.xlsx",
            records: 120,
            errors: 0,
            warnings: 2,
            imported: false,
        });

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/react/import/validate");
        expect(init?.method).toBe("POST");
        expect(init?.body).toBeInstanceOf(FormData);
        expect((init?.body as FormData).get("operation")).toBe("validation");
        expect((init?.body as FormData).get("project")).toBe("3");
    });

    it("posts to the upload endpoint for the import operation", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, id: 9, filename: "b.xlsx", records: 1, errors: 0, warnings: 0, imported: true}));
        const file = new File(["xlsx"], "b.xlsx");

        await importExcel(file, "import");

        expect(fetchMock.mock.calls[0][0]).toBe("/api/react/import/upload");
        expect((fetchMock.mock.calls[0][1]?.body as FormData).get("project")).toBeNull();
    });

    it("throws ApiError with the backend errorMessage on HTTP 400", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, errorMessage: "Nepodporovaný formát souboru"}, 400));

        await expect(importExcel(new File(["x"], "x.xlsx"), "import")).rejects.toMatchObject({
            name: "ApiError",
            message: "Nepodporovaný formát souboru",
        });
    });
});

describe("importCsv", () => {
    it("posts the multipart form and resolves on a success envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: "CSV accepted"}));

        await expect(importCsv(new File(["csv"], "b.csv"), "import", 5)).resolves.toBeUndefined();

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe("/api/react/import/csv");
        expect(init?.method).toBe("POST");
        expect((init?.body as FormData).get("project")).toBe("5");
    });

    it("throws on HTTP 200 with success:false", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, errorMessage: "Špatné kódování"}));

        await expect(importCsv(new File(["csv"], "b.csv"), "import", 5)).rejects.toMatchObject({
            name: "ApiError",
            message: "Špatné kódování",
        });
    });
});

describe("prepareBatchDelete", () => {
    it("marks the batch for deletion and resolves on success", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: ""}));

        await expect(prepareBatchDelete(77)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith("/api/react/atlasadmin/prepareBatchDelete/77", expect.anything());
    });

    it("throws ApiError with the message on HTTP 200 + success:false (mail failure)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Dávku nelze smazat"}));

        await expect(prepareBatchDelete(77)).rejects.toMatchObject({
            name: "ApiError",
            message: "Dávku nelze smazat",
        });
    });
});
