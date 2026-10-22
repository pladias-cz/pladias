/**
 * Testy čistého sestavení dotazu vyhledávání:
 * export_type, FormData + řazení, velikost stránky a matematika paginace.
 */

import {describe, expect, it} from "vitest";
import {
    BROWSER_EXPORT_TYPE,
    DEFAULT_PAGE_SIZE,
    EXCEL_EXPORT_PAGE_SIZE,
    buildSearchFormData,
    computeTotalPages,
    getExportTypeFromPayload,
    getVisiblePages,
    resolvePageSize,
    shouldForceCount,
} from "./searchRequest";

describe("getExportTypeFromPayload", () => {
    it("vrátí excel, když je ve formuláři zaškrtnuté excel radio", () => {
        expect(getExportTypeFromPayload([["export_type", "excel"], ["town", "Brno"]])).toBe("excel");
    });

    it("vrátí browser pro běžný submit i chybějící hodnotu", () => {
        expect(getExportTypeFromPayload([["export_type", "browser"]])).toBe("browser");
        expect(getExportTypeFromPayload([["town", "Brno"]])).toBe(BROWSER_EXPORT_TYPE);
        expect(getExportTypeFromPayload([["export_type", new File([], "x")]])).toBe(BROWSER_EXPORT_TYPE);
    });
});

describe("buildSearchFormData", () => {
    it("zkopíruje všechny filtry a doplní řazení", () => {
        const entries: Array<[string, FormDataEntryValue]> = [
            ["taxon_name", "Acer campestre"],
            ["include_subtaxa", "true"],
            ["project[]", "3"],
        ];
        const formData = buildSearchFormData(entries, "taxonName", "desc");

        expect(formData.get("taxon_name")).toBe("Acer campestre");
        expect(formData.get("include_subtaxa")).toBe("true");
        expect(formData.get("sortBy")).toBe("taxonName");
        expect(formData.get("sortOrder")).toBe("desc");
    });

    it("bez sortBy nepřidá sort parametry (výchozí řazení backendu)", () => {
        const formData = buildSearchFormData([["town", "Brno"]], null, "asc");
        expect(formData.get("sortBy")).toBeNull();
        expect(formData.get("sortOrder")).toBeNull();
    });
});

describe("resolvePageSize / shouldForceCount", () => {
    it("prohlížeč = stránka 50 a count jen na první stránce", () => {
        expect(resolvePageSize("browser")).toBe(DEFAULT_PAGE_SIZE);
        expect(shouldForceCount("browser")).toBe(false);
    });

    it("excel = vše najednou a vynucený count", () => {
        expect(resolvePageSize("excel")).toBe(EXCEL_EXPORT_PAGE_SIZE);
        expect(shouldForceCount("excel")).toBe(true);
    });
});

describe("computeTotalPages", () => {
    it("null total → null (ještě neznáme), jinak min. 1", () => {
        expect(computeTotalPages(null)).toBeNull();
        expect(computeTotalPages(0)).toBe(1);
        expect(computeTotalPages(50)).toBe(1);
        expect(computeTotalPages(51)).toBe(2);
        expect(computeTotalPages(350)).toBe(7);
    });
});

describe("getVisiblePages", () => {
    it("bez total vrací prázdné okno", () => {
        expect(getVisiblePages(1, null)).toEqual([]);
    });

    it("málo stránek → všechny", () => {
        expect(getVisiblePages(1, 3)).toEqual([1, 2, 3]);
        expect(getVisiblePages(2, 3)).toEqual([1, 2, 3]);
    });

    it("okno max 7 kolem aktuální stránky s přídržením na konci", () => {
        expect(getVisiblePages(1, 100)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(getVisiblePages(50, 100)).toEqual([47, 48, 49, 50, 51, 52, 53]);
        expect(getVisiblePages(100, 100)).toEqual([94, 95, 96, 97, 98, 99, 100]);
        // u konce se okno přichytí na poslední stránku, aby zůstala viditelná
        expect(getVisiblePages(99, 100)).toEqual([94, 95, 96, 97, 98, 99, 100]);
    });
});
