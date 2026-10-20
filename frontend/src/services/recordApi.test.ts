import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ApiError} from "./apiClient";
import {
    createComment,
    deleteComment,
    getPhytochorionOptions,
    getRecordComments,
    getRecordFull,
    getUnassignedHerbaria,
    markCommentAsRead,
    moveRecordCoordinates,
    patchRecordField,
    resolveComment,
    reverseGeocode,
    updateComment,
} from "./recordApi";

/**
 * Testy recordApi (sekce F.4, krok A.3): rozbalování obálky, konverze
 * lastEditTimestamp na lastEditTimestampNum, HTTP 200 s `success: false`
 * (mutace komentářů, moveCoordinates), dynamický klíč pole u PATCH editField
 * a slučování pole objektů u reverse geocodingu. Fetch se mockuje přes
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

describe("getRecordFull", () => {
    it("returns the record from the envelope and converts lastEditTimestamp to ms", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            data: {id: 7, taxonId: 5, lastEditTimestamp: "2026-02-09T10:00:00Z"},
        }));

        const record = await getRecordFull(7);

        expect(record.id).toBe(7);
        expect(record.lastEditTimestampNum).toBe(Date.parse("2026-02-09T10:00:00Z"));
        expect(fetchMock).toHaveBeenCalledWith("/api/react/atlas/record/7/full", expect.anything());
    });

    it("throws ApiError with the backend message on 404", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, error: "Záznam nenalezen"}, 404));

        await expect(getRecordFull(7)).rejects.toMatchObject({name: "ApiError", message: "Záznam nenalezen"});
    });
});

describe("getRecordComments", () => {
    it("returns the comment list from the envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 1, message: "první"}]}));

        await expect(getRecordComments(7)).resolves.toEqual([{id: 1, message: "první"}]);
        expect(fetchMock).toHaveBeenCalledWith("/api/react/atlas/record/comments/7", expect.anything());
    });
});

describe("comment mutations", () => {
    it("createComment posts {recordId, message} and resolves on a success envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: {id: 99}}));

        await expect(createComment(7, "nový komentář")).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/atlas/record/comment",
            expect.objectContaining({method: "POST", body: JSON.stringify({recordId: 7, message: "nový komentář"})}),
        );
    });

    it("updateComment puts {message} to the comment endpoint", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await expect(updateComment(99, "upraveno")).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/atlas/record/comment/99",
            expect.objectContaining({method: "PUT", body: JSON.stringify({message: "upraveno"})}),
        );
    });

    it("resolveComment posts to the resolve endpoint", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await expect(resolveComment(99)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/atlas/record/comment/99/resolve",
            expect.objectContaining({method: "POST"}),
        );
    });

    it("deleteComment deletes by id", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await expect(deleteComment(99)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/atlas/record/comment/99",
            expect.objectContaining({method: "DELETE"}),
        );
    });

    it("markCommentAsRead deletes the comment-user association", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true}));

        await expect(markCommentAsRead(99, 5)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/atlas/record/comment-assoc/99/linked-user/5",
            expect.objectContaining({method: "DELETE"}),
        );
    });

    it("throws on HTTP 200 with success:false (gotcha: backend error envelope)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, error: "No permission to update this comment"}));

        await expect(updateComment(99, "x")).rejects.toMatchObject({
            name: "ApiError",
            message: "No permission to update this comment",
        });
    });
});

describe("patchRecordField", () => {
    it("patches {key, value, lastEditTimestampNum} and unwraps the dynamic field key", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            data: {originalid: "12345", lastEditTimestampNum: 1770000000000},
        }));

        const result = await patchRecordField(7, "ORIGINALID", "12345", 1760000000000);

        expect(result).toEqual({updatedValue: "12345", lastEditTimestampNum: 1770000000000});
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/atlas/record/7",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({key: "ORIGINALID", value: "12345", lastEditTimestampNum: 1760000000000}),
            }),
        );
    });

    it("throws ApiError with the conflict message on HTTP 409", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, error: "Novější verze záznamu existuje"}, 409));

        await expect(patchRecordField(7, "LOCALITY", "Praha", 0)).rejects.toMatchObject({
            name: "ApiError",
            status: 409,
            message: "Novější verze záznamu existuje",
        });
    });
});

describe("moveRecordCoordinates", () => {
    it("posts the coordinates and resolves on success", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, recordId: 7}));

        await expect(moveRecordCoordinates(7, 50.1, 15.2, 100, 1770000000000)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/atlas/record/moveCoordinates",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({
                    recordId: 7,
                    latitude: 50.1,
                    longitude: 15.2,
                    gpsPrecision: 100,
                    lastEditTimestampNum: 1770000000000,
                }),
            }),
        );
    });

    it("throws on HTTP 200 with success:false (gotcha: missing record / move failure)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, error: "Záznam nenalezen"}));

        await expect(moveRecordCoordinates(7, 50.1, 15.2, 100, 0)).rejects.toMatchObject({
            name: "ApiError",
            message: "Záznam nenalezen",
        });
    });
});

describe("reverseGeocode", () => {
    it("merges the backend array of objects into one response (skips the success flag)", async () => {
        fetchMock.mockResolvedValue(jsonResponse([
            {success: true},
            {quadrant: {code: "6152"}},
            {district: {name: "Hradec Králové"}},
            {townHierarchy: [{name: "Praha"}]},
            {phytochorions: [{phytochorion: {phytoId: "1a"}}]},
        ]));

        const data = await reverseGeocode(50.1, 15.2);

        expect(data).toEqual({
            quadrant: {code: "6152"},
            district: {name: "Hradec Králové"},
            townHierarchy: [{name: "Praha"}],
            phytochorions: [{phytochorion: {phytoId: "1a"}}],
        });
        expect(fetchMock).toHaveBeenCalledWith("/api/react/query/reverseGeocoding/lon/15.2/lat/50.1", expect.anything());
    });
});

describe("edit options", () => {
    it("getUnassignedHerbaria maps {id, name, label} options", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 1, name: "Herbář PR", label: "PR"}]}));

        await expect(getUnassignedHerbaria(7)).resolves.toEqual([{id: 1, name: "Herbář PR", label: "PR"}]);
        expect(fetchMock).toHaveBeenCalledWith("/api/react/atlas/record/7/unassignedHerbaria", expect.anything());
    });

    it("getPhytochorionOptions falls back to nameLat/nameHtml (taxon-like options)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({
            success: true,
            data: [{id: 2, nameLat: "Meso- a xerothermophilous", nameHtml: "<i>Meso</i>"}],
        }));

        await expect(getPhytochorionOptions()).resolves.toEqual([
            {id: 2, name: "Meso- a xerothermophilous", label: "<i>Meso</i>"},
        ]);
        expect(fetchMock).toHaveBeenCalledWith("/api/react/selectOptions/phytochorions", expect.anything());
    });

    it("throws ApiError when the options request fails", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, error: "Record not found"}, 400));

        const error: unknown = await getUnassignedHerbaria(7).catch((err: unknown) => err);
        expect(error).toBeInstanceOf(ApiError);
    });
});
