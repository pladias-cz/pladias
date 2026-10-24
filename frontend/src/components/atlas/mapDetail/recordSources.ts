/**
 * Registr zdrojů záznamů mapového detailu (PLADIAS/GBIF/iNaturalist).
 *
 * Jediné místo, kde se definují skupiny záznamů (tabs v InfoPanel) a jejich
 * barvy markerů na mapě – nový zdroj = jeden záznam v RECORD_SOURCES.
 */

import type {ProjectType} from '@/models/AtlasRecords';

/** Konfigurace jednoho zdroje záznamů. */
export interface RecordSourceConfig {
    /** Klíč projektu – shodný s klíči RecordsByProject. */
    id: ProjectType;
    /** Jméno zdroje v UI (bez i18n – jde o názvy projektů). */
    label: string;
    /** Barva tečky v hlavičce tabu – odkaz na markery daného zdroje na mapě. */
    markerColor: string;
}

/** Registry zdrojů – pořadí definuje pořadí tabů v InfoPanel. */
export const RECORD_SOURCES: readonly RecordSourceConfig[] = [
    // markery PLADIAS jsou vícebarevné dle validationStatus (výplň z backendu)
    // – tečka používá černou barvu okraje markeru
    {id: 'pladias', label: 'PLADIAS', markerColor: '#000000'},
    // fixní barva výplně GBIF markerů (backend dto.atlas.RecordGbifMinimalDto)
    {id: 'gbif', label: 'GBIF', markerColor: '#C95740'},
    // barva okraje iNaturalist markerů (RecordMarkers)
    {id: 'inaturalist', label: 'iNaturalist', markerColor: '#00AA00'},
];

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
