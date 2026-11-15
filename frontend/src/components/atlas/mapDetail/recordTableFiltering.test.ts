import {describe, expect, it} from 'vitest';
import type {RecordPladias} from '@/models';
import type {RecordGbifMinimal} from '@/models/AtlasRecords';
import {
    applyExternalTableControls,
    applyRecordTableControls,
    countMatchingRecords,
    externalSearchFields,
    finderSurname,
    phytochorionNumericId,
    pladiasSearchFields,
    sortableKeyOf,
} from './recordTableFiltering';

/**
 * Testy klientského filtrování a řazení řádků tabulek mapového detailu
 * (recordTableFiltering) – pravidla sloupců 1–7 ze zadání:
 * písmeno kvadrantu, číslo/název fytochorionu, wildcard obec/lokalita/pramen/
 * původní jméno, wildcard sběratel, rok, název projektu, hodnota statusu.
 */

function makePladiasRecord(overrides: Partial<RecordPladias> & { id: number }): RecordPladias {
    return {
        computedQuadrantCode: '6152a',
        phytochorionPhytoId: '17',
        phytochorionName: 'Čechy',
        nearestTownName: 'Praha',
        nearestTownText: 'Praha',
        districtName: 'Praha',
        locality: 'les u řeky',
        source: 'FLORA 1998',
        taxonOriginal: 'Trifolium pratense',
        recordAuthorsNames: 'Karel Domin, J. Věch',
        dateIso: '1998-05-12',
        year: 1998,
        projectName: 'Flora České republiky',
        projectCredibility: 3,
        validationStatusId: 3,
        originalityStatusId: 1,
        includedInMap: true,
        ...overrides,
    } as unknown as RecordPladias;
}

function makeExternalRecord(overrides: Partial<RecordGbifMinimal> & { id: number }): RecordGbifMinimal {
    return {
        latitude: 50.1,
        longitude: 14.4,
        quadrantLetter: 'a',
        recordedBy: 'J. Věch',
        year: 2020,
        institutionCode: 'CB76',
        project: 'gbif',
        ...overrides,
    } as unknown as RecordGbifMinimal;
}

const ids = (records: readonly { id: number }[]) => records.map(record => record.id);

describe('phytochorionNumericId', () => {
    it('bere číslo z prefixu phyto_id (stejně jako substring backendu)', () => {
        expect(phytochorionNumericId('17')).toBe(17);
        expect(phytochorionNumericId('4202_01_a')).toBe(4202);
    });

    it('bez číselného prefixu a null vrací null (na konec řazení)', () => {
        expect(phytochorionNumericId('x')).toBeNull();
        expect(phytochorionNumericId(null)).toBeNull();
    });
});

describe('finderSurname', () => {
    it('bere poslední slovo prvního jména (= příjmení)', () => {
        expect(finderSurname('Karel Domin, J. Věch')).toBe('Domin');
        expect(finderSurname('Věch')).toBe('Věch');
    });

    it('prázdné a null hodnoty vrací null', () => {
        expect(finderSurname('   ')).toBeNull();
        expect(finderSurname(null)).toBeNull();
    });
});

