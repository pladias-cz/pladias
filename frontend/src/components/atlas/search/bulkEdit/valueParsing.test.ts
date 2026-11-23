/**
 * Testy validátoru data vstupu hromadných úprav. Parsery souřadnic se testují
 * v `core/coordinates/coordinateParsing.test.ts`.
 */
import {describe, expect, it} from 'vitest';
import {isValidDateValue} from './valueParsing';

describe('isValidDateValue', () => {
    it('přijímá prázdné, rok, rok-měsíc a celé datum', () => {
        expect(isValidDateValue('')).toBe(true);
        expect(isValidDateValue('2020')).toBe(true);
        expect(isValidDateValue('2020-05')).toBe(true);
        expect(isValidDateValue('2020-05-12')).toBe(true);
    });

    it('odmítá špatný formát a hodnoty mimo rozsah', () => {
        expect(isValidDateValue('abcd')).toBe(false);
        expect(isValidDateValue('05/2020')).toBe(false);
        expect(isValidDateValue('2020-13')).toBe(false);
        expect(isValidDateValue('2020-00')).toBe(false);
        expect(isValidDateValue('2020-05-32')).toBe(false);
        expect(isValidDateValue('2020-05-00')).toBe(false);
    });
});
