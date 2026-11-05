/**
 * Doména souborů ke stažení (controllers.common.DownloadsController).
 * Komponenta nezná URL ani tvar požadavku.
 */

import {apiDownload, apiGet, ApiError, type DownloadedFile} from './apiClient';
import type {DownloadDto} from '@/models/Download';

/**
 * GET /api/react/downloads – soubory ke stažení (verze aplikace, metodiky,
 * dynamické xlsx exporty).
 *
 * Gotcha (docs/gotchas.md): endpoint vrací **pole bez `JsonResult` obálky**
 * (backend `DownloadsController.getAll` – `ok(Json.toJson(dtos))`). Neopravovat
 * na backendu; tady se pole toleratně parsuje (vzor instanceApi).
 */
export async function getDownloads(): Promise<DownloadDto[]> {
    const payload = await apiGet<unknown>('/api/react/downloads');
    if (!Array.isArray(payload)) {
        throw new ApiError('Načtení souborů ke stažení selhalo.');
    }
    return payload as DownloadDto[];
}

/**
 * Stažení dynamického xlsx exportu (seznam taxonů, herbářů, nálezců) z
 * `DownloadDto.url`. Místo souboru může přijít JSON chyba (HTTP 500) – tu
 * `apiDownload` překládá na `ApiError` s hláškou z backendu.
 */
export async function downloadDynamicFile(download: DownloadDto): Promise<DownloadedFile> {
    return apiDownload(download.url, {fallbackFilename: 'export.xlsx'});
}
