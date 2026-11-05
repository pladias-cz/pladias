/**
 * Doména správce mapy (controllers.atlas: MapStatusController – stavová
 * číselníky taxonů; MapReportsController – přiřazení taxonů uživatelům;
 * MapAdminUserRightsController – projekty uživatelů; TaxonMapSettingsController –
 * tabulka taxonů k administraci). Komponenta nezná URL ani tvar požadavku.
 *
 * Gotchasy backendu (docs/gotchas.md):
 *  - mutace práv odpovídají obálkou `{success, message}`; neúspěch může
 *    přijít přes HTTP status s `message` (JsonResult.buildError) i s `error`
 *    (MapReportsController posílá plain mapu) – obojí vytáhne apiClient,
 *  - `assignUserTaxon` posílá urlencoded formulář (`user`, `taxon`).
 */

import {
    apiDelete,
    apiDownload,
    apiGet,
    apiPost,
    apiPostFormUrlencoded,
    requireData,
    requireEnvelope,
    type DownloadedFile
} from './apiClient';
import type {TaxonMapSettings} from '@/models/TaxonMapSettings';
import type {ApiResult} from '@/models/ApiResponse';

/** Stavová možnost taxonu (revize/publikace). */
export interface TaxonStatusOption {
    id: number;
    description?: string;
    name?: string;
    color?: string;
    icon?: string;
    priority: number;
}

/** GET /api/react/atlasadmin/revision-statuses – revizní stavy taxonů. */
export async function getRevisionStatuses(): Promise<TaxonStatusOption[]> {
    return requireData<TaxonStatusOption[]>(
        await apiGet('/api/react/atlasadmin/revision-statuses'),
        'Načtení revizních stavů selhalo.',
    );
}

/** GET /api/react/atlasadmin/publication-statuses – publikační stavy taxonů. */
export async function getPublicationStatuses(): Promise<TaxonStatusOption[]> {
    return requireData<TaxonStatusOption[]>(
        await apiGet('/api/react/atlasadmin/publication-statuses'),
        'Načtení publikačních stavů selhalo.',
    );
}

/** POST /api/react/atlasadmin/users/{userId}/projects – přiřazení projektu uživateli. */
export async function assignProjectToUser(userId: number, projectId: number): Promise<void> {
    requireEnvelope(
        await apiPost(`/api/react/atlasadmin/users/${userId}/projects`, {projectId}),
        'Přiřazení projektu selhalo.',
    );
}

/** DELETE /api/react/atlasadmin/users/{userId}/projects/{projectId} – odebrání projektu uživateli. */
export async function removeProjectFromUser(userId: number, projectId: number): Promise<void> {
    requireEnvelope(
        await apiDelete(`/api/react/atlasadmin/users/${userId}/projects/${projectId}`),
        'Odebrání projektu selhalo.',
    );
}

/** POST /api/react/atlasadmin/assignUserTaxon – přiřazení taxonu uživateli (urlencoded). */
export async function assignUserTaxon(userId: number, taxonId: number): Promise<void> {
    requireEnvelope(
        await apiPostFormUrlencoded('/api/react/atlasadmin/assignUserTaxon', {
            user: String(userId),
            taxon: String(taxonId)
        }),
        'Přiřazení taxonu selhalo.',
    );
}

/** DELETE /api/react/atlasadmin/removeUserTaxon/user/{userId}/taxon/{taxonId} – odebrání taxonu uživateli. */
export async function removeUserTaxonFromUser(userId: number, taxonId: number): Promise<void> {
    requireEnvelope(
        await apiDelete(`/api/react/atlasadmin/removeUserTaxon/user/${userId}/taxon/${taxonId}`),
        'Odebrání taxonu selhalo.',
    );
}

/**
 * Odpověď `/api/react/atlasadmin/taxa` i `/taxa/user` – řádky nese pole `taxa`
 * (širší obálka bez `data`).
 */
interface TaxaTableResponse extends ApiResult {
    taxa?: TaxonMapSettings[];
    totalCount?: number;
    filteredCount?: number;
}

/**
 * GET /api/react/atlasadmin/downloadBatchModified/{batchId} – export
 * modifikovaných záznamů dávky (xls; generuje se na serveru). Neúspěch
 * přichází jako JSON obálka přes HTTP status (dříve plain text `error`
 * s HTTP 200 – viz gotchas).
 */
export async function downloadBatchModified(batchId: number): Promise<DownloadedFile> {
    return apiDownload(`/api/react/atlasadmin/downloadBatchModified/${batchId}`, {
        fallbackFilename: `Batch${batchId}_modifikace.xls`,
        errorMessage: 'Export modifikovaných záznamů se nezdařil.',
    });
}

