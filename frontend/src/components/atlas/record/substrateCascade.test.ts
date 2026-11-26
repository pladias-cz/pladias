/**
 * Testy přechodů kategorií substrátu (ne-cevnaté záznamy). Hlídají, že optimistická kopie
 * záznamu drží týž invariant jako backend (`RecordsService.updateDaliborSubstrate1/2`):
 * upřesnění nikdy bez hlavní kategorie, změna hlavní kategorie tichou kaskádou smaže
 * neslučitelné upřesnění, vymazání upřesnění hlavní kategorii ponechá.
 */

import {describe, expect, it} from 'vitest';
import type {RecordPladiasFull} from '@/models/RecordPladiasFull';
import type {SubstrateOption} from '@/models/SubstrateOption';
import {substrateStateFrom, withSubstrate1, withSubstrate2, type SubstrateState} from './substrateCascade';

const PODLY = {id: 3, name: 'Půdy'};
const SKALY = {id: 7, name: 'Skály'};

const MECHNA_BAZI_STROMU: SubstrateOption = {
    id: 41,
    name: 'mech na bázi stromu',
    substrate1Id: PODLY.id,
    substrate1Text: PODLY.name,
};

const LISAJNIKNA_SKALE: SubstrateOption = {
    id: 52,
    name: 'lišejník na skále',
    substrate1Id: SKALY.id,
    substrate1Text: SKALY.name,
};

/** Záznam s hlavním substrátem i upřesněním. */
const filled: SubstrateState = {
    substrate1Id: PODLY.id,
    substrate1Text: PODLY.name,
    substrate2Id: MECHNA_BAZI_STROMU.id,
    substrate2Text: MECHNA_BAZI_STROMU.name,
    substrateCategoryText: 'Půdy - mech na bázi stromu',
};

/** Záznam, kde známe jen hlavní kategorii – přesně případ, který šel dřív zadat jen přes import. */
const mainOnly: SubstrateState = {
    substrate1Id: PODLY.id,
    substrate1Text: PODLY.name,
    substrate2Id: null,
    substrate2Text: null,
    substrateCategoryText: 'Půdy',
};

describe('substrateStateFrom', () => {
    it('bere prázdné řetězce ze serveru jako nevymezenou hodnotu', () => {
        const record = {
            substrate1Id: null,
            substrate1Text: '',
            substrate2Id: null,
            substrate2Text: '',
            substrateCategoryText: '',
        } as unknown as RecordPladiasFull;

        expect(substrateStateFrom(record)).toEqual({
            substrate1Id: null,
            substrate1Text: null,
            substrate2Id: null,
            substrate2Text: null,
            substrateCategoryText: null,
        });
    });
});

describe('withSubstrate1', () => {
    it('ponechá upřesnění při volbě téže hlavní kategorie', () => {
        expect(withSubstrate1(filled, PODLY)).toEqual(filled);
    });

    it('tichou kaskádou smaže upřesnění z jiné hlavní kategorie', () => {
        const next = withSubstrate1(filled, SKALY);

        expect(next.substrate1Id).toBe(SKALY.id);
        expect(next.substrate1Text).toBe(SKALY.name);
        expect(next.substrate2Id).toBeNull();
        expect(next.substrate2Text).toBeNull();
        expect(next.substrateCategoryText).toBe(SKALY.name);
    });

    it('nastavení hlavní kategorie k prázdnému upřesnění stačí samo', () => {
        expect(withSubstrate1({
            substrate1Id: null,
            substrate1Text: null,
            substrate2Id: null,
            substrate2Text: null,
            substrateCategoryText: null,
        }, PODLY)).toEqual(mainOnly);
    });

    it('vymazání hlavní kategorie smaže i upřesnění', () => {
        const next = withSubstrate1(filled, null);

        expect(next.substrate1Id).toBeNull();
        expect(next.substrate2Id).toBeNull();
        expect(next.substrateCategoryText).toBeNull();
    });
});

describe('withSubstrate2', () => {
    it('odvodí hlavní kategorii od rodiče upřesnění', () => {
        expect(withSubstrate2(mainOnly, LISAJNIKNA_SKALE)).toEqual({
            substrate1Id: SKALY.id,
            substrate1Text: SKALY.name,
            substrate2Id: LISAJNIKNA_SKALE.id,
            substrate2Text: LISAJNIKNA_SKALE.name,
            substrateCategoryText: 'Skály - lišejník na skále',
        });
    });

    it('vymazání upřesnění nechá hlavní kategorii na místě', () => {
        expect(withSubstrate2(filled, null)).toEqual(mainOnly);
    });
});
