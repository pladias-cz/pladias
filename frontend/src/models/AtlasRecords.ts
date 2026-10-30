import {logWarn} from '@/services/logger';
import type {RecordPladias} from './RecordPladias';

/** Projekt mapového detailu (vlastní data PLADIAS vs. externí GBIF/iNaturalist). */
export type ProjectType = 'pladias' | 'gbif' | 'inaturalist';

/** Externí projekty sdílející stejné minimální DTO záznamu. */
export type ExternalProject = Exclude<ProjectType, 'pladias'>;

/**
 * Všechna id externích projektů – zrcadlí externí zdroje registru RECORD_SOURCES
 * (components/atlas/mapDetail/recordSources.ts). Validuje seznam zdrojů z
 * konfigurace instance (drift BE↔FE, vzor USER_ROLES u rolí).
 */
export const EXTERNAL_PROJECTS: readonly ExternalProject[] = ['gbif', 'inaturalist'];

/** Type guard pro id externího projektu (hodnota z conf `atlas.externalRecordSources`). */
export function isExternalProject(value: unknown): value is ExternalProject {
    return (EXTERNAL_PROJECTS as readonly unknown[]).includes(value);
}

/**
 * Runtime kontrola driftu BE↔FE u seznamu dostupných externích zdrojů
 * (`atlas.externalRecordSources`): neznámé id zaloguje a zahodí. Chybějící
 * klíč (starší backend bez konfigurace) = všechny zdroje, tj. dřívější chování.
 */
export function parseExternalSources(raw: readonly string[] | undefined | null): ExternalProject[] {
    if (raw == null) {
        return [...EXTERNAL_PROJECTS];
    }
    const parsed: ExternalProject[] = [];
    for (const id of raw) {
        if (isExternalProject(id)) {
            parsed.push(id);
        } else {
            logWarn(
                'Neznámý externí zdroj záznamů z backendu – FE registr v src/components/atlas/mapDetail/recordSources.ts nedrží krok s konfigurací.',
                {source: id},
            );
        }
    }
    return parsed;
}

/**
 * PLADIAS record – minimal data for map display.
 * Contains only fields needed for geographic context
 * (backend dto.atlas.RecordPladiasMinimalDto).
 */
export interface RecordPladiasMinimal {
    id: number;
    latitude: number | null;
    longitude: number | null;
    gpsPrecision: number | null;
    year: number | null;
    recordedBy: string | null;
    validationStatusId: number | null;
    validationStatusColor: string | null;
    computedSquareCode: string | null;
}

/**
 * GBIF/iNaturalist record – minimal data from backend.
 * Matches backend dto.atlas.RecordGbifMinimalDto; diskriminátor `project`
 * doplňuje frontend podle endpointu (atlasApi).
 */
export interface RecordGbifMinimal {
    id: number;
    latitude: number;
    longitude: number;
    gpsPrecision: number | null;
    year: number | null;
    recordedBy: string | null;
    institutionCode: string | null;
    validationStatusColor: string | null;
    quadrantLetter: string | null;
    squareCode: string | null;
    computedSquareCode: string | null;
    project: ExternalProject;
}

/** Wire typ externího záznamu – data z backendu bez diskriminátoru `project`. */
export type RecordGbifMinimalData = Omit<RecordGbifMinimal, 'project'>;

/** Union type for all record types that have a project property */
export type RecordWithProject = RecordGbifMinimal;

/** All record types including PLADIAS (which is handled separately) */
export type AnyRecord = RecordPladias | RecordGbifMinimal;

/** Záznamy s plnými daty pro tabulku (aktuální kvadrant). */
export interface RecordsByProject {
    pladias: RecordPladias[];
    gbif: RecordGbifMinimal[];
    inaturalist: RecordGbifMinimal[];
}

/** Záznamy s minimálními daty pro mapu (včetně okolních kvadrantů). */
export interface RecordsByProjectMinimal {
    pladias: RecordPladiasMinimal[];
    gbif: RecordGbifMinimal[];
    inaturalist: RecordGbifMinimal[];
}
