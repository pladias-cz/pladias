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
import type {TaxonMapSettings} from "@/models/TaxonMapSettings";

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

/** GET /api/react/atlas/taxonMapSettings/{id} – nastavení mapy taxonu (panel, viditelnost vrstev). */
export async function getTaxonMapSettings(taxonId: number): Promise<TaxonMapSettings> {
    return requireData<TaxonMapSettings>(
        await apiGet(`/api/react/atlas/taxonMapSettings/${taxonId}`),
        "Načtení nastavení mapy taxonu selhalo.",
    );
}

/** Stav ověření sousedního kvadrantu (navigační šipky detailu mapy). */
export interface SquareValidationStatus {
    direction: string;      // e.g. "north", "northeast", "east", etc.
    squareCode: number;       // The ID of the square in that direction
    text: string;           // Validation status text
    color: string;          // Validation status color (RGB hex)
}

/** Informace o aktuálním kvadrantu (centroid, stav ověření). */
export interface CurrentSquareInfo {
    squareCode: number;     // The square code
    latitude: number;       // Centroid latitude (WGS84)
    longitude: number;       // Centroid longitude (WGS84)
    statusText: string;     // Validation status text for current square
    statusColor: string;    // Validation status color for current square
}

/** Odpověď GET /api/react/atlas/squareInfo/{squareCode}/{taxonId}. */
export interface SquareInfoResponse {
    neighbors: SquareValidationStatus[];
    currentSquare: CurrentSquareInfo;
}

/** GET /api/react/atlas/squareInfo/{squareCode}/{taxonId} – stav kvadrantu a sousedů pro detail mapy. */
export async function getSquareInfo(squareCode: number, taxonId: number): Promise<SquareInfoResponse> {
    return requireData<SquareInfoResponse>(
        await apiGet(`/api/react/atlas/squareInfo/${squareCode}/${taxonId}`),
        "Načtení informací o kvadrantu selhalo.",
    );
}
