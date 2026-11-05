/**
 * Doména importů (controllers.atlas.ImportController/ImportCSVController –
 * upload Excel/CSV dávek; controllers.common.UserController.getProjectsForUser –
 * projekty přihlášeného uživatele; controllers.atlas.MapAdminImportController –
 * naplánování smazání dávky). Komponenta nezná URL ani tvar požadavku.
 *
 * Gotchasy backendu (docs/gotchas.md):
 *  - `projects/user` vrací nestandardní obálku s klíčem `projects` místo `data`,
 *  - Excel import odpovídá plochým objektem `{success, id, filename, records…}`
 *    (neobálkové tělo = přímo výsledek), neúspěch přichází přes HTTP status
 *    s `errorMessage`,
 *  - `prepareBatchDelete` posílá neúspěch (selhání mailu) jako HTTP 200
 *    s obálkou `success: false`.
 */

import {ApiError, apiDownload, apiGet, apiPost, requireEnvelope, type DownloadedFile} from './apiClient';

/** Typ operace importu (formulář uploadu). */
export type ImportOperation = 'validation' | 'import';

/** Výsledek zpracování Excel dávky (ImportController). */
export interface ImportResult {
    id: number;
    filename: string;
    records: number;
    errors: number;
    warnings: number;
    imported: boolean;
    decoratedFileUrl?: string;
}

/** Projekt přihlášeného uživatele (výběr v upload formuláři). */
export interface UserProject {
    id: number;
    name: string;
    abbrev: string;
}

/**
 * GET /api/react/projects/user – projekty přihlášeného uživatele.
 * Gotcha: obálka nese klíč `projects` místo standardního `data`.
 */
export async function getUserProjects(): Promise<UserProject[]> {
    const payload = await apiGet<{ success: boolean; projects?: UserProject[] }>('/api/react/projects/user');
    const projects = payload.projects;
    if (payload.success !== true || !Array.isArray(projects)) {
        throw new ApiError('Projekty se nepodařilo načíst.');
    }
    return projects;
}

/**
 * POST /api/react/import/validate | /api/react/import/upload – validace nebo
 * import Excel dávky (multipart formulář: soubor, operace, projekt).
 * Odpověď je plochý objekt s výsledkem (`success`, počty záznamů/chyb).
 */
export async function importExcel(file: File, operation: ImportOperation, projectId?: number): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('fileUpload', file);
    formData.append('operation', operation);
    if (projectId !== undefined) {
        formData.append('project', String(projectId));
    }

    const endpoint = operation === 'validation' ? '/api/react/import/validate' : '/api/react/import/upload';
    // odpověď je plochý objekt (success + výsledek), ne standardní obálka s `data`
    const result = requireEnvelope(await apiPost(endpoint, formData), 'Import Excel souboru selhal.');
    return {...result} as unknown as ImportResult;
}

/**
 * POST /api/react/import/csv – import CSV dávky (multipart formulář: soubor,
 * operace, projekt). Odpovídá obálkou `{success, message}`.
 */
export async function importCsv(file: File, operation: ImportOperation, projectId: number): Promise<void> {
    const formData = new FormData();
    formData.append('fileUpload', file);
    formData.append('operation', operation);
    formData.append('project', String(projectId));

    requireEnvelope(await apiPost('/api/react/import/csv', formData), 'Import CSV selhal.');
}

/**
 * GET /api/react/occurrence/imports/{id} – dekorovaný importní Excel (původní
 * dávka obohacená o výsledky validace; název nese Content-disposition).
 */
export async function downloadDecoratedImport(importId: number): Promise<DownloadedFile> {
    return apiDownload(`/api/react/occurrence/imports/${importId}`, {
        fallbackFilename: `import-${importId}.xlsx`,
        errorMessage: 'Stažení importního souboru se nezdařilo.',
    });
}

/**
 * GET /api/react/atlasadmin/prepareBatchDelete/{id} – naplánuje smazání dávky
 * (pošle curátorovi mail s přehledem změn). Neúspěch přichází jako HTTP 200
 * s obálkou `success: false`.
 */
export async function prepareBatchDelete(batchId: number): Promise<void> {
    requireEnvelope(
        await apiGet(`/api/react/atlasadmin/prepareBatchDelete/${batchId}`),
        'Naplánování smazání dávky selhalo.',
    );
}