describe('applyRecordTableControls – filtry', () => {
    const records = [
        makePladiasRecord({id: 1}),
        makePladiasRecord({
            id: 2,
            computedQuadrantCode: '6152c',
            phytochorionPhytoId: '4202_01_a',
            phytochorionName: 'Střední Evropa',
            nearestTownName: 'Brno',
            nearestTownText: 'Brno',
            districtName: 'Brno-venkov',
            locality: 'stepní stráň',
            source: 'Nálezová databáze',
            taxonOriginal: 'Festuca rupicola',
            recordAuthorsNames: 'Josef Grulich',
            dateIso: '2005-08-02',
            year: 2005,
            projectName: 'NDOP',
            projectCredibility: 1,
            validationStatusId: 1,
        }),
    ];

    const filter = (id: string, value: string) => applyRecordTableControls(records, [{id: id as never, value}], null, false);

    it('sloupec 1: písmeno kvadrantu', () => {
        expect(ids(filter('quadrantLetter', 'c'))).toEqual([2]);
        expect(ids(filter('quadrantLetter', ''))).toEqual([1, 2]);
    });

    it('sloupec 2: číslo i část názvu fytochorionu', () => {
        expect(ids(filter('phytochorion', '4202'))).toEqual([2]);
        expect(ids(filter('phytochorion', 'Střední Evropa'))).toEqual([2]);
        // wildcard bez diakritiky
        expect(ids(filter('phytochorion', 'stredni'))).toEqual([2]);
    });

    it('sloupec 3: wildcard obec / lokalita / pramen / původní jméno', () => {
        expect(ids(filter('locality', 'Praha'))).toEqual([1]);
        expect(ids(filter('locality', 'Venkov'))).toEqual([2]);
        expect(ids(filter('locality', 'stepní'))).toEqual([2]);
        expect(ids(filter('locality', 'flora'))).toEqual([1]);
        expect(ids(filter('locality', 'rupicola'))).toEqual([2]);
    });

    it('sloupec 4: wildcard sběratel', () => {
        expect(ids(filter('finders', 'domin'))).toEqual([1]);
        expect(ids(filter('finders', 'grulich'))).toEqual([2]);
        expect(ids(filter('finders', 'věch'))).toEqual([1]);
    });

    it('sloupec 5: rok i kus data (1998 / 1998-05 / 05-12)', () => {
        expect(ids(filter('date', '1998'))).toEqual([1]);
        expect(ids(filter('date', '1998-05'))).toEqual([1]);
        expect(ids(filter('date', '2005'))).toEqual([2]);
        expect(ids(filter('date', 'nevim'))).toEqual([]);
    });

    it('sloupec 6: část názvu projektu', () => {
        expect(ids(filter('project', 'flora'))).toEqual([1]);
        expect(ids(filter('project', 'ndo'))).toEqual([2]);
    });

    it('sloupec 7: hodnota statusu', () => {
        expect(ids(filter('validationStatus', '3'))).toEqual([1]);
        expect(ids(filter('validationStatus', '1'))).toEqual([2]);
        // nečíselný vstup se do selectu nedostane, ale nesmí nic shořet
        expect(ids(filter('validationStatus', 'x'))).toEqual([]);
    });

    it('více filtrů se kombinuje AND', () => {
        const filtered = applyRecordTableControls(records, [
            {id: 'quadrantLetter', value: 'c'},
            {id: 'finders', value: 'domin'},
        ], null, false);
        expect(ids(filtered)).toEqual([]);
    });

    it('countMatchingRecords počítá shody bez řazení', () => {
        expect(countMatchingRecords(records.map(pladiasSearchFields), [{id: 'quadrantLetter', value: 'c'}])).toBe(1);
        expect(countMatchingRecords(records.map(pladiasSearchFields), [])).toBe(2);
    });
});

