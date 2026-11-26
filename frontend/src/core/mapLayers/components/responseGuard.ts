/**
 * Stráž nad asynchronním natahováním dat mapové vrstvy.
 *
 * Vrstva se zakládá v `useEffect`u, jehož cleanup ale běží dřív, než se vrátí
 * odpověď ze serveru. Bez ochrany pak „vyhraje“ ten dotaz, který se dokončí
 * jako poslední – i když už mezitím proběhl re‑run efektu s jinými parametry.
 * Na mapě pak zůstane vrstva (i její handlery) ze zastaralé odpovědi, což se
 * najevo jako „občas nic nedělá dvojklik / pravý klik“ ve `SquaresOverlay`.
 *
 * Čistá logika bez Leafletu – komponenty se v testech nespouštějí (leaflet
 * v jsdomu neběží, viz ResultsMap.test.tsx), testuje se tedy jen toto.
 */

export interface ResponseGuard {
    /**
     * Oznámí, že byl spuštěn nový požadavek (zruší tím předchozí a znovu
     * „nabíjí“ stráž po předchozím `cancel()`). Vrací token, který se má
     * předat `isCurrent()` po dojení `await`.
     */
    begin(url?: string): number;

    /** Zavolá se v cleanup efektu – zahodí dosud nedokončené požadavky. */
    cancel(): void;

    /**
     * Platí pořád ještě požadavek `token` (a jeho `url`)? Neplatí, pokud
     * mezitím proběhl `cancel()`, spuštění novějšího `begin()` nebo se liší
     * URL od té aktuální.
     */
    isCurrent(token: number, url?: string): boolean;
}

export function createResponseGuard(): ResponseGuard {
    let token = 0;
    let currentUrl: string | null = null;
    let cancelled = false;

    return {
        begin(url?: string): number {
            cancelled = false;
            currentUrl = url ?? null;
            token += 1;
            return token;
        },

        cancel(): void {
            cancelled = true;
        },

        isCurrent(requestToken: number, url?: string): boolean {
            if (cancelled || requestToken !== token) {
                return false;
            }
            // URL se kontroluje jen když stráž nějakou zná i požadavek ji hlásí
            return !(url !== undefined && currentUrl !== null && url !== currentUrl);
        },
    };
}

export default createResponseGuard;
