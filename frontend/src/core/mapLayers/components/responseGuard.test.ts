import {describe, expect, it} from 'vitest';
import {createResponseGuard} from './responseGuard';

/**
 * Test stráže nad pozdními odpověďmi mapových vrstev (`responseGuard.ts`).
 *
 * Regrese (`SquaresOverlay`): na `mapMain` se GeoJSON s čtverci stahoval dvakrát
 * souběžně (podruhého vyvolalo dojití dotazu na taxon, protože `taxonId` se do
 * mapy dostával z `taxon?.id`). Vrstva, jejíž odpověď dorazila poslední, si
 * nechala své handlery – když to ta první (s `taxonId === undefined`), dvojklik
 * ani pravý klik na čtverec nedělaly nic. Test tedy hlídá, že „poslední
 * dokončený“ není rozhodující kritérium.
 */

describe('createResponseGuard', () => {
    it('pouští naposledy spuštěný požadavek', () => {
        const guard = createResponseGuard();

        const token = guard.begin('https://geoserver/squares?taxonId=1');

        expect(guard.isCurrent(token, 'https://geoserver/squares?taxonId=1')).toBe(true);
    });

    it('zahodí odpověď staršího požadavku, i když dorazí jako poslední', () => {
        const guard = createResponseGuard();

        // 1. request bez taxonId (spuštěn první, odpověď pomalá)
        const staleToken = guard.begin('https://geoserver/squares');
        // 2. request s taxonId (spuštěn později, odpověď rychlá – z cache)
        const currentToken = guard.begin('https://geoserver/squares?taxonId=42');

        expect(guard.isCurrent(currentToken, 'https://geoserver/squares?taxonId=42')).toBe(true);
        expect(guard.isCurrent(staleToken, 'https://geoserver/squares')).toBe(false);
    });

    it('zahodí nedokončený požadavek po zrušení efektu', () => {
        const guard = createResponseGuard();
        const token = guard.begin('https://geoserver/squares');

        guard.cancel();

        expect(guard.isCurrent(token, 'https://geoserver/squares')).toBe(false);
    });

    it('po dalším beginu je zase nabita (re-run efektu po zrušení)', () => {
        const guard = createResponseGuard();
        guard.begin('https://geoserver/squares');
        guard.cancel();

        const token = guard.begin('https://geoserver/squares');

        expect(guard.isCurrent(token, 'https://geoserver/squares')).toBe(true);
    });

    it('zahodí odpověď pro jinou URL, než je aktuální', () => {
        const guard = createResponseGuard();
        const token = guard.begin('https://geoserver/squares?bbox=old');

        expect(guard.isCurrent(token, 'https://geoserver/squares?bbox=new')).toBe(false);
        // bez URL se kontrola neuplatní (volající ji nezná)
        expect(guard.isCurrent(token)).toBe(true);
    });

    it('stráži bez URL nevadí, že volající hlásí svou URL', () => {
        const guard = createResponseGuard();
        const token = guard.begin();

        expect(guard.isCurrent(token, 'https://geoserver/squares')).toBe(true);
    });
});
