import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {ApiError} from "./apiClient";
import {
    createTaxon,
    deleteTaxon,
    deleteTaxonSynonym,
    getTaxon,
    getTaxonSynonyms,
    moveTaxon,
    moveTaxonBeforeSibling,
    saveTaxonSynonym,
    searchImportableTaxa,
    searchPossibleTaxonParents,
    searchTaxaByPrefix,
    updateTaxonField,
} from "./taxonApi";

/**
 * Testy taxonApi (sekce F.4): rozbalování obálky, HTTP 200 s `success: false`
 * (taxon správce), editor-lock redirect (HTML tělo místo obálky) a URL/těla
 * mutací. Fetch se mockuje přes vi.stubGlobal (vzor apiClient.test.ts).
 */

const jsonResponse = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
        status,
        headers: {"Content-Type": "application/json"},
    });

const htmlResponse = () =>
    new Response("<!DOCTYPE html><html><body>Pladias</body></html>", {
        status: 200,
        headers: {"Content-Type": "text/html; charset=utf-8"},
    });

const textResponse = (message: string) =>
    new Response(message, {
        status: 400,
        headers: {"Content-Type": "text/plain"},
    });

const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

const newSynonym = {
    id: -123,
    taxonId: 5,
    name: "Acer campestre",
    nameHtml: "",
    suffix: "",
    autocomplete: false,
    publication: 1,
};

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("getTaxon", () => {
    it("returns the taxon from the JsonResult envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: {id: 5, nameLat: "Acer campestre"}}));

        await expect(getTaxon(5)).resolves.toEqual({id: 5, nameLat: "Acer campestre"});
        expect(fetchMock).toHaveBeenCalledWith("/api/react/taxon/5", expect.anything());
    });

    it("throws ApiError with the backend message on 404", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Taxon 5 not found"}, 404));

        await expect(getTaxon(5)).rejects.toMatchObject({name: "ApiError", message: "Taxon 5 not found"});
    });
});

describe("getTaxonSynonyms", () => {
    it("returns the synonym list from the envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [newSynonym]}));

        await expect(getTaxonSynonyms(5)).resolves.toEqual([newSynonym]);
        expect(fetchMock).toHaveBeenCalledWith("/api/react/taxon/5/synonyms", expect.anything());
    });

    it("throws when the taxon no longer exists (404)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Taxon 5 not found"}, 404));

        await expect(getTaxonSynonyms(5)).rejects.toBeInstanceOf(ApiError);
    });
});

describe("updateTaxonField", () => {
    it("sends {field, value} as a JSON body and returns the whole updated taxon", async () => {
        const updated = {id: 5, nameLat: "Acer campestre", suppressed: false};
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: updated}));

        await expect(updateTaxonField(5, "LATNAME", "Acer campestre")).resolves.toEqual(updated);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/taxon/5",
            expect.objectContaining({
                method: "PATCH",
                body: JSON.stringify({field: "LATNAME", value: "Acer campestre"}),
                headers: expect.objectContaining({"Content-Type": "application/json"}),
            }),
        );
    });

    it("keeps boolean values unquoted in the body (SUPPRESSED)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: {id: 5, suppressed: true}}));

        await updateTaxonField(5, "SUPPRESSED", true);
        expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({field: "SUPPRESSED", value: true});
    });

    it("throws ApiError with the backend message on HTTP 200 + success:false", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Invalid value"}));

        await expect(updateTaxonField(5, "LATNAME", "x")).rejects.toMatchObject({
            name: "ApiError",
            message: "Invalid value",
        });
    });

    it("throws a clean ApiError when the editor lock redirect swallows the envelope (HTML body)", async () => {
        fetchMock.mockResolvedValue(htmlResponse());

        await expect(updateTaxonField(5, "LATNAME", "x")).rejects.toMatchObject({
            name: "ApiError",
            message: "Uložení pole taxonu selhalo.",
        });
    });
});

describe("createTaxon", () => {
    it("posts {nameLat, rankId, parentId} and returns the created taxon (201)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: {id: 42}}, 201));

        await expect(createTaxon({nameLat: "Acer", rankId: 28, parentId: 5})).resolves.toEqual({id: 42});
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/taxon",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({nameLat: "Acer", rankId: 28, parentId: 5}),
            }),
        );
    });

    it("surfaces backend validation errors (HTTP 400 + envelope)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Parent not found"}, 400));

        await expect(createTaxon({nameLat: "Acer", rankId: 28, parentId: 5})).rejects.toMatchObject({
            name: "ApiError",
            message: "Parent not found",
        });
    });
});

