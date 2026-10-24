import {describe, expect, it} from 'vitest';
import i18n from './i18n';

describe('i18n', () => {
    it('initializes with cs as the default language', () => {
        expect(i18n.language).toBe('cs');
        expect(i18n.t('user.playMessages.submit')).toBe('Uložit');
    });

    it('translates to en/de (pl is filled the same way) and falls back to cs for unknown languages', () => {
        expect(i18n.t('user.playMessages.submit', {lng: 'en'})).toBe('Save');
        expect(i18n.t('user.playMessages.submit', {lng: 'de'})).toBe('Speichern');
        expect(i18n.t('user.playMessages.submit', {lng: 'xx'})).toBe('Uložit');
    });

    it('interpolates placeholders in taxon admin card texts (i18next syntax is {{...}}, not {...})', () => {
        expect(i18n.t('taxon.move.title', {name: 'Taraxacum'})).toBe('Přesun taxonu Taraxacum');
        expect(i18n.t('taxon.create.title', {name: 'Taraxacum'})).toBe('Nový taxon pod Taraxacum');
        expect(i18n.t('taxon.move.deleteConfirm', {name: 'Taraxacum'})).not.toContain('{name}');
        expect(i18n.t('taxon.move.deleteConfirm', {name: 'Taraxacum'})).toContain('Taraxacum');
    });
});