/**
 * Testy sestavení payloadu pokročilého vyhledávání: emitují se jen hodnoty
 * viditelných a na instanci aplikovatelných filtrů; base klíče (export_type,
 * committerId fallback) vždy. Parita chování starého formuláře:
 * include_subtaxa (default true), checkboxy jen při zaškrtnutí, -1 u committera.
 */

import {describe, expect, it} from 'vitest';
import {buildAdvancedSearchPayload, emittedKeysForFilter, hasFilterValues, payloadEntriesEqual} from './advancedSearchRequest';
import {DEFAULT_VISIBLE_FILTERS, FILTER_DEFINITIONS, type FilterDefinition} from './filterRegistry';
import type {FilterValue, FilterValues} from './types';

/** Všechny samostatné filtry viditelné (bez companion). */
const ALL_VISIBLE = FILTER_DEFINITIONS
    .filter((filter) => !filter.companionOf)
    .map((filter) => filter.id);

/** entries → objekt; duplicitní klíče (project[]) jako pole hodnot. */
function toMap(entries: Array<[string, FormDataEntryValue]>): Record<string, string | string[]> {
    const map: Record<string, string | string[]> = {};
    for (const [key, value] of entries) {
        const text = String(value);
        if (key in map) {
            const existing = map[key];
            map[key] = Array.isArray(existing) ? [...existing, text] : [existing, text];
        } else {
            map[key] = text;
        }
    }
    return map;
}

/** Vyplněná ukázková hodnota podle druhu filtru. */
function sampleValue(filter: FilterDefinition): FilterValue | undefined {
    switch (filter.kind) {
        case 'checkbox':
            return true;
        case 'checkboxGroup':
            return [{id: 'commented', label: 'ukázka'}];
        case 'taxonAutocomplete':
            return [{id: 1, label: 'Quercus'}];
        case 'polygonMap':
            return 'POLYGON ((14 49, 15 49, 15 50, 14 49))';
        case 'typeahead':
            return [{id: 1, label: 'ukázka'}];
        case 'numberRange':
        case 'dateRange':
            return {from: '1', to: '2'};
        default:
            return 'abc';
    }
}

describe('filterRegistry sanity', () => {
    it('defaultně viditelné filtry existují v registru', () => {
        const ids = new Set(FILTER_DEFINITIONS.map((filter) => filter.id));
        for (const id of DEFAULT_VISIBLE_FILTERS) {
            expect(ids.has(id)).toBe(true);
        }
    });

    it('každý filtr deklaruje aspoň jeden payload klíč', () => {
        for (const filter of FILTER_DEFINITIONS) {
            expect(filter.payloadKeys.length).toBeGreaterThan(0);
        }
    });

    it('vyplněná hodnota filtru emituje jen deklarované payload klíče', () => {
        for (const filter of FILTER_DEFINITIONS) {
            for (const key of emittedKeysForFilter(filter, sampleValue(filter))) {
                expect([...filter.payloadKeys]).toContain(key);
            }
        }
    });
});

