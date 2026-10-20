/**
 * Doména mapových stránek atlasu (controllers.atlas.MapDetailController:
 * getNearbyRecords/getSquareRecords; SearchController.getRecordsWithCommentsCurrentUser).
 * Komponenta nezná URL ani tvar požadavku.
 *
 * Gotchasy backendu (docs/gotchas.md):
 *  - `/records` vrací záznamy včetně okolních kvadrantů (data pro mapu),
 *    `/records-square` jen z aktuálního kvadrantu (data pro tabulku) – stejné
 *    parametry, jiný význam,
 *  - externí projekty (gbif/inaturalist) sdílejí DTO bez diskriminátoru
 *    `project` – doplňuje ho tato služba podle parametru volání,
 *  - chyby přichází přes HTTP status s obálkou (řeší apiClient).
 */

import {apiGet, requireData} from "./apiClient";
import type {
    ExternalProject,
    RecordGbifMinimal,
    RecordGbifMinimalData,
    RecordPladiasMinimal,
} from "@/models/AtlasRecords";
import type {RecordPladias} from "@/models/RecordPladias";

/** GET /api/react/atlas/records/{square}/{taxonId}/pladias – data pro mapu (okolní kvadranty). */
export async function getNearbyPladiasRecords(squareCode: string, taxonId: number): Promise<RecordPladiasMinimal[]> {
    return requireData<RecordPladiasMinimal[]>(
        await apiGet(`/api/react/atlas/records/${squareCode}/${taxonId}/pladias`),
        "Načtení záznamů selhalo.",
    );
}

/** GET /api/react/atlas/records/{square}/{taxonId}/{project} – externí data pro mapu (okolní kvadranty). */
export async function getNearbyExternalRecords(
    squareCode: string,
    taxonId: number,
    project: ExternalProject,
): Promise<RecordGbifMinimal[]> {
    const records = requireData<RecordGbifMinimalData[]>(
        await apiGet(`/api/react/atlas/records/${squareCode}/${taxonId}/${project}`),
        "Načtení záznamů selhalo.",
    );
    return records.map(record => ({...record, project}));
}

/** GET /api/react/atlas/records-square/{square}/{taxonId}/pladias – data pro tabulku (aktuální kvadrant). */
export async function getSquarePladiasRecords(squareCode: string, taxonId: number): Promise<RecordPladias[]> {
    const records = requireData<RecordPladias[]>(
        await apiGet(`/api/react/atlas/records-square/${squareCode}/${taxonId}/pladias`),
        "Načtení záznamů selhalo.",
    );
    // lastEditTimestamp (ISO) → lastEditTimestampNum (ms) pro detekci konfliktů
    return records.map(record => ({
        ...record,
        lastEditTimestampNum: record.lastEditTimestamp ? Date.parse(record.lastEditTimestamp) : 0,
    }));
}

/** GET /api/react/atlas/records-square/{square}/{taxonId}/{project} – externí data pro tabulku. */
export async function getSquareExternalRecords(
    squareCode: string,
    taxonId: number,
    project: ExternalProject,
): Promise<RecordGbifMinimal[]> {
    const records = requireData<RecordGbifMinimalData[]>(
        await apiGet(`/api/react/atlas/records-square/${squareCode}/${taxonId}/${project}`),
        "Načtení záznamů selhalo.",
    );
    return records.map(record => ({...record, project}));
}

/**
 * GET /api/react/atlas/search/records-with-comments – záznamy s komentáři
 * aktuálního uživatele. Odpověď nese `data.records` (PageSearchResults).
 */
export async function getRecordsWithComments(): Promise<RecordPladias[]> {
    const data = requireData<{records?: RecordPladias[]}>(
        await apiGet("/api/react/atlas/search/records-with-comments"),
        "Načtení záznamů s komentáři selhalo.",
    );
    return Array.isArray(data.records) ? data.records : [];
}
