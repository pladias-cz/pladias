/**
 * Testy čistého sestavení dotazu vyhledávání:
 * export_type, FormData + řazení, velikost stránky a matematika paginace.
 */

import {describe, expect, it} from 'vitest';
import {
    BROWSER_EXPORT_TYPE,
    DEFAULT_PAGE_SIZE,
    EXCEL_EXPORT_PAGE_SIZE,
    PAGE_SIZE_OPTIONS,
    buildSearchFormData,
    computeTotalPages,
    getExportTypeFromPayload,
    resolvePageSize,
    shouldForceCount,
} from './searchRequest';

describe('getExportTypeFromPayload', () => {
    it('vrátí excel, když je ve formuláři zaškrtnuté excel radio', () => {
        expect(getExportTypeFromPayload([['export_type', 'excel'], ['town', 'Brno']])).toBe('excel');
    });

    it('vrátí browser pro běžný submit i chybějící hodnotu', () => {
        expect(getExportTypeFromPayload([['export_type', 'browser']])).toBe('browser');
        expect(getExportTypeFromPayload([['town', 'Brno']])).toBe(BROWSER_EXPORT_TYPE);
        expect(getExportTypeFromPayload([['export_type', new File([], 'x')]])).toBe(BROWSER_EXPORT_TYPE);
    });
});

describe('buildSearchFormData', () => {
    it('zkopíruje všechny filtry a doplní řazení', () => {
        const entries: Array<[string, FormDataEntryValue]> = [
            ['taxon_name', 'Acer campestre'],
            ['include_subtaxa', 'true'],
            ['project[]', '3'],
        ];
        const formData = buildSearchFormData(entries, 'taxonName', 'desc');

        expect(formData.get('taxon_name')).toBe('Acer campestre');
        expect(formData.get('include_subtaxa')).toBe('true');
        expect(formData.get('sortBy')).toBe('taxonName');
        expect(formData.get('sortOrder')).toBe('desc');
    });

    it('bez sortBy nepřidá sort parametry (výchozí řazení backendu)', () => {
        const formData = buildSearchFormData([['town', 'Brno']], null, 'asc');
        expect(formData.get('sortBy')).toBeNull();
        expect(formData.get('sortOrder')).toBeNull();
    });
});

describe('resolvePageSize / shouldForceCount', () => {
    it('prohlížeč = zvolená velikost stránky (default 50) a count jen na první stránce', () => {
        expect(resolvePageSize('browser')).toBe(DEFAULT_PAGE_SIZE);
        expect(resolvePageSize('browser', 20)).toBe(20);
        expect(shouldForceCount('browser')).toBe(false);
    });

    it('excel = vše najednou bez ohledu na velikost stránky a vynucený count', () => {
        expect(resolvePageSize('excel', 20)).toBe(EXCEL_EXPORT_PAGE_SIZE);
        expect(shouldForceCount('excel')).toBe(true);
    });

    it('nabídka velikostí stránky obsahuje výchozí hodnotu', () => {
        expect(PAGE_SIZE_OPTIONS).toContain(DEFAULT_PAGE_SIZE);
    });
});

describe('computeTotalPages', () => {
    it('null total → null (ještě neznáme), jinak min. 1 dle velikosti stránky', () => {
        expect(computeTotalPages(null, 50)).toBeNull();
        expect(computeTotalPages(0, 50)).toBe(1);
        expect(computeTotalPages(50, 50)).toBe(1);
        expect(computeTotalPages(51, 50)).toBe(2);
        expect(computeTotalPages(350, 50)).toBe(7);
        expect(computeTotalPages(100, 20)).toBe(5);
        expect(computeTotalPages(101, 20)).toBe(6);
    });
});
