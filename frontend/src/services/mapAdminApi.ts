/**
 * Doména správce mapy (controllers.atlas.MapStatusController – stavová
 * číselníky taxonů; MapReportsController – přiřazení taxonů uživatelům;
 * MapAdminUserRightsController – projekty uživatelů). Komponenta nezná URL
 * ani tvar požadavku.
 *
 * Gotchasy backendu (docs/gotchas.md):
 *  - mutace práv odpovídají obálkou `{success, message}`; neúspěch může
 *    přijít přes HTTP status s `message` (JsonResult.buildError) i s `error`
 *    (MapReportsController posílá plain mapu) – obojí vytáhne apiClient,
 *  - `assignUserTaxon` posílá urlencoded formulář (`user`, `taxon`).
 */

import {apiDelete, apiGet, apiPost, apiPostFormUrlencoded, requireData, requireEnvelope} from "./apiClient";

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
        await apiGet("/api/react/atlasadmin/revision-statuses"),
        "Načtení revizních stavů selhalo.",
    );
}

/** GET /api/react/atlasadmin/publication-statuses – publikační stavy taxonů. */
export async function getPublicationStatuses(): Promise<TaxonStatusOption[]> {
    return requireData<TaxonStatusOption[]>(
        await apiGet("/api/react/atlasadmin/publication-statuses"),
        "Načtení publikačních stavů selhalo.",
    );
}

/** POST /api/react/atlasadmin/users/{userId}/projects – přiřazení projektu uživateli. */
export async function assignProjectToUser(userId: number, projectId: number): Promise<void> {
    requireEnvelope(
        await apiPost(`/api/react/atlasadmin/users/${userId}/projects`, {projectId}),
        "Přiřazení projektu selhalo.",
    );
}

/** DELETE /api/react/atlasadmin/users/{userId}/projects/{projectId} – odebrání projektu uživateli. */
export async function removeProjectFromUser(userId: number, projectId: number): Promise<void> {
    requireEnvelope(
        await apiDelete(`/api/react/atlasadmin/users/${userId}/projects/${projectId}`),
        "Odebrání projektu selhalo.",
    );
}

/** POST /api/react/atlasadmin/assignUserTaxon – přiřazení taxonu uživateli (urlencoded). */
export async function assignUserTaxon(userId: number, taxonId: number): Promise<void> {
    requireEnvelope(
        await apiPostFormUrlencoded("/api/react/atlasadmin/assignUserTaxon", {
            user: String(userId),
            taxon: String(taxonId)
        }),
        "Přiřazení taxonu selhalo.",
    );
}

/** DELETE /api/react/atlasadmin/removeUserTaxon/user/{userId}/taxon/{taxonId} – odebrání taxonu uživateli. */
export async function removeUserTaxonFromUser(userId: number, taxonId: number): Promise<void> {
    requireEnvelope(
        await apiDelete(`/api/react/atlasadmin/removeUserTaxon/user/${userId}/taxon/${taxonId}`),
        "Odebrání taxonu selhalo.",
    );
}