describe('buildAdvancedSearchPayload', () => {
    it('bez vyplněných filtrů: base klíče + include_subtaxa (parita starého formuláře)', () => {
        const map = toMap(buildAdvancedSearchPayload({}, ALL_VISIBLE, true));

        expect(map['export_type']).toBe('browser');
        expect(map['include_subtaxa']).toBe('true');
        expect(map['committerId']).toBe('-1');
    });

    it('skrytý filtr se do dotazu neposílá (town vyplněný, ale skrytý)', () => {
        const map = toMap(buildAdvancedSearchPayload({town: 'Brno'}, DEFAULT_VISIBLE_FILTERS, true));

        expect(map['town']).toBeUndefined();
    });

    it('vyplněný taxon se posílá i s podtaxonami; vícenásobný výběr odděluje středníkem', () => {
        const map = toMap(buildAdvancedSearchPayload(
            {
                taxonName: [
                    {id: 1, label: 'Quercus'},
                    {id: 2, label: 'Carex pilulifera'},
                ],
            },
            DEFAULT_VISIBLE_FILTERS,
            true,
        ));

        expect(map['taxon_name']).toBe('Quercus;Carex pilulifera');
        expect(map['include_subtaxa']).toBe('true');
    });

    it('odškrtnuté podtaxony se neposílají', () => {
        const map = toMap(buildAdvancedSearchPayload(
            {taxonName: [{id: 1, label: 'Quercus'}], includeSubtaxa: false},
            DEFAULT_VISIBLE_FILTERS,
            true,
        ));

        expect(map['include_subtaxa']).toBeUndefined();
    });

    it('companion (podtaxony) se posílá jen s viditelným taxonem', () => {
        const visibleWithoutTaxon = DEFAULT_VISIBLE_FILTERS.filter((id) => id !== 'taxonName');
        const map = toMap(buildAdvancedSearchPayload({taxonName: [{id: 1, label: 'Quercus'}]}, visibleWithoutTaxon, true));

        expect(map['taxon_name']).toBeUndefined();
        expect(map['include_subtaxa']).toBeUndefined();
    });

    it('polygon se posílá jako polygonWkt (WKT řetězec)', () => {
        const wkt = 'POLYGON ((14.1 49.5, 14.2 49.6, 14.3 49.4, 14.1 49.5))';
        const map = toMap(buildAdvancedSearchPayload({polygon: wkt}, ALL_VISIBLE, true));

        expect(map['polygonWkt']).toBe(wkt);
    });

    it('typeahead: single posílá id, multiple posílá každé id zvlášť pod stejným klíčem', () => {
        const values: FilterValues = {
            phytochorion: [{id: 5, label: 'Fyt'}],
            projects: [{id: 1, label: 'P1'}, {id: 2, label: 'P2'}],
        };
        const map = toMap(buildAdvancedSearchPayload(values, ALL_VISIBLE, true));

        expect(map['phytochorion']).toBe('5');
        expect(map['project[]']).toEqual(['1', '2']);
    });

    it('rozsah: posílají se jen vyplněné strany', () => {
        const map = toMap(buildAdvancedSearchPayload({year: {from: '1990', to: ''}}, DEFAULT_VISIBLE_FILTERS, true));

        expect(map['minYear']).toBe('1990');
        expect(map['maxYear']).toBeUndefined();
    });

    it('checkboxy: true ano, false ne; skupina stavu komenářů emituje jen zaškrtnuté volby', () => {
        const values: FilterValues = {
            commentStatus: [
                {id: 'commented', label: 'jen s komentářem'},
                {id: 'unresolvedComment', label: 'jen s nevyřešeným komentářem'},
            ],
            noMapSquare: false,
        };
        const map = toMap(buildAdvancedSearchPayload(values, ALL_VISIBLE, true));

        expect(map['commented']).toBe('true');
        expect(map['unresolvedComment']).toBe('true');
        expect(map['no_map_square_or_quadrant']).toBeUndefined();
    });

    it('committer s výběrem neposílá fallback -1', () => {
        const map = toMap(buildAdvancedSearchPayload({committer: [{id: 7, label: 'Novák'}]}, ALL_VISIBLE, true));

        expect(map['committerId']).toBe('7');
    });

    it('scope: vascular instanci patří herbarium (typeahead), ne herbariumText', () => {
        const values: FilterValues = {herbarium: [{id: 3, label: 'BRNM'}], herbariumText: 'BRNM'};
        const map = toMap(buildAdvancedSearchPayload(values, ALL_VISIBLE, true));

        expect(map['herbarium']).toBe('3');
        expect(map['herbariumText']).toBeUndefined();
    });

    it('scope: non-vascular instanci patří herbariumText, ne phytochorion', () => {
        const values: FilterValues = {herbariumText: 'BRNM', phytochorion: [{id: 5, label: 'Fyt'}]};
        const map = toMap(buildAdvancedSearchPayload(values, ALL_VISIBLE, false));

        expect(map['herbariumText']).toBe('BRNM');
        expect(map['phytochorion']).toBeUndefined();
    });

    it('prázdné a bílé stringy se neposílají', () => {
        const map = toMap(buildAdvancedSearchPayload({town: '   '}, ALL_VISIBLE, true));

        expect(map['town']).toBeUndefined();
    });

    it('exportType excel se promítne do export_type', () => {
        const map = toMap(buildAdvancedSearchPayload({}, DEFAULT_VISIBLE_FILTERS, true, 'excel'));

        expect(map['export_type']).toBe('excel');
    });
});

describe('hasFilterValues / payloadEntriesEqual', () => {
    it('base payload (export_type, committerId, include_subtaxa) nemá hodnoty filtrů', () => {
        expect(hasFilterValues(buildAdvancedSearchPayload({}, ALL_VISIBLE, true))).toBe(false);
    });

    it('payload s hodnotou filtru hodnoty má', () => {
        expect(hasFilterValues(buildAdvancedSearchPayload({town: 'Brno'}, ALL_VISIBLE, true))).toBe(true);
    });

    it('shodné payloady (stejné hodnoty i pořadí) se rovnají; při změně ne', () => {
        const a = buildAdvancedSearchPayload({town: 'Brno'}, ALL_VISIBLE, true);
        const b = buildAdvancedSearchPayload({town: 'Brno'}, ALL_VISIBLE, true);

        expect(payloadEntriesEqual(a, b)).toBe(true);
        expect(payloadEntriesEqual(a, buildAdvancedSearchPayload({}, ALL_VISIBLE, true))).toBe(false);
        expect(payloadEntriesEqual([], [])).toBe(true);
    });
});
