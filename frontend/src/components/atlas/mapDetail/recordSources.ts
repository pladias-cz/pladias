/**
 * Registr zdrojů záznamů mapového detailu (PLADIAS/GBIF/iNaturalist).
 *
 * Jediné místo, kde se definují skupiny záznamů (tabs v InfoPanel) a jejich
 * barvy markerů na mapě – nový zdroj = jeden záznam v RECORD_SOURCES.
 */

import type {ExternalProject, ProjectType, RecordsByProject} from '@/models/AtlasRecords';

/**
 * Výplň markerů externích zdrojů (GBIF/iNaturalist) a tečky v hlavičkách tabů
 * – zdroje se na mapě odlišují jen barvou okraje, výplň je neutrální šedá.
 * Markery PLADIAS si výplň barví dle validačního statusu (z backendu).
 */
export const EXTERNAL_MARKER_FILL_COLOR = '#808080';

/** Konfigurace jednoho zdroje záznamů. */
export interface RecordSourceConfig {
    /** Klíč projektu – shodný s klíči RecordsByProject. */
    id: ProjectType;
    /** Jméno zdroje v UI (bez i18n – jde o názvy projektů). */
    label: string;
    /** Barva okraje markerů zdroje na mapě – tečka v hlavičce tabu ji používá jako okraj. */
    strokeColor: string;
}

/** Registry zdrojů – pořadí definuje pořadí tabů v InfoPanel. */
export const RECORD_SOURCES: readonly RecordSourceConfig[] = [
    // markery PLADIAS jsou vícebarevné dle validationStatus (výplň z backendu)
    // a mají černý okraj – tečka používá černou barvu okraje markeru
    {id: 'pladias', label: 'PLADIAS', strokeColor: '#000000'},
    // barvy okrajů externích markerů (RecordMarkers), výplň je pro všechny
    // externí zdroje šedá (EXTERNAL_MARKER_FILL_COLOR) – odlišují se jen okrajem
    {id: 'gbif', label: 'GBIF', strokeColor: '#CC0000'},
    {id: 'inaturalist', label: 'iNaturalist', strokeColor: '#EF7C09'},
];

/**
 * Zdroje dostupné v dané instanci – PLADIAS vždy, externí jen nakonfigurované
 * (conf `atlas.externalRecordSources`, viz InstanceConfig). Instance bez
 * GBIF/iNaturalist dat tak nekreslí jejich taby v InfoPanelu ani markery na mapě.
 */
export function availableRecordSources(
    externalSources: readonly ExternalProject[],
): readonly RecordSourceConfig[] {
    return RECORD_SOURCES.filter(
        source => source.id === 'pladias' || externalSources.includes(source.id),
    );
}

/** Viditelnost skupin záznamů na mapě (checkboxy v hlavičkách tabů). */
export type RecordSourceVisibility = Record<ProjectType, boolean>;

/** Výchozí stav – všechny skupiny na mapě viditelné. */
export const ALL_SOURCES_VISIBLE: RecordSourceVisibility = {pladias: true, gbif: true, inaturalist: true};

/** Seznam viditelných zdrojů – formát pro perzistenci do user settings. */
export function visibleSourceIds(visibility: RecordSourceVisibility): ProjectType[] {
    return RECORD_SOURCES.filter(source => visibility[source.id]).map(source => source.id);
}

/**
 * Skryté skupiny nahradí prázdnými poli – výsledek jde na mapu (markery).
 * Funguje pro plná (RecordsByProject) i minimální (RecordsByProjectMinimal) data.
 */
export function filterRecordsByVisibility<T extends Record<ProjectType, readonly unknown[]>>(
    records: T,
    visibility: RecordSourceVisibility,
): T {
    return {
        ...records,
        pladias: visibility.pladias ? records.pladias : [],
        gbif: visibility.gbif ? records.gbif : [],
        inaturalist: visibility.inaturalist ? records.inaturalist : [],
    } as T;
}

/**
 * Tabulková data mapového detailu: jen záznamy aktuálního kvadrantu
 * (computedSquareCode == squareCode), seřazené dle písmene kvadrantu.
 * Záznamy okolních kvadrantů zůstávají na mapě, ale do tabulek InfoPanelu
 * (ani k popupům jejich markerů) se nedostanou.
 */
export function filterAndSortTableRecords(records: RecordsByProject, squareCode: string): RecordsByProject {
    return {
        pladias: inCurrentSquare(records.pladias, squareCode, r => quadrantLetter(r.computedQuadrantCode)),
        gbif: inCurrentSquare(records.gbif, squareCode, r => r.quadrantLetter),
        inaturalist: inCurrentSquare(records.inaturalist, squareCode, r => r.quadrantLetter),
    };
}

/** Záznamy jednoho zdroje z daného kvadrantu, seřazené dle písmene kvadrantu. */
function inCurrentSquare<T extends { computedSquareCode: string | null }>(
    records: readonly T[],
    squareCode: string,
    quadrantLetterOf: (record: T) => string | null,
): T[] {
    return records
        .filter(record => record.computedSquareCode === squareCode)
        .sort((a, b) => compareQuadrantLetters(quadrantLetterOf(a), quadrantLetterOf(b)));
}

/** Písmeno kvadrantu z kompletního kódu kvadrantu – např. „6152a“ → „a“. */
function quadrantLetter(quadrantCode: string | null): string | null {
    return quadrantCode ? quadrantCode.slice(-1) : null;
}

/** Srovnání písmen kvadrantů vzestupně; záznamy bez písmene řadí na konec. */
function compareQuadrantLetters(a: string | null, b: string | null): number {
    if (a === b) {
        return 0;
    }
    if (a === null) {
        return 1;
    }
    if (b === null) {
        return -1;
    }
    return a.localeCompare(b);
}

/**
 * Parsování uložené viditelnosti (JSON seznam viditelných zdrojů, viz
 * useRecordSourceVisibility). Vrací null pro nevalidní data (ne-JSON,
 * ne-pole, jen neznámé klíče) – volající pak použije výchozí stav.
 * Prázdné pole je naopak validní (uživatel záměrně skryl vše), neznámé
 * klíče se odfiltrují.
 */
export function parseSavedVisibility(saved: string | null): RecordSourceVisibility | null {
    if (!saved) {
        return null;
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(saved);
    } catch {
        return null;
    }
    if (!Array.isArray(parsed)) {
        return null;
    }
    const known = parsed.filter((id): id is ProjectType =>
        typeof id === 'string' && RECORD_SOURCES.some(source => source.id === id));
    if (known.length === 0 && parsed.length > 0) {
        return null;
    }
    return {
        pladias: known.includes('pladias'),
        gbif: known.includes('gbif'),
        inaturalist: known.includes('inaturalist'),
    };
}
