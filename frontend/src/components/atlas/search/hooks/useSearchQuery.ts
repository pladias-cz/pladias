/**
 * Dotaz vyhledávání přes service vrstvu (E.1 z refactor.md): stránkování,
 * řazení, Excel export a hlášky o výsledcích.
 */

import {useCallback, useState} from "react";
import {useTranslation} from "react-i18next";
import type {RecordPladias} from "@/models";
import {ApiError, apiErrorMessage} from "@/services/apiClient";
import {exportSearchExcel, searchRecords} from "@/services/searchApi";
import {
    EXCEL_EXPORT_PAGE_SIZE,
    EXCEL_EXPORT_TYPE,
    buildSearchFormData,
    getExportTypeFromPayload,
    resolvePageSize,
    shouldForceCount,
} from "../searchRequest";

export type SearchPayloadEntries = Array<[string, FormDataEntryValue]>;

export function useSearchQuery() {
    const {t} = useTranslation();

    const [records, setRecords] = useState<RecordPladias[]>([]);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [totalCount, setTotalCount] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [submitMessage, setSubmitMessage] = useState<string>("");
    const [lastPayloadEntries, setLastPayloadEntries] = useState<SearchPayloadEntries>([]);
    const [sortBy, setSortBy] = useState<string | null>("taxonName");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [sortDescending, setSortDescending] = useState<boolean>(false);

    const downloadFile = useCallback((blob: Blob, fileName: string) => {
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.URL.revokeObjectURL(url);
    }, []);

    const fetchSearchPage = useCallback(async (
        page: number,
        getCount: boolean,
        payloadEntries: SearchPayloadEntries,
        activeSort?: { sortBy: string | null; sortOrder: "asc" | "desc" }
    ) => {
        const effectiveSort = activeSort ?? {sortBy, sortOrder};
        const formData = buildSearchFormData(payloadEntries, effectiveSort.sortBy, effectiveSort.sortOrder);

        const exportType = getExportTypeFromPayload(payloadEntries);
        const pageSize = resolvePageSize(exportType);
        const getCountParam = shouldForceCount(exportType) || getCount;

        setIsLoading(true);
        try {
            if (exportType === EXCEL_EXPORT_TYPE) {
                const file = await exportSearchExcel(EXCEL_EXPORT_PAGE_SIZE, formData);

                downloadFile(file.blob, file.filename);

                if (file.totalRecords != null) {
                    if (file.recordsExported >= file.totalRecords) {
                        setSubmitMessage(t("atlas.search.form.excelExportedAll", {
                            recordsCount: file.recordsExported,
                        }));
                    } else {
                        setSubmitMessage(t("atlas.search.form.excelExportedPartial", {
                            exported: file.recordsExported,
                            total: file.totalRecords,
                        }));
                    }
                } else {
                    setSubmitMessage("");
                }
                return true;
            }

            const payload = await searchRecords(page, pageSize, getCountParam, formData);
            const nextRecords = Array.isArray(payload.records) ? payload.records : [];
            setRecords(nextRecords);

            if (getCount) {
                setTotalCount(typeof payload.totalCount === "number" ? payload.totalCount : null);
            }

            const effectiveTotal = getCount
                ? (typeof payload.totalCount === "number" ? payload.totalCount : nextRecords.length)
                : (totalCount ?? nextRecords.length);
            setSubmitMessage(t("atlas.search.form.foundRecords", {
                recordsCount: nextRecords.length,
                totalCount: effectiveTotal,
            }));
            return true;
        } catch (err) {
            if (err instanceof ApiError && err.payload !== undefined) {
                // hláška z obálky (příliš mnoho záznamů apod.) nebo fallback
                setSubmitMessage(apiErrorMessage(err, t("atlas.search.form.searchFailed")));
            } else {
                setSubmitMessage(t("atlas.search.form.submitFailed"));
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [downloadFile, sortBy, sortOrder, t, totalCount]);

    /** Submit formuláře – první stránka s přepočtem total. */
    const search = useCallback(async (payloadEntries: SearchPayloadEntries) => {
        setSubmitMessage("");
        setLastPayloadEntries(payloadEntries);
        const loaded = await fetchSearchPage(1, true, payloadEntries, {sortBy, sortOrder});
        if (loaded) {
            setCurrentPage(1);
        }
    }, [fetchSearchPage, sortBy, sortOrder]);

    /** Stránkování – count už známe, posílá se jen stránka. */
    const changePage = useCallback(async (nextPage: number) => {
        if (nextPage < 1 || lastPayloadEntries.length === 0) {
            return;
        }

        const loaded = await fetchSearchPage(nextPage, false, lastPayloadEntries, {sortBy, sortOrder});
        if (loaded) {
            setCurrentPage(nextPage);
        }
    }, [fetchSearchPage, lastPayloadEntries, sortBy, sortOrder]);

    /** Změna řazení – vždy od první stránky s přepočtem total. */
    const changeSort = useCallback(async (nextSortBy: string | null, nextSortOrder: "asc" | "desc" = "asc") => {
        const resolvedSortBy = nextSortBy ?? "taxonName";
        setSortBy(resolvedSortBy);
        setSortOrder(nextSortOrder);

        if (lastPayloadEntries.length === 0) {
            return;
        }

        const loaded = await fetchSearchPage(1, true, lastPayloadEntries, {sortBy: resolvedSortBy, sortOrder: nextSortOrder});
        if (loaded) {
            setCurrentPage(1);
        }
    }, [fetchSearchPage, lastPayloadEntries]);

    /** Obnovení aktuální stránky po hromadné editaci. */
    const refreshAfterBulkEdit = useCallback(async () => {
        if (lastPayloadEntries.length === 0) {
            return;
        }

        await fetchSearchPage(currentPage, false, lastPayloadEntries, {sortBy, sortOrder});
    }, [currentPage, fetchSearchPage, lastPayloadEntries, sortBy, sortOrder]);

    /** Nové hledání – zahodit výsledky i řazení. */
    const reset = useCallback(() => {
        setRecords([]);
        setCurrentPage(1);
        setTotalCount(null);
        setSubmitMessage("");
        setSortBy("taxonName");
        setSortOrder("asc");
        setSortDescending(false);
    }, []);

    return {
        records,
        currentPage,
        totalCount,
        isLoading,
        submitMessage,
        lastPayloadEntries,
        sortBy,
        sortDescending,
        setSortDescending,
        search,
        changePage,
        changeSort,
        refreshAfterBulkEdit,
        reset,
    };
}
