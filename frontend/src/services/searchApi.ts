/**
 * Doména vyhledávání záznamů (controllers.atlas.SearchController.search;
 * CommonController – číselníky vyhledávacího formuláře; ProjectsController –
 * projekty výskytů). Komponenta nezná URL ani tvar požadavku.
 *
 * Gotchasy backendu (docs/gotchas.md):
 *  - `search` vrací neúspěch často jako HTTP 200 s obálkou `success: false`
 *    (příliš mnoho záznamů, uživatel bez projektu) – řeší `requireEnvelope`,
 *  - Excel export odpovídá souborem, ale při chybě JSON obálkou s `message`
 *    – rozlišuje se podle Content-Type; metadata nese hlavička `X-Excel-*`
 *    (proto vlastní fetch místo `apiDownload`, který hlavičky nevrací).
 */

import {ApiError, apiGet, apiPost, requireData, requireEnvelope, resolveFilename} from "./apiClient";
import type {RecordPladias} from "@/models";

/** Projekty výskytů (select vyhledávacího formuláře). */
export interface ProjectOption {
    id: number;
    name: string;
    abbrev?: string;
}

/** Fytogeografická území (typeahead formuláře i bulk editu). */
export interface PhytochorionOption {
    rowid: number;
    name: string;
}

/** Herbáři (select vyhledávacího formuláře). */
export interface HerbariumOption {
    id: number;
    name: string;
    translationKey?: string;
}

/** Instituce (select vyhledávacího formuláře). */
export interface InstitutionOption {
    id: string;
    name: string;
}

/** Zpracovatelé (select vyhledávacího formuláře). */
export interface CommitterOption {
    id: number;
    name: string;
}

/** Licence (select vyhledávacího formuláře). */
export interface LicenseOption {
    id: number;
    key: string;
}

/** Příznaky historie (select vyhledávacího formuláře). */
export interface HistoryFlagOption {
    value: string;
}

/** Stránka výsledků hledání (backend PageSearchResults). */
export interface SearchPage {
    records?: RecordPladias[];
    totalCount?: number;
}

/** Výsledek Excel exportu vyhledávání (soubor + metadata z hlaviček). */
export interface SearchExcelExport {
    blob: Blob;
    filename: string;
    recordsExported: number;
    totalRecords: number | null;
}

/** GET /api/react/occurrence/projects – projekty výskytů. */
export async function getProjects(): Promise<ProjectOption[]> {
    return requireData<ProjectOption[]>(await apiGet("/api/react/occurrence/projects"), "Načtení projektů selhalo.");
}

/** GET /api/react/atlas/common/herbariums – herbáři. */
export async function getHerbariums(): Promise<HerbariumOption[]> {
    return requireData<HerbariumOption[]>(await apiGet("/api/react/atlas/common/herbariums"), "Načtení herbářů selhalo.");
}

/** GET /api/react/atlas/common/institutions – instituce. */
export async function getInstitutions(): Promise<InstitutionOption[]> {
    return requireData<InstitutionOption[]>(await apiGet("/api/react/atlas/common/institutions"), "Načtení institucí selhalo.");
}

/** GET /api/react/atlas/common/committers – zpracovatelé. */
export async function getCommitters(): Promise<CommitterOption[]> {
    return requireData<CommitterOption[]>(await apiGet("/api/react/atlas/common/committers"), "Načtení zpracovatelů selhalo.");
}

/** GET /api/react/atlas/common/licenses – licence. */
export async function getLicenses(): Promise<LicenseOption[]> {
    return requireData<LicenseOption[]>(await apiGet("/api/react/atlas/common/licenses"), "Načtení licencí selhalo.");
}

/** GET /api/react/atlas/common/history-flags – příznaky historie. */
export async function getHistoryFlags(): Promise<HistoryFlagOption[]> {
    return requireData<HistoryFlagOption[]>(await apiGet("/api/react/atlas/common/history-flags"), "Načtení příznaků historie selhalo.");
}

/** GET /api/react/atlas/common/phytochorions – fytogeografická území. */
export async function getPhytochorions(): Promise<PhytochorionOption[]> {
    return requireData<PhytochorionOption[]>(await apiGet("/api/react/atlas/common/phytochorions"), "Načtení fytogeografických území selhalo.");
}

/**
 * POST /api/react/atlas/search/page/{page}/pageSize/{pageSize}/getCount/{getCount} –
 * vyhledávání záznamů (multipart formulář). Neúspěch přichází jako HTTP 200
 * s obálkou `success: false` (message s vysvětlením).
 */
export async function searchRecords(page: number, pageSize: number, getCount: boolean, formData: FormData): Promise<SearchPage> {
    const envelope = requireEnvelope(
        await apiPost(`/api/react/atlas/search/page/${page}/pageSize/${pageSize}/getCount/${getCount}`, formData),
        "Vyhledávání selhalo.",
    );
    return (envelope.data ?? {}) as SearchPage;
}

/**
 * POST /api/react/atlas/search/page/1/… – Excel export výsledků. Místo souboru
 * může přijít JSON chyba s `message` (např. příliš mnoho záznamů) – pozná se
 * podle Content-Type a končí jako `ApiError` s hláškou.
 */
export async function exportSearchExcel(pageSize: number, formData: FormData): Promise<SearchExcelExport> {
    const response = await fetch(`/api/react/atlas/search/page/1/pageSize/${pageSize}/getCount/true`, {
        method: "POST",
        body: formData,
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        const payload = await response.json().catch(() => null) as {message?: string} | null;
        throw new ApiError(payload?.message || "Export selhal.", response.status, payload);
    }

    if (!response.ok) {
        throw new ApiError(`Export selhal (HTTP ${response.status}).`, response.status);
    }

    const totalRecordsHeader = response.headers.get("X-Excel-Total-Records");
    const parsedTotal = totalRecordsHeader != null ? parseInt(totalRecordsHeader, 10) : null;
    return {
        blob: await response.blob(),
        filename: resolveFilename(response.headers.get("content-disposition"), "PladiasExport.xlsx"),
        recordsExported: parseInt(response.headers.get("X-Excel-Records-Exported") ?? "0", 10),
        totalRecords: parsedTotal != null && !Number.isNaN(parsedTotal) ? parsedTotal : null,
    };
}
