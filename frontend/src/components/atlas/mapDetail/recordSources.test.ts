import {describe, expect, it} from 'vitest';
import type {RecordsByProject, RecordGbifMinimal} from '@/models/AtlasRecords';
import type {RecordPladias} from '@/models/RecordPladias';
import {
    ALL_SOURCES_VISIBLE,
    RECORD_SOURCES,
    availableRecordSources,
    filterAndSortTableRecords,
    filterRecordsByVisibility,
    parseSavedVisibility,
    visibleSourceIds,
} from './recordSources';

/** Minimální PLADIAS záznam – filterAndSortTableRecords čte jen computed* pole. */
function pladiasRecord(
    id: number,
    computedQuadrantCode: string | null,
    computedSquareCode: string | null = computedQuadrantCode ? computedQuadrantCode.slice(0, -1) : null,
): RecordPladias {
    return {id, computedQuadrantCode, computedSquareCode} as unknown as RecordPladias;
}

/** Minimální externí záznam – filterAndSortTableRecords čte jen computed* pole. */
function externalRecord(id: number, quadrantLetter: string | null, computedSquareCode: string | null): RecordGbifMinimal {
    return {id, quadrantLetter, computedSquareCode} as unknown as RecordGbifMinimal;
}

describe('recordSources', () => {
    describe('RECORD_SOURCES', () => {
        it('obsahuje všechny tři zdroje v pořadí tabů', () => {
            expect(RECORD_SOURCES.map(source => source.id)).toEqual(['pladias', 'gbif', 'inaturalist']);
        });
    });

    describe('availableRecordSources', () => {
        it('bez externích zdrojů zůstane jen PLADIAS – je dostupný vždy', () => {
            expect(availableRecordSources([]).map(source => source.id)).toEqual(['pladias']);
        });

        it('s oběma externími zdroji vrací celý registr (dřívější chování)', () => {
            expect(availableRecordSources(['gbif', 'inaturalist']).map(source => source.id))
                .toEqual(['pladias', 'gbif', 'inaturalist']);
        });

        it('vynechá jen nedostupné externí zdroje, pořadí přebírá z registru', () => {
            expect(availableRecordSources(['inaturalist']).map(source => source.id))
                .toEqual(['pladias', 'inaturalist']);
        });
    });

    describe('filterRecordsByVisibility', () => {
        it('při všem viditelném vrací záznamy beze změny', () => {
            const records = {pladias: [1], gbif: [2, 3], inaturalist: [4]};
            expect(filterRecordsByVisibility(records, ALL_SOURCES_VISIBLE)).toEqual(records);
        });

        it('skryté skupiny nahradí prázdnými poli, viditelné ponechá', () => {
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

        it('vše skryté = všechna pole prázdná', () => {
            const result = filterRecordsByVisibility(
                {pladias: [{id: 1}], gbif: [{id: 2}], inaturalist: [{id: 3}]},
                {pladias: false, gbif: false, inaturalist: false},
            );
            expect(result).toEqual({pladias: [], gbif: [], inaturalist: []});
        });
    });

    describe('filterAndSortTableRecords', () => {
        it('nechá jen záznamy aktuálního kvadrantu', () => {
            const records: RecordsByProject = {
                pladias: [
                    pladiasRecord(1, '6152a'),
                    pladiasRecord(2, '6451a'),
                ],
                gbif: [
                    externalRecord(3, 'c', '6152'),
                    externalRecord(4, 'a', '6855'),
                    externalRecord(5, 'b', null),
                ],
                inaturalist: [externalRecord(6, 'b', '6152')],
            };

            const result = filterAndSortTableRecords(records, '6152');

            expect(result.pladias.map(r => r.id)).toEqual([1]);
            expect(result.gbif.map(r => r.id)).toEqual([3]);
            expect(result.inaturalist.map(r => r.id)).toEqual([6]);
        });

        it('seřadí dle písmene kvadrantu, záznamy bez písmene na konec', () => {
            const records: RecordsByProject = {
                pladias: [
                    pladiasRecord(1, '6152c'),
                    pladiasRecord(2, null, '6152'),
                    pladiasRecord(3, '6152a'),
                    pladiasRecord(4, '6152b'),
                ],
                gbif: [
                    externalRecord(5, 'd', '6152'),
                    externalRecord(6, null, '6152'),
                    externalRecord(7, 'a', '6152'),
                ],
                inaturalist: [],
            };

            const result = filterAndSortTableRecords(records, '6152');

            expect(result.pladias.map(r => r.id)).toEqual([3, 4, 1, 2]);
            expect(result.gbif.map(r => r.id)).toEqual([7, 5, 6]);
        });

        it('nezmutuje vstupní pole', () => {
            const pladias = [pladiasRecord(1, '6152b'), pladiasRecord(2, '6152a')];
            const records: RecordsByProject = {pladias, gbif: [], inaturalist: []};

            filterAndSortTableRecords(records, '6152');

            expect(pladias.map(r => r.id)).toEqual([1, 2]);
        });
    });

    describe('visibleSourceIds', () => {
        it('vrací seznam viditelných zdrojů v pořadí registru', () => {
            expect(visibleSourceIds(ALL_SOURCES_VISIBLE)).toEqual(['pladias', 'gbif', 'inaturalist']);
            expect(visibleSourceIds({pladias: false, gbif: true, inaturalist: false})).toEqual(['gbif']);
        });
    });

    describe('parseSavedVisibility', () => {
        it('vrací null pro prázdnou/chybějící hodnotu', () => {
            expect(parseSavedVisibility(null)).toBeNull();
            expect(parseSavedVisibility('')).toBeNull();
        });

        it('vrací null pro nevalidní data (ne-JSON, ne-pole, jen neznámé klíče)', () => {
            expect(parseSavedVisibility('nonsense')).toBeNull();
            expect(parseSavedVisibility('{"pladias":true}')).toBeNull();
            expect(parseSavedVisibility('["bflm","zachodni"]')).toBeNull();
        });

        it('naparsuje uložený seznam viditelných zdrojů', () => {
            expect(parseSavedVisibility('["pladias","inaturalist"]')).toEqual({
                pladias: true,
                gbif: false,
                inaturalist: true,
            });
        });

        it('prázdné pole je validní stav – vše skryto', () => {
            expect(parseSavedVisibility('[]')).toEqual({pladias: false, gbif: false, inaturalist: false});
        });

        it('neznámé klíče odfiltruje', () => {
            expect(parseSavedVisibility('["gbif","bflm"]')).toEqual({
                pladias: false,
                gbif: true,
                inaturalist: false,
            });
        });
    });
});
