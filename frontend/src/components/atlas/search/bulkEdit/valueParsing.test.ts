/**
 * Testy čistých parserů vstupů hromadných úprav (F.3 z refactor.md):
 * souřadnice (desetinné i DMS, hemisféry, unicode varianty úhlů) a data.
 */
import {describe, expect, it} from "vitest";
import {formatCoord, isValidDateValue, parseCoordinate, parseCoordinatePair} from "./valueParsing";

describe("parseCoordinate", () => {
    it("parsuje desetinné stupně", () => {
        expect(parseCoordinate("49.5", "lat", "N")).toBe(49.5);
        expect(parseCoordinate("18.25", "lon", "E")).toBe(18.25);
        expect(parseCoordinate(" 49.5 ", "lat", "N")).toBe(49.5);
    });

    it("parsuje hemisféry jako prefix i suffix", () => {
        expect(parseCoordinate("N49.5", "lat", "N")).toBe(49.5);
        expect(parseCoordinate("N 49.5", "lat", "N")).toBe(49.5);
        expect(parseCoordinate("49.5S", "lat", "N")).toBe(-49.5);
        expect(parseCoordinate("S49.5", "lat", "N")).toBe(-49.5);
        expect(parseCoordinate("18.2W", "lon", "E")).toBe(-18.2);
        expect(parseCoordinate("E18.2", "lon", "E")).toBe(18.2);
    });

    it("bez hemisféry použije výchozí a normalizuje znaménko na kladné", () => {
        // záměrné chování: explicitní S/W je jediný způsob zápisu záporné hodnoty
        expect(parseCoordinate("-49.5", "lat", "N")).toBe(49.5);
        expect(parseCoordinate("+49.5", "lat", "N")).toBe(49.5);
    });

    it("parsuje DMS stupně-minuty-vteřiny", () => {
        expect(parseCoordinate("49°30'", "lat", "N")).toBe(49.5);
        expect(parseCoordinate("50° 30' 30\"", "lat", "N")).toBeCloseTo(50.5083333, 6);
        expect(parseCoordinate("49°0'30\"", "lat", "N")).toBeCloseTo(49.0083333, 6);
        expect(parseCoordinate("18°15'0\"", "lon", "E")).toBeCloseTo(18.25, 6);
    });

    it("normalizuje unicode varianty úhlů a apostrofů (º, ′, ″)", () => {
        expect(parseCoordinate("49º30′", "lat", "N")).toBe(49.5);
        expect(parseCoordinate("18°15’", "lon", "E")).toBeCloseTo(18.25, 6);
        expect(parseCoordinate("49°30”", "lat", "N")).toBeCloseTo(49.5, 6);
    });

    it("odmítá hodnoty mimo rozsah osy", () => {
        expect(parseCoordinate("90.1", "lat", "N")).toBeNull();
        expect(parseCoordinate("-90.5S", "lat", "N")).toBeNull();
        expect(parseCoordinate("180.1", "lon", "E")).toBeNull();
    });

    it("odmítá nesmyslné vstupy", () => {
        expect(parseCoordinate("", "lat", "N")).toBeNull();
        expect(parseCoordinate("   ", "lat", "N")).toBeNull();
        expect(parseCoordinate("N", "lat", "N")).toBeNull();
        expect(parseCoordinate("abc", "lat", "N")).toBeNull();
        expect(parseCoordinate("49,5", "lat", "N")).toBeNull();
    });

    it("odmítá minuty/vteřiny >= 60 v DMS", () => {
        expect(parseCoordinate("49°60'", "lat", "N")).toBeNull();
        expect(parseCoordinate("49°0'60\"", "lat", "N")).toBeNull();
    });
});

describe("parseCoordinatePair", () => {
    it("rozdělí surový vstup podle čárky i středníku", () => {
        expect(parseCoordinatePair("49.5, 18.25")).toEqual({lat: 49.5, lon: 18.25});
        expect(parseCoordinatePair("49.5;18.25")).toEqual({lat: 49.5, lon: 18.25});
        expect(parseCoordinatePair("N 49°30', E 18°15'")).toEqual({lat: 49.5, lon: 18.25});
    });

    it("vrací null bez oddělovače nebo s neplatnou částí", () => {
        expect(parseCoordinatePair("")).toBeNull();
        expect(parseCoordinatePair("49.5 18.25")).toBeNull();
        expect(parseCoordinatePair("abc, 18.25")).toBeNull();
        expect(parseCoordinatePair("95, 18.25")).toBeNull();
        expect(parseCoordinatePair("49.5, 195")).toBeNull();
    });
});

describe("formatCoord", () => {
    it("zaokrouhlí na 8 desetinných míst", () => {
        expect(formatCoord(49.123456789)).toBe("49.12345679");
        expect(formatCoord(-18.2)).toBe("-18.2");
        expect(formatCoord(0)).toBe("0");
    });
});

describe("isValidDateValue", () => {
    it("přijímá prázdné, rok, rok-měsíc a celé datum", () => {
        expect(isValidDateValue("")).toBe(true);
        expect(isValidDateValue("2020")).toBe(true);
        expect(isValidDateValue("2020-05")).toBe(true);
        expect(isValidDateValue("2020-05-12")).toBe(true);
    });

    it("odmítá špatný formát a hodnoty mimo rozsah", () => {
        expect(isValidDateValue("abcd")).toBe(false);
        expect(isValidDateValue("05/2020")).toBe(false);
        expect(isValidDateValue("2020-13")).toBe(false);
        expect(isValidDateValue("2020-00")).toBe(false);
        expect(isValidDateValue("2020-05-32")).toBe(false);
        expect(isValidDateValue("2020-05-00")).toBe(false);
    });
});
