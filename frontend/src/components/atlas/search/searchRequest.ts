/**
 * Čisté sestavení dotazu vyhledávání – bez Reactu,
 * testovatelné samostatně (F.3).
 *
 * Formulář je převážně nekontrolovaný: hodnoty filtrů čteme až ze submitu
 * (FormData entries) a pro stránkování/řazení je doplňujeme o sort.
 */

export const DEFAULT_PAGE_SIZE = 50;
export const EXCEL_EXPORT_PAGE_SIZE = 100000;
export const EXCEL_EXPORT_TYPE = "excel";
export const BROWSER_EXPORT_TYPE = "browser";

/** Typ exportu z odeslaného formuláře (radio export_type). */
export function getExportTypeFromPayload(payloadEntries: Array<[string, FormDataEntryValue]>): string {
    const exportTypeEntry = payloadEntries.find(([key]) => key === "export_type");
    return typeof exportTypeEntry?.[1] === "string" ? exportTypeEntry[1] : BROWSER_EXPORT_TYPE;
}

/** FormData pro searchRecords: filtry + volitelné řazení (sortBy/sortOrder). */
export function buildSearchFormData(
    payloadEntries: Array<[string, FormDataEntryValue]>,
    sortBy: string | null,
    sortOrder: "asc" | "desc"
): FormData {
    const formData = new FormData();
    for (const [key, value] of payloadEntries) {
        formData.append(key, value);
    }
    if (sortBy) {
        formData.append("sortBy", sortBy);
        formData.append("sortOrder", sortOrder);
    }
    return formData;
}

/** Excel export stahuje vše najednou, prohlížeč po stránkách. */
export function resolvePageSize(exportType: string): number {
    return exportType === EXCEL_EXPORT_TYPE ? EXCEL_EXPORT_PAGE_SIZE : DEFAULT_PAGE_SIZE;
}

/** U Excelu vždy potřebujeme celkový počet (pro hlášku o exportu). */
export function shouldForceCount(exportType: string): boolean {
    return exportType === EXCEL_EXPORT_TYPE;
}

/** Počet stránek výsledků (min. 1) – null, když total ještě neznáme. */
export function computeTotalPages(totalCount: number | null): number | null {
    return totalCount != null ? Math.max(1, Math.ceil(totalCount / DEFAULT_PAGE_SIZE)) : null;
}

/** Viditelné stránky paginace (okno max 7 kolem aktuální stránky). */
export function getVisiblePages(currentPage: number, totalPages: number | null): number[] {
    if (totalPages == null) {
        return [];
    }

    const maxVisible = 7;
    const half = Math.floor(maxVisible / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
        start = Math.max(1, end - maxVisible + 1);
    }

    const pages: number[] = [];
    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }
    return pages;
}
