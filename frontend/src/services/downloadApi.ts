/**
 * Doména souborů ke stažení (controllers.common.DownloadsController).
 * Komponenta nezná URL ani tvar požadavku.
 */

import {apiGet, requireData} from "./apiClient";
import type {DownloadDto} from "@/models/Download";

/** GET /api/react/downloads – soubory ke stažení (verze aplikace, metodiky). */
export async function getDownloads(): Promise<DownloadDto[]> {
    return requireData<DownloadDto[]>(await apiGet("/api/react/downloads"), "Načtení souborů ke stažení selhalo.");
}
