import {describe, expect, it} from "vitest";
import {
    ALL_SOURCES_VISIBLE,
    RECORD_SOURCES,
    filterRecordsByVisibility,
    parseSavedVisibility,
    visibleSourceIds,
} from "./recordSources";

describe("recordSources", () => {
    describe("RECORD_SOURCES", () => {
        it("obsahuje všechny tři zdroje v pořadí tabů", () => {
            expect(RECORD_SOURCES.map(source => source.id)).toEqual(["pladias", "gbif", "inaturalist"]);
        });
    });

    describe("filterRecordsByVisibility", () => {
        it("při všem viditelném vrací záznamy beze změny", () => {
            const records = {pladias: [1], gbif: [2, 3], inaturalist: [4]};
            expect(filterRecordsByVisibility(records, ALL_SOURCES_VISIBLE)).toEqual(records);
        });

        it("skryté skupiny nahradí prázdnými poli, viditelné ponechá", () => {
            const pladias = [{id: 1}];
            const gbif = [{id: 2}];
            const inaturalist = [{id: 3}];
            const result = filterRecordsByVisibility(
                {pladias, gbif, inaturalist},
                {pladias: true, gbif: false, inaturalist: false},
            );
            expect(result.pladias).toEqual(pladias);
            expect(result.gbif).toEqual([]);
            expect(result.inaturalist).toEqual([]);
        });

        it("vše skryté = všechna pole prázdná", () => {
            const result = filterRecordsByVisibility(
                {pladias: [{id: 1}], gbif: [{id: 2}], inaturalist: [{id: 3}]},
                {pladias: false, gbif: false, inaturalist: false},
            );
            expect(result).toEqual({pladias: [], gbif: [], inaturalist: []});
        });
    });

    describe("visibleSourceIds", () => {
        it("vrací seznam viditelných zdrojů v pořadí registru", () => {
            expect(visibleSourceIds(ALL_SOURCES_VISIBLE)).toEqual(["pladias", "gbif", "inaturalist"]);
            expect(visibleSourceIds({pladias: false, gbif: true, inaturalist: false})).toEqual(["gbif"]);
        });
    });

    describe("parseSavedVisibility", () => {
        it("vrací null pro prázdnou/chybějící hodnotu", () => {
            expect(parseSavedVisibility(null)).toBeNull();
            expect(parseSavedVisibility("")).toBeNull();
        });

        it("vrací null pro nevalidní data (ne-JSON, ne-pole, jen neznámé klíče)", () => {
            expect(parseSavedVisibility("nonsense")).toBeNull();
            expect(parseSavedVisibility('{"pladias":true}')).toBeNull();
            expect(parseSavedVisibility('["bflm","zachodni"]')).toBeNull();
        });

        it("naparsuje uložený seznam viditelných zdrojů", () => {
            expect(parseSavedVisibility('["pladias","inaturalist"]')).toEqual({
                pladias: true,
                gbif: false,
                inaturalist: true,
            });
        });

        it("prázdné pole je validní stav – vše skryto", () => {
            expect(parseSavedVisibility("[]")).toEqual({pladias: false, gbif: false, inaturalist: false});
        });

        it("neznámé klíče odfiltruje", () => {
            expect(parseSavedVisibility('["gbif","bflm"]')).toEqual({
                pladias: false,
                gbif: true,
                inaturalist: false,
            });
        });
    });
});