/** GET /api/react/atlas/map-reports/download-csv/{id} – CSV dat mapového výstupu taxonu. */
export async function downloadArchiveCsv(csvMapDetailId: number): Promise<DownloadedFile> {
    return apiDownload(`/api/react/atlas/map-reports/download-csv/${csvMapDetailId}`, {
        fallbackFilename: `csv-${csvMapDetailId}.csv`,
        errorMessage: 'Stažení CSV dat se nezdařilo.',
    });
}

/** GET /api/react/atlas/map-reports/download-csv-map/{id} – CSV vykreslení mapy (map render). */
export async function downloadArchiveCsvMap(csvMapDetailId: number): Promise<DownloadedFile> {
    return apiDownload(`/api/react/atlas/map-reports/download-csv-map/${csvMapDetailId}`, {
        fallbackFilename: `csv-map-${csvMapDetailId}.csv`,
        errorMessage: 'Stažení CSV mapy se nezdařilo.',
    });
}

/** GET /api/react/atlas/pngMap/taxon/{taxonId} – PNG mapa taxonu (mapový archiv). */
export async function downloadPngMap(taxonId: number): Promise<DownloadedFile> {
    return apiDownload(`/api/react/atlas/pngMap/taxon/${taxonId}`, {
        fallbackFilename: `taxon-${taxonId}-mapa.png`,
        errorMessage: 'Stažení PNG mapy se nezdařilo.',
    });
}

/** Stránka tabulky taxonů – normalizovaný tvar pro `DataTable.fetchData`. */
export interface TaxaTableData {
    data: TaxonMapSettings[];
    totalCount: number;
    filteredCount: number;
}

/** Vstup `DataTable.fetchData` (custom fetcher kontrakt `core/dataTable`). */
export interface TaxaTableParams {
    page: number;
    pageSize: number;
    sorting: Array<{ id: string; desc: boolean }>;
    columnFilters: Array<{ id: string; value: string }>;
    additionalParams: Record<string, string>;
    signal?: AbortSignal;
}

/**
 * Query params taxa endpointu pro filtry vyplněné do filtrovacího řádku
 * tabulky. Prázdné vstupy nejsou filtry, proto se vypouštějí (backend je
 * stejně ignoruje). Sdílí je stránkovaný fetch i XLSX export
 * (`DataTable.buildExportFilterParams`).
 */
export function extractTaxaFilters(columnFilters: Array<{ id: string; value: string }>): Record<string, string> {
    const valueOf = (columnId: string) => columnFilters.find(f => f.id === columnId)?.value || '';
    const filters: Record<string, string> = {
        nameLatFilter: valueOf('taxonNameLat'),
        isMappedFilter: valueOf('isMapped'),
        commonThresholdFilter: valueOf('commonThreshold'),
        isProtectedFilter: valueOf('isProtected'),
        presliaFilter: valueOf('preslia'),
        revisorsFilter: valueOf('revisors'),
        revisionStatusFilter: valueOf('revisionStatusId'),
        publicationStatusFilter: valueOf('publicationStatusId'),
    };
    return Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value.trim() !== '')
    );
}

/**
 * Načte stránku tabulky taxonů z `/api/react/atlasadmin/taxa` (administrace)
 * nebo `/api/react/atlasadmin/taxa/user` (taxony aktuálního uživatele) – oba
 * endpointy sdílejí filtry, stránkování i `sortField`/`sortDirection`
 * (backend neznámé/nevyplněné pole fallbackuje na `t.name_lat ASC`).
 */
export async function getTaxaTable(endpoint: string, params: TaxaTableParams): Promise<TaxaTableData> {
    const {page, pageSize, sorting, columnFilters, signal} = params;

    const sort: Record<string, string> = sorting[0]
        ? {sortField: sorting[0].id, sortDirection: sorting[0].desc ? 'DESC' : 'ASC'}
        : {};

    const payload = requireEnvelope(
        await apiGet<TaxaTableResponse>(endpoint, {
            params: {
                page: String(page),
                pageSize: String(pageSize),
                ...sort,
                ...extractTaxaFilters(columnFilters),
            },
            signal,
        }),
        'Načtení seznamu taxonů selhalo.',
    ) as TaxaTableResponse;

    const totalCount = payload.totalCount || 0;
    return {
        data: payload.taxa || [],
        totalCount,
        filteredCount: payload.filteredCount || totalCount,
    };
}