describe("moveTaxon", () => {
    it("posts {parentId} and returns the moved taxon", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: {id: 5, parentId: 9}}));

        await expect(moveTaxon(5, 9)).resolves.toEqual({id: 5, parentId: 9});
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/taxon/5/move",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({parentId: 9}),
            }),
        );
    });

    it("throws on the soft failure (HTTP 200 + success:false) with the backend message", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Target is a descendant"}));

        await expect(moveTaxon(5, 9)).rejects.toMatchObject({
            name: "ApiError",
            message: "Target is a descendant",
        });
    });
});

describe("moveTaxonBeforeSibling", () => {
    it("posts {taxonId, siblingId} and resolves on a success envelope without data", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: "Order updated"}));

        await expect(moveTaxonBeforeSibling(7, 9)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/taxon/moveBeforeSibling",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify({taxonId: 7, siblingId: 9}),
            }),
        );
    });

    it("throws on HTTP 500 with the envelope error message", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Reorder failed"}, 500));

        await expect(moveTaxonBeforeSibling(7, 9)).rejects.toMatchObject({
            name: "ApiError",
            message: "Reorder failed",
        });
    });
});

describe("deleteTaxon", () => {
    it("resolves on a success message envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: "Taxon deleted"}));

        await expect(deleteTaxon(5)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/taxon/5",
            expect.objectContaining({method: "DELETE"}),
        );
    });

    it("throws when the backend refuses with HTTP 200 + success:false (taxon has children)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: false, message: "Taxon has children"}));

        await expect(deleteTaxon(5)).rejects.toMatchObject({
            name: "ApiError",
            message: "Taxon has children",
        });
    });
});

describe("saveTaxonSynonym", () => {
    it("posts a new synonym (negative id) to the taxon endpoint and tolerates a response without data", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: "Synonym saved"}, 201));

        await expect(saveTaxonSynonym(newSynonym)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/synonyms/5",
            expect.objectContaining({
                method: "POST",
                body: JSON.stringify(newSynonym),
            }),
        );
    });

    it("puts an existing synonym to its own endpoint", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: "Synonym saved"}));
        const existing = {...newSynonym, id: 77};

        await expect(saveTaxonSynonym(existing)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/synonyms/77",
            expect.objectContaining({
                method: "PUT",
                body: JSON.stringify(existing),
            }),
        );
    });

    it("throws ApiError with the plain-text backend message on HTTP 400 (SynonymController.add)", async () => {
        fetchMock.mockResolvedValue(textResponse("Synonym already exists"));

        await expect(saveTaxonSynonym(newSynonym)).rejects.toMatchObject({
            name: "ApiError",
            message: "Synonym already exists",
        });
    });
});

describe("deleteTaxonSynonym", () => {
    it("deletes by id and resolves on a message envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, message: "Synonym deleted"}));

        await expect(deleteTaxonSynonym(77)).resolves.toBeUndefined();
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/synonyms/77",
            expect.objectContaining({method: "DELETE"}),
        );
    });
});

describe("searchTaxaByPrefix", () => {
    it("searches by prefix query param and unwraps the envelope", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 5, nameLat: "Acer campestre", nameHtml: "<i>Acer</i>"}]}));

        await expect(searchTaxaByPrefix("Acer")).resolves.toEqual([
            {id: 5, nameLat: "Acer campestre", nameHtml: "<i>Acer</i>"},
        ]);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/taxa/queryAll?prefix=Acer",
            expect.objectContaining({method: "GET"}),
        );
    });

    it("passes the abort signal to fetch (typeahead cancellation)", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: []}));
        const controller = new AbortController();

        await searchTaxaByPrefix("Acer", controller.signal);

        const [, init] = fetchMock.mock.calls[0];
        expect(init?.signal).toBe(controller.signal);
    });
});

describe("searchImportableTaxa", () => {
    it("searches importable taxa by prefix", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 6, nameLat: "Acer platanoides"}]}));

        await expect(searchImportableTaxa("Acer")).resolves.toEqual([{id: 6, nameLat: "Acer platanoides"}]);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/taxa/importable?prefix=Acer",
            expect.objectContaining({method: "GET"}),
        );
    });
});

describe("searchPossibleTaxonParents", () => {
    it("searches possible parents for the taxon by prefix", async () => {
        fetchMock.mockResolvedValue(jsonResponse({success: true, data: [{id: 1, nameLat: "Acer"}]}));

        await expect(searchPossibleTaxonParents(9, "Ac")).resolves.toEqual([{id: 1, nameLat: "Acer"}]);
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/react/taxon/9/possibleParents?prefix=Ac",
            expect.objectContaining({method: "GET"}),
        );
    });
});