describe('applyRecordTableControls – řazení', () => {
    const records = [
        makePladiasRecord({
            id: 1, computedQuadrantCode: '6152c', nearestTownName: 'Ves', nearestTownText: 'Ves',
            phytochorionPhytoId: '124', recordAuthorsNames: 'Eva Nováková', dateIso: '2001-01-01',
            year: 2001, projectCredibility: 2, projectName: 'Druhý projekt', validationStatusId: 1,
        }),
        makePladiasRecord({
            id: 2, computedQuadrantCode: '6152a', nearestTownName: 'Adamov', nearestTownText: 'Adamov',
            phytochorionPhytoId: '17', recordAuthorsNames: 'Pavel Novotný', dateIso: '1990-06-06',
            year: 1990, projectCredibility: 5, projectName: 'První projekt', validationStatusId: 3,
        }),
        makePladiasRecord({
            id: 3, computedQuadrantCode: '6152b', nearestTownName: 'Zlín', nearestTownText: 'Zlín',
            phytochorionPhytoId: '4202_01_a', recordAuthorsNames: 'Jana Dvořáková', dateIso: null,
            year: null, projectCredibility: 1, projectName: 'Třetí projekt', validationStatusId: 0,
            includedInMap: false,
        }),
    ];

    it('řadí podle písmene kvadrantu abecedně', () => {
        expect(ids(applyRecordTableControls(records, [], 'quadrantLetter', false))).toEqual([2, 3, 1]);
    });

    it('řadí podle čísla fytochorionu (17 < 124 < 4202)', () => {
        expect(ids(applyRecordTableControls(records, [], 'phytochorion', false))).toEqual([2, 1, 3]);
    });

    it('řadí podle obce česky a sestupně obrací', () => {
        expect(ids(applyRecordTableControls(records, [], 'locality', false))).toEqual([2, 1, 3]);
        expect(ids(applyRecordTableControls(records, [], 'locality', true))).toEqual([3, 1, 2]);
    });

    it('řadí podle příjmení sběratele', () => {
        expect(ids(applyRecordTableControls(records, [], 'finders', false))).toEqual([3, 1, 2]);
    });

    it('řadí podle data, záznam bez data až na konec', () => {
        expect(ids(applyRecordTableControls(records, [], 'date', false))).toEqual([2, 1, 3]);
        expect(ids(applyRecordTableControls(records, [], 'date', true))).toEqual([1, 2, 3]);
    });

    it('řadí podle věrohodnosti projektu klesající (5 > 2 > 1)', () => {
        expect(ids(applyRecordTableControls(records, [], 'project', false))).toEqual([2, 1, 3]);
    });

    it('řadí podle priority statusu a uvnitř kategorie dle id statusu', () => {
        const statuses = [
            makePladiasRecord({id: 10, validationStatusId: 1, includedInMap: true}),
            makePladiasRecord({id: 11, validationStatusId: 3, includedInMap: true}),
            makePladiasRecord({id: 12, validationStatusId: 3, includedInMap: false}),
            makePladiasRecord({id: 13, validationStatusId: 0, includedInMap: false}),
            makePladiasRecord({id: 14, validationStatusId: 2, includedInMap: false}),
        ];
        // priorita 0: nejdřív status 1 (id 10), pak status 3 (id 11); priorita 1: 12;
        // priorita 2: status 0 (id 13), pak 2 (id 14)
        expect(ids(applyRecordTableControls(statuses, [], 'validationStatus', false))).toEqual([10, 11, 12, 13, 14]);
    });

    it('bez řadicího klíče zachová pořadí ze serveru', () => {
        expect(ids(applyRecordTableControls(records, [], null, false))).toEqual([1, 2, 3]);
    });

    it('filtr a řazení dohromady', () => {
        const sorted = applyRecordTableControls(
            records,
            [{id: 'finders', value: 'nov'}],
            'finders',
            false,
        );
        expect(ids(sorted)).toEqual([1, 2]);
    });
});

describe('applyExternalTableControls', () => {
    const records = [
        makeExternalRecord({id: 1, quadrantLetter: 'b', year: 2001, recordedBy: 'Karel Domin', institutionCode: 'CB76'}),
        makeExternalRecord({id: 2, quadrantLetter: 'a', year: 1999, recordedBy: 'J. Věch', institutionCode: 'CB'}),
    ];

    it('filtruje písmeno, sběratele, rok i instituci', () => {
        expect(ids(applyExternalTableControls(records, [{id: 'quadrantLetter', value: 'a'}], null, false))).toEqual([2]);
        expect(ids(applyExternalTableControls(records, [{id: 'finders', value: 'domin'}], null, false))).toEqual([1]);
        expect(ids(applyExternalTableControls(records, [{id: 'date', value: '1999'}], null, false))).toEqual([2]);
        expect(ids(applyExternalTableControls(records, [{id: 'institution', value: 'cb76'}], null, false))).toEqual([1]);
    });

    it('řadí podle roku a písmene kvadrantu', () => {
        expect(ids(applyExternalTableControls(records, [], 'date', false))).toEqual([2, 1]);
        expect(ids(applyExternalTableControls(records, [], 'quadrantLetter', false))).toEqual([2, 1]);
    });

    it('countMatchingRecords přes externalSearchFields', () => {
        expect(countMatchingRecords(records.map(externalSearchFields), [{id: 'finders', value: 'někdo'}])).toBe(0);
    });
});

describe('sortableKeyOf', () => {
    it('zná řaditelné sloupce a neznámý vrací null', () => {
        expect(sortableKeyOf('locality')).toBe('locality');
        expect(sortableKeyOf('taxon')).toBeNull();
    });
});
