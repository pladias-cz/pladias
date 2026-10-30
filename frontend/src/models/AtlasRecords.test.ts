import {beforeEach, describe, expect, it} from 'vitest';
import {EXTERNAL_PROJECTS, isExternalProject, parseExternalSources} from './AtlasRecords';
import {getRecentLogEntries, resetLogger} from '@/services/logger';

describe('EXTERNAL_PROJECTS', () => {
    it('zrcadlí externí zdroje registru RECORD_SOURCES', () => {
        expect([...EXTERNAL_PROJECTS]).toEqual(['gbif', 'inaturalist']);
    });
});

describe('isExternalProject', () => {
    it('přijímá známá id zdrojů', () => {
        expect(isExternalProject('gbif')).toBe(true);
        expect(isExternalProject('inaturalist')).toBe(true);
    });

    it('odmítá neznámá id a překlepy', () => {
        expect(isExternalProject('pladias')).toBe(false);
        expect(isExternalProject('bflm')).toBe(false);
        expect(isExternalProject('')).toBe(false);
    });
});

describe('parseExternalSources', () => {
    beforeEach(() => {
        resetLogger();
    });

    it('neznámá id zahodí s varováním do logu (drift BE↔FE)', () => {
        expect(parseExternalSources(['gbif', 'futureSource'])).toEqual(['gbif']);

        const logged = getRecentLogEntries();
        expect(logged).toHaveLength(1);
        expect(logged[0].level).toBe('warn');
        expect(logged[0].context).toEqual({source: 'futureSource'});
    });

    it('chybějící klíč (starší backend) = všechny externí zdroje', () => {
        expect(parseExternalSources(undefined)).toEqual(['gbif', 'inaturalist']);
        expect(parseExternalSources(null)).toEqual(['gbif', 'inaturalist']);
        expect(getRecentLogEntries()).toHaveLength(0);
    });

    it('prázdné pole je platná konfigurace – instance bez externích dat', () => {
        expect(parseExternalSources([])).toEqual([]);
        expect(getRecentLogEntries()).toHaveLength(0);
    });
});