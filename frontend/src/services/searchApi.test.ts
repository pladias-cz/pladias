import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ApiError} from "./apiClient";
import {exportSearchExcel, getPhytochorions, getProjects, searchRecords} from "./searchApi";

/**
 * Testy searchApi (sekce F.4, krok A.6): rozbalování obálek číselníků,
 * HTTP 200 s `success: false` u vyhledávání a dvě podoby odpovědi Excel
 * exportu (soubor s X-Excel-* hlavičkami vs. JSON chyba). Fetch se mockuje
 * přes vi.stubGlobal (vzor apiClient.test.ts).
 */

const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {"Content-Type": "application/json"},
    });

const excelResponse = (headerOverrides: Record<string, string | undefined> = {}) =>
    new Response("xlsx-bytes", {
        status: 200,
        headers: Object.fromEntries(Object.entries({
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="PladiasExport.xlsx"',
            "X-Excel-Records-Exported": "120",
            "X-Excel-Total-Records": "150",
            ...headerOverrides,
        }).filter(([, value]) => value !== undefined)),
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

describe("getProjects", () => {
    it("returns the project list from the envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 1, name: "Pladias"}]}));

        await expect(getProjects()).resolves.toEqual([{id: 1, name: "Pladias"}]);
        expect(fetchMock).toHaveBeenCalledWith("/api/react/occurrence/projects", expect.anything());
    });
});

describe("getPhytochorions", () => {
    it("returns phytochorions from the common endpoint", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{rowid: 11, name: "Meso"}]}));

        await expect(getPhytochorions()).resolves.toEqual([{rowid: 11, name: "Meso"}]);
        expect(fetchMock).toHaveBeenCalledWith("/api/react/atlas/common/phytochorions", expect.anything());
    });
});

describe("searchRecords", () => {
    it("posts the multipart form and returns the search page", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            data: {records: [{id: 1}], totalCount: 1},
        }));
        const formData = new FormData();

        await expect(searchRecords(2, 50, true, formData)).resolves.toEqual({records: [{id: 1}], totalCount: 1});
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/atlas/search/page/2/pageSize/50/getCount/true",
            expect.objectContaining({method: "POST", body: formData}),
        );
    });

    it("throws ApiError with the message on HTTP 200 + success:false (too many records)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Příliš mnoho záznamů"}));

        await expect(searchRecords(1, 50, true, new FormData())).rejects.toMatchObject({
            name: "ApiError",
            message: "Příliš mnoho záznamů",
        });
    });
});

describe("exportSearchExcel", () => {
    it("returns the file with metadata from X-Excel-* headers", async () => {
        fetchMock.mockResolvedValue(excelResponse());

        const file = await exportSearchExcel(100000, new FormData());

        expect(file.filename).toBe("PladiasExport.xlsx");
        expect(file.recordsExported).toBe(120);
        expect(file.totalRecords).toBe(150);
        await expect(file.blob.text()).resolves.toBe("xlsx-bytes");
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/atlas/search/page/1/pageSize/100000/getCount/true",
            expect.objectContaining({method: "POST"}),
        );
    });

    it("totalRecords is null when the header is missing", async () => {
        fetchMock.mockResolvedValue(excelResponse({
            "X-Excel-Total-Records": undefined,
            "X-Excel-Records-Exported": undefined,
        }));

        const file = await exportSearchExcel(100000, new FormData());
        expect(file.totalRecords).toBeNull();
        expect(file.recordsExported).toBe(0);
    });

    it("throws ApiError with the JSON message when the export is rejected", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "User not assigned to any project"}));

        await expect(exportSearchExcel(100000, new FormData())).rejects.toMatchObject({
            name: "ApiError",
            message: "User not assigned to any project",
        });
    });

    it("throws ApiError on a non-JSON HTTP error", async () => {
        fetchMock.mockResolvedValue(new Response("boom", {status: 500}));

        const error: unknown = await exportSearchExcel(100000, new FormData()).catch((err: unknown) => err);
        expect(error).toBeInstanceOf(ApiError);
    });
});
