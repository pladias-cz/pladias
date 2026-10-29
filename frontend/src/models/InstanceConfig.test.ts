import {describe, expect, it} from 'vitest';
import InstanceConfig from './InstanceConfig';

/**
 * Testy projektových direktiv z konfigurace instance (conf `atlas.excerptionProjectIds`
 * a `atlas.ndopProjectIds`): členství v seznamech, null projectId (záznam bez projektu)
 * a defaulty – bez direktivy je seznam prázdný, tj. funkce vypnutá (dalibor apod.).
 */
describe('InstanceConfig', () => {
    it('isExcerptionProject vrátí true jen pro ID z excerpčních projektů', () => {
        const config = new InstanceConfig({excerptionProjectIds: [14, 20]});

        expect(config.isExcerptionProject(14)).toBe(true);
        expect(config.isExcerptionProject(20)).toBe(true);
        expect(config.isExcerptionProject(9)).toBe(false);
    });

    it('isNdopProject vrátí true jen pro ID z NDOP projektů', () => {
        const config = new InstanceConfig({ndopProjectIds: [9]});

        expect(config.isNdopProject(9)).toBe(true);
        expect(config.isNdopProject(14)).toBe(false);
    });

    it('null/undefined projectId (záznam bez projektu) nikdy neodpovídá', () => {
        const config = new InstanceConfig({excerptionProjectIds: [14], ndopProjectIds: [9]});

        expect(config.isExcerptionProject(null)).toBe(false);
        expect(config.isExcerptionProject(undefined)).toBe(false);
        expect(config.isNdopProject(null)).toBe(false);
        expect(config.isNdopProject(undefined)).toBe(false);
    });

    it('bez direktiv jsou seznamy prázdné a helpery vrací false (funkce vypnutá)', () => {
        const config = new InstanceConfig({});

        expect(config.excerptionProjectIds).toEqual([]);
        expect(config.ndopProjectIds).toEqual([]);
        expect(config.isExcerptionProject(14)).toBe(false);
        expect(config.isNdopProject(9)).toBe(false);
    });
});
